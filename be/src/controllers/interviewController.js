const Interview = require('../models/Interview');
const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const { getPaginationParams, buildPaginationResponse, applyPagination } = require('../utils/pagination');

// @desc    Get all interviews
// @route   GET /api/v1/interviews
// @access  Private
exports.getInterviews = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    let query = {};
    
    // Filter by user role
    if (req.user.role === 'candidate') {
      const candidate = await Candidate.findOne({ user_id: req.user.id });
      if (candidate) {
        query.candidate_id = candidate._id;
      }
    } else if (req.user.role === 'recruiter') {
      const recruiter = await Recruiter.findOne({ user_id: req.user.id });
      if (recruiter) {
        query.recruiter_id = recruiter._id;
      }
    }
    
    // Additional filters
    if (req.query.status) {
      query.interview_status = req.query.status;
    }
    
    const interviewsQuery = Interview.find(query)
      .populate('feedback')
      .sort('interview_date');
    
    const interviews = await applyPagination(interviewsQuery, page, limit, skip);
    const total = await Interview.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(interviews, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single interview
// @route   GET /api/v1/interviews/:id
// @access  Private
exports.getInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('feedback');
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    // Check if user has access to this interview
    if (req.user.role === 'candidate') {
      const candidate = await Candidate.findOne({ user_id: req.user.id });
      if (interview.candidate_id._id.toString() !== candidate._id.toString()) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to view this interview'
        });
      }
    } else if (req.user.role === 'recruiter') {
      const recruiter = await Recruiter.findOne({ user_id: req.user.id });
      if (interview.recruiter_id._id.toString() !== recruiter._id.toString()) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to view this interview'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create interview
// @route   POST /api/v1/interviews
// @access  Private/Recruiter
exports.createInterview = async (req, res, next) => {
  try {
    // Get recruiter
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(400).json({
        success: false,
        message: 'User is not a recruiter'
      });
    }
    
    req.body.recruiter_id = recruiter._id;
    
    const interview = await Interview.create(req.body);
    
    res.status(201).json({
      success: true,
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update interview
// @route   PUT /api/v1/interviews/:id
// @access  Private/Recruiter
exports.updateInterview = async (req, res, next) => {
  try {
    let interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    // Get recruiter
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    // Make sure user is interview owner
    if (interview.recruiter_id.toString() !== recruiter._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this interview'
      });
    }
    
    interview = await Interview.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete interview
// @route   DELETE /api/v1/interviews/:id
// @access  Private/Recruiter
exports.deleteInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }
    
    // Get recruiter
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    console.log('Recruiter:', recruiter._id , "---", interview.recruiter_id._id);
    // Make sure user is interview owner
    if (interview.recruiter_id._id.toString() !== recruiter._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this interview'
      });
    }
    
    await interview.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
