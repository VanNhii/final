"""
Test script for recommendation system
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.recommendation_engine import RecommendationEngine
from src.database import get_database
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_job_recommendations():
    """Test job recommendations"""
    logger.info("=" * 60)
    logger.info("Testing Job Recommendations")
    logger.info("=" * 60)
    
    try:
        # Get a candidate
        db = get_database()
        db.connect()
        
        candidate = db.get_collection('candidates').find_one({'job_status': 'seeking'})
        
        if not candidate:
            logger.warning("No seeking candidates found. Creating test scenario...")
            return False
        
        candidate_id = str(candidate['_id'])
        logger.info(f"\nTest Candidate ID: {candidate_id}")
        logger.info(f"Experience: {candidate.get('experience_years', 0)} years")
        logger.info(f"Education: {candidate.get('education_level', 'N/A')}")
        
        # Get recommendations
        engine = RecommendationEngine()
        recommendations = engine.recommend_jobs_for_candidate(
            candidate_id=candidate_id,
            limit=10
        )
        
        logger.info(f"\n[SUCCESS] Generated {len(recommendations)} recommendations")
        
        # Display top 5
        logger.info("\nTop 5 Recommendations:")
        for i, rec in enumerate(recommendations[:5], 1):
            job = rec['job']
            logger.info(f"\n{i}. {job.get('title')}")
            logger.info(f"   Company: {job.get('company_name', 'N/A')}")
            logger.info(f"   Location: {job.get('location', {}).get('city', 'N/A')}")
            logger.info(f"   Score: {rec['score']:.3f}")
            logger.info(f"   Confidence: {rec['confidence']:.3f}")
            logger.info(f"   Reasons: {len(rec['reasons'])} factors")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def test_candidate_recommendations():
    """Test candidate recommendations"""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Candidate Recommendations")
    logger.info("=" * 60)
    
    try:
        # Get a job
        db = get_database()
        db.connect()
        
        job = db.get_collection('jobs').find_one({
            'is_active': True,
            'status': 'approved'
        })
        
        if not job:
            logger.warning("No active jobs found.")
            return False
        
        job_id = str(job['_id'])
        logger.info(f"\nTest Job ID: {job_id}")
        logger.info(f"Title: {job.get('title')}")
        logger.info(f"Company: {job.get('company_name', 'N/A')}")
        
        # Get recommendations
        engine = RecommendationEngine()
        recommendations = engine.recommend_candidates_for_job(
            job_id=job_id,
            limit=10
        )
        
        logger.info(f"\n[SUCCESS] Generated {len(recommendations)} candidate recommendations")
        
        # Display top 5
        logger.info("\nTop 5 Candidates:")
        for i, rec in enumerate(recommendations[:5], 1):
            candidate = rec['candidate']
            logger.info(f"\n{i}. Candidate ID: {str(candidate['_id'])}")
            logger.info(f"   Experience: {candidate.get('experience_years', 0)} years")
            logger.info(f"   Education: {candidate.get('education_level', 'N/A')}")
            logger.info(f"   Score: {rec['score']:.3f}")
            logger.info(f"   Confidence: {rec['confidence']:.3f}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def test_model_loading():
    """Test model loading"""
    logger.info("\n" + "=" * 60)
    logger.info("Testing Model Loading")
    logger.info("=" * 60)
    
    try:
        from src.model_trainer import ModelTrainer, CollaborativeFilteringModel
        
        # Test content-based model
        logger.info("\nLoading content-based model...")
        cb_model = ModelTrainer()
        cb_loaded = cb_model.load_model()
        
        if cb_loaded:
            logger.info("[SUCCESS] Content-based model loaded")
            logger.info(f"   Version: {cb_model.metadata.get('version')}")
            logger.info(f"   Trained: {cb_model.metadata.get('trained_at')}")
            logger.info(f"   Features: {len(cb_model.feature_columns)}")
        else:
            logger.warning("[WARNING] Content-based model not available")
        
        # Test CF model
        logger.info("\nLoading collaborative filtering model...")
        cf_model = CollaborativeFilteringModel()
        cf_loaded = cf_model.load_model()
        
        if cf_loaded:
            logger.info("[SUCCESS] Collaborative filtering model loaded")
            logger.info(f"   Users: {len(cf_model.user_ids)}")
            logger.info(f"   Items: {len(cf_model.item_ids)}")
            logger.info(f"   Factors: {cf_model.n_factors}")
        else:
            logger.warning("[WARNING] Collaborative filtering model not available")
        
        return cb_loaded or cf_loaded
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}", exc_info=True)
        return False


def main():
    """Run all tests"""
    logger.info("\n" + "=" * 60)
    logger.info("AI RECOMMENDATION SYSTEM TESTS")
    logger.info("=" * 60)
    
    results = {
        'model_loading': test_model_loading(),
        'job_recommendations': test_job_recommendations(),
        'candidate_recommendations': test_candidate_recommendations()
    }
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    
    for test, success in results.items():
        status = "[PASSED]" if success else "[FAILED]"
        logger.info(f"{test.upper()}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        logger.info("\n[SUCCESS] All tests passed!")
    else:
        logger.warning("\n[WARNING] Some tests failed.")
    
    return all_passed


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
