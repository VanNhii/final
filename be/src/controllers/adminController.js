const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Report = require('../models/Report');
const Payment = require('../models/Payment');
const EmailTemplate = require('../models/EmailTemplate');
const Notification = require('../models/Notification');
const JobCategory = require('../models/JobCategory');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const SystemSetting = require('../models/SystemSetting');
const UserActivity = require('../models/UserActivity');
const ServicePlan = require('../models/ServicePlan');
const RecruiterSubscription = require('../models/RecruiterSubscription');
const { generateSystemReport, sendBulkEmails, cleanupOldData, backupCollections } = require('../utils/adminUtils');
const { getPaginationParams, buildPaginationResponse, applyPagination, getSearchParams, getDateRangeFilter } = require('../utils/pagination');

// Helper function to get client IP address safely
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         '127.0.0.1';
};

 

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Payment.countDocuments(),
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'recruiter' }),
      Job.countDocuments({ status: 'approved' }),
      Application.countDocuments({ application_status: 'pending' })
    ]);

    const [
      totalUsers,
      totalJobs,
      totalApplications,
      pendingReports,
      totalPayments,
      totalCandidates,
      totalRecruiters,
      activeJobs,
      pendingApplications
    ] = stats;

    // Get recent activities with better formatting
    const recentActivities = await UserActivity.find()
      .populate('user_id', 'email role first_name last_name')
      .sort('-created_at')
      .limit(10)
      .lean(); // Use lean for better performance

    // Format activities for better display
    const formattedActivities = recentActivities.map(activity => ({
      id: activity._id,
      user_id: {
        _id: activity.user_id?._id,
        email: activity.user_id?.email,
        role: activity.user_id?.role,
        name: activity.user_id?.full_name || 
              `${activity.user_id?.first_name || ''} ${activity.user_id?.last_name || ''}`.trim() ||
              activity.user_id?.email
      },
      activity_type: activity.activity_type,
      description: activity.description || `Thực hiện hành động: ${activity.activity_type}`,
      created_at: activity.created_at,
      ip_address: activity.ip_address
    }));

    // Get monthly stats for charts
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 1);
    
    const [currentMonthUsers, lastMonthUsers, currentMonthJobs, lastMonthJobs, currentMonthApplications, lastMonthApplications] = await Promise.all([
      User.countDocuments({ created_at: { $gte: lastMonth } }),
      User.countDocuments({ created_at: { $gte: previousMonth, $lt: lastMonth } }),
      Job.countDocuments({ created_at: { $gte: lastMonth } }),
      Job.countDocuments({ created_at: { $gte: previousMonth, $lt: lastMonth } }),
      Application.countDocuments({ created_at: { $gte: lastMonth } }),
      Application.countDocuments({ created_at: { $gte: previousMonth, $lt: lastMonth } })
    ]);

    // Calculate growth percentages
    const userGrowthPercent = lastMonthUsers > 0 ? ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : currentMonthUsers > 0 ? 100 : 0;
    const jobGrowthPercent = lastMonthJobs > 0 ? ((currentMonthJobs - lastMonthJobs) / lastMonthJobs) * 100 : currentMonthJobs > 0 ? 100 : 0;
    const applicationGrowthPercent = lastMonthApplications > 0 ? ((currentMonthApplications - lastMonthApplications) / lastMonthApplications) * 100 : currentMonthApplications > 0 ? 100 : 0;

    // Get total revenue
    const revenueResult = await Payment.aggregate([
      { $match: { payment_status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Calculate revenue growth (comparing current month vs last month)
    const [currentMonthRevenue, lastMonthRevenue] = await Promise.all([
      Payment.aggregate([
        { $match: { payment_status: 'completed', created_at: { $gte: lastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { payment_status: 'completed', created_at: { $gte: previousMonth, $lt: lastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const currentRevenue = currentMonthRevenue[0]?.total || 0;
    const previousRevenue = lastMonthRevenue[0]?.total || 0;
    const revenueGrowthPercent = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalJobs,
          totalApplications,
          pendingReports,
          totalPayments,
          totalCandidates,
          totalRecruiters,
          activeJobs,
          pendingApplications
        },
        monthly: {
          newUsers: currentMonthUsers,
          newJobs: currentMonthJobs,
          newApplications: currentMonthApplications
        },
        growth: {
          userGrowthPercent: userGrowthPercent.toFixed(1),
          jobGrowthPercent: jobGrowthPercent.toFixed(1),
          applicationGrowthPercent: applicationGrowthPercent.toFixed(1),
          revenueGrowthPercent: revenueGrowthPercent.toFixed(1)
        },
        totalRevenue: Math.round(totalRevenue / 1000000), // Convert to millions
        recentActivities: formattedActivities
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user growth data for analytics
// @route   GET /api/admin/analytics/user-growth
// @access  Private/Admin
exports.getUserGrowthData = async (req, res, next) => {
  try {
    const { timeRange = '7days' } = req.query;
    
    // Parse time range
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get user growth data
    const userGrowthData = await User.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            role: "$role"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Format data for chart
    const labels = [];
    const candidatesData = [];
    const recruitersData = [];
    
    // Generate date labels
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
    }
    
    // Initialize data arrays
    labels.forEach(() => {
      candidatesData.push(0);
      recruitersData.push(0);
    });
    
    // Fill actual data
    userGrowthData.forEach(item => {
      const dateIndex = labels.indexOf(new Date(item._id.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
      if (dateIndex !== -1) {
        if (item._id.role === 'candidate') {
          candidatesData[dateIndex] = item.count;
        } else if (item._id.role === 'recruiter') {
          recruitersData[dateIndex] = item.count;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        labels,
        candidates: candidatesData,
        recruiters: recruitersData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get job statistics for analytics
// @route   GET /api/admin/analytics/job-stats
// @access  Private/Admin
exports.getJobStatistics = async (req, res, next) => {
  try {
    const { timeRange = '7days' } = req.query;
    
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get job statistics by category
    const jobStats = await Job.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'jobcategories',
          localField: 'job_category_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$category.name', 0] },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const labels = jobStats.map(item => item._id || 'Khác');
    const values = jobStats.map(item => item.count);

    res.status(200).json({
      success: true,
      data: {
        labels,
        values
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get application statistics for analytics
// @route   GET /api/admin/analytics/application-stats
// @access  Private/Admin
exports.getApplicationStatistics = async (req, res, next) => {
  try {
    const { timeRange = '7days' } = req.query;
    
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const applicationStats = await Application.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            status: "$application_status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    // Format data for chart
    const labels = [];
    const applicationsData = [];
    const acceptedData = [];
    
    // Generate date labels
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
    }
    
    // Initialize data arrays
    labels.forEach(() => {
      applicationsData.push(0);
      acceptedData.push(0);
    });
    
    // Fill actual data
    applicationStats.forEach(item => {
      const dateIndex = labels.indexOf(new Date(item._id.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
      if (dateIndex !== -1) {
        // Count all applications
        applicationsData[dateIndex] += item.count;
        // Count accepted (offered/shortlisted) applications
        if (item._id.status === 'offered' || item._id.status === 'shortlisted' || item._id.status === 'interviewed') {
          acceptedData[dateIndex] += item.count;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        labels,
        applications: applicationsData,
        accepted: acceptedData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get revenue statistics for analytics  
// @route   GET /api/admin/analytics/revenue-stats
// @access  Private/Admin
exports.getRevenueStatistics = async (req, res, next) => {
  try {
    const { timeRange = '7days' } = req.query;
    
    // Determine number of months to show based on timeRange
    let months;
    if (timeRange === '7days' || timeRange === '30days') {
      months = 6; // Show last 6 months for short time ranges
    } else if (timeRange === '90days') {
      months = 9; // Show last 9 months
    } else {
      months = 12; // Show last 12 months for 1 year
    }
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1); // Start from beginning of month
    
    const revenueStats = await Payment.aggregate([
      {
        $match: {
          created_at: { $gte: startDate },
          payment_status: 'completed'
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$created_at" },
            month: { $month: "$created_at" }
          },
          revenue: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Format data for chart - generate labels for each month
    const labels = [];
    const values = [];
    
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() is 0-indexed
      
      labels.push(monthNames[month - 1]);
      
      // Find revenue for this month
      const monthRevenue = revenueStats.find(
        item => item._id.year === year && item._id.month === month
      );
      values.push(monthRevenue ? Math.round(monthRevenue.revenue / 1000000) : 0); // Convert to millions
    }

    res.status(200).json({
      success: true,
      data: {
        labels,
        values
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system status for maintenance
// @route   GET /api/admin/maintenance/status
// @access  Private/Admin
exports.getSystemStatus = async (req, res, next) => {
  try {
    // Check various system components
    const [userCount, jobCount, applicationCount] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments()
    ]);

    // Mock system health checks (in real app, you'd check actual services)
    const systemStatus = {
      overall: 'healthy',
      database: 'healthy', 
      storage: userCount > 1000 ? 'warning' : 'healthy',
      email: 'healthy',
      payment: 'healthy',
      ai: jobCount > 100 ? 'healthy' : 'warning'
    };

    const systemStats = {
      uptime: '15 ngày 6 giờ', // Mock data
      totalUsers: userCount,
      activeJobs: jobCount,
      storageUsed: '78%', // Mock data
      memoryUsage: '65%', // Mock data
      cpuUsage: '42%' // Mock data
    };

    res.status(200).json({
      success: true,
      data: {
        systemStatus,
        systemStats,
        maintenanceMode: false // You'd check actual maintenance mode status
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get maintenance tasks
// @route   GET /api/admin/maintenance/tasks
// @access  Private/Admin
exports.getMaintenanceTasks = async (req, res, next) => {
  try {
    // Mock maintenance tasks (in real app, you'd fetch from database)
    const maintenanceTasks = [
      {
        id: 1,
        name: 'Dọn dẹp log files',
        status: 'completed',
        lastRun: '2024-01-15 02:00',
        nextRun: '2024-01-16 02:00'
      },
      {
        id: 2,
        name: 'Backup database',
        status: 'running',
        lastRun: '2024-01-16 01:00',
        nextRun: '2024-01-17 01:00'
      },
      {
        id: 3,
        name: 'Optimize database',
        status: 'pending',
        lastRun: '2024-01-10 03:00',
        nextRun: '2024-01-17 03:00'
      },
      {
        id: 4,
        name: 'Clean temporary files',
        status: 'scheduled',
        lastRun: '2024-01-15 04:00',
        nextRun: '2024-01-16 04:00'
      }
    ];

    res.status(200).json({
      success: true,
      data: maintenanceTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run maintenance task
// @route   POST /api/admin/maintenance/tasks/:id/run
// @access  Private/Admin
exports.runMaintenanceTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Mock running a maintenance task
    // In real app, you'd execute the actual task
    
    res.status(200).json({
      success: true,
      message: `Maintenance task ${id} started successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enable maintenance mode
// @route   POST /api/admin/maintenance/mode/enable
// @access  Private/Admin
exports.enableMaintenanceMode = async (req, res, next) => {
  try {
    // In real app, you'd set maintenance mode flag in database or config
    res.status(200).json({
      success: true,
      message: 'Maintenance mode enabled'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export analytics report
// @route   POST /api/admin/analytics/export
// @access  Private/Admin
exports.exportAnalyticsReport = async (req, res, next) => {
  try {
    const { timeRange, format } = req.body;
    
    // In real app, you'd generate actual report file
    // For now, just return success message
    res.status(200).json({
      success: true,
      message: 'Analytics report export initiated',
      downloadUrl: `/downloads/analytics-report-${timeRange}.${format}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable maintenance mode
// @route   POST /api/admin/maintenance/mode/disable
// @access  Private/Admin
exports.disableMaintenanceMode = async (req, res, next) => {
  try {
    // In real app, you'd remove maintenance mode flag
    res.status(200).json({
      success: true,
      message: 'Maintenance mode disabled'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule maintenance task
// @route   POST /api/admin/maintenance/tasks/:id/schedule
// @access  Private/Admin
exports.scheduleMaintenanceTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scheduledTime, recurring } = req.body;
    
    // In real app, you'd schedule the task using cron or task scheduler
    res.status(200).json({
      success: true,
      message: `Maintenance task ${id} scheduled successfully`,
      data: {
        taskId: id,
        scheduledTime,
        recurring: recurring || false
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users for admin management
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    const { role, status } = req.query;

    console.log('Search Filters:', searchFilters);
    
    const query = { ...searchFilters };

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by status
    if (status) {
      query.is_active = status == 'active';
    }

    const usersQuery = User.find(query)
      .select('-password')
      .populate('candidate_profile')
      .populate('recruiter_profile');

    const users = await applyPagination(usersQuery, page, limit, skip);
    const totalUsers = await User.countDocuments(query);
    
    // Get overall stats (not filtered)
    const [totalAll, totalCandidates, totalRecruiters, totalInactive, totalAdmins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'recruiter' }),
      User.countDocuments({ is_active: false }),
      User.countDocuments({ role: 'admin' })
    ]);

    const response = buildPaginationResponse(users, totalUsers, page, limit);
    response.stats = {
      total: totalAll,
      candidates: totalCandidates,
      recruiters: totalRecruiters,
      admins: totalAdmins,
      inactive: totalInactive
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate system reports
// @route   GET /api/admin/reports/system/:type
// @access  Private/Admin
exports.generateReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { period = 30 } = req.query;

    const reportData = await generateSystemReport(type, parseInt(period));

    res.status(200).json({
      success: true,
      data: {
        type,
        period: `${period} days`,
        generated_at: new Date(),
        ...reportData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send bulk emails
// @route   POST /api/admin/emails/bulk
// @access  Private/Admin
exports.sendBulkEmails = async (req, res, next) => {
  try {
    const { template_name, target_role, custom_recipients, variables } = req.body;

    let recipients = [];

    if (custom_recipients && custom_recipients.length > 0) {
      recipients = custom_recipients;
    } else if (target_role) {
      const users = await User.find({ role: target_role, is_active: true })
        .select('email full_name');
      recipients = users;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please specify either target_role or custom_recipients'
      });
    }

    const result = await sendBulkEmails(template_name, recipients, variables);

    res.status(200).json({
      success: true,
      message: 'Bulk email sending completed',
      data: result
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    next(error);
  }
};

// @desc    Clean up old data
// @route   POST /api/admin/maintenance/cleanup
// @access  Private/Admin
exports.cleanupSystem = async (req, res, next) => {
  try {
    const { days_to_keep = 365 } = req.body;

    const result = await cleanupOldData(parseInt(days_to_keep));

    res.status(200).json({
      success: true,
      message: 'System cleanup completed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Backup system data
// @route   POST /api/admin/maintenance/backup
// @access  Private/Admin
exports.backupSystem = async (req, res, next) => {
  try {
    const { collections } = req.body;

    const result = await backupCollections(collections);

    res.status(200).json({
      success: true,
      message: 'System backup completed',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user activities
// @route   GET /api/admin/activities
// @access  Private/Admin
exports.getUserActivities = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const dateFilters = getDateRangeFilter(req);
    const { user_id, activity_type } = req.query;
    
    const query = { ...dateFilters };
    if (user_id) query.user_id = user_id;
    if (activity_type) query.activity_type = activity_type;

    const activitiesQuery = UserActivity.find(query)
      .populate('user_id', 'email first_name last_name role');

    const activities = await applyPagination(activitiesQuery, page, limit, skip);
    const totalActivities = await UserActivity.countDocuments(query);

    res.status(200).json(buildPaginationResponse(activities, totalActivities, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get system health check
// @route   GET /api/admin/health
// @access  Private/Admin
exports.getSystemHealth = async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      database: 'connected',
      services: {},
      metrics: {}
    };

    // Check database connectivity
    try {
      await User.findOne().limit(1);
      health.database = 'connected';
    } catch (error) {
      health.database = 'disconnected';
      health.status = 'unhealthy';
    }

    // Get basic metrics
    health.metrics = {
      totalUsers: await User.countDocuments(),
      totalJobs: await Job.countDocuments(),
      totalApplications: await Application.countDocuments(),
      pendingReports: await Report.countDocuments({ status: 'pending' }),
      activeUsers: await User.countDocuments({ is_active: true }),
      activeJobs: await Job.countDocuments({ status: 'approved', is_active: true })
    };

    // Check for any critical issues
    const criticalIssues = [];
    
    if (health.metrics.pendingReports > 50) {
      criticalIssues.push('High number of pending reports');
    }

    if (health.metrics.activeJobs === 0) {
      criticalIssues.push('No active jobs in system');
    }

    if (criticalIssues.length > 0) {
      health.status = 'warning';
      health.issues = criticalIssues;
    }

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject user account
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body; // status: 'approved', 'rejected', 'suspended'
    console.log('Updating user status:', req.ip);
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user status
    user.is_active = status === 'approved';
    user.account_status = status;
    user.status_reason = reason || '';
    user.status_updated_by = req.user.id;
    user.status_updated_at = new Date();

    await user.save();

    // Log activity with better description
    const actionDescriptions = {
      'approved': 'Phê duyệt tài khoản',
      'rejected': 'Từ chối tài khoản', 
      'suspended': 'Tạm khóa tài khoản'
    };
    
    await UserActivity.create({
      user_id: req.user.id,
      activity_type: 'admin_action',
      entity_type: 'User',
      entity_id: user._id,
      description: `${actionDescriptions[status] || 'Cập nhật trạng thái'} tài khoản: ${user.email}`,
      ip_address: getClientIP(req),
      user_agent: req.get('User-Agent') || 'Unknown',
      activity_data: {
        target_user: user.email,
        action: status,
        reason: reason
      }
    });

    // Send notification to user
    await Notification.create({
      user_id: user._id,
      title: `Account ${status}`,
      message: reason ? `Your account has been ${status}. Reason: ${reason}` : `Your account has been ${status}.`,
      notification_type: 'system_announcement',
      related_entity_type: 'User',
      related_entity_id: user._id,
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: `User account ${status} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all jobs for admin management
// @route   GET /api/admin/jobs
// @access  Private/Admin
exports.getJobs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    const { status } = req.query;
    
    const query = { ...searchFilters };

    // Filter by status
    if (status) {
      query.status = status;
    }

    const jobsQuery = Job.find(query)
      .populate({
        path: 'recruiter_id',
        select: 'company_name',
        populate: {
          path: 'user_id',
          select: 'first_name last_name email phone'
        }
      })
      .populate('categories', 'name description')
      .populate({
        path: 'applications',
        select: 'application_status'
      });

    const jobs = await applyPagination(jobsQuery, page, limit, skip);
    const totalJobs = await Job.countDocuments(query);

    res.status(200).json(buildPaginationResponse(jobs, totalJobs, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject job posting
// @route   PUT /api/admin/jobs/:id/status
// @access  Private/Admin
exports.updateJobStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body; // status: 'approved', 'rejected', 'suspended'
    
    // Use findByIdAndUpdate to avoid full document validation
    // This prevents validation errors on legacy data with invalid enum values
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      {
        status: status,
        admin_notes: reason || '',
        reviewed_by: req.user.id,
        reviewed_at: new Date()
      },
      { new: true, runValidators: false }
    ).populate('recruiter_id');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Send notification to recruiter
    await Notification.create({
      user_id: job.recruiter_id.user_id,
      title: `Job Posting ${status}`,
      message: `Your job posting "${job.title}" has been ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      notification_type: 'system_announcement',
      related_entity_type: 'Job',
      related_entity_id: job._id,
      priority: 'medium'
    });

    res.status(200).json({
      success: true,
      message: `Job ${status} successfully`,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports for admin
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status, priority } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const reportsQuery = Report.find(query)
      .populate('reporter_id', 'email first_name last_name')
      .populate('reported_user_id', 'email first_name last_name')
      .populate('resolved_by', 'email first_name last_name');

    const reports = await applyPagination(reportsQuery, page, limit, skip);
    const totalReports = await Report.countDocuments(query);

    res.status(200).json(buildPaginationResponse(reports, totalReports, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve report
// @route   PUT /api/admin/reports/:id/resolve
// @access  Private/Admin
exports.resolveReport = async (req, res, next) => {
  try {
    const { resolution_action, admin_notes } = req.body;
    
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.status = 'resolved';
    report.resolution_action = resolution_action;
    report.admin_notes = admin_notes;
    report.resolved_by = req.user.id;
    report.resolved_at = new Date();

    await report.save();

    // If action is to suspend user, update user status
    if (resolution_action === 'suspend_user' && report.reported_user_id) {
      await User.findByIdAndUpdate(report.reported_user_id, {
        is_active: false,
        account_status: 'suspended',
        status_reason: `Suspended due to report: ${report.report_type}`,
        status_updated_by: req.user.id,
        status_updated_at: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report resolved successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private/Admin
exports.getPayments = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { status, payment_method } = req.query;
    
    const query = {};
    if (status) query.payment_status = status;
    if (payment_method) query.payment_method = payment_method;

    const paymentsQuery = Payment.find(query)
      .populate({
        path: 'recruiter_id',
        select: 'user_id company_name company_email',
        populate: {
          path: 'user_id',
          select: 'email first_name last_name phone'
        }
      })
      .populate({
        path: 'subscription_id',
        populate: {
          path: 'service_plan_id',
          select: 'name description price duration_days plan_type'
        }
      })
      .sort({ created_at: -1 });

    const rawPayments = await applyPagination(paymentsQuery, page, limit, skip);
    const totalPayments = await Payment.countDocuments(query);

    // Map payments to handle null recruiter_id with fallback data
    const payments = rawPayments.map(payment => {
      const paymentObj = payment.toObject();
      
      // Handle null recruiter_id
      if (!paymentObj.recruiter_id) {
        paymentObj.recruiter_id = {
          _id: payment._doc.recruiter_id || null,
          company_name: '[Đã xóa]',
          company_email: null,
          user_id: {
            _id: null,
            email: '[Người dùng đã xóa]',
            first_name: 'N/A',
            last_name: '',
            phone: null
          }
        };
      } else if (!paymentObj.recruiter_id.user_id) {
        // Handle case where recruiter exists but user_id is null
        paymentObj.recruiter_id.user_id = {
          _id: null,
          email: '[Người dùng đã xóa]',
          first_name: 'N/A',
          last_name: '',
          phone: null
        };
      }

      // Handle null service_plan in subscription
      if (paymentObj.subscription_id && !paymentObj.subscription_id.service_plan_id) {
        paymentObj.subscription_id.service_plan_id = {
          _id: null,
          name: '[Gói đã xóa]',
          description: '',
          price: 0,
          duration_days: 0,
          plan_type: 'basic'
        };
      }

      return paymentObj;
    });

    // Calculate total revenue
    const revenueStats = await Payment.aggregate([
      { $match: { payment_status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const response = buildPaginationResponse(payments, totalPayments, page, limit);
    response.revenue = revenueStats[0] || { totalRevenue: 0, count: 0 };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all email templates
// @route   GET /api/admin/email-templates
// @access  Private/Admin
exports.getEmailTemplates = async (req, res, next) => {
  try {
    const { template_type, is_active } = req.query;
    const query = {};

    if (template_type) query.template_type = template_type;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const templates = await EmailTemplate.find(query)
      .populate('created_by', 'email first_name last_name')
      .populate('last_modified_by', 'email first_name last_name')
      .sort('-updated_at');

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create email template
// @route   POST /api/admin/email-templates
// @access  Private/Admin
exports.createEmailTemplate = async (req, res, next) => {
  try {
    req.body.created_by = req.user.id;
    req.body.last_modified_by = req.user.id;

    const template = await EmailTemplate.create(req.body);

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update email template
// @route   PUT /api/admin/email-templates/:id
// @access  Private/Admin
exports.updateEmailTemplate = async (req, res, next) => {
  try {
    req.body.last_modified_by = req.user.id;

    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete email template
// @route   DELETE /api/admin/email-templates/:id
// @access  Private/Admin
exports.deleteEmailTemplate = async (req, res, next) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send system notification to all users or specific role
// @route   POST /api/admin/notifications/broadcast
// @access  Private/Admin
exports.broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, notification_type, target_role, priority } = req.body;
    
    // Get target users
    const query = target_role ? { role: target_role } : {};
    const users = await User.find(query).select('_id');

    // Create notifications for all target users
    const notifications = users.map(user => ({
      user_id: user._id,
      title,
      message,
      notification_type: notification_type || 'system_announcement',
      priority: priority || 'medium'
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      data: {
        title,
        message,
        target_count: users.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getSystemAnalytics = async (req, res, next) => {
  try {
    const { timeRange = '30days' } = req.query;
    
    // Parse time range
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 365;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - (days * 2));

    // === Calculate Key Metrics ===
    
    // User growth calculation
    const [currentPeriodUsers, previousPeriodUsers] = await Promise.all([
      User.countDocuments({ created_at: { $gte: startDate } }),
      User.countDocuments({ created_at: { $gte: previousStartDate, $lt: startDate } })
    ]);
    
    const userGrowthPercent = previousPeriodUsers > 0 
      ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers * 100).toFixed(1)
      : currentPeriodUsers > 0 ? 100 : 0;

    // New jobs count
    const newJobsCount = await Job.countDocuments({ created_at: { $gte: startDate } });

    // Application rate calculation
    const totalJobs = await Job.countDocuments({ status: 'approved', is_active: true });
    const totalApplications = await Application.countDocuments({ created_at: { $gte: startDate } });
    const applicationRate = totalJobs > 0 
      ? ((totalApplications / totalJobs) * 100).toFixed(1)
      : 0;

    // Monthly revenue (last 30 days)
    const revenueResult = await Payment.aggregate([
      { 
        $match: { 
          payment_status: 'completed',
          created_at: { $gte: startDate }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyRevenue = revenueResult[0]?.total 
      ? Math.round(revenueResult[0].total / 1000000) 
      : 0;

    // === User Distribution ===
    const userDistributionData = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const userDistribution = {
      candidates: userDistributionData.find(u => u._id === 'candidate')?.count || 0,
      recruiters: userDistributionData.find(u => u._id === 'recruiter')?.count || 0,
      admins: userDistributionData.find(u => u._id === 'admin')?.count || 0
    };

    // === Top Skills ===
    const topSkillsData = await Job.aggregate([
      { $match: { status: 'approved' } },
      { $unwind: { path: '$required_skills', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$required_skills',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    const maxSkillCount = topSkillsData[0]?.count || 1;
    const topSkills = topSkillsData.map(item => ({
      skill: item._id,
      count: item.count,
      percent: Math.round((item.count / maxSkillCount) * 100)
    }));

    // === Top Locations ===
    const topLocationsData = await Job.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$location.city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    const maxLocationCount = topLocationsData[0]?.count || 1;
    const topLocations = topLocationsData.map(item => ({
      location: item._id || 'Khác',
      count: item.count,
      percent: Math.round((item.count / maxLocationCount) * 100)
    }));

    // === Salary Ranges ===
    const salaryRangesData = await Job.aggregate([
      { $match: { status: 'approved', salary_min: { $exists: true, $ne: null } } },
      {
        $project: {
          salaryRange: {
            $switch: {
              branches: [
                { case: { $lte: ['$salary_min', 15000000] }, then: '10-15M VNĐ' },
                { case: { $lte: ['$salary_min', 25000000] }, then: '15-25M VNĐ' },
                { case: { $lte: ['$salary_min', 40000000] }, then: '25-40M VNĐ' },
                { case: { $lte: ['$salary_min', 60000000] }, then: '40-60M VNĐ' }
              ],
              default: '60M+ VNĐ'
            }
          }
        }
      },
      {
        $group: {
          _id: '$salaryRange',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const maxSalaryCount = salaryRangesData[0]?.count || 1;
    const salaryRanges = salaryRangesData.map(item => ({
      range: item._id,
      count: item.count,
      percent: Math.round((item.count / maxSalaryCount) * 100)
    }));

    res.status(200).json({
      success: true,
      data: {
        // Key metrics for cards
        userGrowthPercent: parseFloat(userGrowthPercent),
        newJobsCount,
        applicationRate: parseFloat(applicationRate),
        monthlyRevenue,
        
        // User distribution for pie chart
        userDistribution,
        
        // Summary stats for lists
        topSkills,
        topLocations,
        salaryRanges,
        
        // Period info
        period: `${days} days`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export users data
// @route   GET /api/admin/export/users
// @access  Private/Admin
exports.exportUsers = async (req, res, next) => {
  try {
    const { role, format = 'json' } = req.query;
    const query = role ? { role } : {};

    const users = await User.find(query)
      .select('-password')
      .populate('candidate_profile')
      .populate('recruiter_profile')
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csv = users.map(user => ({
        id: user._id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login: user.last_login
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      
      // Simple CSV conversion (in production, use a proper CSV library)
      const csvContent = [
        Object.keys(csv[0]).join(','),
        ...csv.map(row => Object.values(row).join(','))
      ].join('\n');

      res.send(csvContent);
    } else {
      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all service plans
// @route   GET /api/admin/service-plans
// @access  Private/Admin
exports.getServicePlans = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { is_active, plan_type } = req.query;
    
    const query = {};
    if (is_active !== undefined) query.is_active = is_active === 'true';
    if (plan_type) query.plan_type = plan_type;

    const totalPlans = await ServicePlan.countDocuments(query);
    const plans = await ServicePlan.find(query)
      .sort({ sort_order: 1, created_at: -1 })
      .skip(skip)
      .limit(limit);

    const pagination = buildPaginationResponse(page, limit, totalPlans);

    res.status(200).json({
      success: true,
      count: plans.length,
      pagination,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create service plan
// @route   POST /api/admin/service-plans
// @access  Private/Admin
exports.createServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Service plan created successfully',
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service plan
// @route   PUT /api/admin/service-plans/:id
// @access  Private/Admin
exports.updateServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service plan updated successfully',
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service plan
// @route   DELETE /api/admin/service-plans/:id
// @access  Private/Admin
exports.deleteServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }

    // Check if plan is being used by any active subscriptions
    const activeSubscriptions = await RecruiterSubscription.countDocuments({
      plan_type: plan.plan_type,
      payment_status: 'paid',
      end_date: { $gt: new Date() }
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${activeSubscriptions} active subscriptions are using this plan.`
      });
    }

    await plan.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Service plan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle service plan status
// @route   PUT /api/admin/service-plans/:id/toggle-status
// @access  Private/Admin
exports.toggleServicePlanStatus = async (req, res, next) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }

    plan.is_active = !plan.is_active;
    await plan.save();

    res.status(200).json({
      success: true,
      message: `Service plan ${plan.is_active ? 'activated' : 'deactivated'} successfully`,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all subscriptions
// @route   GET /api/admin/subscriptions
// @access  Private/Admin
exports.getSubscriptions = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { payment_status, plan_type, search } = req.query;
    
    const query = {};
    if (payment_status) query.payment_status = payment_status;
    if (plan_type) query.plan_type = plan_type;

    // Search by recruiter company name or email
    if (search) {
      const users = await User.find({
        $or: [
          { email: { $regex: search, $options: 'i' } },
        ]
      }).select('_id');
      
      const recruiters = await Recruiter.find({
        $or: [
          { company_name: { $regex: search, $options: 'i' } },
          { user_id: { $in: users.map(u => u._id) } }
        ]
      }).select('_id');

      if (recruiters.length > 0) {
        query.recruiter_id = { $in: recruiters.map(r => r._id) };
      } else {
        query.recruiter_id = null; // No results
      }
    }

    const totalSubscriptions = await RecruiterSubscription.countDocuments(query);
    const rawSubscriptions = await RecruiterSubscription.find(query)
      .populate({
        path: 'recruiter_id',
        select: 'company_name company_email company_phone user_id',
        populate: {
          path: 'user_id',
          select: 'email phone first_name last_name'
        }
      })
      .populate('service_plan_id', 'name description price duration_days plan_type')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    // Map subscriptions to handle null recruiter_id with fallback data
    const subscriptions = rawSubscriptions.map(subscription => {
      const subObj = subscription.toObject();
      
      // Handle null recruiter_id
      if (!subObj.recruiter_id) {
        subObj.recruiter_id = {
          _id: subscription._doc.recruiter_id || null,
          company_name: '[Đã xóa]',
          company_email: null,
          company_phone: null,
          user_id: {
            _id: null,
            email: '[Người dùng đã xóa]',
            phone: null,
            first_name: 'N/A',
            last_name: ''
          }
        };
      } else if (!subObj.recruiter_id.user_id) {
        // Handle case where recruiter exists but user_id is null
        subObj.recruiter_id.user_id = {
          _id: null,
          email: '[Người dùng đã xóa]',
          phone: null,
          first_name: 'N/A',
          last_name: ''
        };
      }

      // Handle null service_plan_id
      if (!subObj.service_plan_id) {
        subObj.service_plan_id = {
          _id: subscription._doc.service_plan_id || null,
          name: '[Gói đã xóa]',
          description: '',
          price: 0,
          duration_days: 0,
          plan_type: 'basic'
        };
      }

      return subObj;
    });

    const pagination = buildPaginationResponse(page, limit, totalSubscriptions);

    res.status(200).json({
      success: true,
      count: subscriptions.length,
      pagination,
      data: subscriptions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update subscription status
// @route   PUT /api/admin/subscriptions/:id/status
// @access  Private/Admin
exports.updateSubscriptionStatus = async (req, res, next) => {
  try {
    const { payment_status, admin_notes } = req.body;
    
    const subscription = await RecruiterSubscription.findById(req.params.id)
      .populate('recruiter_id');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    subscription.payment_status = payment_status;
    if (admin_notes) subscription.admin_notes = admin_notes;
    
    await subscription.save();

    // Send notification to recruiter
    await Notification.create({
      user_id: subscription.recruiter_id.user_id,
      title: `Subscription ${payment_status}`,
      message: `Your ${subscription.plan_type} subscription status has been updated to ${payment_status}.`,
      notification_type: 'payment_reminder',
      related_entity_type: 'Payment',
      related_entity_id: subscription._id,
      priority: 'medium'
    });

    res.status(200).json({
      success: true,
      message: 'Subscription status updated successfully',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subscription statistics
// @route   GET /api/admin/subscriptions/stats
// @access  Private/Admin
exports.getSubscriptionStats = async (req, res, next) => {
  try {
    const stats = await Promise.all([
      RecruiterSubscription.countDocuments(),
      RecruiterSubscription.countDocuments({ payment_status: 'paid' }),
      RecruiterSubscription.countDocuments({ payment_status: 'pending' }),
      RecruiterSubscription.countDocuments({ payment_status: 'failed' }),
      RecruiterSubscription.countDocuments({ 
        payment_status: 'paid',
        end_date: { $gt: new Date() }
      }),
      RecruiterSubscription.countDocuments({ 
        payment_status: 'paid',
        end_date: { $lt: new Date() }
      })
    ]);

    const [
      totalSubscriptions,
      paidSubscriptions,
      pendingSubscriptions,
      failedSubscriptions,
      activeSubscriptions,
      expiredSubscriptions
    ] = stats;

    // Get revenue statistics
    const revenueStats = await RecruiterSubscription.aggregate([
      {
        $match: { payment_status: 'paid' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    // Get subscriptions by plan type
    const planTypeStats = await RecruiterSubscription.aggregate([
      {
        $group: {
          _id: '$plan_type',
          count: { $sum: 1 },
          revenue: { 
            $sum: { 
              $cond: [{ $eq: ['$payment_status', 'paid'] }, '$price', 0] 
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalSubscriptions,
          paidSubscriptions,
          pendingSubscriptions,
          failedSubscriptions,
          activeSubscriptions,
          expiredSubscriptions
        },
        revenue: revenueStats[0] || { totalRevenue: 0, averagePrice: 0 },
        planTypes: planTypeStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
exports.getSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.getAllSettings();
    
    // If no settings exist, initialize with defaults
    if (Object.keys(settings).length === 0) {
      await SystemSetting.initializeDefaults(req.user.id);
      settings = await SystemSetting.getAllSettings();
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings/:section
// @access  Private/Admin
exports.updateSettings = async (req, res, next) => {
  try {
    const { section } = req.params;
    const settingsData = req.body;

    // Validate section
    const validSections = ['general', 'email', 'seo', 'payment', 'security', 'notifications'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings section'
      });
    }

    // Update settings in database
    const updatedSetting = await SystemSetting.updateBySection(section, settingsData, req.user.id);

    res.status(200).json({
      success: true,
      message: `${section} settings updated successfully`,
      data: {
        section: updatedSetting.section,
        settings: updatedSetting.settings,
        lastUpdatedBy: updatedSetting.last_updated_by,
        updatedAt: updatedSetting.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test email settings
// @route   POST /api/admin/settings/test-email
// @access  Private/Admin
exports.testEmailSettings = async (req, res, next) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, testRecipient } = req.body;

    // Validate required fields
    if (!smtpHost || !smtpPort || !smtpUser || !fromEmail || !testRecipient) {
      return res.status(400).json({
        success: false,
        message: 'Missing required email settings'
      });
    }

    // In a real application, you would use nodemailer or similar to send actual test email
    console.log('Testing email settings:', {
      smtpHost,
      smtpPort,
      smtpUser,
      fromEmail,
      testRecipient
    });

    // Simulate test delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate validation - check if settings are reasonable
    const isValidPort = smtpPort >= 25 && smtpPort <= 65535;
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient);
    const isValidHost = smtpHost && smtpHost.length > 0;

    if (!isValidPort || !isValidEmail || !isValidHost) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email settings. Please check your configuration.'
      });
    }

    // For demo purposes, simulate random success/failure
    const isSuccess = Math.random() > 0.1; // 90% success rate

    if (isSuccess) {
      res.status(200).json({
        success: true,
        message: 'Test email sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send test email. Please check your SMTP settings.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Test payment settings
// @route   POST /api/admin/settings/test-payment
// @access  Private/Admin
exports.testPaymentSettings = async (req, res, next) => {
  try {
    const paymentSettings = req.body;

    // Mock payment test - in real app, this would test payment gateway connection
    console.log('Testing payment settings:', paymentSettings);

    // Simulate test delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate random success/failure for demo
    const isSuccess = Math.random() > 0.3; // 70% success rate

    if (isSuccess) {
      res.status(200).json({
        success: true,
        message: 'Payment gateway connection successful'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to connect to payment gateway. Please check your configuration.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all notifications for admin
// @route   GET /api/admin/notifications
// @access  Private/Admin
exports.getNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { notification_type, is_read, priority } = req.query;
    
    const query = {};
    if (notification_type) query.notification_type = notification_type;
    if (is_read !== undefined) query.is_read = is_read === 'true';
    if (priority) query.priority = priority;

    const totalNotifications = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .populate('user_id', 'email first_name last_name role')
      .sort('-created_at')
      .skip(skip)
      .limit(limit);

    const pagination = buildPaginationResponse(page, limit, totalNotifications);

    res.status(200).json({
      success: true,
      count: notifications.length,
      pagination,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create notification
// @route   POST /api/admin/notifications
// @access  Private/Admin
exports.createNotification = async (req, res, next) => {
  try {
    // Map frontend field names to backend model fields
    const notificationData = {
      user_id: req.body.user_id || req.user.id,
      title: req.body.title,
      message: req.body.message,
      notification_type: req.body.type || req.body.notification_type || 'system_announcement',
      priority: req.body.priority || 'medium',
      scheduled_at: req.body.scheduled_at || req.body.scheduledAt || null,
      target: req.body.target,
      status: req.body.status || 'draft'
    };

    const notification = await Notification.create(notificationData);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update notification
// @route   PUT /api/admin/notifications/:id
// @access  Private/Admin
exports.updateNotification = async (req, res, next) => {
  try {
    // Map frontend field names to backend model fields
    const updateData = {
      title: req.body.title,
      message: req.body.message,
      notification_type: req.body.type || req.body.notification_type,
      priority: req.body.priority,
      scheduled_at: req.body.scheduled_at || req.body.scheduledAt,
      target: req.body.target,
      status: req.body.status
    };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification updated successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/admin/notifications/:id
// @access  Private/Admin
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send notification
// @route   POST /api/admin/notifications/:id/send
// @access  Private/Admin
exports.sendNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // In real app, send the notification
    notification.status = 'sent';
    notification.sent_at = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset settings to default
// @route   POST /api/admin/settings/:section/reset
// @access  Private/Admin
exports.resetSettings = async (req, res, next) => {
  try {
    const { section } = req.params;
    
    // Default settings for each section
    const defaultSettings = {
      general: {
        siteName: 'IT Jobs Platform',
        siteDescription: 'Nền tảng tuyển dụng IT hàng đầu Việt Nam',
        contactEmail: 'contact@itjobs.vn',
        supportEmail: 'support@itjobs.vn',
        maxJobPostingDays: 30,
        maxFreeJobPosts: 3,
        enableRegistration: true,
        enableJobPosting: true,
        enableUserReports: true
      },
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: 'noreply@itjobs.vn',
        fromName: 'IT Jobs Platform'
      },
      seo: {
        metaTitle: 'IT Jobs - Việc làm IT hàng đầu',
        metaDescription: 'Tìm kiếm và ứng tuyển các vị trí việc làm IT tốt nhất tại Việt Nam',
        metaKeywords: 'việc làm IT, tuyển dụng IT, jobs, careers',
        ogTitle: 'IT Jobs Platform',
        ogDescription: 'Nền tảng tuyển dụng IT hàng đầu Việt Nam',
        ogImage: '/og-image.jpg'
      },
      payment: {
        enablePayment: true,
        currency: 'VND',
        paymentMethods: ['vnpay', 'momo', 'bank_transfer'],
        taxRate: 10
      },
      security: {
        passwordMinLength: 8,
        sessionTimeout: 24,
        maxLoginAttempts: 5,
        enableTwoFactor: false,
        requireEmailVerification: true,
        enableCaptcha: true
      }
    };

    if (!defaultSettings[section]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid settings section'
      });
    }

    // In real app, update settings in database
    res.status(200).json({
      success: true,
      message: `${section} settings reset to default`,
      data: defaultSettings[section]
    });
  } catch (error) {
    next(error);
  }
};
