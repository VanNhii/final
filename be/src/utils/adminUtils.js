const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Report = require('../models/Report');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const EmailTemplate = require('../models/EmailTemplate');
const { sendEmail } = require('./emailService');

// Generate system reports
const generateSystemReport = async (type, period = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  switch (type) {
    case 'users':
      return await generateUserReport(startDate);
    case 'jobs':
      return await generateJobReport(startDate);
    case 'applications':
      return await generateApplicationReport(startDate);
    case 'revenue':
      return await generateRevenueReport(startDate);
    default:
      throw new Error('Invalid report type');
  }
};

const generateUserReport = async (startDate) => {
  const totalUsers = await User.countDocuments();
  const newUsers = await User.countDocuments({ created_at: { $gte: startDate } });
  const activeUsers = await User.countDocuments({ is_active: true });
  const pendingUsers = await User.countDocuments({ account_status: 'pending' });
  
  const usersByRole = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);

  const userRegistrationTrend = await User.aggregate([
    {
      $match: { created_at: { $gte: startDate } }
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

  return {
    summary: {
      totalUsers,
      newUsers,
      activeUsers,
      pendingUsers
    },
    usersByRole,
    registrationTrend: userRegistrationTrend
  };
};

const generateJobReport = async (startDate) => {
  const totalJobs = await Job.countDocuments();
  const newJobs = await Job.countDocuments({ created_at: { $gte: startDate } });
  const activeJobs = await Job.countDocuments({ status: 'approved', is_active: true });
  const pendingJobs = await Job.countDocuments({ status: 'pending' });

  const jobsByCategory = await Job.aggregate([
    {
      $lookup: {
        from: 'jobcategories',
        localField: 'category_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
    },
    {
      $group: {
        _id: '$category.name',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  const jobsByLocation = await Job.aggregate([
    {
      $group: {
        _id: '$location.city',
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

  return {
    summary: {
      totalJobs,
      newJobs,
      activeJobs,
      pendingJobs
    },
    jobsByCategory,
    jobsByLocation
  };
};

const generateApplicationReport = async (startDate) => {
  const totalApplications = await Application.countDocuments();
  const newApplications = await Application.countDocuments({ created_at: { $gte: startDate } });
  
  const applicationsByStatus = await Application.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const applicationTrend = await Application.aggregate([
    {
      $match: { created_at: { $gte: startDate } }
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

  return {
    summary: {
      totalApplications,
      newApplications
    },
    applicationsByStatus,
    applicationTrend
  };
};

const generateRevenueReport = async (startDate) => {
  const totalRevenue = await Payment.aggregate([
    {
      $match: { payment_status: 'completed' }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const recentRevenue = await Payment.aggregate([
    {
      $match: { 
        payment_status: 'completed',
        created_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const revenueByMonth = await Payment.aggregate([
    {
      $match: { 
        payment_status: 'completed',
        created_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$created_at' },
          month: { $month: '$created_at' }
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    }
  ]);

  return {
    summary: {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTransactions: totalRevenue[0]?.count || 0,
      recentRevenue: recentRevenue[0]?.total || 0,
      recentTransactions: recentRevenue[0]?.count || 0
    },
    revenueByMonth
  };
};

// Send bulk emails using templates
const sendBulkEmails = async (templateName, recipients, variables = {}) => {
  try {
    const template = await EmailTemplate.findOne({ 
      template_name: templateName,
      is_active: true 
    });

    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const emailPromises = recipients.map(recipient => {
      // Replace variables in template content
      let content = template.content;
      let subject = template.subject;

      // Replace common variables
      const allVariables = {
        ...variables,
        user_name: recipient.full_name || recipient.email,
        user_email: recipient.email
      };

      Object.keys(allVariables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, allVariables[key]);
        subject = subject.replace(regex, allVariables[key]);
      });

      return sendEmail({
        to: recipient.email,
        subject: subject,
        html: content
      });
    });

    const results = await Promise.allSettled(emailPromises);
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return {
      total: recipients.length,
      successful,
      failed,
      details: results
    };
  } catch (error) {
    throw new Error(`Failed to send bulk emails: ${error.message}`);
  }
};

// Clean up old data
const cleanupOldData = async (daysToKeep = 365) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const results = {
    deletedActivities: 0,
    deletedNotifications: 0,
    deletedReports: 0
  };

  // Clean up old user activities (already handled by TTL index)
  // Clean up old notifications
  const deletedNotifications = await Notification.deleteMany({
    created_at: { $lt: cutoffDate },
    is_read: true
  });
  results.deletedNotifications = deletedNotifications.deletedCount;

  // Clean up resolved reports older than cutoff
  const deletedReports = await Report.deleteMany({
    created_at: { $lt: cutoffDate },
    status: 'resolved'
  });
  results.deletedReports = deletedReports.deletedCount;

  return results;
};

// Backup database collections
const backupCollections = async (collections = []) => {
  // This would integrate with your backup strategy
  // For now, just return collection stats
  const backupInfo = {
    timestamp: new Date(),
    collections: {}
  };

  const defaultCollections = ['users', 'jobs', 'applications', 'payments'];
  const collectionsToBackup = collections.length > 0 ? collections : defaultCollections;

  for (const collectionName of collectionsToBackup) {
    try {
      let model;
      switch (collectionName) {
        case 'users':
          model = User;
          break;
        case 'jobs':
          model = Job;
          break;
        case 'applications':
          model = Application;
          break;
        case 'payments':
          model = Payment;
          break;
        default:
          continue;
      }

      const count = await model.countDocuments();
      backupInfo.collections[collectionName] = {
        documentCount: count,
        status: 'completed'
      };
    } catch (error) {
      backupInfo.collections[collectionName] = {
        status: 'failed',
        error: error.message
      };
    }
  }

  return backupInfo;
};
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         '127.0.0.1';
};
module.exports = {
  generateSystemReport,
  sendBulkEmails,
  cleanupOldData,
  backupCollections,
  getClientIP
};
