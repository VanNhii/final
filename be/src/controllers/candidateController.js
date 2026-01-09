const Candidate = require('../models/Candidate');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const { getPaginationParams, buildPaginationResponse, applyPagination, getSearchParams, getDateRangeFilter } = require('../utils/pagination');
const User = require('../models/User');
const { syncCandidateToAI } = require('../utils/aiSync');

// @desc    Get all candidates
// @route   GET /api/v1/candidates
// @access  Private/Admin/Recruiter
exports.getCandidates = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);

    const candidatesQuery = Candidate.find(searchFilters)
      .populate('user_id', 'first_name last_name email phone avatar_url')
      .sort('-created_at');

    const candidates = await applyPagination(candidatesQuery, page, limit, skip);
    const total = await Candidate.countDocuments(searchFilters);

    res.status(200).json(buildPaginationResponse(candidates, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single candidate
// @route   GET /api/v1/candidates/:id
// @access  Private
exports.getCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('user_id', 'first_name last_name email phone avatar_url')
      .populate('applications');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create candidate
// @route   POST /api/v1/candidates
// @access  Private/Candidate
exports.createCandidate = async (req, res, next) => {
  try {
    // Add user ID from authenticated user
    req.body.user_id = req.user.id;

    const candidate = await Candidate.create(req.body);

    res.status(201).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update candidate
// @route   PUT /api/v1/candidates/:id
// @access  Private/Candidate
exports.updateCandidate = async (req, res, next) => {
  try {
    let candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Make sure user is candidate owner
    if (candidate.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this candidate'
      });
    }

    candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user_id', 'first_name last_name email phone avatar_url');

    res.status(200).json({
      success: true,
      data: candidate
    });

    // Start RAG Sync (async)
    syncCandidateToAI(candidate._id.toString());
  } catch (error) {
    next(error);
  }
};

// @desc    Delete candidate
// @route   DELETE /api/v1/candidates/:id
// @access  Private/Candidate
exports.deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Make sure user is candidate owner
    if (candidate.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this candidate'
      });
    }

    await candidate.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });

    // Start RAG Sync (async)
    syncCandidateToAI(candidate._id.toString());
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidate profile (own profile)
// @route   GET /api/candidates/profile
// @access  Private/Candidate
exports.getCandidateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let candidate = await Candidate.findOne({ user_id: req.user.id })
      .populate('user_id', 'first_name last_name email phone avatar_url');

    // Auto-create candidate profile if not exists
    if (!candidate) {
      candidate = await Candidate.create({ user_id: req.user.id });
      await candidate.populate('user_id', 'first_name last_name email phone avatar_url');
    }

    res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update candidate profile
// @route   PUT /api/candidates/profile
// @access  Private/Candidate
exports.updateCandidateProfile = async (req, res, next) => {
  try {
    let candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      // Create candidate profile if not exists
      req.body.user_id = req.user.id;
      candidate = await Candidate.create(req.body);
    } else {
      candidate = await Candidate.findByIdAndUpdate(candidate._id, req.body, {
        new: true,
        runValidators: true
      });
    }

    await candidate.populate('user_id', 'first_name last_name email phone avatar_url');

    res.status(200).json({
      success: true,
      data: candidate
    });

    // Start RAG Sync (async)
    syncCandidateToAI(candidate._id.toString());
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidate applications
// @route   GET /api/candidates/applications
// @access  Private/Candidate
exports.getCandidateApplications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status } = req.query;

    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    const query = { candidate_id: candidate._id };
    if (status) query.application_status = status;

    const applicationsQuery = Application.find(query)
      .populate('job_id', 'title company_name salary_min salary_max location work_location')
      .populate({
        path: 'job_id',
        populate: {
          path: 'recruiter_id',
          select: 'company_name company_logo_url'
        }
      })
      .sort('-created_at');

    const applications = await applyPagination(applicationsQuery, page, limit, skip);
    const total = await Application.countDocuments(query);

    res.status(200).json(buildPaginationResponse(applications, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidate interviews
// @route   GET /api/candidates/interviews
// @access  Private/Candidate
exports.getCandidateInterviews = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const dateFilters = getDateRangeFilter(req);
    const { status } = req.query;

    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    const query = {
      candidate_id: candidate._id,
      ...dateFilters
    };

    if (status) query.interview_status = status;

    const interviewsQuery = Interview.find(query)
      .populate({
        path: 'application_id',
        select: 'application_status',
        populate: {
          path: 'job_id',
          select: 'title company_name salary_min salary_max location'
        }
      })
      .populate({
        path: 'recruiter_id',
        select: 'company_name company_logo_url user_id',
        populate: {
          path: 'user_id',
          select: 'full_name email phone'
        }
      })
      .sort('interview_date');

    const interviews = await applyPagination(interviewsQuery, page, limit, skip);
    const total = await Interview.countDocuments(query);

    res.status(200).json(buildPaginationResponse(interviews, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Search jobs for candidate
// @route   GET /api/candidates/jobs/search
// @access  Private/Candidate
exports.searchJobs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    const { category, job_type, work_location, salary_min, salary_max, location } = req.query;

    const query = {
      is_active: true,
      status: 'approved',
      ...searchFilters
    };

    // Additional filters
    if (category) query.categories = category;
    if (job_type) query.job_type = job_type;
    if (work_location) query.work_location = work_location;
    if (location) query['location.city'] = { $regex: location, $options: 'i' };

    if (salary_min) {
      query.salary_min = { $gte: parseInt(salary_min) };
    }

    if (salary_max) {
      query.salary_max = { $lte: parseInt(salary_max) };
    }

    const jobsQuery = Job.find(query)
      .populate('category_id', 'name')
      .populate('recruiter_id', 'company_name company_logo_url industry')
      .select('-applications -interviews')
      .sort('-created_at');

    const jobs = await applyPagination(jobsQuery, page, limit, skip);
    const total = await Job.countDocuments(query);

    res.status(200).json(buildPaginationResponse(jobs, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidate dashboard
// @route   GET /api/candidates/dashboard
// @access  Private/Candidate
exports.getCandidateDashboard = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Get basic stats
    const [
      totalApplications,
      pendingApplications,
      acceptedApplications,
      rejectedApplications,
      totalInterviews,
      upcomingInterviews
    ] = await Promise.all([
      Application.countDocuments({ candidate_id: candidate._id }),
      Application.countDocuments({ candidate_id: candidate._id, application_status: 'pending' }),
      Application.countDocuments({ candidate_id: candidate._id, application_status: 'accepted' }),
      Application.countDocuments({ candidate_id: candidate._id, application_status: 'rejected' }),
      Interview.countDocuments({ candidate_id: candidate._id }),
      Interview.countDocuments({
        candidate_id: candidate._id,
        interview_date: { $gte: new Date() },
        interview_status: 'scheduled'
      })
    ]);

    // Get recent applications
    const recentApplications = await Application.find({
      candidate_id: candidate._id
    })
      .populate('job_id', 'title company_name')
      .populate({
        path: 'job_id',
        populate: {
          path: 'recruiter_id',
          select: 'company_name company_logo_url'
        }
      })
      .sort('-created_at')
      .limit(5);

    // Get recommended jobs (basic implementation)
    const recommendedJobs = await Job.find({
      is_active: true,
      status: 'approved'
    })
      .populate('category_id', 'name')
      .populate('recruiter_id', 'company_name company_logo_url')
      .sort('-created_at')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalApplications,
          pendingApplications,
          acceptedApplications,
          rejectedApplications,
          totalInterviews,
          upcomingInterviews
        },
        recentApplications,
        recommendedJobs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidate notifications
// @route   GET /api/candidates/notifications
// @access  Private/Candidate
exports.getCandidateNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { is_read } = req.query;

    const query = { user_id: req.user.id };
    if (is_read !== undefined) query.is_read = is_read === 'true';

    const notificationsQuery = Notification.find(query)
      .sort('-created_at');

    const notifications = await applyPagination(notificationsQuery, page, limit, skip);
    const total = await Notification.countDocuments(query);

    // Mark as read if requested
    if (req.query.mark_as_read === 'true') {
      await Notification.updateMany(
        { user_id: req.user.id, is_read: false },
        { is_read: true, read_at: new Date() }
      );
    }

    res.status(200).json(buildPaginationResponse(notifications, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// ==================== EXPERIENCE MANAGEMENT ====================

// @desc    Get candidate experiences
// @route   GET /api/candidates/experiences
// @access  Private/Candidate
exports.getCandidateExperiences = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Sort experiences by start_date (newest first)
    const experiences = candidate.experience.sort((a, b) =>
      new Date(b.start_date) - new Date(a.start_date)
    );

    res.status(200).json({
      success: true,
      data: experiences
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add candidate experience
// @route   POST /api/candidates/experiences
// @access  Private/Candidate
exports.addCandidateExperience = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Add new experience to embedded array
    candidate.experience.push(req.body);
    await candidate.save();

    // Return the newly added experience
    const newExperience = candidate.experience[candidate.experience.length - 1];

    res.status(201).json({
      success: true,
      data: newExperience
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update candidate experience
// @route   PUT /api/candidates/experiences/:experienceId
// @access  Private/Candidate
exports.updateCandidateExperience = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Find experience in embedded array
    const experienceIndex = candidate.experience.findIndex(
      exp => exp._id.toString() === req.params.experienceId
    );

    if (experienceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found'
      });
    }

    // Update experience
    Object.assign(candidate.experience[experienceIndex], req.body);
    await candidate.save();

    res.status(200).json({
      success: true,
      data: candidate.experience[experienceIndex]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete candidate experience
// @route   DELETE /api/candidates/experiences/:experienceId
// @access  Private/Candidate
exports.deleteCandidateExperience = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Remove experience from embedded array
    candidate.experience = candidate.experience.filter(
      exp => exp._id.toString() !== req.params.experienceId
    );

    await candidate.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// ==================== EDUCATION MANAGEMENT ====================

// @desc    Get candidate educations
// @route   GET /api/candidates/educations
// @access  Private/Candidate
exports.getCandidateEducations = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Sort educations by start_date (newest first)
    const educations = candidate.education.sort((a, b) =>
      new Date(b.start_date) - new Date(a.start_date)
    );

    res.status(200).json({
      success: true,
      data: educations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add candidate education
// @route   POST /api/candidates/educations
// @access  Private/Candidate
exports.addCandidateEducation = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Add new education to embedded array
    candidate.education.push(req.body);
    await candidate.save();

    // Return the newly added education
    const newEducation = candidate.education[candidate.education.length - 1];

    res.status(201).json({
      success: true,
      data: newEducation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update candidate education
// @route   PUT /api/candidates/educations/:educationId
// @access  Private/Candidate
exports.updateCandidateEducation = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Find education in embedded array
    const educationIndex = candidate.education.findIndex(
      edu => edu._id.toString() === req.params.educationId
    );

    if (educationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Education not found'
      });
    }

    // Update education
    Object.assign(candidate.education[educationIndex], req.body);
    await candidate.save();

    res.status(200).json({
      success: true,
      data: candidate.education[educationIndex]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete candidate education
// @route   DELETE /api/candidates/educations/:educationId
// @access  Private/Candidate
exports.deleteCandidateEducation = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Remove education from embedded array
    candidate.education = candidate.education.filter(
      edu => edu._id.toString() !== req.params.educationId
    );

    await candidate.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SKILL MANAGEMENT ====================

// @desc    Get candidate skills
// @route   GET /api/candidates/skills
// @access  Private/Candidate
exports.getCandidateSkills = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Sort skills by name
    const skills = candidate.skills_detailed.sort((a, b) =>
      a.skill_name.localeCompare(b.skill_name)
    );

    res.status(200).json({
      success: true,
      data: skills
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add candidate skill
// @route   POST /api/candidates/skills
// @access  Private/Candidate
exports.addCandidateSkill = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Check if skill already exists
    const existingSkill = candidate.skills_detailed.find(
      skill => skill.skill_name.toLowerCase() === req.body.skill_name.toLowerCase()
    );

    if (existingSkill) {
      return res.status(400).json({
        success: false,
        message: 'Skill already exists'
      });
    }

    // Add new skill to embedded array
    candidate.skills_detailed.push(req.body);
    await candidate.save();

    // Return the newly added skill
    const newSkill = candidate.skills_detailed[candidate.skills_detailed.length - 1];

    res.status(201).json({
      success: true,
      data: newSkill
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update candidate skill
// @route   PUT /api/candidates/skills/:skillId
// @access  Private/Candidate
exports.updateCandidateSkill = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Find skill in embedded array
    const skillIndex = candidate.skills_detailed.findIndex(
      skill => skill._id.toString() === req.params.skillId
    );

    if (skillIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Skill not found'
      });
    }

    // Check if skill name is being changed and already exists
    if (req.body.skill_name && req.body.skill_name.toLowerCase() !== candidate.skills_detailed[skillIndex].skill_name.toLowerCase()) {
      const existingSkill = candidate.skills_detailed.find(
        (skill, index) => index !== skillIndex && skill.skill_name.toLowerCase() === req.body.skill_name.toLowerCase()
      );

      if (existingSkill) {
        return res.status(400).json({
          success: false,
          message: 'Skill name already exists'
        });
      }
    }

    // Update skill
    Object.assign(candidate.skills_detailed[skillIndex], req.body);
    await candidate.save();

    res.status(200).json({
      success: true,
      data: candidate.skills_detailed[skillIndex]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete candidate skill
// @route   DELETE /api/candidates/skills/:skillId
// @access  Private/Candidate
exports.deleteCandidateSkill = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Remove skill from embedded array
    candidate.skills_detailed = candidate.skills_detailed.filter(
      skill => skill._id.toString() !== req.params.skillId
    );

    await candidate.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// ==================== JOB APPLICATION MANAGEMENT ====================

// @desc    Apply for a job
// @route   POST /api/candidates/jobs/:jobId/apply
// @access  Private/Candidate
exports.applyForJob = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Check if job exists
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      job_id: req.params.jobId,
      candidate_id: candidate._id
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Create application
    const applicationData = {
      job_id: req.params.jobId,
      candidate_id: candidate._id,
      cover_letter: req.body.cover_letter,
      cv_url: req.body.cv_url || candidate.cv_url
    };

    // Validate CV is available
    if (!applicationData.cv_url) {
      return res.status(400).json({
        success: false,
        message: 'CV is required for application. Please upload your CV in your profile first.'
      });
    }

    const application = await Application.create(applicationData);

    // Populate application data
    await application.populate([
      { path: 'job_id', select: 'title company_name' },
      { path: 'candidate_id', select: 'bio experience_years' }
    ]);

    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw job application
// @route   DELETE /api/candidates/applications/:applicationId/withdraw
// @access  Private/Candidate
exports.withdrawApplication = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    const application = await Application.findById(req.params.applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check ownership
    if (application.candidate_id.toString() !== candidate._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to withdraw this application'
      });
    }

    // Check if application can be withdrawn
    if (application.application_status === 'accepted' || application.application_status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw application that has been processed'
      });
    }

    await application.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get saved/bookmarked jobs
// @route   GET /api/candidates/jobs/saved
// @access  Private/Candidate
exports.getSavedJobs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Get saved job IDs
    const savedJobIds = candidate.saved_jobs || [];

    if (savedJobIds.length === 0) {
      return res.status(200).json(buildPaginationResponse([], 0, page, limit));
    }

    const jobsQuery = Job.find({
      _id: { $in: savedJobIds },
      is_active: true
    })
      .sort('-created_at');

    const jobs = await applyPagination(jobsQuery, page, limit, skip);
    const total = await Job.countDocuments({
      _id: { $in: savedJobIds },
      is_active: true
    });

    res.status(200).json(buildPaginationResponse(jobs, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Save/bookmark a job
// @route   POST /api/candidates/jobs/:jobId/save
// @access  Private/Candidate
exports.saveJob = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Check if job exists
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Initialize saved_jobs if not exists
    if (!candidate.saved_jobs) {
      candidate.saved_jobs = [];
    }

    // Check if already saved
    if (candidate.saved_jobs.includes(req.params.jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Job already saved'
      });
    }

    // Add to saved jobs
    candidate.saved_jobs.push(req.params.jobId);
    await candidate.save();

    res.status(200).json({
      success: true,
      message: 'Job saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unsave/unbookmark a job
// @route   DELETE /api/candidates/jobs/:jobId/unsave
// @access  Private/Candidate
exports.unsaveJob = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Remove from saved jobs
    if (candidate.saved_jobs) {
      candidate.saved_jobs = candidate.saved_jobs.filter(
        jobId => jobId.toString() !== req.params.jobId
      );
      await candidate.save();
    }

    res.status(200).json({
      success: true,
      message: 'Job unsaved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update salary expectation
// @route   PUT /api/candidates/salary-expectation
// @access  Private/Candidate
exports.updateSalaryExpectation = async (req, res, next) => {
  try {
    const { min, max, currency } = req.body;

    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Validate salary range
    if (min && max && min > max) {
      return res.status(400).json({
        success: false,
        message: 'Minimum salary cannot be greater than maximum salary'
      });
    }

    candidate.salary_expectation = {
      min: min || candidate.salary_expectation?.min,
      max: max || candidate.salary_expectation?.max,
      currency: currency || candidate.salary_expectation?.currency || 'VND'
    };

    await candidate.save();

    res.status(200).json({
      success: true,
      data: candidate.salary_expectation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job status
// @route   PUT /api/candidates/job-status
// @access  Private/Candidate
exports.updateJobStatus = async (req, res, next) => {
  try {
    const { job_status } = req.body;

    if (!['seeking', 'employed', 'not_seeking'].includes(job_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job status. Must be: seeking, employed, or not_seeking'
      });
    }

    const candidate = await Candidate.findOne({ user_id: req.user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    candidate.job_status = job_status;
    await candidate.save();

    res.status(200).json({
      success: true,
      data: { job_status: candidate.job_status }
    });
  } catch (error) {
    next(error);
  }
};
