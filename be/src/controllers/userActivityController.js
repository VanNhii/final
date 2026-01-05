const UserActivity = require('../models/UserActivity');
const { getPaginationParams, buildPaginationResponse, applyPagination, getDateRangeFilter } = require('../utils/pagination');
const { getClientIP } = require('../utils/adminUtils');

// @desc    Log user activity
// @route   POST /api/v1/user-activity
// @access  Private
exports.logActivity = async (req, res, next) => {
  try {
    const { activity_type, entity_type, entity_id, activity_data, description } = req.body;
    
    const activity = await UserActivity.create({
      user_id: req.user.id,
      activity_type,
      entity_type,
      entity_id,
      activity_data,
      description,
      ip_address: getClientIP(req),
      user_agent: req.get('User-Agent')
    });
    
    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's activity log
// @route   GET /api/v1/user-activity
// @access  Private
exports.getUserActivity = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { activity_type, entity_type, start_date, end_date } = req.query;
    
    const query = { user_id: req.user.id };
    
    if (activity_type) query.activity_type = activity_type;
    if (entity_type) query.entity_type = entity_type;
    
    // Date range filter
    const dateFilter = getDateRangeFilter(start_date, end_date);
    if (dateFilter) query.created_at = dateFilter;
    
    const activitiesQuery = UserActivity.find(query)
      .sort('-created_at');
    
    const activities = await applyPagination(activitiesQuery, page, limit, skip);
    const total = await UserActivity.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(activities, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity analytics for user
// @route   GET /api/v1/user-activity/analytics
// @access  Private
exports.getUserActivityAnalytics = async (req, res, next) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    // Activity by type
    const activityByType = await UserActivity.aggregate([
      { 
        $match: { 
          user_id: new mongoose.Types.ObjectId(req.user.id),
          created_at: { $gte: startDate } 
        } 
      },
      { $group: { _id: '$activity_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Daily activity trend
    const dailyActivity = await UserActivity.aggregate([
      { 
        $match: { 
          user_id: new mongoose.Types.ObjectId(req.user.id),
          created_at: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: `${period} days`,
        activityByType,
        dailyActivity,
        totalActivities: activityByType.reduce((sum, item) => sum + item.count, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all user activities (Admin only)
// @route   GET /api/v1/user-activity/admin
// @access  Private/Admin
exports.getAllUserActivities = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const { user_id, activity_type, entity_type, start_date, end_date } = req.query;
    
    const query = {};
    
    if (user_id) query.user_id = user_id;
    if (activity_type) query.activity_type = activity_type;
    if (entity_type) query.entity_type = entity_type;
    
    // Date range filter
    const dateFilter = getDateRangeFilter(start_date, end_date);
    if (dateFilter) query.created_at = dateFilter;
    
    const activitiesQuery = UserActivity.find(query)
      .populate('user_id', 'first_name last_name email role')
      .sort('-created_at');
    
    const activities = await applyPagination(activitiesQuery, page, limit, skip);
    const total = await UserActivity.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(activities, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get system activity analytics (Admin only)
// @route   GET /api/v1/user-activity/admin/analytics
// @access  Private/Admin
exports.getSystemActivityAnalytics = async (req, res, next) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    // Activity by type
    const activityByType = await UserActivity.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      { $group: { _id: '$activity_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Most active users
    const mostActiveUsers = await UserActivity.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          user_id: '$_id',
          activity_count: '$count',
          user_name: { $concat: ['$user.first_name', ' ', '$user.last_name'] },
          user_email: '$user.email'
        }
      }
    ]);
    
    // Daily activity trend
    const dailyActivity = await UserActivity.aggregate([
      { $match: { created_at: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        period: `${period} days`,
        activityByType,
        mostActiveUsers,
        dailyActivity,
        totalActivities: activityByType.reduce((sum, item) => sum + item.count, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to log activity from other controllers
exports.logUserActivity = async (userId, activityType, entityType = null, entityId = null, activityData = {}, description = '', req = null) => {
  try {
    await UserActivity.create({
      user_id: userId,
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      activity_data: activityData,
      description,
      ip_address: req ? getClientIP(req) : null,
      user_agent: req ? req.get('User-Agent') : null
    });
  } catch (error) {
    console.error('Error logging user activity:', error);
  }
};