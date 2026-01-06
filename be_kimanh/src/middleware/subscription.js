const RecruiterSubscription = require('../models/RecruiterSubscription');
const Recruiter = require('../models/Recruiter');
const Job = require('../models/Job');

// Check if recruiter has active subscription
exports.checkActiveSubscription = async (req, res, next) => {
  try {
    if (req.user.role !== 'recruiter') {
      return next();
    }

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Check for active subscription
    const activeSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      payment_status: 'paid',
      subscription_status: 'active',
      end_date: { $gt: new Date() }
    })
    .populate('service_plan_id')
    .sort({ end_date: -1 });

    if (!activeSubscription) {
      return res.status(403).json({
        success: false,
        message: 'No active subscription found. Please upgrade your plan to continue.',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    req.subscription = activeSubscription;
    req.recruiter = recruiter;
    next();
  } catch (error) {
    next(error);
  }
};

// Check job posting limits
exports.checkJobPostingLimit = async (req, res, next) => {
  try {
    if (req.user.role !== 'recruiter') {
      return next();
    }

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get active subscription or use basic plan limits
    let jobPostsLimit = 3; // Free plan limit
    let planType = 'free';

    const activeSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      payment_status: 'paid',
      subscription_status: 'active',
      end_date: { $gt: new Date() }
    })
    .populate('service_plan_id')
    .sort({ end_date: -1 });

    if (activeSubscription && activeSubscription.service_plan_id) {
      jobPostsLimit = activeSubscription.service_plan_id.features?.job_posts_limit || 3;
      planType = activeSubscription.service_plan_id.plan_type || 'basic';
    }

    // Count current active jobs
    const currentJobsCount = await Job.countDocuments({
      recruiter_id: recruiter._id,
      is_active: true,
      status: { $in: ['approved', 'pending'] }
    });

    if (currentJobsCount >= jobPostsLimit) {
      return res.status(403).json({
        success: false,
        message: `You have reached your job posting limit (${jobPostsLimit} jobs for ${planType} plan). Please upgrade your subscription or deactivate some jobs.`,
        code: 'JOB_LIMIT_EXCEEDED',
        data: {
          currentJobs: currentJobsCount,
          limit: jobPostsLimit,
          planType: planType
        }
      });
    }

    req.recruiter = recruiter;
    req.subscription = activeSubscription;
    req.jobStats = {
      currentJobs: currentJobsCount,
      limit: jobPostsLimit,
      planType: planType,
      remaining: jobPostsLimit - currentJobsCount
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Check candidate search permission
exports.checkCandidateSearchPermission = async (req, res, next) => {
  try {
    if (req.user.role !== 'recruiter') {
      return next();
    }

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Check for active subscription with candidate search feature
    const activeSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      payment_status: 'paid',
      subscription_status: 'active',
      end_date: { $gt: new Date() }
    })
    .populate('service_plan_id')
    .sort({ end_date: -1 });

    console.log('Checking candidate search permission for recruiter:', recruiter._id);
    console.log('Active subscription:', activeSubscription?._id);
    console.log('Service plan:', activeSubscription?.service_plan_id?.name);
    console.log('Candidate search feature:', activeSubscription?.service_plan_id?.features?.candidate_search);

    // For development/demo purposes, allowing basic search even for free plan
    // In production, this would check for specific features
    const hasPermission = activeSubscription?.service_plan_id?.features?.candidate_search || !activeSubscription;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Candidate search feature requires a premium subscription. Please upgrade your plan.',
        code: 'PREMIUM_FEATURE_REQUIRED',
        data: {
          hasSubscription: !!activeSubscription,
          planName: activeSubscription?.service_plan_id?.name,
          hasCandidateSearch: activeSubscription?.service_plan_id?.features?.candidate_search
        }
      });
    }

    req.subscription = activeSubscription;
    req.recruiter = recruiter;
    next();
  } catch (error) {
    next(error);
  }
};

// Check featured job permission
exports.checkFeaturedJobPermission = async (req, res, next) => {
  try {
    if (req.user.role !== 'recruiter') {
      return next();
    }

    // Only check if request is trying to create/update a featured job
    const isFeatured = req.body.is_featured === true;
    if (!isFeatured) {
      return next();
    }

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get active subscription
    const activeSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      payment_status: 'paid',
      subscription_status: 'active',
      end_date: { $gt: new Date() }
    })
    .populate('service_plan_id')
    .sort({ end_date: -1 });

    if (!activeSubscription || !activeSubscription.service_plan_id?.features?.featured_jobs) {
      return res.status(403).json({
        success: false,
        message: 'Featured job feature requires a premium subscription. Please upgrade your plan.',
        code: 'PREMIUM_FEATURE_REQUIRED'
      });
    }

    // Check featured jobs limit
    const featuredJobsLimit = activeSubscription.service_plan_id.features.featured_jobs;
    const featuredJobsUsed = activeSubscription.features_used?.featured_jobs_used || 0;

    if (featuredJobsUsed >= featuredJobsLimit) {
      return res.status(403).json({
        success: false,
        message: `You have reached your featured job limit (${featuredJobsLimit}). Please upgrade your plan.`,
        code: 'FEATURED_JOB_LIMIT_EXCEEDED',
        data: {
          used: featuredJobsUsed,
          limit: featuredJobsLimit
        }
      });
    }

    req.subscription = activeSubscription;
    req.recruiter = recruiter;
    next();
  } catch (error) {
    next(error);
  }
};

// Check CV download permission
exports.checkCVDownloadPermission = async (req, res, next) => {
  try {
    if (req.user.role !== 'recruiter') {
      return next();
    }

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }

    // Get active subscription or use basic plan limits
    let cvDownloadsLimit = 0; // Free plan limit
    
    const activeSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      payment_status: 'paid',
      subscription_status: 'active',
      end_date: { $gt: new Date() }
    })
    .populate('service_plan_id')
    .sort({ end_date: -1 });

    if (activeSubscription && activeSubscription.service_plan_id) {
      cvDownloadsLimit = activeSubscription.service_plan_id.features?.cv_downloads || 0;
    }

    if (cvDownloadsLimit === 0) {
      return res.status(403).json({
        success: false,
        message: 'CV download feature requires a paid subscription. Please upgrade your plan.',
        code: 'CV_DOWNLOAD_REQUIRED'
      });
    }

    // Check CV download usage
    const cvDownloadsUsed = activeSubscription.features_used?.cv_downloads_used || 0;

    if (cvDownloadsUsed >= cvDownloadsLimit) {
      return res.status(403).json({
        success: false,
        message: `You have reached your CV download limit (${cvDownloadsLimit}). Please upgrade your plan.`,
        code: 'CV_DOWNLOAD_LIMIT_EXCEEDED',
        data: {
          used: cvDownloadsUsed,
          limit: cvDownloadsLimit
        }
      });
    }

    req.subscription = activeSubscription;
    req.recruiter = recruiter;
    next();
  } catch (error) {
    next(error);
  }
};

// Increment CV download counter
exports.incrementCVDownload = async (recruiterId, subscriptionId) => {
  try {
    await RecruiterSubscription.findByIdAndUpdate(
      subscriptionId,
      { $inc: { 'features_used.cv_downloads_used': 1 } }
    );
    return true;
  } catch (error) {
    console.error('Error incrementing CV download:', error);
    return false;
  }
};

// Increment featured job counter
exports.incrementFeaturedJob = async (subscriptionId) => {
  try {
    await RecruiterSubscription.findByIdAndUpdate(
      subscriptionId,
      { $inc: { 'features_used.featured_jobs_used': 1 } }
    );
    return true;
  } catch (error) {
    console.error('Error incrementing featured job:', error);
    return false;
  }
};

// Get subscription status for response
exports.getSubscriptionStatus = async (recruiterId) => {
  try {
    const activeSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiterId,
      payment_status: 'paid',
      end_date: { $gt: new Date() }
    }).sort({ end_date: -1 });

    if (!activeSubscription) {
      return {
        planType: 'free',
        isActive: false,
        features: {
          job_posts_limit: 3,
          featured_jobs: 0,
          candidate_search: false,
          advanced_analytics: false,
          priority_support: false,
          cv_downloads: 5
        },
        daysRemaining: 0
      };
    }

    const daysRemaining = Math.ceil((activeSubscription.end_date - new Date()) / (1000 * 60 * 60 * 24));

    return {
      planType: activeSubscription.plan_type,
      isActive: true,
      features: activeSubscription.features,
      daysRemaining: daysRemaining,
      endDate: activeSubscription.end_date
    };
  } catch (error) {
    throw error;
  }
};

module.exports = exports;
