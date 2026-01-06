const InterviewFeedback = require('../models/InterviewFeedback');

// @desc    Get all interview feedbacks
// @route   GET /api/v1/interview-feedbacks
// @access  Private/Recruiter/Admin
exports.getInterviewFeedbacks = async (req, res, next) => {
  try {
    let query = {};
    
    // Filter by interviewer if recruiter
    if (req.user.role === 'recruiter') {
      query.interviewer_id = req.user.id;
    }
    
    const feedbacks = await InterviewFeedback.find(query)
      .populate('interview_id interviewer_id')
      .sort('-created_at');
    
    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single interview feedback
// @route   GET /api/v1/interview-feedbacks/:id
// @access  Private
exports.getInterviewFeedback = async (req, res, next) => {
  try {
    const feedback = await InterviewFeedback.findById(req.params.id)
      .populate('interview_id interviewer_id');
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Interview feedback not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create interview feedback
// @route   POST /api/v1/interview-feedbacks
// @access  Private/Recruiter
exports.createInterviewFeedback = async (req, res, next) => {
  try {
    req.body.interviewer_id = req.user.id;
    
    const feedback = await InterviewFeedback.create(req.body);
    
    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update interview feedback
// @route   PUT /api/v1/interview-feedbacks/:id
// @access  Private/Recruiter
exports.updateInterviewFeedback = async (req, res, next) => {
  try {
    let feedback = await InterviewFeedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Interview feedback not found'
      });
    }
    
    // Make sure user is feedback owner
    if (feedback.interviewer_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }
    
    feedback = await InterviewFeedback.findByIdAndUpdate(req.params.id, req.body, {
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

// @desc    Delete interview feedback
// @route   DELETE /api/v1/interview-feedbacks/:id
// @access  Private/Recruiter
exports.deleteInterviewFeedback = async (req, res, next) => {
  try {
    const feedback = await InterviewFeedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Interview feedback not found'
      });
    }
    
    // Make sure user is feedback owner
    if (feedback.interviewer_id.toString() !== req.user.id && req.user.role !== 'admin') {
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
