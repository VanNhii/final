"""
Training script for updating AI models
Run this periodically to retrain models with new data
"""
import sys
import os
import argparse

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.model_trainer import ModelTrainer, CollaborativeFilteringModel
from config import get_config
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Train AI recommendation models')
    parser.add_argument(
        '--model-type',
        type=str,
        choices=['content_based', 'collaborative_filtering', 'both'],
        default='both',
        help='Type of model to train'
    )
    parser.add_argument(
        '--days-back',
        type=int,
        default=180,
        help='Number of days of historical data to use'
    )
    parser.add_argument(
        '--algorithm',
        type=str,
        choices=['random_forest', 'gradient_boosting'],
        default='random_forest',
        help='ML algorithm for content-based model'
    )
    parser.add_argument(
        '--n-factors',
        type=int,
        default=50,
        help='Number of latent factors for collaborative filtering'
    )
    
    return parser.parse_args()


def train_content_based(algorithm='random_forest', days_back=180):
    """Train content-based model"""
    logger.info(f"Training content-based model with {algorithm}...")
    
    try:
        trainer = ModelTrainer(model_type=algorithm)
        success = trainer.train(days_back=days_back)
        
        if success:
            trainer.save_model()
            
            # Print metrics
            metrics = trainer.metadata.get('metrics', {})
            logger.info("\nModel Performance Metrics:")
            logger.info(f"  Accuracy:  {metrics.get('accuracy', 0):.4f}")
            logger.info(f"  Precision: {metrics.get('precision', 0):.4f}")
            logger.info(f"  Recall:    {metrics.get('recall', 0):.4f}")
            logger.info(f"  F1 Score:  {metrics.get('f1', 0):.4f}")
            logger.info(f"  ROC AUC:   {metrics.get('roc_auc', 0):.4f}")
            
            logger.info("\n[SUCCESS] Content-based model trained successfully!")
            return True
        else:
            logger.error("[FAILED] Content-based model training failed!")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
        return False


def train_collaborative(n_factors=50):
    """Train collaborative filtering model"""
    logger.info(f"Training collaborative filtering model with {n_factors} factors...")
    
    try:
        cf_trainer = CollaborativeFilteringModel(n_factors=n_factors)
        success = cf_trainer.train()
        
        if success:
            cf_trainer.save_model()
            
            logger.info(f"\nModel Statistics:")
            logger.info(f"  Users: {len(cf_trainer.user_ids)}")
            logger.info(f"  Items: {len(cf_trainer.item_ids)}")
            logger.info(f"  Factors: {cf_trainer.n_factors}")
            
            logger.info("\n[SUCCESS] Collaborative filtering model trained successfully!")
            return True
        else:
            logger.error("[FAILED] Collaborative filtering model training failed!")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error: {e}", exc_info=True)
        return False


def main():
    """Main function"""
    args = parse_args()
    
    logger.info("=" * 60)
    logger.info("AI MODEL TRAINING")
    logger.info("=" * 60)
    logger.info(f"Model Type: {args.model_type}")
    logger.info(f"Days Back: {args.days_back}")
    
    config = get_config()
    logger.info(f"Model Version: {config.MODEL_VERSION}")
    logger.info("=" * 60)
    
    # Create model directory
    os.makedirs(config.MODEL_PATH, exist_ok=True)
    
    results = {}
    
    # Train models based on selection
    if args.model_type in ['content_based', 'both']:
        results['content_based'] = train_content_based(
            algorithm=args.algorithm,
            days_back=args.days_back
        )
    
    if args.model_type in ['collaborative_filtering', 'both']:
        results['collaborative_filtering'] = train_collaborative(
            n_factors=args.n_factors
        )
    
    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("TRAINING SUMMARY")
    logger.info("=" * 60)
    
    for model, success in results.items():
        status = "[SUCCESS]" if success else "[FAILED]"
        logger.info(f"{model.upper()}: {status}")
    
    all_success = all(results.values())
    
    if all_success:
        logger.info("\n[SUCCESS] Training completed successfully!")
    else:
        logger.warning("\n[WARNING] Some models failed to train.")
    
    return all_success


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
