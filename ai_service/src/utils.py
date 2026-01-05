"""
Utility functions for AI service
"""
import re
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


def normalize_text(text):
    """Normalize text for processing"""
    if not text:
        return ""
    # Convert to lowercase
    text = text.lower()
    # Remove special characters
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text


def extract_skills(text):
    """Extract skills from text"""
    if not text:
        return []
    # Normalize text
    text = normalize_text(text)
    # Split into words
    words = text.split()
    # Filter skills (this is a simple approach, can be improved with NLP)
    return words


def calculate_experience_match(candidate_exp, job_exp_min, job_exp_max=None):
    """
    Calculate experience match score
    Returns a score between 0 and 1
    """
    if candidate_exp is None or job_exp_min is None:
        return 0.5  # Neutral score if data is missing
    
    if candidate_exp >= job_exp_min:
        if job_exp_max and candidate_exp > job_exp_max:
            # Penalize if over-qualified
            overshoot = candidate_exp - job_exp_max
            penalty = min(overshoot * 0.1, 0.3)  # Max 30% penalty
            return max(1.0 - penalty, 0.7)
        return 1.0
    else:
        # Under-qualified
        gap = job_exp_min - candidate_exp
        return max(1.0 - (gap * 0.2), 0.0)


def calculate_salary_match(candidate_salary, job_salary_min, job_salary_max=None):
    """
    Calculate salary match score
    Returns a score between 0 and 1
    """
    if not candidate_salary or not job_salary_min:
        return 0.5  # Neutral score
    
    candidate_min = candidate_salary.get('min', 0) if isinstance(candidate_salary, dict) else candidate_salary
    
    if candidate_min <= job_salary_min:
        return 1.0
    elif job_salary_max and candidate_min <= job_salary_max:
        # Partially satisfied
        return 0.7
    else:
        # Salary expectation too high
        if job_salary_max:
            gap_ratio = (candidate_min - job_salary_max) / job_salary_max
        else:
            gap_ratio = (candidate_min - job_salary_min) / job_salary_min
        return max(1.0 - gap_ratio, 0.0)


def calculate_location_match(candidate_locations, job_location):
    """
    Calculate location match score
    Returns a score between 0 and 1
    """
    if not candidate_locations or not job_location:
        return 0.5  # Neutral score
    
    # Extract city from job location
    job_city = job_location.get('city', '').lower() if isinstance(job_location, dict) else job_location.lower()
    
    # Check if candidate prefers this location
    if isinstance(candidate_locations, list):
        candidate_cities = [loc.lower() for loc in candidate_locations]
        if job_city in candidate_cities:
            return 1.0
    
    return 0.3  # Low score if location doesn't match


def calculate_education_match(candidate_edu, job_edu):
    """
    Calculate education match score
    Returns a score between 0 and 1
    """
    if not job_edu or job_edu == 'not_required':
        return 1.0
    
    if not candidate_edu:
        return 0.5
    
    # Education hierarchy
    edu_levels = {
        'high_school': 1,
        'associate': 2,
        'bachelor': 3,
        'master': 4,
        'doctorate': 5
    }
    
    candidate_level = edu_levels.get(candidate_edu, 0)
    job_level = edu_levels.get(job_edu, 0)
    
    if candidate_level >= job_level:
        return 1.0
    else:
        gap = job_level - candidate_level
        return max(1.0 - (gap * 0.2), 0.0)


def calculate_job_type_match(candidate_prefs, job_type):
    """
    Calculate job type match score
    Returns a score between 0 and 1
    """
    if not candidate_prefs or not job_type:
        return 0.5
    
    preferred_types = candidate_prefs.get('preferred_job_types', [])
    if not preferred_types:
        return 0.5
    
    if job_type in preferred_types:
        return 1.0
    
    return 0.3


def cosine_similarity(vec1, vec2):
    """Calculate cosine similarity between two vectors"""
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return dot_product / (norm1 * norm2)


def jaccard_similarity(set1, set2):
    """Calculate Jaccard similarity between two sets"""
    set1 = set(set1)
    set2 = set(set2)
    
    if len(set1) == 0 and len(set2) == 0:
        return 1.0
    
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    
    if len(union) == 0:
        return 0.0
    
    return len(intersection) / len(union)


def get_timestamp():
    """Get current timestamp"""
    return datetime.utcnow()


def format_recommendation(rec_data):
    """Format recommendation data for API response"""
    return {
        'recommendation_id': str(rec_data.get('_id', '')),
        'entity_id': str(rec_data.get('recommended_entity_id', '')),
        'entity_type': rec_data.get('recommended_entity_type', ''),
        'score': float(rec_data.get('score', 0)),
        'confidence': float(rec_data.get('confidence', 0)),
        'reasons': rec_data.get('reasons', []),
        'algorithm_version': rec_data.get('algorithm_version', ''),
        'created_at': rec_data.get('created_at', get_timestamp()).isoformat()
    }


def extract_skills_from_candidate(candidate):
    """Extract skills from candidate profile"""
    skills = []
    
    # From skills_detailed array
    if 'skills_detailed' in candidate:
        for skill in candidate['skills_detailed']:
            if isinstance(skill, dict):
                skills.append(skill.get('skill_name', ''))
            else:
                skills.append(str(skill))
    
    # From experience array
    if 'experience' in candidate:
        for exp in candidate['experience']:
            if isinstance(exp, dict) and 'technologies' in exp:
                skills.extend(exp['technologies'])
    
    # Clean and normalize
    skills = [normalize_text(s) for s in skills if s]
    return list(set(skills))  # Remove duplicates


def extract_skills_from_job(job):
    """Extract skills from job posting"""
    skills = []
    
    # From skills_required array
    if 'skills_required' in job:
        for skill in job['skills_required']:
            if isinstance(skill, dict):
                skills.append(skill.get('skill_name', ''))
            else:
                skills.append(str(skill))
    
    # From nice_to_have_skills array
    if 'nice_to_have_skills' in job:
        for skill in job['nice_to_have_skills']:
            if isinstance(skill, dict):
                skills.append(skill.get('skill_name', ''))
            else:
                skills.append(str(skill))
    
    # From tags
    if 'tags' in job:
        skills.extend(job['tags'])
    
    # Clean and normalize
    skills = [normalize_text(s) for s in skills if s]
    return list(set(skills))


def calculate_profile_completeness(candidate):
    """Calculate candidate profile completeness score"""
    fields = [
        'education_level',
        'experience_years',
        'bio',
        'cv_url',
        'skills_detailed',
        'experience',
        'education'
    ]
    
    score = 0
    for field in fields:
        if field in candidate and candidate[field]:
            if isinstance(candidate[field], list):
                score += 1 if len(candidate[field]) > 0 else 0
            else:
                score += 1
    
    return score / len(fields)


def setup_logging(log_file=None, log_level='INFO'):
    """Setup logging configuration"""
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    handlers = [logging.StreamHandler()]
    
    if log_file:
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=getattr(logging, log_level),
        format=log_format,
        handlers=handlers
    )
