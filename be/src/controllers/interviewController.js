const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const { createInterviewNotification } = require('../utils/notificationHelper');
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
    const recruiter = await Recruiter.findOne({ user_id: req.user.id })
      .populate('user_id', 'first_name last_name');

    if (!recruiter) {
      return res.status(400).json({
        success: false,
        message: 'User is not a recruiter'
      });
    }

    req.body.recruiter_id = recruiter._id;

    const interview = await Interview.create(req.body);

    // Populate interview with candidate and job details for notification
    const populatedInterview = await Interview.findById(interview._id)
      .populate({
        path: 'candidate_id',
        populate: {
          path: 'user_id',
          select: '_id first_name last_name'
        }
      })
      .populate({
        path: 'application_id',
        populate: {
          path: 'job_id',
          select: 'title'
        }
      });

    // Send notification to candidate
    if (populatedInterview.candidate_id?.user_id?._id) {
      try {
        const { notifyCandidateInterviewScheduled } = require('../utils/notificationHelper');
        const interviewDate = new Date(interview.interview_date).toLocaleDateString('vi-VN');
        const interviewTime = interview.interview_time || '';

        await notifyCandidateInterviewScheduled({
          candidateUserId: populatedInterview.candidate_id.user_id._id,
          jobTitle: populatedInterview.application_id?.job_id?.title || 'Vị trí ứng tuyển',
          companyName: recruiter.company_name || 'Công ty',
          interviewDate,
          interviewTime,
          interviewType: interview.interview_type,
          interviewId: interview._id
        });
      } catch (notifyError) {
        console.error('Failed to send interview notification:', notifyError);
      }
    }

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

// @desc    Confirm interview attendance (Candidate)
// @route   PUT /api/v1/interviews/:id/confirm
// @access  Private/Candidate
exports.confirmInterview = async (req, res, next) => {
  try {
    const { message } = req.body;
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Verify user is the candidate for this interview
    const candidate = await Candidate.findOne({ user_id: req.user.id });
    if (!candidate || interview.candidate_id.toString() !== candidate._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to confirm this interview'
      });
    }

    if (interview.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Can only confirm scheduled interviews'
      });
    }

    interview.candidate_confirmation = {
      is_confirmed: true,
      message: message || '',
      confirmed_at: new Date()
    };

    await interview.save();

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
    console.log('Recruiter:', recruiter._id, "---", interview.recruiter_id._id);
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

// @desc    Confirm interview (candidate)
// @route   PUT /api/v1/interviews/:id/confirm
// @access  Private/Candidate
exports.confirmInterview = async (req, res, next) => {
  try {
    // Populate all needed data for notification
    const interview = await Interview.findById(req.params.id)
      .populate({
        path: 'candidate_id',
        populate: { path: 'user_id', select: 'first_name last_name email' }
      })
      .populate({
        path: 'recruiter_id',
        populate: { path: 'user_id', select: '_id' }
      })
      .populate({
        path: 'application_id',
        populate: { path: 'job_id', select: 'title' }
      });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Verify candidate owns this interview
    const candidate = await Candidate.findOne({ user_id: req.user.id });
    if (!candidate) {
      return res.status(403).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Handle both populated and non-populated candidate_id
    const interviewCandidateId = interview.candidate_id._id
      ? interview.candidate_id._id.toString()
      : interview.candidate_id.toString();

    if (interviewCandidateId !== candidate._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this interview'
      });
    }

    // Update status to scheduled and confirmation
    interview.status = 'scheduled';
    interview.candidate_confirmation = {
      status: 'confirmed',
      is_confirmed: true,
      message: req.body.message || '',
      confirmed_at: new Date()
    };

    await interview.save();

    // Send notification to recruiter
    try {
      const candidateName = `${interview.candidate_id.user_id?.first_name || ''} ${interview.candidate_id.user_id?.last_name || ''}`.trim() || 'Ứng viên';
      const jobTitle = interview.application_id?.job_id?.title || 'Vị trí ứng tuyển';
      const interviewDate = new Date(interview.interview_date).toLocaleDateString('vi-VN');

      await createInterviewNotification({
        recruiterId: interview.recruiter_id.user_id._id,
        candidateName,
        jobTitle,
        interviewDate,
        interviewTime: interview.interview_time,
        type: 'confirmed',
        interviewId: interview._id,
        candidateMessage: req.body.message
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      data: interview,
      message: 'Interview confirmed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject interview (candidate)
// @route   PUT /api/v1/interviews/:id/reject
// @access  Private/Candidate
exports.rejectInterview = async (req, res, next) => {
  try {
    // Populate all needed data for notification before deleting
    const interview = await Interview.findById(req.params.id)
      .populate({
        path: 'candidate_id',
        populate: { path: 'user_id', select: 'first_name last_name email' }
      })
      .populate({
        path: 'recruiter_id',
        populate: { path: 'user_id', select: '_id' }
      })
      .populate({
        path: 'application_id',
        populate: { path: 'job_id', select: 'title' }
      });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found'
      });
    }

    // Verify candidate owns this interview
    const candidate = await Candidate.findOne({ user_id: req.user.id });
    if (!candidate) {
      return res.status(403).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Handle both populated and non-populated candidate_id
    const interviewCandidateId = interview.candidate_id._id
      ? interview.candidate_id._id.toString()
      : interview.candidate_id.toString();

    if (interviewCandidateId !== candidate._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this interview'
      });
    }

    // Get info for notification before deleting
    const candidateName = `${interview.candidate_id.user_id?.first_name || ''} ${interview.candidate_id.user_id?.last_name || ''}`.trim() || 'Ứng viên';
    const jobTitle = interview.application_id?.job_id?.title || 'Vị trí ứng tuyển';
    const interviewDate = new Date(interview.interview_date).toLocaleDateString('vi-VN');
    const interviewTime = interview.interview_time;
    const recruiterId = interview.recruiter_id.user_id._id;
    const interviewId = interview._id;
    const candidateMessage = req.body.message;

    // Send notification to recruiter
    try {
      await createInterviewNotification({
        recruiterId,
        candidateName,
        jobTitle,
        interviewDate,
        interviewTime,
        type: 'rejected',
        interviewId,
        candidateMessage
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Delete the interview from database
    await interview.deleteOne();
    console.log(`✅ Interview ${interviewId} deleted after rejection`);

    res.status(200).json({
      success: true,
      message: 'Interview rejected and deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update interview status
// @route   PUT /api/v1/interviews/:id/status
// @access  Private/Recruiter
exports.updateInterviewStatus = async (req, res, next) => {
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

    if (!recruiter) {
      return res.status(403).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Check authorization - handle both populated and non-populated recruiter_id
    const interviewRecruiterId = interview.recruiter_id._id
      ? interview.recruiter_id._id.toString()
      : interview.recruiter_id.toString();

    if (interviewRecruiterId !== recruiter._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this interview'
      });
    }

    // Validate status
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Update status
    interview.status = req.body.status;
    await interview.save();

    res.status(200).json({
      success: true,
      data: interview,
      message: 'Interview status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
