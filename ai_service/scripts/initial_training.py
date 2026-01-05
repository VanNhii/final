"""
Initial training script for AI models
Run this once to train models with initial data
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.model_trainer import ModelTrainer, CollaborativeFilteringModel
from src.feature_engineering import FeatureEngineer
from src.database import get_database
from config import get_config
import logging

# Setup logging with UTF-8 encoding
import sys
import codecs
if sys.stdout.encoding != 'utf-8':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def train_content_based_model():
    """Train content-based recommendation model"""
    logger.info("=" * 60)
    logger.info("Training Content-Based Model")
    logger.info("=" * 60)
    
    try:
        # Initialize trainer
        trainer = ModelTrainer(model_type='random_forest')
        
        # Train model
        success = trainer.train(days_back=365)  # Use 1 year of data
        
        if success:
            # Save model
            trainer.save_model()
            
            # Print feature importance
            feature_importance = trainer.get_feature_importance()
            logger.info("\nTop 10 Important Features:")
            for i, (feature, importance) in enumerate(list(feature_importance.items())[:10]):
                logger.info(f"{i+1}. {feature}: {importance:.4f}")
            
            logger.info("\n[SUCCESS] Content-based model training completed successfully!")
            return True
        else:
            logger.error("\n[FAILED] Content-based model training failed!")
            return False
            
    except Exception as e:
        logger.error(f"\n❌ Error during training: {e}", exc_info=True)
        return False


def train_collaborative_filtering_model():
    """Train collaborative filtering model"""
    logger.info("\n" + "=" * 60)
    logger.info("Training Collaborative Filtering Model")
    logger.info("=" * 60)
    
    try:
        # Initialize CF trainer
        cf_trainer = CollaborativeFilteringModel(n_factors=50)
        
        # Train model
        success = cf_trainer.train()
        
        if success:
            # Save model
            cf_trainer.save_model()
            
            logger.info(f"\nNumber of users: {len(cf_trainer.user_ids)}")
            logger.info(f"Number of items: {len(cf_trainer.item_ids)}")
            logger.info(f"Latent factors: {cf_trainer.n_factors}")
            
            logger.info("\n[SUCCESS] Collaborative filtering model training completed successfully!")
            return True
        else:
            logger.error("\n[FAILED] Collaborative filtering model training failed!")
            return False
            
    except Exception as e:
        logger.error(f"\n❌ Error during CF training: {e}", exc_info=True)
        return False


def train_feature_embeddings():
    """Train feature embeddings"""
    logger.info("\n" + "=" * 60)
    logger.info("Training Feature Embeddings")
    logger.info("=" * 60)
    
    try:
        # Get data
        db = get_database()
        db.connect()
        
        jobs = db.get_jobs()
        candidates = db.get_candidates()
        
        logger.info(f"Loaded {len(jobs)} jobs and {len(candidates)} candidates")
        
        # Train embeddings
        feature_engineer = FeatureEngineer()
        feature_engineer.fit_skill_embeddings(jobs, candidates)
        
        logger.info("\n[SUCCESS] Feature embeddings training completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"\n❌ Error during embedding training: {e}", exc_info=True)
        return False


def main():
    """Main training pipeline"""
    logger.info("\n" + "=" * 60)
    logger.info("AI MODEL INITIAL TRAINING")
    logger.info("=" * 60)
    
    config = get_config()
    logger.info(f"\nConfiguration:")
    logger.info(f"- Environment: {config.FLASK_ENV}")
    logger.info(f"- MongoDB: {config.MONGODB_URI}")
    logger.info(f"- Model Path: {config.MODEL_PATH}")
    logger.info(f"- Model Version: {config.MODEL_VERSION}")
    
    # Create model directory if not exists
    os.makedirs(config.MODEL_PATH, exist_ok=True)
    
    results = {
        'feature_embeddings': False,
        'content_based': False,
        'collaborative_filtering': False
    }
    
    # 1. Train feature embeddings
    logger.info("\n" + "=" * 60)
    logger.info("Step 1: Training Feature Embeddings")
    logger.info("=" * 60)
    results['feature_embeddings'] = train_feature_embeddings()
    
    # 2. Train content-based model
    logger.info("\n" + "=" * 60)
    logger.info("Step 2: Training Content-Based Model")
    logger.info("=" * 60)
    results['content_based'] = train_content_based_model()
    
    # 3. Train collaborative filtering model
    logger.info("\n" + "=" * 60)
    logger.info("Step 3: Training Collaborative Filtering Model")
    logger.info("=" * 60)
    results['collaborative_filtering'] = train_collaborative_filtering_model()
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TRAINING SUMMARY")
    logger.info("=" * 60)
    for model, success in results.items():
        status = "[SUCCESS]" if success else "[FAILED]"
        logger.info(f"{model.upper()}: {status}")
    
    all_success = all(results.values())
    if all_success:
        logger.info("\n[SUCCESS] All models trained successfully!")
        logger.info("\nYou can now start the API server with:")
        logger.info("  python run.py")
    else:
        logger.warning("\n[WARNING] Some models failed to train. Check the logs above.")
        logger.info("\nNote: If you don't have enough data, some models may fail.")
        logger.info("The system can still work with the models that were trained successfully.")
    
    return all_success


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
