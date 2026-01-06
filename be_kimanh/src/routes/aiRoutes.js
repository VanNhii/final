const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { AIRecommendation, AIUserPreferences, AIFeedback } = require('../models');

// @desc    Health check for AI service
// @route   GET /api/v1/ai/health
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await aiService.checkHealth();
    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'AI service is unavailable',
      error: error.message
    });
  }
});

// @desc    Get job recommendations for logged-in candidate
// @route   GET /api/v1/ai/recommendations/jobs
// @access  Private (Candidate)
router.get('/recommendations/jobs', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const minScore = req.query.min_score ? parseFloat(req.query.min_score) : 0;
    const options = {
      min_score: minScore,
      location: req.query.location,
      job_type: req.query.job_type
    };

    // Get recommendations from AI service
    let recommendations = await aiService.getJobRecommendations(
      req.user.candidate_id || req.user.id,
      limit * 2, // Request more to account for filtering
      options
    );
    console.log('Job Recommendations (before filter):', recommendations?.length);
 
    // Handle empty recommendations
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No recommendations found. This is normal for newly created users. Please complete your profile with skills and experience.'
      });
    }

    // Apply filters that AI service may not have applied correctly
    if (minScore > 0) {
      recommendations = recommendations.filter(rec => (rec.score || 0) >= minScore);
    }
    if (options.location && options.location.trim()) {
      const locationFilter = options.location.toLowerCase().trim();
      recommendations = recommendations.filter(rec => 
        (rec.location || '').toLowerCase().includes(locationFilter)
      );
    }
    if (options.job_type && options.job_type.trim()) {
      const jobTypeFilter = options.job_type.toLowerCase().trim();
      recommendations = recommendations.filter(rec => 
        (rec.job_type || '').toLowerCase() === jobTypeFilter
      );
    }

    // Limit results after filtering
    recommendations = recommendations.slice(0, limit);
    console.log('Job Recommendations (after filter):', recommendations?.length);

    // Save recommendations to database for tracking (fire and forget, don't block response)
    // Use the AI data directly for response, save to DB in background
    const savePromises = recommendations.map(async (rec) => {
      try {
        const existing = await AIRecommendation.findOne({
          requester_id: req.user.id,
          recommended_entity_id: rec.job_id,
          recommendation_type: 'job_for_candidate'
        });

        if (!existing) {
          // Convert simple string reasons to proper schema format
          const formattedReasons = Array.isArray(rec.reasons) 
            ? rec.reasons.map((reason) => {
                if (typeof reason === 'string') {
                  return {
                    factor: 'skills_match',
                    weight: 0.5,
                    score: rec.score || 0.5,
                    description: reason
                  };
                }
                return reason;
              })
            : [];

          await AIRecommendation.create({
            requester_id: req.user.id,
            requester_type: 'candidate',
            recommendation_type: 'job_for_candidate',
            recommended_entity_id: rec.job_id,
            recommended_entity_type: 'Job',
            score: rec.score,
            confidence: rec.confidence,
            reasons: formattedReasons,
            algorithm_version: rec.algorithm_used || 'v1.0'
          });
        }
      } catch (saveError) {
        console.error('Error saving recommendation:', saveError);
      }
    });

    // Don't wait for saves to complete, process in background
    Promise.all(savePromises).catch(err => console.error('Error saving recommendations:', err));

    // Transform AI service data to frontend-friendly format
    const formattedData = recommendations.map(rec => ({
      _id: rec.job_id, // Use job_id as _id for frontend compatibility
      job_id: rec.job_id,
      title: rec.title || '',
      company_name: rec.company_name || '',
      location: rec.location || '',
      salary_min: rec.salary_min || null,
      salary_max: rec.salary_max || null,
      job_type: rec.job_type || '',
      work_location: rec.work_location || '',
      score: rec.score || 0,
      confidence: rec.confidence || 0,
      reasons: rec.reasons || [],
      algorithm_version: rec.algorithm_used || 'v1.0',
      is_viewed: false,
      is_clicked: false,
      created_at: new Date().toISOString()
    }));

    res.json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    console.error('Error in /recommendations/jobs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get candidate recommendations for a job
// @route   GET /api/v1/ai/recommendations/candidates/:jobId
// @access  Private (Recruiter)
router.get('/recommendations/candidates/:jobId', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const options = {
      min_score: req.query.min_score ? parseFloat(req.query.min_score) : undefined
    };

    // Get recommendations from AI service
    const recommendations = await aiService.getCandidateRecommendations(
      req.params.jobId,
      limit,
      options
    );
    console.log('Candidate Recommendations:', recommendations);

    // Handle empty recommendations
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No candidate recommendations found for this job.'
      });
    }

    // Save recommendations to database for tracking (fire and forget)
    const savePromises = recommendations.map(async (rec) => {
      try {
        const existing = await AIRecommendation.findOne({
          requester_id: req.user.id,
          recommended_entity_id: rec.candidate_id,
          recommendation_type: 'candidate_for_job',
          context_job_id: req.params.jobId
        });

        if (!existing) {
          // Convert simple string reasons to proper schema format
          const formattedReasons = Array.isArray(rec.reasons) 
            ? rec.reasons.map((reason) => {
                if (typeof reason === 'string') {
                  return {
                    factor: 'skills_match',
                    weight: 0.5,
                    score: rec.score || 0.5,
                    description: reason
                  };
                }
                return reason;
              })
            : [];

          await AIRecommendation.create({
            requester_id: req.user.id,
            requester_type: 'recruiter',
            recommendation_type: 'candidate_for_job',
            recommended_entity_id: rec.candidate_id,
            recommended_entity_type: 'Candidate',
            context_job_id: req.params.jobId,
            score: rec.score,
            confidence: rec.confidence,
            reasons: formattedReasons,
            algorithm_version: rec.algorithm_used || 'v1.0'
          });
        }
      } catch (saveError) {
        console.error('Error saving candidate recommendation:', saveError);
      }
    });

    // Don't wait for saves to complete
    Promise.all(savePromises).catch(err => console.error('Error saving candidate recommendations:', err));

    // Transform AI service data to frontend-friendly format
    const formattedData = recommendations.map(rec => ({
      _id: rec.candidate_id, // Use candidate_id as _id for frontend compatibility
      candidate_id: rec.candidate_id,
      experience_years: rec.experience_years || 0,
      education_level: rec.education_level || '',
      skills: rec.skills || [],
      job_status: rec.job_status || '',
      score: rec.score || 0,
      confidence: rec.confidence || 0,
      reasons: rec.reasons || [],
      algorithm_version: rec.algorithm_used || 'v1.0',
      context_job_id: req.params.jobId,
      is_viewed: false,
      is_clicked: false,
      created_at: new Date().toISOString()
    }));

    res.json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get similar jobs
// @route   GET /api/v1/ai/recommendations/similar/:jobId
// @access  Public
router.get('/recommendations/similar/:jobId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const similarJobs = await aiService.getSimilarJobs(req.params.jobId, limit);

    res.json({
      success: true,
      count: Array.isArray(similarJobs) ? similarJobs.length : 0,
      data: Array.isArray(similarJobs) ? similarJobs : []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get personalized job feed
// @route   GET /api/v1/ai/feed
// @access  Private (Candidate)
router.get('/feed', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const feed = await aiService.getPersonalizedJobFeed(
      req.user.candidate_id || req.user.id,
      page,
      limit
    );

    res.json({
      success: true,
      data: feed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Track recommendation interaction
// @route   POST /api/v1/ai/recommendations/:id/interaction
// @access  Private
router.post('/recommendations/:id/interaction', protect, async (req, res) => {
  try {
    const { interaction_type } = req.body; // view, click, apply, reject
    const entityId = req.params.id;

    // Try to find recommendation by _id first, then by recommended_entity_id (job_id/candidate_id)
    let recommendation = await AIRecommendation.findById(entityId);
    
    if (!recommendation) {
      // Try to find by recommended_entity_id (job_id or candidate_id)
      recommendation = await AIRecommendation.findOne({
        requester_id: req.user.id,
        recommended_entity_id: entityId
      });
    }

    if (!recommendation) {
      // If still not found, create a minimal tracking record or just log and return success
      // This can happen if the recommendation was from AI but not yet saved to DB
      console.log(`Recommendation not found for entity ${entityId}, skipping DB update`);
      
      // Still try to send to AI service for learning
      try {
        await aiService.trackRecommendationInteraction(entityId, interaction_type);
      } catch (aiError) {
        console.error('Error sending interaction to AI service:', aiError);
      }

      return res.json({
        success: true,
        message: 'Interaction tracked (recommendation not in DB yet)'
      });
    }

    // Update interaction fields
    switch (interaction_type) {
      case 'view':
        recommendation.is_viewed = true;
        recommendation.viewed_at = new Date();
        break;
      case 'click':
        recommendation.is_clicked = true;
        recommendation.clicked_at = new Date();
        break;
      case 'apply':
        recommendation.is_applied = true;
        recommendation.applied_at = new Date();
        break;
      case 'reject':
        recommendation.is_dismissed = true;
        recommendation.dismissed_at = new Date();
        break;
    }

    await recommendation.save();

    // Send to AI service for learning
    try {
      await aiService.trackRecommendationInteraction(req.params.id, interaction_type);
    } catch (aiError) {
      console.error('Error sending interaction to AI service:', aiError);
    }

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Submit recommendation feedback
// @route   POST /api/v1/ai/recommendations/:id/feedback
// @access  Private
router.post('/recommendations/:id/feedback', protect, async (req, res) => {
  try {
    const { feedback_type, rating, comment } = req.body;

    // Create feedback in database
    const feedback = await AIFeedback.create({
      user_id: req.user.id,
      recommendation_id: req.params.id,
      feedback_type,
      rating,
      comment,
      recommendation_type: 'job_for_candidate'
    });

    // Send to AI service
    await aiService.submitRecommendationFeedback(req.params.id, feedback_type, {
      rating,
      comment
    });

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get or update user preferences
// @route   GET/POST /api/v1/ai/preferences
// @access  Private
router.get('/preferences', protect, async (req, res) => {
  try {
    let preferences = await AIUserPreferences.findOne({ user_id: req.user.id });
    
    if (!preferences) {
      // Create default preferences
      preferences = await AIUserPreferences.create({
        user_id: req.user.id,
        job_preferences: {},
        search_history: [],
        interaction_weights: {}
      });
    }

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/preferences', protect, async (req, res) => {
  try {
    const { job_preferences, notification_preferences } = req.body;

    let preferences = await AIUserPreferences.findOne({ user_id: req.user.id });

    if (!preferences) {
      preferences = await AIUserPreferences.create({
        user_id: req.user.id,
        job_preferences,
        notification_preferences
      });
    } else {
      if (job_preferences) preferences.job_preferences = job_preferences;
      if (notification_preferences) preferences.notification_preferences = notification_preferences;
      await preferences.save();
    }

    // Sync with AI service
    await aiService.updateUserPreferences(req.user.id, {
      job_preferences,
      notification_preferences
    });

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Trigger model training (Admin only)
// @route   POST /api/v1/ai/model/train
// @access  Private/Admin
router.post('/model/train', protect, async (req, res) => {
  try {
    // TODO: Add admin check middleware
    const { force_retrain } = req.body;

    const trainingResult = await aiService.triggerModelTraining({ force_retrain });

    res.json({
      success: true,
      data: trainingResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get model status
// @route   GET /api/v1/ai/model/status
// @access  Private/Admin
router.get('/model/status', protect, async (req, res) => {
  try {
    const status = await aiService.getModelStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get AI statistics
// @route   GET /api/v1/ai/statistics
// @access  Private/Admin
router.get('/statistics', protect, async (req, res) => {
  try {
    const statistics = await aiService.getAIStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
