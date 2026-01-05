"""
Data Pipeline for extracting and preprocessing data from MongoDB
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import logging
from .database import get_database
from .utils import (
    extract_skills_from_candidate,
    extract_skills_from_job,
    normalize_text,
    calculate_profile_completeness
)

logger = logging.getLogger(__name__)


class DataPipeline:
    """Data extraction and preprocessing pipeline"""
    
    def __init__(self):
        self.db = get_database()
        self.db.connect()
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        
    def extract_training_data(self, days_back=180):
        """
        Extract training data from database
        Returns: DataFrame with features and labels
        """
        logger.info("Extracting training data from database...")
        
        # Get data from last N days
        date_threshold = datetime.utcnow() - timedelta(days=days_back)
        
        # Get applications (labels)
        applications = self.db.get_applications({
            'created_at': {'$gte': date_threshold}
        })
        logger.info(f"Extracted {len(applications)} applications")
        
        # Get jobs and candidates
        jobs = self.db.get_jobs()
        candidates = self.db.get_candidates()
        logger.info(f"Extracted {len(jobs)} jobs and {len(candidates)} candidates")
        
        # Create lookup dictionaries
        jobs_dict = {str(job['_id']): job for job in jobs}
        candidates_dict = {str(candidate['_id']): candidate for candidate in candidates}
        
        # Build training dataset
        training_data = []
        for app in applications:
            job_id = str(app['job_id'])
            candidate_id = str(app['candidate_id'])
            
            if job_id in jobs_dict and candidate_id in candidates_dict:
                job = jobs_dict[job_id]
                candidate = candidates_dict[candidate_id]
                
                # Extract features
                features = self._extract_features(candidate, job)
                
                # Label: 1 if successful (interviewed, offered, accepted), 0 otherwise
                label = 1 if app['application_status'] in ['interviewed', 'offered', 'shortlisted'] else 0
                
                features['label'] = label
                features['job_id'] = job_id
                features['candidate_id'] = candidate_id
                features['application_id'] = str(app['_id'])
                
                training_data.append(features)
        
        logger.info(f"Created {len(training_data)} training samples")
        
        if len(training_data) == 0:
            logger.warning("No training data available!")
            return pd.DataFrame()
        
        df = pd.DataFrame(training_data)
        return df
    
    def _extract_features(self, candidate, job):
        """Extract features from candidate and job"""
        features = {}
        
        # === Candidate Features ===
        features['candidate_experience_years'] = candidate.get('experience_years', 0) or 0
        features['candidate_education_level'] = candidate.get('education_level', 'bachelor')
        features['candidate_profile_completeness'] = calculate_profile_completeness(candidate)
        
        # Candidate skills
        candidate_skills = extract_skills_from_candidate(candidate)
        features['candidate_skills_count'] = len(candidate_skills)
        
        # Candidate salary expectation
        salary_exp = candidate.get('salary_expectation', {})
        features['candidate_salary_min'] = salary_exp.get('min', 0) if isinstance(salary_exp, dict) else 0
        
        # Candidate location
        features['candidate_city'] = candidate.get('city', 'unknown')
        
        # Candidate job status
        features['candidate_job_status'] = candidate.get('job_status', 'seeking')
        
        # === Job Features ===
        features['job_type'] = job.get('job_type', 'full_time')
        features['job_work_location'] = job.get('work_location', 'onsite')
        features['job_seniority_level'] = job.get('seniority_level', 'junior')
        
        # Job experience required
        exp_req = job.get('experience_required', {})
        features['job_experience_min'] = exp_req.get('min', 0) if isinstance(exp_req, dict) else 0
        features['job_experience_max'] = exp_req.get('max', 10) if isinstance(exp_req, dict) else 10
        
        # Job education required
        features['job_education_required'] = job.get('education_required', 'not_required')
        
        # Job salary
        features['job_salary_min'] = job.get('salary_min', 0) or 0
        features['job_salary_max'] = job.get('salary_max', 0) or 0
        
        # Job location
        job_location = job.get('location', {})
        features['job_city'] = job_location.get('city', 'unknown') if isinstance(job_location, dict) else 'unknown'
        
        # Job skills
        job_skills = extract_skills_from_job(job)
        features['job_skills_count'] = len(job_skills)
        
        # Job popularity
        features['job_views_count'] = job.get('views_count', 0) or 0
        features['job_applications_count'] = job.get('applications_count', 0) or 0
        features['job_is_hot'] = 1 if job.get('is_hot', False) else 0
        features['job_is_featured'] = 1 if job.get('is_featured', False) else 0
        
        # === Interaction Features ===
        # Skills match
        skills_intersection = set(candidate_skills).intersection(set(job_skills))
        features['skills_match_count'] = len(skills_intersection)
        features['skills_match_ratio'] = len(skills_intersection) / max(len(candidate_skills), 1)
        
        # Experience match
        candidate_exp = features['candidate_experience_years']
        job_exp_min = features['job_experience_min']
        job_exp_max = features['job_experience_max']
        
        if candidate_exp >= job_exp_min and candidate_exp <= job_exp_max:
            features['experience_match'] = 1.0
        elif candidate_exp >= job_exp_min:
            features['experience_match'] = 0.7  # Over-qualified
        else:
            gap = job_exp_min - candidate_exp
            features['experience_match'] = max(1.0 - (gap * 0.3), 0.0)
        
        # Location match
        features['location_match'] = 1 if features['candidate_city'].lower() == features['job_city'].lower() else 0
        
        # Salary match
        if features['candidate_salary_min'] > 0 and features['job_salary_max'] > 0:
            if features['candidate_salary_min'] <= features['job_salary_max']:
                features['salary_match'] = 1.0
            else:
                gap_ratio = (features['candidate_salary_min'] - features['job_salary_max']) / features['job_salary_max']
                features['salary_match'] = max(1.0 - gap_ratio, 0.0)
        else:
            features['salary_match'] = 0.5  # Neutral
        
        # Text features (will be processed later)
        features['candidate_skills_text'] = ' '.join(candidate_skills)
        features['job_skills_text'] = ' '.join(job_skills)
        
        return features
    
    def preprocess_features(self, df, verbose=True):
        """Preprocess features for model training
        
        Args:
            df: DataFrame with raw features
            verbose: Whether to log preprocessing info (default True for training, False for prediction)
        """
        if verbose:
            logger.info("Preprocessing features...")
        
        if df.empty:
            return df, []
        
        # Make a copy to avoid modifying original
        df = df.copy()
        
        # Categorical encoding
        categorical_columns = [
            'candidate_education_level',
            'candidate_city',
            'candidate_job_status',
            'job_type',
            'job_work_location',
            'job_seniority_level',
            'job_education_required',
            'job_city'
        ]
        
        for col in categorical_columns:
            if col in df.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    df[col + '_encoded'] = self.label_encoders[col].fit_transform(df[col].fillna('unknown'))
                else:
                    # Handle unseen categories
                    df[col + '_encoded'] = df[col].apply(
                        lambda x: self._safe_transform(self.label_encoders[col], x)
                    )
        
        # Numerical columns to scale
        numerical_columns = [
            'candidate_experience_years',
            'candidate_profile_completeness',
            'candidate_skills_count',
            'candidate_salary_min',
            'job_experience_min',
            'job_experience_max',
            'job_salary_min',
            'job_salary_max',
            'job_skills_count',
            'job_views_count',
            'job_applications_count',
            'skills_match_count',
            'skills_match_ratio',
            'experience_match',
            'salary_match'
        ]
        
        # Fill missing values
        for col in numerical_columns:
            if col in df.columns:
                df[col] = df[col].fillna(0)
        
        # Feature names for model
        feature_columns = [col + '_encoded' for col in categorical_columns if col in df.columns]
        feature_columns.extend([col for col in numerical_columns if col in df.columns])
        feature_columns.extend(['location_match', 'job_is_hot', 'job_is_featured'])
        
        return df, feature_columns
    
    def _safe_transform(self, encoder, value):
        """Safely transform value with label encoder"""
        try:
            return encoder.transform([value])[0]
        except:
            # Return a default value for unseen categories
            return 0
    
    def extract_user_interaction_data(self):
        """Extract user interaction data for collaborative filtering"""
        logger.info("Extracting user interaction data...")
        
        # Get applications
        applications = self.db.get_applications()
        
        # Get AI feedback
        feedbacks = self.db.get_ai_feedback()
        
        # Get recommendations with interactions
        recommendations = self.db.get_ai_recommendations({
            '$or': [
                {'is_viewed': True},
                {'is_clicked': True},
                {'is_applied': True}
            ]
        })
        
        # Build interaction matrix
        interactions = []
        
        # From applications (explicit feedback)
        for app in applications:
            interaction = {
                'user_id': str(app['candidate_id']),
                'item_id': str(app['job_id']),
                'interaction_type': 'application',
                'rating': self._get_application_rating(app['application_status']),
                'timestamp': app.get('created_at', datetime.utcnow())
            }
            interactions.append(interaction)
        
        # From recommendations (implicit feedback)
        for rec in recommendations:
            rating = 0
            if rec.get('is_applied'):
                rating = 5
            elif rec.get('is_clicked'):
                rating = 3
            elif rec.get('is_viewed'):
                rating = 1
            
            interaction = {
                'user_id': str(rec['requester_id']),
                'item_id': str(rec['recommended_entity_id']),
                'interaction_type': 'view',
                'rating': rating,
                'timestamp': rec.get('created_at', datetime.utcnow())
            }
            interactions.append(interaction)
        
        logger.info(f"Extracted {len(interactions)} user interactions")
        
        df = pd.DataFrame(interactions)
        return df
    
    def _get_application_rating(self, status):
        """Convert application status to rating"""
        rating_map = {
            'pending': 1,
            'reviewing': 2,
            'shortlisted': 4,
            'interviewed': 5,
            'offered': 5,
            'rejected': 0,
            'withdrawn': 0
        }
        return rating_map.get(status, 1)
    
    def create_interaction_matrix(self, interactions_df):
        """Create user-item interaction matrix"""
        if interactions_df.empty:
            return pd.DataFrame(), [], []
        
        # Pivot to create matrix
        matrix = interactions_df.pivot_table(
            index='user_id',
            columns='item_id',
            values='rating',
            aggfunc='max',
            fill_value=0
        )
        
        user_ids = matrix.index.tolist()
        item_ids = matrix.columns.tolist()
        
        logger.info(f"Created interaction matrix: {matrix.shape[0]} users x {matrix.shape[1]} items")
        
        return matrix, user_ids, item_ids
