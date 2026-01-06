const Application = require('../models/Application');
const { getPaginationParams, buildPaginationResponse, applyPagination } = require('../utils/pagination');

// @desc    Get all applications
// @route   GET /api/v1/applications
// @access  Private
exports.getApplications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    let query = {};
    
    // Filter by user role
    if (req.user.role === 'candidate') {
      const candidate = await require('../models/Candidate').findOne({ user_id: req.user.id });
      if (candidate) {
        query.candidate_id = candidate._id;
      }
    } else if (req.user.role === 'recruiter') {
      const recruiter = await require('../models/Recruiter').findOne({ user_id: req.user.id });
      if (recruiter) {
        const jobs = await require('../models/Job').find({ recruiter_id: recruiter._id }).select('_id');
        query.job_id = { $in: jobs.map(job => job._id) };
      }
    }
    
    // Additional filters
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    const applicationsQuery = Application.find(query)
      .populate('job_id', 'title company_name')
      .populate({
        path: 'candidate_id',
        select: 'bio experience_years',
        populate: {
          path: 'user_id',
          select: 'first_name last_name email phone avatar_url'
        }
      });
    
    const applications = await applyPagination(applicationsQuery, page, limit, skip);
    const total = await Application.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(applications, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single application
// @route   GET /api/v1/applications/:id
// @access  Private
exports.getApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('status_history interviews')
      .populate({
        path: 'candidate_id',
        select: 'skills experience education desired_position bio experience_years',
        populate: {
          path: 'user_id',
          select: 'first_name last_name email phone avatar_url'
        }
      })
      .populate({
        path: 'job_id',
        select: 'title description requirements salary_range location employment_type',
        populate: {
          path: 'recruiter_id',
          select: 'company_name company_description',
          populate: {
            path: 'user_id',
            select: 'first_name last_name email phone'
          }
        }
      });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create application
// @route   POST /api/v1/applications
// @access  Private/Candidate
exports.createApplication = async (req, res, next) => {
  try {
    // Get candidate
    const candidate = await require('../models/Candidate').findOne({ user_id: req.user.id });
    
    if (!candidate) {
      return res.status(400).json({
        success: false,
        message: 'User is not a candidate'
      });
    }
    
    // Check if already applied
    const existingApplication = await Application.findOne({
      job_id: req.body.job_id,
      candidate_id: candidate._id
    });
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }
    
    req.body.candidate_id = candidate._id;
    
    const application = await Application.create(req.body);
    
    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application status
// @route   PUT /api/v1/applications/:id/status
// @access  Private/Recruiter
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Get new status from request body (try both status and application_status)
    const newStatus = req.body.status || req.body.application_status;
    
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Create status history record
    const oldStatus = application.application_status;
    
    if (oldStatus !== newStatus) {
      await require('../models/ApplicationStatusHistory').create({
        application_id: application._id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: req.user.id,
        change_reason: req.body.change_reason
      });
    }
    
    const updatedApplication = await Application.findByIdAndUpdate(
      req.params.id, 
      {
        application_status: newStatus,
        reviewed_at: new Date(),
        interviewer_notes: req.body.interviewer_notes,
        rejection_reason: req.body.rejection_reason
      },
      {
        new: true,
        runValidators: true
      }
    ).populate({
      path: 'candidate_id',
      select: 'skills experience education desired_position',
      populate: {
        path: 'user_id',
        select: 'first_name last_name email phone avatar_url'
      }
    }).populate({
      path: 'job_id',
      select: 'title description requirements salary_range location employment_type',
      populate: {
        path: 'recruiter_id',
        select: 'company_name company_description',
        populate: {
          path: 'user_id',
          select: 'first_name last_name email phone'
        }
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedApplication
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete application
// @route   DELETE /api/v1/applications/:id
// @access  Private/Candidate
exports.deleteApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Get candidate
    const candidate = await require('../models/Candidate').findOne({ user_id: req.user.id });
    
    // Make sure user is application owner
    if (application.candidate_id.toString() !== candidate._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this application'
      });
    }
    
    await application.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
