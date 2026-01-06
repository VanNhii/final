const Job = require('../models/Job');
const Recruiter = require('../models/Recruiter');
const { getPaginationParams, buildPaginationResponse, applyPagination, getSearchParams } = require('../utils/pagination');
const { incrementFeaturedJob } = require('../middleware/subscription');

// @desc    Get all jobs
// @route   GET /api/v1/jobs
// @access  Public
exports.getJobs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    console.log("Chạy tới đây",searchFilters)
    
    // Base query for active jobs
    const query = { is_active: true, status: 'approved', ...searchFilters };
    
    // Additional filters
    if (req.query.category) {
      query.categories = req.query.category;
    }
    
    if (req.query.job_type) {
      query.job_type = req.query.job_type;
    }
    
    if (req.query.work_location) {
      query.work_location = req.query.work_location;
    }
    
    if (req.query.salary_min) {
      query.salary_min = { $gte: parseInt(req.query.salary_min) };
    }
    
    if (req.query.salary_max) {
      query.salary_max = { $lte: parseInt(req.query.salary_max) };
    }
    
    // Location filter
    if (req.query.location) {
      query['location.city'] = { $regex: req.query.location, $options: 'i' };
    }
    console.log("Query",query)
    
    const jobsQuery = Job.find(query)
      .populate('categories', 'name')
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

// @desc    Get single job
// @route   GET /api/v1/jobs/:id
// @access  Public
exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('categories', 'name')
      .populate({
        path: 'recruiter_id',
        select: 'company_name company_description company_logo_url industry website company_size',
        populate: {
          path: 'user_id',
          select: 'first_name last_name email phone'
        }
      })
      .populate({
        path: 'applications',
        select: 'candidate_id application_status created_at',
        populate: {
          path: 'candidate_id',
          select: 'bio experience_years',
          populate: {
            path: 'user_id',
            select: 'first_name last_name email phone avatar_url'
          }
        }
      });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Only show applications to job owner or admin
    if (req.user && (req.user.role === 'admin' || 
        (req.user.role === 'recruiter' && job.recruiter_id?.user_id?._id?.toString() === req.user.id))) {
      // Keep applications
    } else {
      // Hide applications from public view
      job.applications = undefined;
    }
    
    // Increment view count
    await Job.findByIdAndUpdate(req.params.id, { $inc: { views_count: 1 } });
    
    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create job
// @route   POST /api/v1/jobs
// @access  Private/Recruiter
exports.createJob = async (req, res, next) => {
  try {
    // Add recruiter ID from authenticated user
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(400).json({
        success: false,
        message: 'User is not a recruiter'
      });
    }
    
    req.body.recruiter_id = recruiter._id;
    req.body.status = 'pending'; // Default status for new jobs
    
    const job = await Job.create(req.body);
    
    // Increment featured job counter if job is featured
    if (job.is_featured && req.subscription) {
      await incrementFeaturedJob(req.subscription._id);
    }
    
    // Populate the job with recruiter info
    await job.populate('categories', 'name');
    await job.populate('recruiter_id', 'company_name');
    
    res.status(201).json({
      success: true,
      data: job,
      subscriptionInfo: req.jobStats // Added from middleware
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job
// @route   PUT /api/v1/jobs/:id
// @access  Private/Recruiter
exports.updateJob = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Get recruiter
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    // Make sure user is job owner
    if (job.recruiter_id.toString() !== recruiter._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }
    
    // Check if featured status is being changed
    const wasFeatured = job.is_featured;
    const willBeFeatured = req.body.is_featured === true;
    
    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('categories', 'name')
    .populate('recruiter_id', 'company_name');
    
    // Increment featured job counter if changed from non-featured to featured
    if (!wasFeatured && willBeFeatured && req.subscription) {
      await incrementFeaturedJob(req.subscription._id);
    }
    
    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job
// @route   DELETE /api/v1/jobs/:id
// @access  Private/Recruiter
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Get recruiter
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    // Make sure user is job owner
    if (job.recruiter_id.toString() !== recruiter._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }
    
    await job.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
