"""
Recommendation Engine - Core recommendation logic
Hybrid approach: Content-Based + Collaborative Filtering
"""
import numpy as np
import pandas as pd
from datetime import datetime
from bson import ObjectId
import logging
from .model_trainer import ModelTrainer, CollaborativeFilteringModel
from .feature_engineering import FeatureEngineer
from .database import get_database
from .utils import (
    extract_skills_from_candidate,
    extract_skills_from_job,
    calculate_experience_match,
    calculate_salary_match,
    calculate_location_match,
    calculate_education_match,
    jaccard_similarity,
    cosine_similarity,
    get_timestamp
)
from config import get_config

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Main recommendation engine"""
    
    def __init__(self, config=None):
        if config is None:
            config = get_config()
        self.config = config
        self.db = get_database()
        self.db.connect()
        
        # Models
        self.content_model = ModelTrainer(model_type='random_forest', config=config)
        self.cf_model = CollaborativeFilteringModel(config=config)
        self.feature_engineer = FeatureEngineer()
        
        # Load trained models
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models"""
        try:
            self.content_model.load_model()
            logger.info("Content-based model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load content-based model: {e}")
        
        try:
            self.cf_model.load_model()
            logger.info("Collaborative filtering model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load CF model: {e}")
    
    def recommend_jobs_for_candidate(self, candidate_id, limit=20, filters=None):
        """
        Recommend jobs for a candidate
        
        Args:
            candidate_id: Candidate ID
            limit: Number of recommendations
            filters: Additional filters (location, job_type, etc.)
        
        Returns:
            List of recommended jobs with scores
        """
        logger.info(f"Generating job recommendations for candidate {candidate_id}")
        
        # Get candidate data - try candidates collection first, then users collection
        candidate = self.db.get_collection('candidates').find_one({'_id': ObjectId(candidate_id)})

        # If not found in candidates, try to find user_id in candidates collection
        if not candidate:
            candidate = self.db.get_collection('candidates').find_one({'user_id': ObjectId(candidate_id)})

        # If still not found, check if user exists (newly created user without profile)
        if not candidate:
            user = self.db.get_collection('users').find_one({'_id': ObjectId(candidate_id)})
            if not user:
                logger.error(f"Candidate {candidate_id} not found in candidates or users collection")
                return []

            # User exists but no candidate profile yet - return generic popular jobs
            logger.warning(f"User {candidate_id} exists but has no candidate profile. Returning popular jobs.")
            return self._get_popular_jobs(limit, filters)

        # Check if candidate has minimal profile data
        if not self._has_sufficient_profile(candidate):
            logger.warning(f"Candidate {candidate_id} has insufficient profile data. Returning popular jobs.")
            return self._get_popular_jobs(limit, filters)
        
        # Get active jobs
        job_query = {
            'is_active': True,
            'status': 'approved'
        }
        
        # Apply filters
        if filters:
            if 'location' in filters:
                job_query['location.city'] = filters['location']
            if 'job_type' in filters:
                job_query['job_type'] = filters['job_type']
            if 'salary_min' in filters:
                job_query['salary_min'] = {'$gte': filters['salary_min']}
        
        jobs = self.db.get_jobs(query=job_query)
        
        if not jobs:
            logger.warning("No active jobs found")
            return []
        
        logger.info(f"Evaluating {len(jobs)} jobs...")
        
        # Score all jobs
        recommendations = []
        for job in jobs:
            try:
                score_data = self._score_candidate_job_match(candidate, job)
                
                if score_data['score'] >= self.config.MIN_CONFIDENCE_SCORE:
                    recommendations.append({
                        'job': job,
                        'score': score_data['score'],
                        'confidence': score_data['confidence'],
                        'reasons': score_data['reasons']
                    })
            except Exception as e:
                logger.error(f"Error scoring job {job['_id']}: {e}")
                continue
        
        # Sort by score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        # Limit results
        recommendations = recommendations[:limit]
        
        # Save recommendations to database
        self._save_recommendations(
            requester_id=candidate_id,
            requester_type='candidate',
            recommendation_type='job_for_candidate',
            recommendations=recommendations
        )
        
        logger.info(f"Generated {len(recommendations)} recommendations")
        
        return recommendations
    
    def recommend_candidates_for_job(self, job_id, limit=50):
        """
        Recommend candidates for a job posting
        
        Args:
            job_id: Job ID
            limit: Number of recommendations
        
        Returns:
            List of recommended candidates with scores
        """
        logger.info(f"Generating candidate recommendations for job {job_id}")
        
        # Get job data
        job = self.db.get_collection('jobs').find_one({'_id': ObjectId(job_id)})
        if not job:
            logger.error(f"Job {job_id} not found")
            return []
        
        # Get candidates who are seeking jobs
        candidates = self.db.get_candidates(query={'job_status': 'seeking'})
        
        if not candidates:
            logger.warning("No seeking candidates found")
            return []
        
        logger.info(f"Evaluating {len(candidates)} candidates...")
        
        # Score all candidates
        recommendations = []
        for candidate in candidates:
            try:
                score_data = self._score_candidate_job_match(candidate, job)
                
                if score_data['score'] >= self.config.MIN_CONFIDENCE_SCORE:
                    recommendations.append({
                        'candidate': candidate,
                        'score': score_data['score'],
                        'confidence': score_data['confidence'],
                        'reasons': score_data['reasons']
                    })
            except Exception as e:
                logger.error(f"Error scoring candidate {candidate['_id']}: {e}")
                continue
        
        # Sort by score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        # Limit results
        recommendations = recommendations[:limit]
        
        logger.info(f"Generated {len(recommendations)} candidate recommendations")
        
        return recommendations
    
    def _score_candidate_job_match(self, candidate, job):
        """
        Calculate match score between candidate and job
        Uses hybrid approach: content-based + collaborative filtering
        """
        scores = {}
        reasons = []
        candidate_id = str(candidate.get('_id') or "")
        cf_user_known = False
        if self.cf_model.user_factors is not None and candidate_id:
            cf_user_known = candidate_id in self.cf_model.user_ids
        
        # === 1. Content-Based Scoring ===
        
        # Skills match
        candidate_skills = set(extract_skills_from_candidate(candidate))
        job_skills = set(extract_skills_from_job(job))
        
        skills_match_score = jaccard_similarity(candidate_skills, job_skills)
        scores['skills_match'] = skills_match_score
        
        if skills_match_score > 0.7:
            reasons.append({
                'factor': 'skills_match',
                'weight': self.config.FEATURE_WEIGHTS['skill'],
                'score': skills_match_score,
                'description': f"Strong skills match ({int(skills_match_score * 100)}%)"
            })
        elif skills_match_score > 0.4:
            reasons.append({
                'factor': 'skills_match',
                'weight': self.config.FEATURE_WEIGHTS['skill'],
                'score': skills_match_score,
                'description': f"Moderate skills match ({int(skills_match_score * 100)}%)"
            })
        
        # Experience match
        candidate_exp = candidate.get('experience_years', 0) or 0
        job_exp = job.get('experience_required', {})
        job_exp_min = job_exp.get('min', 0) if isinstance(job_exp, dict) else 0
        job_exp_max = job_exp.get('max', 10) if isinstance(job_exp, dict) else 10
        
        exp_match_score = calculate_experience_match(candidate_exp, job_exp_min, job_exp_max)
        scores['experience_match'] = exp_match_score
        
        if exp_match_score >= 0.8:
            reasons.append({
                'factor': 'experience_match',
                'weight': self.config.FEATURE_WEIGHTS['experience'],
                'score': exp_match_score,
                'description': f"Experience level fits well ({candidate_exp} years)"
            })
        
        # Education match
        candidate_edu = candidate.get('education_level', 'bachelor')
        job_edu = job.get('education_required', 'not_required')
        
        edu_match_score = calculate_education_match(candidate_edu, job_edu)
        scores['education_match'] = edu_match_score
        
        if edu_match_score >= 0.8:
            reasons.append({
                'factor': 'education_match',
                'weight': self.config.FEATURE_WEIGHTS['education'],
                'score': edu_match_score,
                'description': f"Education requirement satisfied"
            })
        
        # Location match
        candidate_city = candidate.get('city', '').lower()
        job_location = job.get('location', {})
        job_city = job_location.get('city', '').lower() if isinstance(job_location, dict) else ''
        
        location_match_score = 1.0 if candidate_city == job_city else 0.3
        scores['location_match'] = location_match_score
        
        if location_match_score >= 0.8:
            reasons.append({
                'factor': 'location_match',
                'weight': self.config.FEATURE_WEIGHTS['location'],
                'score': location_match_score,
                'description': f"Located in same city"
            })
        
        # Salary match
        candidate_salary = candidate.get('salary_expectation', {})
        candidate_salary_min = candidate_salary.get('min', 0) if isinstance(candidate_salary, dict) else 0
        job_salary_min = job.get('salary_min', 0) or 0
        job_salary_max = job.get('salary_max', 0) or 0
        
        salary_match_score = calculate_salary_match(candidate_salary, job_salary_min, job_salary_max)
        scores['salary_match'] = salary_match_score
        
        if salary_match_score >= 0.7:
            reasons.append({
                'factor': 'salary_match',
                'weight': self.config.FEATURE_WEIGHTS['salary'],
                'score': salary_match_score,
                'description': "Salary expectation aligns"
            })
        
        # === 2. ML Model Prediction (if available) ===
        ml_score = 0.5  # Default neutral score
        
        if self.content_model.model is not None:
            try:
                # Extract features
                features = self.content_model.data_pipeline._extract_features(candidate, job)
                df = pd.DataFrame([features])
                df, feature_columns = self.content_model.data_pipeline.preprocess_features(df, verbose=False)
                
                if not df.empty and len(feature_columns) > 0:
                    X = df[feature_columns].values
                    ml_score = self.content_model.predict_proba(X)[0]
            except Exception as e:
                logger.warning(f"ML prediction failed: {e}")
        
        scores['ml_prediction'] = ml_score
        
        # === 3. Collaborative Filtering Score (if available) ===
        cf_score = 0.5  # Default neutral score
        
        if self.cf_model.user_factors is not None and cf_user_known:
            try:
                job_id = str(job['_id'])
                cf_predictions = self.cf_model.predict(candidate_id, [job_id])
                if job_id in cf_predictions:
                    cf_score = min(max(cf_predictions[job_id] / 5.0, 0.0), 1.0)  # Normalize to 0-1
            except Exception as e:
                logger.debug(f"CF prediction failed: {e}")
        
        scores['cf_prediction'] = cf_score
        
        # === 4. Calculate Final Score ===
        weights = self.config.FEATURE_WEIGHTS
        
        final_score = (
            scores['skills_match'] * weights['skill'] +
            scores['experience_match'] * weights['experience'] +
            scores['location_match'] * weights['location'] +
            scores['salary_match'] * weights['salary'] +
            scores['education_match'] * weights['education'] +
            ml_score * 0.2 +  # ML model weight
            cf_score * 0.1    # CF model weight
        )
        
        # Normalize score to 0-1
        final_score = min(max(final_score, 0.0), 1.0)
        
        # Calculate confidence based on data completeness
        confidence = self._calculate_confidence(candidate, job, scores)
        
        return {
            'score': final_score,
            'confidence': confidence,
            'reasons': reasons,
            'detailed_scores': scores
        }
    
    def _calculate_confidence(self, candidate, job, scores):
        """Calculate confidence score based on data completeness"""
        confidence_factors = []
        
        # Candidate profile completeness
        has_skills = len(extract_skills_from_candidate(candidate)) > 0
        has_experience = candidate.get('experience_years') is not None
        has_education = candidate.get('education_level') is not None
        has_cv = candidate.get('cv_url') is not None
        
        profile_completeness = sum([has_skills, has_experience, has_education, has_cv]) / 4
        confidence_factors.append(profile_completeness)
        
        # Job posting completeness
        has_job_skills = len(extract_skills_from_job(job)) > 0
        has_job_exp_req = 'experience_required' in job
        has_salary = job.get('salary_min') is not None
        
        job_completeness = sum([has_job_skills, has_job_exp_req, has_salary]) / 3
        confidence_factors.append(job_completeness)
        
        # Score consistency (low variance = high confidence)
        score_values = list(scores.values())
        if len(score_values) > 1:
            score_variance = np.var(score_values)
            consistency = 1.0 - min(score_variance, 1.0)
            confidence_factors.append(consistency)
        
        # Average confidence
        confidence = np.mean(confidence_factors)
        
        return confidence
    
    def _save_recommendations(self, requester_id, requester_type, recommendation_type, recommendations):
        """Save recommendations to database"""
        try:
            for rec in recommendations:
                entity_key = 'job' if 'job' in rec else 'candidate'
                entity = rec[entity_key]
                
                recommendation_doc = {
                    'requester_id': ObjectId(requester_id),
                    'requester_type': requester_type,
                    'recommendation_type': recommendation_type,
                    'recommended_entity_id': entity['_id'],
                    'recommended_entity_type': 'Job' if entity_key == 'job' else 'Candidate',
                    'score': rec['score'],
                    'confidence': rec['confidence'],
                    'algorithm_version': self.config.MODEL_VERSION,
                    'reasons': rec['reasons'],
                    'is_viewed': False,
                    'is_clicked': False,
                    'is_applied': False,
                    'created_at': get_timestamp(),
                    'updated_at': get_timestamp()
                }
                
                self.db.save_ai_recommendation(recommendation_doc)
            
            logger.info(f"Saved {len(recommendations)} recommendations to database")
        except Exception as e:
            logger.error(f"Failed to save recommendations: {e}")
    
    def update_recommendation_feedback(self, recommendation_id, feedback_data):
        """Update recommendation with user feedback"""
        try:
            update_data = {
                'updated_at': get_timestamp()
            }
            
            if 'is_viewed' in feedback_data:
                update_data['is_viewed'] = feedback_data['is_viewed']
                update_data['viewed_at'] = get_timestamp()
            
            if 'is_clicked' in feedback_data:
                update_data['is_clicked'] = feedback_data['is_clicked']
                update_data['clicked_at'] = get_timestamp()
            
            if 'is_applied' in feedback_data:
                update_data['is_applied'] = feedback_data['is_applied']
                update_data['applied_at'] = get_timestamp()
            
            self.db.update_recommendation(ObjectId(recommendation_id), update_data)
            logger.info(f"Updated recommendation {recommendation_id} with feedback")
            
            return True
        except Exception as e:
            logger.error(f"Failed to update recommendation feedback: {e}")
            return False
    
    def get_similar_jobs(self, job_id, limit=5):
        """
        Get similar jobs based on job features
        
        Args:
            job_id: Job ID to find similar jobs for
            limit: Number of similar jobs to return
        
        Returns:
            List of similar jobs with similarity scores
        """
        logger.info(f"Finding similar jobs for job {job_id}")
        
        # Get target job
        target_job = self.db.get_collection('jobs').find_one({'_id': ObjectId(job_id)})
        if not target_job:
            logger.error(f"Job {job_id} not found")
            return []
        
        # Get active jobs (exclude target job)
        jobs = self.db.get_jobs(query={
            '_id': {'$ne': ObjectId(job_id)},
            'is_active': True,
            'status': 'approved'
        })
        
        if not jobs:
            logger.warning("No active jobs found for similarity comparison")
            return []
        
        # Calculate similarity for each job
        similar_jobs = []
        target_skills = set(extract_skills_from_job(target_job))
        target_category = target_job.get('categories', [])
        target_location = target_job.get('location', {}).get('city', '')
        target_job_type = target_job.get('job_type', '')
        target_seniority = target_job.get('seniority_level', '')
        
        for job in jobs:
            try:
                similarity_score = 0.0
                
                # Skills similarity (40% weight)
                job_skills = set(extract_skills_from_job(job))
                skills_similarity = jaccard_similarity(target_skills, job_skills)
                similarity_score += skills_similarity * 0.4
                
                # Category similarity (30% weight)
                job_category = job.get('categories', [])
                if target_category and job_category:
                    # Check if any category matches
                    category_match = bool(set(target_category) & set(job_category))
                    similarity_score += (1.0 if category_match else 0.0) * 0.3
                
                # Location similarity (15% weight)
                job_location = job.get('location', {}).get('city', '')
                if target_location and job_location:
                    location_match = target_location.lower() == job_location.lower()
                    similarity_score += (1.0 if location_match else 0.0) * 0.15
                
                # Job type similarity (10% weight)
                job_type_match = target_job_type == job.get('job_type', '')
                similarity_score += (1.0 if job_type_match else 0.0) * 0.1
                
                # Seniority level similarity (5% weight)
                seniority_match = target_seniority == job.get('seniority_level', '')
                similarity_score += (1.0 if seniority_match else 0.0) * 0.05
                
                if similarity_score > 0.2:  # Threshold for similarity
                    similar_jobs.append({
                        '_id': str(job['_id']),
                        'job_id': str(job['_id']),
                        'title': job.get('title'),
                        'company_name': job.get('recruiter_id', {}).get('company_name') if isinstance(job.get('recruiter_id'), dict) else None,
                        'location': job.get('location', {}).get('city'),
                        'job_type': job.get('job_type'),
                        'salary_min': job.get('salary_min'),
                        'salary_max': job.get('salary_max'),
                        'created_at': job.get('created_at'),
                        'similarity_score': similarity_score
                    })
            except Exception as e:
                logger.error(f"Error calculating similarity for job {job['_id']}: {e}")
                continue
        
        # Sort by similarity score
        similar_jobs.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        # Limit results
        similar_jobs = similar_jobs[:limit]
        
        logger.info(f"Found {len(similar_jobs)} similar jobs")
        
        return similar_jobs

    def _has_sufficient_profile(self, candidate):
        """
        Check if candidate has sufficient profile data for personalized recommendations
        """
        skills = candidate.get('skills', [])
        if skills and len(skills) > 0:
            return True

        experience = candidate.get('experience', [])
        if experience and len(experience) > 0:
            return True

        education = candidate.get('education', [])
        if education and len(education) > 0:
            return True

        job_preferences = candidate.get('job_preferences', {})
        if job_preferences and (
            job_preferences.get('preferred_job_types') or
            job_preferences.get('preferred_locations') or
            job_preferences.get('preferred_categories')
        ):
            return True

        return False

    def _get_popular_jobs(self, limit=20, filters=None):
        """
        Get popular/recent jobs for users with incomplete profiles
        """
        logger.info("Getting popular jobs for user with incomplete profile")

        job_query = {
            'is_active': True,
            'status': 'approved'
        }

        if filters:
            if 'location' in filters and filters['location']:
                job_query['location.city'] = filters['location']
            if 'job_type' in filters and filters['job_type']:
                job_query['job_type'] = filters['job_type']

        collection = self.db.get_collection('jobs')
        jobs = list(collection.find(job_query).sort('created_at', -1).limit(limit))

        if not jobs:
            logger.warning("No active jobs found for popular jobs")
            return []

        recommendations = []
        for job in jobs:
            recommendations.append({
                'job': job,
                'score': 0.5,
                'confidence': 0.3,
                'reasons': ['Cong viec moi dang tuyen', 'Pho bien trong he thong']
            })

        logger.info(f"Returned {len(recommendations)} popular jobs")

        return recommendations
