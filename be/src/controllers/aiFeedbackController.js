const AIFeedback = require('../models/AIFeedback');
const { getPaginationParams, buildPaginationResponse, applyPagination } = require('../utils/pagination');

// @desc    Create AI feedback
// @route   POST /api/v1/ai-feedback
// @access  Private
exports.createAIFeedback = async (req, res, next) => {
  try {
    req.body.user_id = req.user.id;
    
    const feedback = await AIFeedback.create(req.body);
    
    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's AI feedback
// @route   GET /api/v1/ai-feedback
// @access  Private
exports.getUserAIFeedback = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { recommendation_type, feedback_type } = req.query;
    
    const query = { user_id: req.user.id };
    if (recommendation_type) query.recommendation_type = recommendation_type;
    if (feedback_type) query.feedback_type = feedback_type;
    
    const feedbackQuery = AIFeedback.find(query)
      .populate('recommendation_id')
      .sort('-created_at');
    
    const feedback = await applyPagination(feedbackQuery, page, limit, skip);
    const total = await AIFeedback.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(feedback, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Update AI feedback
// @route   PUT /api/v1/ai-feedback/:id
// @access  Private
exports.updateAIFeedback = async (req, res, next) => {
  try {
    let feedback = await AIFeedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'AI feedback not found'
      });
    }
    
    // Check ownership
    if (feedback.user_id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }
    
    feedback = await AIFeedback.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete AI feedback
// @route   DELETE /api/v1/ai-feedback/:id
// @access  Private
exports.deleteAIFeedback = async (req, res, next) => {
  try {
    const feedback = await AIFeedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'AI feedback not found'
      });
    }
    
    // Check ownership
    if (feedback.user_id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this feedback'
      });
    }
    
    await feedback.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI feedback analytics (Admin only)
// @route   GET /api/v1/ai-feedback/analytics
// @access  Private/Admin
exports.getAIFeedbackAnalytics = async (req, res, next) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    // Feedback by type
    const feedbackByType = await AIFeedback.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      { $group: { _id: '$feedback_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Feedback by recommendation type
    const feedbackByRecType = await AIFeedback.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      { $group: { _id: '$recommendation_type', count: { $sum: 1 } } }
    ]);
    
    // Average rating
    const avgRating = await AIFeedback.aggregate([
      { $match: { created_at: { $gte: startDate }, rating: { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    
    // Processing status
    const processingStatus = await AIFeedback.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      { $group: { _id: '$is_processed', count: { $sum: 1 } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: `${period} days`,
        feedbackByType,
        feedbackByRecType,
        averageRating: avgRating[0]?.avgRating || 0,
        processingStatus,
        totalFeedback: feedbackByType.reduce((sum, item) => sum + item.count, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};