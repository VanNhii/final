const Job = require('../models/Job');
const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const Application = require('../models/Application');

// @desc    Get hot/featured jobs
// @route   GET /api/v1/jobs/featured
// @access  Public
const getFeaturedJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 6 } = req.query;
    const skip = (page - 1) * limit;

    const jobs = await Job.find({
      is_active: true,
      status: 'approved',
      $or: [{ is_hot: true }, { is_featured: true }]
    })
      .populate('categories', 'name')
      .populate('recruiter_id', 'company_name logo_url industry')
      .sort('-created_at')
      .limit(limit * 1)
      .skip(skip);

    const total = await Job.countDocuments({
      is_active: true,
      status: 'approved',
      $or: [{ is_hot: true }, { is_featured: true }]
    });

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get urgent jobs
// @route   GET /api/v1/jobs/urgent
// @access  Public
const getUrgentJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({
      is_active: true,
      status: 'approved',
      is_urgent: true,
      application_deadline: { $gte: new Date() }
    })
      .populate('categories', 'name')
      .populate('recruiter_id', 'company_name logo_url')
      .sort('application_deadline')
      .limit(10);

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get related jobs
// @route   GET /api/v1/jobs/:id/related
// @access  Public
const getRelatedJobs = async (req, res, next) => {
  try {
    const currentJob = await Job.findById(req.params.id);

    if (!currentJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Find jobs with similar category or skills
    const relatedJobs = await Job.find({
      _id: { $ne: req.params.id },
      is_active: true,
      status: 'approved',
      $or: [
        { categories: { $in: currentJob.categories || [] } },
        { 'skills_required.skill_name': { $in: currentJob.skills_required?.map(s => s.skill_name) || [] } },
        { tags: { $in: currentJob.tags || [] } },
        { seniority_level: currentJob.seniority_level }
      ]
    })
      .populate('recruiter_id', 'company_name logo_url')
      .select('title company_name location salary_min salary_max job_type')
      .limit(5)
      .sort('-views_count');

    res.status(200).json({
      success: true,
      count: relatedJobs.length,
      data: relatedJobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Increment job view count
// @route   POST /api/v1/jobs/:id/view
// @access  Public
const incrementJobView = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { views_count: 1 } },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { views_count: job.views_count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get job statistics
// @route   GET /api/v1/jobs/:id/stats
// @access  Public
const getJobStats = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .select('views_count applications_count created_at application_deadline')
      .populate('applications', null, null, { options: { limit: 0 } });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const stats = {
      views: job.views_count || 0,
      applications: job.applications_count || 0,
      daysPosted: Math.ceil((new Date() - job.created_at) / (1000 * 60 * 60 * 24)),
      daysLeft: job.application_deadline ?
        Math.ceil((job.application_deadline - new Date()) / (1000 * 60 * 60 * 24)) : null,
      applicationRate: job.views_count > 0 ?
        ((job.applications_count || 0) / job.views_count * 100).toFixed(1) : 0
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Search jobs with advanced filters
// @route   GET /api/v1/jobs/search
// @access  Public
const searchJobs = async (req, res, next) => {
  try {
    const {
      q, // search term
      category,
      location,
      job_type,
      work_location,
      seniority_level,
      salary_min,
      salary_max,
      is_hot,
      is_urgent,
      tags,
      company,
      page = 1,
      limit = 10,
      sort = '-created_at'
    } = req.query;

    // Build search query
    const searchQuery = {
      is_active: true,
      status: 'approved'
    };

    // Text search
    if (q) {
      searchQuery.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { company_name: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }

    // Category filter
    if (category) {
      searchQuery.categories = category;
    }

    // Location filter
    if (location) {
      searchQuery['location.city'] = { $regex: location, $options: 'i' };
    }

    // Job type filter
    if (job_type) {
      searchQuery.job_type = job_type;
    }

    // Work location filter
    if (work_location) {
      searchQuery.work_location = work_location;
    }

    // Seniority level filter
    if (seniority_level) {
      searchQuery.seniority_level = seniority_level;
    }

    // Salary range filter
    if (salary_min) {
      searchQuery.salary_min = { $gte: parseInt(salary_min) };
    }
    if (salary_max) {
      searchQuery.salary_max = { $lte: parseInt(salary_max) };
    }

    // Hot/Urgent filters
    if (is_hot === 'true') {
      searchQuery.is_hot = true;
    }
    if (is_urgent === 'true') {
      searchQuery.is_urgent = true;
    }

    // Tags filter
    if (tags) {
      const tagsArray = tags.split(',');
      searchQuery.tags = { $in: tagsArray };
    }

    // Company filter
    if (company) {
      searchQuery.company_name = { $regex: company, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Job.find(searchQuery)
      .populate('categories', 'name')
      .populate('recruiter_id', 'company_name logo_url industry company_size')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Job.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      data: jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get job recommendations for user
// @route   GET /api/v1/jobs/recommendations
// @access  Private
const getJobRecommendations = async (req, res, next) => {
  try {
    // This would typically use ML algorithms based on user profile
    // For now, we'll use simple matching based on user skills and preferences

    const user = req.user;
    const candidate = await Candidate.findOne({ user_id: user.id });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Build recommendation query based on candidate profile
    const recommendationQuery = {
      is_active: true,
      status: 'approved'
    };

    // Match skills
    if (candidate.skills && candidate.skills.length > 0) {
      recommendationQuery.$or = [
        { 'skills_required.skill_name': { $in: candidate.skills.map(s => s.skill_name) } },
        { tags: { $in: candidate.skills.map(s => s.skill_name) } }
      ];
    }

    // Match seniority level based on experience
    if (candidate.years_of_experience !== undefined) {
      if (candidate.years_of_experience < 1) {
        recommendationQuery.seniority_level = { $in: ['entry', 'junior'] };
      } else if (candidate.years_of_experience < 3) {
        recommendationQuery.seniority_level = { $in: ['junior', 'mid'] };
      } else if (candidate.years_of_experience < 5) {
        recommendationQuery.seniority_level = { $in: ['mid', 'senior'] };
      } else {
        recommendationQuery.seniority_level = { $in: ['senior', 'lead', 'executive'] };
      }
    }

    // Match preferred locations
    if (candidate.preferred_locations && candidate.preferred_locations.length > 0) {
      recommendationQuery['location.city'] = { $in: candidate.preferred_locations };
    }

    const recommendations = await Job.find(recommendationQuery)
      .populate('categories', 'name')
      .populate('recruiter_id', 'company_name logo_url')
      .sort({ is_hot: -1, is_featured: -1, views_count: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get global statistics for homepage
// @route   GET /api/v1/jobs/stats/global
// @access  Public
const getGlobalStats = async (req, res, next) => {
  try {
    const totalJobs = await Job.countDocuments({ status: 'approved', is_active: true });
    const totalCompanies = await Recruiter.countDocuments();
    const totalCandidates = await Candidate.countDocuments();
    const totalApplications = await Application.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalJobs: totalJobs + 1000,
        totalCompanies: totalCompanies + 50,
        totalCandidates: totalCandidates + 500,
        totalApplications: totalApplications + 200,
        raw: {
          jobs: totalJobs,
          companies: totalCompanies,
          candidates: totalCandidates,
          applications: totalApplications
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

module.exports = {
  getFeaturedJobs,
  getUrgentJobs,
  getRelatedJobs,
  incrementJobView,
  getJobStats,
  searchJobs,
  getJobRecommendations,
  getGlobalStats
};
