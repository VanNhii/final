const Recruiter = require('../models/Recruiter');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Notification = require('../models/Notification');
const RecruiterSubscription = require('../models/RecruiterSubscription');
const { getPaginationParams, buildPaginationResponse, applyPagination, getSearchParams, getDateRangeFilter } = require('../utils/pagination');
const { getSubscriptionStatus } = require('../middleware/subscription');

// @desc    Get all recruiters
// @route   GET /api/v1/recruiters
// @access  Private/Admin
exports.getRecruiters = async (req, res, next) => {
  try {
    const recruiters = await Recruiter.find()
      .populate('user_id', 'first_name last_name email phone avatar_url')
      .populate({
        path: 'jobs',
        select: 'title status is_active job_type location created_at'
      })
      .populate('subscriptions')
      .sort('-created_at');

    res.status(200).json({
      success: true,
      count: recruiters.length,
      data: recruiters
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all recruiters (public)
// @route   GET /api/v1/recruiters/public
// @access  Public
exports.getPublicRecruiters = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const query = { is_verified: true };

    const recruitersQuery = Recruiter.find(query)
      .select('company_name logo_url industry company_size company_description')
      .sort('-created_at');

    const recruiters = await applyPagination(recruitersQuery, page, limit, skip);
    const total = await Recruiter.countDocuments(query);

    res.status(200).json(buildPaginationResponse(recruiters, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single recruiter
// @route   GET /api/v1/recruiters/:id
// @access  Public
exports.getRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id)
      .populate('user_id', 'first_name last_name email phone avatar_url')
      .populate({
        path: 'jobs',
        select: 'title status is_active job_type location salary_min salary_max application_deadline created_at',
        options: { sort: { created_at: -1 } }
      });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    res.status(200).json({
      success: true,
      data: recruiter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create recruiter
// @route   POST /api/v1/recruiters
// @access  Private
exports.createRecruiter = async (req, res, next) => {
  try {
    // Add user ID from authenticated user
    req.body.user_id = req.user.id;

    const recruiter = await Recruiter.create(req.body);

    res.status(201).json({
      success: true,
      data: recruiter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update recruiter
// @route   PUT /api/v1/recruiters/:id
// @access  Private
exports.updateRecruiter = async (req, res, next) => {
  try {
    let recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    // Make sure user is recruiter owner
    if (recruiter.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this recruiter'
      });
    }

    recruiter = await Recruiter.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: recruiter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete recruiter
// @route   DELETE /api/v1/recruiters/:id
// @access  Private
exports.deleteRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    // Make sure user is recruiter owner
    if (recruiter.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this recruiter'
      });
    }

    await recruiter.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recruiter profile (own profile)
// @route   GET /api/recruiters/profile
// @access  Private/Recruiter
exports.getRecruiterProfile = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ user_id: req.user.id })
      .populate('user_id', 'first_name last_name email phone avatar_url')
      .populate({
        path: 'jobs',
        select: 'title status is_active job_type location salary_min salary_max application_deadline created_at',
        options: { sort: { created_at: -1 } }
      })
      .populate('subscriptions');

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: recruiter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update recruiter profile
// @route   PUT /api/recruiters/profile
// @access  Private/Recruiter
exports.updateRecruiterProfile = async (req, res, next) => {
  try {
    let recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    recruiter = await Recruiter.findByIdAndUpdate(recruiter._id, req.body, {
      new: true,
      runValidators: true
    }).populate('user_id', 'first_name last_name email phone avatar_url');

    // If avatar_url is provided, update User model as well
    if (req.body.avatar_url) {
      await User.findByIdAndUpdate(req.user.id, {
        avatar_url: req.body.avatar_url
      });
      // Refresh user_id population to reflect changes in response
      await recruiter.populate('user_id', 'first_name last_name email phone avatar_url');
    }

    res.status(200).json({
      success: true,
      data: recruiter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recruiter's jobs
// @route   GET /api/recruiters/jobs
// @access  Private/Recruiter
exports.getRecruiterJobs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    const { status, is_active } = req.query;

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    const query = {
      recruiter_id: recruiter._id,
      ...searchFilters
    };

    // Only add filters if they have values (not empty string)
    if (status && status.trim() !== '') query.status = status;
    if (is_active !== undefined && is_active !== '') {
      query.is_active = is_active === 'true';
    }

    const jobsQuery = Job.find(query)
      .populate('categories', 'name')
      .populate({
        path: 'applications',
        select: 'candidate_id application_status created_at',
        populate: {
          path: 'candidate_id',
          select: 'bio experience_years',
          populate: {
            path: 'user_id',
            select: '_id first_name last_name email phone avatar_url'
          }
        }
      });

    const jobs = await applyPagination(jobsQuery, page, limit, skip);
    const total = await Job.countDocuments(query);

    res.status(200).json(buildPaginationResponse(jobs, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get recruiter's applications
// @route   GET /api/recruiters/applications
// @access  Private/Recruiter
exports.getRecruiterApplications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status } = req.query;

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get all jobs by this recruiter
    const jobs = await Job.find({ recruiter_id: recruiter._id }).select('_id');
    const jobIds = jobs.map(job => job._id);

    const query = { job_id: { $in: jobIds } };
    if (status) query.application_status = status;

    const applicationsQuery = Application.find(query)
      .populate('job_id', 'title location job_type')
      .populate({
        path: 'candidate_id',
        select: 'bio experience_years education experience skills_detailed salary_expectation available_from',
        populate: {
          path: 'user_id',
          select: '_id first_name last_name email phone avatar_url'
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

// @desc    Get recruiter's interviews
// @route   GET /api/recruiters/interviews
// @access  Private/Recruiter
exports.getRecruiterInterviews = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const dateFilters = getDateRangeFilter(req);
    const { status } = req.query;

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    const query = {
      recruiter_id: recruiter._id,
      ...dateFilters
    };

    if (status) query.status = status;

    const interviewsQuery = Interview.find(query)
      .populate({
        path: 'application_id',
        populate: {
          path: 'job_id',
          select: 'title'
        }
      })
      .populate({
        path: 'candidate_id',
        select: 'bio experience_years',
        populate: {
          path: 'user_id',
          select: '_id first_name last_name email phone avatar_url full_name'
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

// @desc    Get recruiter dashboard statistics
// @route   GET /api/recruiters/dashboard
// @access  Private/Recruiter
exports.getRecruiterDashboard = async (req, res, next) => {
  console.log('Fetching recruiter dashboard stats...', req.user);
  try {
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get basic stats
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      pendingApplications,
      totalInterviews,
      upcomingInterviews
    ] = await Promise.all([
      Job.countDocuments({ recruiter_id: recruiter._id }),
      Job.countDocuments({ recruiter_id: recruiter._id, is_active: true, status: 'approved' }),
      Application.countDocuments({
        job_id: { $in: await Job.find({ recruiter_id: recruiter._id }).select('_id') }
      }),
      Application.countDocuments({
        job_id: { $in: await Job.find({ recruiter_id: recruiter._id }).select('_id') },
        application_status: 'pending'
      }),
      Interview.countDocuments({ recruiter_id: recruiter._id }),
      Interview.countDocuments({
        recruiter_id: recruiter._id,
        interview_date: { $gte: new Date() },
        interview_status: 'scheduled'
      })
    ]);

    // Get recent applications
    const jobIds = await Job.find({ recruiter_id: recruiter._id }).select('_id');
    const recentApplications = await Application.find({
      job_id: { $in: jobIds }
    })
      .populate('job_id', 'title')
      .populate('candidate_id', 'bio experience_years')
      .sort('-created_at')
      .limit(5);

    // Get subscription status
    const subscriptionStatus = await getSubscriptionStatus(recruiter._id);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalJobs,
          activeJobs,
          totalApplications,
          pendingApplications,
          totalInterviews,
          upcomingInterviews
        },
        recentApplications,
        subscription: subscriptionStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recruiter's notifications
// @route   GET /api/recruiters/notifications
// @access  Private/Recruiter
exports.getRecruiterNotifications = async (req, res, next) => {
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

// @desc    Get recruiter's subscription history
// @route   GET /api/recruiters/subscriptions
// @access  Private/Recruiter
exports.getRecruiterSubscriptions = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    const subscriptions = await RecruiterSubscription.find({
      recruiter_id: recruiter._id
    })
      .populate('service_plan_id')
      .sort('-created_at');

    console.log(subscriptions.length);
    res.status(200).json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current active subscription
// @route   GET /api/recruiters/subscription/current
// @access  Private/Recruiter
exports.getCurrentSubscription = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    const currentSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      subscription_status: 'active',
      end_date: { $gt: new Date() }
    })
      .populate('service_plan_id')
      .sort({ end_date: -1 });

    let usage = null;
    if (currentSubscription && currentSubscription.service_plan_id) {
      const plan = currentSubscription.service_plan_id;
      usage = {
        job_postings_used: currentSubscription.features_used?.job_posts_used || 0,
        job_postings_limit: plan.features?.job_posts_limit || 0,
        cv_download_used: currentSubscription.features_used?.cv_downloads_used || 0,
        cv_download_limit: plan.features?.cv_downloads || 0,
        candidate_search_used: 0, // Implement based on your tracking
        candidate_search_limit: plan.features?.candidate_search ? -1 : 0 // -1 means unlimited
      };
    }
    console.log(currentSubscription);
    res.status(200).json({
      success: true,
      data: currentSubscription ? {
        ...currentSubscription.toObject(),
        usage
      } : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upgrade subscription
// @route   PUT /api/recruiters/subscription/upgrade
// @access  Private/Recruiter
exports.upgradeSubscription = async (req, res, next) => {
  try {
    const { planId, payment_method } = req.body;

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get new service plan
    const newPlan = await ServicePlan.findById(planId);

    if (!newPlan || !newPlan.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found or inactive'
      });
    }

    // Get current subscription
    const currentSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      subscription_status: 'active'
    });

    if (currentSubscription) {
      // Cancel current subscription
      currentSubscription.subscription_status = 'cancelled';
      await currentSubscription.save();
    }

    // Create new subscription
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + newPlan.duration_days);

    const newSubscription = await RecruiterSubscription.create({
      recruiter_id: recruiter._id,
      service_plan_id: newPlan._id,
      start_date: startDate,
      end_date: endDate,
      subscription_status: 'pending',
      payment_status: 'pending',
      features_used: {
        job_posts_used: 0,
        featured_jobs_used: 0,
        cv_downloads_used: 0
      }
    });

    const populatedSubscription = await RecruiterSubscription.findById(newSubscription._id)
      .populate('service_plan_id');

    res.status(200).json({
      success: true,
      message: 'Subscription upgraded successfully. Please complete payment to activate.',
      data: populatedSubscription
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel subscription
// @route   PUT /api/recruiters/subscription/cancel
// @access  Private/Recruiter
exports.cancelSubscription = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    const currentSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      subscription_status: 'active'
    });

    if (!currentSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    currentSubscription.subscription_status = 'cancelled';
    await currentSubscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: currentSubscription
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recruiter analytics
// @route   GET /api/recruiters/analytics
// @access  Private/Recruiter
exports.getRecruiterAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get job IDs as array of ObjectIds
    const jobs = await Job.find({ recruiter_id: recruiter._id }).select('_id');
    const jobIds = jobs.map(job => job._id);

    console.log('[ANALYTICS] Recruiter:', recruiter._id);
    console.log('[ANALYTICS] Jobs found:', jobs.length);
    console.log('[ANALYTICS] Job IDs:', jobIds);

    // Applications over time
    const applicationTrend = await Application.aggregate([
      {
        $match: {
          job_id: { $in: jobIds },
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    console.log('[ANALYTICS] Application trend results:', applicationTrend.length);

    // Applications by status
    const applicationsByStatus = await Application.aggregate([
      {
        $match: { job_id: { $in: jobIds } }
      },
      {
        $group: {
          _id: '$application_status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('[ANALYTICS] Applications by status:', applicationsByStatus);

    // Top performing jobs
    const topJobs = await Job.aggregate([
      {
        $match: { recruiter_id: recruiter._id }
      },
      {
        $lookup: {
          from: 'applications',
          localField: '_id',
          foreignField: 'job_id',
          as: 'applications'
        }
      },
      {
        $project: {
          title: 1,
          applicationCount: { $size: '$applications' },
          views_count: 1
        }
      },
      {
        $sort: { applicationCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: `${period} days`,
        applicationTrend,
        applicationsByStatus,
        topJobs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company culture and values
// @route   PUT /api/recruiters/company-culture
// @access  Private/Recruiter
exports.updateCompanyCulture = async (req, res, next) => {
  try {
    const { mission, vision, company_culture, benefits } = req.body;

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Update company culture fields
    if (mission !== undefined) recruiter.mission = mission;
    if (vision !== undefined) recruiter.vision = vision;
    if (company_culture !== undefined) recruiter.company_culture = company_culture;
    if (benefits !== undefined) recruiter.benefits = benefits;

    await recruiter.save();

    res.status(200).json({
      success: true,
      data: {
        mission: recruiter.mission,
        vision: recruiter.vision,
        company_culture: recruiter.company_culture,
        benefits: recruiter.benefits
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add company benefit
// @route   POST /api/recruiters/benefits
// @access  Private/Recruiter
exports.addBenefit = async (req, res, next) => {
  try {
    const { benefit } = req.body;

    if (!benefit || benefit.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Benefit description is required'
      });
    }

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    if (!recruiter.benefits) {
      recruiter.benefits = [];
    }

    recruiter.benefits.push(benefit.trim());
    await recruiter.save();

    res.status(201).json({
      success: true,
      data: recruiter.benefits
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove company benefit
// @route   DELETE /api/recruiters/benefits/:index
// @access  Private/Recruiter
exports.removeBenefit = async (req, res, next) => {
  try {
    const { index } = req.params;
    const benefitIndex = parseInt(index);

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    if (!recruiter.benefits || benefitIndex < 0 || benefitIndex >= recruiter.benefits.length) {
      return res.status(404).json({
        success: false,
        message: 'Benefit not found'
      });
    }

    recruiter.benefits.splice(benefitIndex, 1);
    await recruiter.save();

    res.status(200).json({
      success: true,
      data: recruiter.benefits
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update social media links
// @route   PUT /api/recruiters/social-links
// @access  Private/Recruiter
exports.updateSocialLinks = async (req, res, next) => {
  try {
    const { linkedin, facebook, twitter } = req.body;

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    if (!recruiter.social_links) {
      recruiter.social_links = {};
    }

    // Update social links
    if (linkedin !== undefined) recruiter.social_links.linkedin = linkedin;
    if (facebook !== undefined) recruiter.social_links.facebook = facebook;
    if (twitter !== undefined) recruiter.social_links.twitter = twitter;

    await recruiter.save();

    res.status(200).json({
      success: true,
      data: recruiter.social_links
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Debug subscription status
// @route   GET /api/v1/recruiters/debug/subscription
// @access  Private/Recruiter
exports.debugSubscription = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get all subscriptions for this recruiter
    const allSubscriptions = await RecruiterSubscription.find({
      recruiter_id: recruiter._id
    })
      .populate('service_plan_id')
      .sort({ created_at: -1 });

    // Get active subscription
    const activeSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      payment_status: 'paid',
      subscription_status: 'active',
      end_date: { $gt: new Date() }
    })
      .populate('service_plan_id')
      .sort({ end_date: -1 });

    const debugInfo = {
      recruiter: {
        id: recruiter._id,
        email: req.user.email,
        company: recruiter.company_name
      },
      currentTime: new Date(),
      allSubscriptions: allSubscriptions.map(sub => ({
        id: sub._id,
        planName: sub.service_plan_id?.name,
        planType: sub.service_plan_id?.plan_type,
        subscriptionStatus: sub.subscription_status,
        paymentStatus: sub.payment_status,
        startDate: sub.start_date,
        endDate: sub.end_date,
        isExpired: sub.end_date < new Date(),
        features: sub.service_plan_id?.features,
        createdAt: sub.created_at
      })),
      activeSubscription: activeSubscription ? {
        id: activeSubscription._id,
        planName: activeSubscription.service_plan_id?.name,
        planType: activeSubscription.service_plan_id?.plan_type,
        subscriptionStatus: activeSubscription.subscription_status,
        paymentStatus: activeSubscription.payment_status,
        startDate: activeSubscription.start_date,
        endDate: activeSubscription.end_date,
        daysRemaining: Math.ceil((activeSubscription.end_date - new Date()) / (1000 * 60 * 60 * 24)),
        features: activeSubscription.service_plan_id?.features,
        hasCandidateSearch: activeSubscription.service_plan_id?.features?.candidate_search,
        cvDownloads: activeSubscription.service_plan_id?.features?.cv_downloads,
        jobPostsLimit: activeSubscription.service_plan_id?.features?.job_posts_limit
      } : null
    };

    res.status(200).json({
      success: true,
      data: debugInfo
    });
  } catch (error) {
    next(error);
  }
};
