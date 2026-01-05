"""
Configuration module for AI Service
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration"""
    
    # MongoDB Configuration
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://nhivv21it_db_user:DATN123@vannhidatn.x9ziwvd.mongodb.net/datn_1?appName=VanNhiDATN')
    MONGODB_DB_NAME = os.getenv('MONGODB_DB_NAME', 'datn_1')
    
    # Flask Configuration
    FLASK_APP = os.getenv('FLASK_APP', 'src.app')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    API_PORT = int(os.getenv('API_PORT', 5000))
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    
    # Backend URL
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3000')
    
    # Model Configuration
    MODEL_VERSION = os.getenv('MODEL_VERSION', 'v1.0.0')
    MODEL_PATH = os.getenv('MODEL_PATH', './models')
    DATA_PATH = os.getenv('DATA_PATH', './data')
    
    # Training Configuration
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', 32))
    EPOCHS = int(os.getenv('EPOCHS', 50))
    LEARNING_RATE = float(os.getenv('LEARNING_RATE', 0.001))
    VALIDATION_SPLIT = float(os.getenv('VALIDATION_SPLIT', 0.2))
    
    # Recommendation Settings
    MAX_RECOMMENDATIONS = int(os.getenv('MAX_RECOMMENDATIONS', 20))
    MIN_CONFIDENCE_SCORE = float(os.getenv('MIN_CONFIDENCE_SCORE', 0.3))
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', 0.5))
    
    # Feature Weights
    FEATURE_WEIGHTS = {
        'skill': float(os.getenv('SKILL_WEIGHT', 0.35)),
        'experience': float(os.getenv('EXPERIENCE_WEIGHT', 0.25)),
        'location': float(os.getenv('LOCATION_WEIGHT', 0.15)),
        'salary': float(os.getenv('SALARY_WEIGHT', 0.10)),
        'education': float(os.getenv('EDUCATION_WEIGHT', 0.10)),
        'job_type': float(os.getenv('JOB_TYPE_WEIGHT', 0.05))
    }
    
    # Caching
    CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'True').lower() == 'true'
    CACHE_TTL = int(os.getenv('CACHE_TTL', 3600))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', './logs/ai_service.log')
    LOG_MAX_BYTES = int(os.getenv('LOG_MAX_BYTES', 10485760))
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', 5))
    
    # Security
    API_KEY = os.getenv('API_KEY', 'your-secret-api-key-here')
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    FLASK_ENV = 'production'

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    MONGODB_DB_NAME = 'job_portal_test'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(env=None):
    """Get configuration based on environment"""
    if env is None:
        env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])
