"""
Seed sample applications for testing AI training
This creates sample application data if your database doesn't have enough
"""
import sys
import os
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import get_database
from bson import ObjectId
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def seed_applications(num_applications=100):
    """Create sample applications for testing"""
    logger.info("=" * 60)
    logger.info("SEEDING SAMPLE APPLICATIONS")
    logger.info("=" * 60)
    
    try:
        db = get_database()
        db.connect()
        
        # Get existing jobs and candidates
        jobs = db.get_jobs({'is_active': True, 'status': 'approved'})
        candidates = db.get_candidates()
        
        if len(jobs) == 0:
            logger.error("No jobs found in database. Please add some jobs first.")
            return False
        
        if len(candidates) == 0:
            logger.error("No candidates found in database. Please add some candidates first.")
            return False
        
        logger.info(f"Found {len(jobs)} jobs and {len(candidates)} candidates")
        
        # Application statuses with weights (more successful applications)
        statuses = [
            ('pending', 0.2),
            ('reviewing', 0.15),
            ('shortlisted', 0.25),
            ('interviewed', 0.20),
            ('offered', 0.10),
            ('rejected', 0.08),
            ('withdrawn', 0.02)
        ]
        
        applications_collection = db.get_collection('applications')
        
        # Check existing applications
        existing_count = applications_collection.count_documents({})
        logger.info(f"Existing applications: {existing_count}")
        
        if existing_count >= num_applications:
            logger.info(f"Already have {existing_count} applications. No need to seed.")
            return True
        
        needed = num_applications - existing_count
        logger.info(f"Creating {needed} sample applications...")
        
        created = 0
        attempts = 0
        max_attempts = needed * 3  # Try 3x to avoid duplicates
        
        while created < needed and attempts < max_attempts:
            attempts += 1
            
            # Random job and candidate
            job = random.choice(jobs)
            candidate = random.choice(candidates)
            
            # Check if application already exists
            existing = applications_collection.find_one({
                'job_id': job['_id'],
                'candidate_id': candidate['_id']
            })
            
            if existing:
                continue
            
            # Select status based on weights
            status = random.choices(
                [s[0] for s in statuses],
                weights=[s[1] for s in statuses]
            )[0]
            
            # Random date in last 180 days
            days_ago = random.randint(0, 180)
            created_at = datetime.utcnow() - timedelta(days=days_ago)
            
            # Create application
            application = {
                'job_id': job['_id'],
                'candidate_id': candidate['_id'],
                'cover_letter': f"Sample cover letter for {job.get('title', 'position')}",
                'cv_url': candidate.get('cv_url', 'https://example.com/cv.pdf'),
                'application_status': status,
                'applied_at': created_at,
                'created_at': created_at,
                'updated_at': created_at
            }
            
            # Add reviewed_at for certain statuses
            if status in ['reviewing', 'shortlisted', 'interviewed', 'offered', 'rejected']:
                review_days = random.randint(1, 7)
                application['reviewed_at'] = created_at + timedelta(days=review_days)
            
            # Insert
            try:
                applications_collection.insert_one(application)
                created += 1
                
                if created % 20 == 0:
                    logger.info(f"Created {created}/{needed} applications...")
            except Exception as e:
                logger.debug(f"Failed to insert application: {e}")
                continue
        
        logger.info(f"\n[SUCCESS] Created {created} sample applications!")
        logger.info(f"Total applications in database: {existing_count + created}")
        
        # Show status distribution
        logger.info("\nApplication Status Distribution:")
        for status_name, _ in statuses:
            count = applications_collection.count_documents({'application_status': status_name})
            logger.info(f"  {status_name}: {count}")
        
        return True
        
    except Exception as e:
        logger.error(f"[FAILED] Error seeding applications: {e}", exc_info=True)
        return False


def seed_recommendations(num_recommendations=50):
    """Create sample AI recommendations for testing feedback"""
    logger.info("\n" + "=" * 60)
    logger.info("SEEDING SAMPLE AI RECOMMENDATIONS")
    logger.info("=" * 60)
    
    try:
        db = get_database()
        db.connect()
        
        jobs = db.get_jobs({'is_active': True})
        candidates = db.get_candidates()
        
        if len(jobs) == 0 or len(candidates) == 0:
            logger.warning("Not enough data to seed recommendations")
            return False
        
        recommendations_collection = db.get_collection('airecommendations')
        
        existing_count = recommendations_collection.count_documents({})
        logger.info(f"Existing recommendations: {existing_count}")
        
        if existing_count >= num_recommendations:
            logger.info("Already have enough recommendations")
            return True
        
        needed = num_recommendations - existing_count
        logger.info(f"Creating {needed} sample recommendations...")
        
        created = 0
        
        for i in range(needed):
            job = random.choice(jobs)
            candidate = random.choice(candidates)
            
            # Random score and confidence
            score = random.uniform(0.5, 1.0)
            confidence = random.uniform(0.6, 0.95)
            
            # Random interactions
            is_viewed = random.random() < 0.7  # 70% viewed
            is_clicked = is_viewed and random.random() < 0.5  # 50% of viewed are clicked
            is_applied = is_clicked and random.random() < 0.3  # 30% of clicked are applied
            
            days_ago = random.randint(0, 90)
            created_at = datetime.utcnow() - timedelta(days=days_ago)
            
            recommendation = {
                'requester_id': candidate['_id'],
                'requester_type': 'candidate',
                'recommendation_type': 'job_for_candidate',
                'recommended_entity_id': job['_id'],
                'recommended_entity_type': 'Job',
                'score': score,
                'confidence': confidence,
                'algorithm_version': 'v1.0.0',
                'reasons': [
                    {
                        'factor': 'skills_match',
                        'weight': 0.35,
                        'score': random.uniform(0.5, 1.0),
                        'description': 'Skills match well'
                    }
                ],
                'is_viewed': is_viewed,
                'is_clicked': is_clicked,
                'is_applied': is_applied,
                'created_at': created_at,
                'updated_at': created_at
            }
            
            if is_viewed:
                recommendation['viewed_at'] = created_at + timedelta(hours=random.randint(1, 24))
            
            if is_clicked:
                recommendation['clicked_at'] = recommendation['viewed_at'] + timedelta(minutes=random.randint(1, 60))
            
            try:
                recommendations_collection.insert_one(recommendation)
                created += 1
            except:
                continue
        
        logger.info(f"\n[SUCCESS] Created {created} sample recommendations!")
        logger.info(f"Total recommendations: {existing_count + created}")
        
        # Show interaction stats
        viewed = recommendations_collection.count_documents({'is_viewed': True})
        clicked = recommendations_collection.count_documents({'is_clicked': True})
        applied = recommendations_collection.count_documents({'is_applied': True})
        
        logger.info("\nInteraction Statistics:")
        logger.info(f"  Viewed: {viewed}")
        logger.info(f"  Clicked: {clicked}")
        logger.info(f"  Applied: {applied}")
        
        return True
        
    except Exception as e:
        logger.error(f"[FAILED] Error seeding recommendations: {e}", exc_info=True)
        return False


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Seed sample data for AI training')
    parser.add_argument('--applications', type=int, default=100,
                        help='Number of applications to create (default: 100)')
    parser.add_argument('--recommendations', type=int, default=50,
                        help='Number of recommendations to create (default: 50)')
    parser.add_argument('--skip-recommendations', action='store_true',
                        help='Skip seeding recommendations')
    
    args = parser.parse_args()
    
    logger.info("\n" + "=" * 60)
    logger.info("DATA SEEDING FOR AI TRAINING")
    logger.info("=" * 60)
    
    results = {}
    
    # Seed applications
    results['applications'] = seed_applications(args.applications)
    
    # Seed recommendations
    if not args.skip_recommendations:
        results['recommendations'] = seed_recommendations(args.recommendations)
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("SEEDING SUMMARY")
    logger.info("=" * 60)
    
    for item, success in results.items():
        status = "[SUCCESS]" if success else "[FAILED]"
        logger.info(f"{item.upper()}: {status}")
    
    all_success = all(results.values())
    
    if all_success:
        logger.info("\n[SUCCESS] Data seeding completed!")
        logger.info("\nYou can now train the models:")
        logger.info("  python scripts/initial_training.py")
    else:
        logger.warning("\n[WARNING] Some seeding operations failed.")
    
    return all_success


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
