"""
AI Service Package Initialization
"""

__version__ = '1.0.0'
__author__ = 'Job Portal AI Team'

from .app import app
from .recommendation_engine import RecommendationEngine
from .model_trainer import ModelTrainer, CollaborativeFilteringModel
from .data_pipeline import DataPipeline
from .feature_engineering import FeatureEngineer

__all__ = [
    'app',
    'RecommendationEngine',
    'ModelTrainer',
    'CollaborativeFilteringModel',
    'DataPipeline',
    'FeatureEngineer'
]
