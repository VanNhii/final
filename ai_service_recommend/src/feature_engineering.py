"""
Feature Engineering module for extracting and transforming features
"""
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
import logging
from .utils import (
    extract_skills_from_candidate,
    extract_skills_from_job,
    normalize_text,
    jaccard_similarity,
    cosine_similarity
)

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Feature engineering for job recommendations"""
    
    def __init__(self):
        self.skill_vectorizer = TfidfVectorizer(
            max_features=200,
            ngram_range=(1, 2),
            stop_words='english'
        )
        self.svd = TruncatedSVD(n_components=50)
        self.skill_matrix = None
        self.skill_embeddings = None
        
    def fit_skill_embeddings(self, jobs, candidates):
        """Fit skill embeddings from jobs and candidates"""
        logger.info("Fitting skill embeddings...")
        
        # Collect all skill texts
        skill_texts = []
        
        for job in jobs:
            skills = extract_skills_from_job(job)
            skill_texts.append(' '.join(skills))
        
        for candidate in candidates:
            skills = extract_skills_from_candidate(candidate)
            skill_texts.append(' '.join(skills))
        
        if len(skill_texts) > 0:
            # Fit TF-IDF
            self.skill_matrix = self.skill_vectorizer.fit_transform(skill_texts)
            
            # Apply dimensionality reduction
            if self.skill_matrix.shape[0] > 50:
                self.skill_embeddings = self.svd.fit_transform(self.skill_matrix)
            else:
                self.skill_embeddings = self.skill_matrix.toarray()
            
            logger.info(f"Skill embeddings shape: {self.skill_embeddings.shape}")
        else:
            logger.warning("No skill texts available for embedding")
    
    def transform_skills(self, text):
        """Transform skill text to vector"""
        if self.skill_vectorizer is None:
            return np.zeros(200)
        
        vector = self.skill_vectorizer.transform([text])
        
        if self.svd and vector.shape[1] > 50:
            return self.svd.transform(vector)[0]
        else:
            return vector.toarray()[0]
    
    def extract_candidate_features(self, candidate):
        """Extract comprehensive features from candidate"""
        features = {}
        
        # Basic features
        features['experience_years'] = candidate.get('experience_years', 0) or 0
        features['education_level'] = self._encode_education(candidate.get('education_level'))
        features['job_status'] = self._encode_job_status(candidate.get('job_status'))
        
        # Skills
        skills = extract_skills_from_candidate(candidate)
        features['skills_count'] = len(skills)
        features['skills_diversity'] = len(set(skills))
        
        # Salary expectation
        salary_exp = candidate.get('salary_expectation', {})
        if isinstance(salary_exp, dict):
            features['salary_min'] = salary_exp.get('min', 0) or 0
            features['salary_max'] = salary_exp.get('max', 0) or 0
        else:
            features['salary_min'] = 0
            features['salary_max'] = 0
        
        # Work experience
        experience = candidate.get('experience', [])
        features['experience_count'] = len(experience)
        features['has_current_job'] = any(exp.get('is_current', False) for exp in experience)
        
        # Education
        education = candidate.get('education', [])
        features['education_count'] = len(education)
        features['highest_gpa'] = max([edu.get('gpa', 0) or 0 for edu in education], default=0)
        
        # Profile completeness
        features['has_cv'] = 1 if candidate.get('cv_url') else 0
        features['has_linkedin'] = 1 if candidate.get('linkedin_url') else 0
        features['has_github'] = 1 if candidate.get('github_url') else 0
        features['has_portfolio'] = 1 if candidate.get('portfolio_url') else 0
        features['has_bio'] = 1 if candidate.get('bio') else 0
        
        # Skill embeddings
        skill_text = ' '.join(skills)
        features['skill_embedding'] = self.transform_skills(skill_text)
        
        return features
    
    def extract_job_features(self, job):
        """Extract comprehensive features from job"""
        features = {}
        
        # Basic features
        features['job_type'] = self._encode_job_type(job.get('job_type'))
        features['work_location'] = self._encode_work_location(job.get('work_location'))
        features['seniority_level'] = self._encode_seniority(job.get('seniority_level'))
        
        # Experience requirements
        exp_req = job.get('experience_required', {})
        if isinstance(exp_req, dict):
            features['experience_min'] = exp_req.get('min', 0) or 0
            features['experience_max'] = exp_req.get('max', 10) or 10
        else:
            features['experience_min'] = 0
            features['experience_max'] = 10
        
        # Education requirement
        features['education_required'] = self._encode_education(job.get('education_required'))
        
        # Salary
        features['salary_min'] = job.get('salary_min', 0) or 0
        features['salary_max'] = job.get('salary_max', 0) or 0
        features['salary_range'] = features['salary_max'] - features['salary_min']
        
        # Skills
        skills = extract_skills_from_job(job)
        features['skills_count'] = len(skills)
        
        # Required vs optional skills
        skills_required = job.get('skills_required', [])
        nice_to_have = job.get('nice_to_have_skills', [])
        features['required_skills_count'] = len(skills_required)
        features['optional_skills_count'] = len(nice_to_have)
        
        # Job popularity/quality
        features['views_count'] = job.get('views_count', 0) or 0
        features['applications_count'] = job.get('applications_count', 0) or 0
        features['is_hot'] = 1 if job.get('is_hot', False) else 0
        features['is_featured'] = 1 if job.get('is_featured', False) else 0
        features['is_urgent'] = 1 if job.get('is_urgent', False) else 0
        
        # Positions
        features['positions_available'] = job.get('positions_available', 1)
        
        # Application deadline
        deadline = job.get('application_deadline')
        if deadline:
            from datetime import datetime
            days_left = (deadline - datetime.utcnow()).days
            features['days_until_deadline'] = max(days_left, 0)
        else:
            features['days_until_deadline'] = 30  # Default
        
        # Benefits
        benefits = job.get('benefits', [])
        features['benefits_count'] = len(benefits)
        
        # Skill embeddings
        skill_text = ' '.join(skills)
        features['skill_embedding'] = self.transform_skills(skill_text)
        
        return features
    
    def calculate_match_features(self, candidate_features, job_features):
        """Calculate matching features between candidate and job"""
        match_features = {}
        
        # Skill similarity
        if 'skill_embedding' in candidate_features and 'skill_embedding' in job_features:
            match_features['skill_similarity'] = cosine_similarity(
                candidate_features['skill_embedding'],
                job_features['skill_embedding']
            )
        else:
            match_features['skill_similarity'] = 0.0
        
        # Experience match
        candidate_exp = candidate_features.get('experience_years', 0)
        job_exp_min = job_features.get('experience_min', 0)
        job_exp_max = job_features.get('experience_max', 10)
        
        if candidate_exp >= job_exp_min and candidate_exp <= job_exp_max:
            match_features['experience_match'] = 1.0
        elif candidate_exp >= job_exp_min:
            # Over-qualified
            overshoot = candidate_exp - job_exp_max
            match_features['experience_match'] = max(1.0 - (overshoot * 0.1), 0.7)
        else:
            # Under-qualified
            gap = job_exp_min - candidate_exp
            match_features['experience_match'] = max(1.0 - (gap * 0.2), 0.0)
        
        # Education match
        candidate_edu = candidate_features.get('education_level', 0)
        job_edu = job_features.get('education_required', 0)
        match_features['education_match'] = 1.0 if candidate_edu >= job_edu else 0.5
        
        # Salary match
        candidate_salary_min = candidate_features.get('salary_min', 0)
        job_salary_max = job_features.get('salary_max', 0)
        
        if candidate_salary_min > 0 and job_salary_max > 0:
            if candidate_salary_min <= job_salary_max:
                match_features['salary_match'] = 1.0
            else:
                gap_ratio = (candidate_salary_min - job_salary_max) / job_salary_max
                match_features['salary_match'] = max(1.0 - gap_ratio, 0.0)
        else:
            match_features['salary_match'] = 0.5
        
        # Profile quality vs job requirements
        profile_score = (
            candidate_features.get('has_cv', 0) +
            candidate_features.get('has_linkedin', 0) * 0.5 +
            candidate_features.get('has_github', 0) * 0.5 +
            candidate_features.get('has_bio', 0) * 0.3
        ) / 2.3
        
        job_competitiveness = (
            job_features.get('is_hot', 0) +
            job_features.get('is_featured', 0) +
            (min(job_features.get('applications_count', 0) / 100, 1.0))
        ) / 3.0
        
        match_features['profile_job_fit'] = min(profile_score / max(job_competitiveness, 0.1), 1.0)
        
        return match_features
    
    def _encode_education(self, education):
        """Encode education level to numeric"""
        education_map = {
            'high_school': 1,
            'associate': 2,
            'bachelor': 3,
            'master': 4,
            'doctorate': 5,
            'not_required': 0
        }
        return education_map.get(education, 2)
    
    def _encode_job_type(self, job_type):
        """Encode job type to numeric"""
        job_type_map = {
            'full_time': 1,
            'part_time': 2,
            'contract': 3,
            'internship': 4,
            'freelance': 5
        }
        return job_type_map.get(job_type, 1)
    
    def _encode_work_location(self, work_location):
        """Encode work location to numeric"""
        location_map = {
            'onsite': 1,
            'remote': 2,
            'hybrid': 3
        }
        return location_map.get(work_location, 1)
    
    def _encode_seniority(self, seniority):
        """Encode seniority level to numeric"""
        seniority_map = {
            'entry': 1,
            'junior': 2,
            'mid': 3,
            'senior': 4,
            'lead': 5,
            'executive': 6
        }
        return seniority_map.get(seniority, 2)
    
    def _encode_job_status(self, status):
        """Encode job status to numeric"""
        status_map = {
            'seeking': 1,
            'employed': 2,
            'not_seeking': 3
        }
        return status_map.get(status, 1)
