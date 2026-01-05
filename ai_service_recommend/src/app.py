"""
Flask API for AI Recommendation Service
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from .recommendation_engine import RecommendationEngine
from .model_trainer import ModelTrainer, CollaborativeFilteringModel
from .utils import setup_logging, format_recommendation
from config import get_config

# Setup logging
config = get_config()
setup_logging(log_file=config.LOG_FILE, log_level=config.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=config.ALLOWED_ORIGINS)

# Initialize recommendation engine
recommendation_engine = RecommendationEngine(config=config)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'AI Recommendation Service',
        'version': config.MODEL_VERSION
    })


@app.route('/recommendations/jobs', methods=['POST'])
def recommend_jobs():
    """
    Recommend jobs for a candidate
    
    Request body:
    {
        "candidate_id": "507f1f77bcf86cd799439011",
        "limit": 20,
        "filters": {
            "location": "Hà Nội",
            "job_type": "full_time"
        }
    }
    """
    try:
        data = request.get_json()
        if not data or 'candidate_id' not in data:
            return jsonify({
                'success': False,
                'message': 'candidate_id is required'
            }), 400
        candidate_id = data['candidate_id']
        limit = data.get('limit', 20)
        filters = data.get('filters', {})
        
        logger.info(f"Job recommendation request for candidate {candidate_id}")
        
        # Get recommendations
        recommendations = recommendation_engine.recommend_jobs_for_candidate(
            candidate_id=candidate_id,
            limit=limit,
            filters=filters
        )
        
        # Format response
        formatted_recs = []
        for rec in recommendations:
            job = rec['job']
            formatted_recs.append({
                'job_id': str(job['_id']),
                'title': job.get('title'),
                'company_name': job.get('company_name'),
                'location': job.get('location', {}).get('city'),
                'job_type': job.get('job_type'),
                'salary_min': job.get('salary_min'),
                'salary_max': job.get('salary_max'),
                'score': rec['score'],
                'confidence': rec['confidence'],
                'reasons': rec['reasons']
            })
        
        return jsonify({
            'success': True,
            'count': len(formatted_recs),
            'data': formatted_recs
        })
        
    except Exception as e:
        logger.error(f"Error in job recommendation: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500


@app.route('/recommendations/candidates', methods=['POST'])
def recommend_candidates():
    """
    Recommend candidates for a job
    
    Request body:
    {
        "job_id": "507f1f77bcf86cd799439012",
        "limit": 50
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'job_id' not in data:
            return jsonify({
                'success': False,
                'message': 'job_id is required'
            }), 400
        
        job_id = data['job_id']
        limit = data.get('limit', 50)
        
        logger.info(f"Candidate recommendation request for job {job_id}")
        
        # Get recommendations
        recommendations = recommendation_engine.recommend_candidates_for_job(
            job_id=job_id,
            limit=limit
        )
        
        # Format response
        formatted_recs = []
        for rec in recommendations:
            candidate = rec['candidate']
            formatted_recs.append({
                'candidate_id': str(candidate['_id']),
                'experience_years': candidate.get('experience_years'),
                'education_level': candidate.get('education_level'),
                'score': rec['score'],
                'confidence': rec['confidence'],
                'reasons': rec['reasons']
            })
        
        return jsonify({
            'success': True,
            'count': len(formatted_recs),
            'data': formatted_recs
        })
        
    except Exception as e:
        logger.error(f"Error in candidate recommendation: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500


@app.route('/feedback', methods=['POST'])
def update_feedback():
    """
    Update recommendation feedback
    
    Request body:
    {
        "recommendation_id": "507f1f77bcf86cd799439013",
        "is_viewed": true,
        "is_clicked": true,
        "is_applied": false
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'recommendation_id' not in data:
            return jsonify({
                'success': False,
                'message': 'recommendation_id is required'
            }), 400
        
        recommendation_id = data['recommendation_id']
        feedback_data = {
            'is_viewed': data.get('is_viewed'),
            'is_clicked': data.get('is_clicked'),
            'is_applied': data.get('is_applied')
        }
        
        # Update feedback
        success = recommendation_engine.update_recommendation_feedback(
            recommendation_id=recommendation_id,
            feedback_data=feedback_data
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Feedback updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to update feedback'
            }), 500
        
    except Exception as e:
        logger.error(f"Error updating feedback: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500


@app.route('/recommendations/similar-jobs', methods=['POST'])
def get_similar_jobs():
    """
    Get similar jobs based on a job
    
    Request body:
    {
        "job_id": "507f1f77bcf86cd799439012",
        "limit": 5
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'job_id' not in data:
            return jsonify({
                'success': False,
                'message': 'job_id is required'
            }), 400
        
        job_id = data['job_id']
        limit = data.get('limit', 5)
        
        logger.info(f"Similar jobs request for job {job_id}")
        
        # Get similar jobs from recommendation engine
        similar_jobs = recommendation_engine.get_similar_jobs(
            job_id=job_id,
            limit=limit
        )
        
        return jsonify({
            'success': True,
            'count': len(similar_jobs),
            'data': similar_jobs
        })
        
    except Exception as e:
        logger.error(f"Error getting similar jobs: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500


@app.route('/model/train', methods=['POST'])
def train_model():
    """
    Train or retrain models
    
    Request body:
    {
        "model_type": "content_based",  // or "collaborative_filtering" or "both"
        "days_back": 180
    }
    """
    try:
        data = request.get_json() or {}
        
        model_type = data.get('model_type', 'both')
        days_back = data.get('days_back', 180)
        
        logger.info(f"Training request: model_type={model_type}, days_back={days_back}")
        
        results = {}
        
        # Train content-based model
        if model_type in ['content_based', 'both']:
            logger.info("Training content-based model...")
            trainer = ModelTrainer(model_type='random_forest', config=config)
            success = trainer.train(days_back=days_back)
            
            if success:
                trainer.save_model()
                results['content_based'] = {
                    'success': True,
                    'metrics': trainer.metadata.get('metrics', {}),
                    'trained_at': trainer.metadata.get('trained_at')
                }
            else:
                results['content_based'] = {
                    'success': False,
                    'message': 'Training failed'
                }
        
        # Train collaborative filtering model
        if model_type in ['collaborative_filtering', 'both']:
            logger.info("Training collaborative filtering model...")
            cf_trainer = CollaborativeFilteringModel(config=config)
            success = cf_trainer.train()
            
            if success:
                cf_trainer.save_model()
                results['collaborative_filtering'] = {
                    'success': True,
                    'trained_at': cf_trainer.metadata.get('trained_at')
                }
            else:
                results['collaborative_filtering'] = {
                    'success': False,
                    'message': 'Training failed'
                }
        
        # Reload models in recommendation engine
        recommendation_engine._load_models()
        
        return jsonify({
            'success': True,
            'message': 'Training completed',
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Error during training: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Training failed',
            'error': str(e)
        }), 500


@app.route('/model/status', methods=['GET'])
def model_status():
    """Get model status and metadata"""
    try:
        status = {
            'content_based': {
                'loaded': recommendation_engine.content_model.model is not None,
                'metadata': recommendation_engine.content_model.metadata
            },
            'collaborative_filtering': {
                'loaded': recommendation_engine.cf_model.user_factors is not None,
                'metadata': recommendation_engine.cf_model.metadata
            }
        }
        
        return jsonify({
            'success': True,
            'data': status
        })
        
    except Exception as e:
        logger.error(f"Error getting model status: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get model status',
            'error': str(e)
        }), 500


@app.route('/statistics', methods=['GET'])
def get_statistics():
    """Get recommendation statistics"""
    try:
        from .database import get_database
        db = get_database()
        db.connect()
        
        # Get counts
        total_recommendations = db.get_collection('airecommendations').count_documents({})
        viewed_recommendations = db.get_collection('airecommendations').count_documents({'is_viewed': True})
        clicked_recommendations = db.get_collection('airecommendations').count_documents({'is_clicked': True})
        applied_recommendations = db.get_collection('airecommendations').count_documents({'is_applied': True})
        
        # Calculate rates
        view_rate = (viewed_recommendations / total_recommendations * 100) if total_recommendations > 0 else 0
        click_rate = (clicked_recommendations / total_recommendations * 100) if total_recommendations > 0 else 0
        apply_rate = (applied_recommendations / total_recommendations * 100) if total_recommendations > 0 else 0
        
        stats = {
            'total_recommendations': total_recommendations,
            'viewed_recommendations': viewed_recommendations,
            'clicked_recommendations': clicked_recommendations,
            'applied_recommendations': applied_recommendations,
            'view_rate': round(view_rate, 2),
            'click_rate': round(click_rate, 2),
            'apply_rate': round(apply_rate, 2)
        }
        
        return jsonify({
            'success': True,
            'data': stats
        })
        
    except Exception as e:
        logger.error(f"Error getting statistics: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'Failed to get statistics',
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500


if __name__ == '__main__':
    app.run(
        host=config.API_HOST,
        port=config.API_PORT,
        debug=config.FLASK_DEBUG
    )
