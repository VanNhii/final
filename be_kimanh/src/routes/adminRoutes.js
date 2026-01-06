const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { logAdminAction } = require('../middleware/activityTracker');
const {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getJobs,
  updateJobStatus,
  getReports,
  resolveReport,
  getPayments,
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  broadcastNotification,
  getSystemAnalytics,
  getUserGrowthData,
  getJobStatistics,
  getApplicationStatistics,
  getRevenueStatistics,
  exportUsers,
  generateReport,
  sendBulkEmails,
  cleanupSystem,
  backupSystem,
  getUserActivities,
  getSystemHealth,
  getSystemStatus,
  getMaintenanceTasks,
  runMaintenanceTask,
  scheduleMaintenanceTask,
  enableMaintenanceMode,
  disableMaintenanceMode,
  getServicePlans,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  toggleServicePlanStatus,
  getSubscriptions,
  updateSubscriptionStatus,
  getSubscriptionStats,
  getSettings,
  updateSettings,
  resetSettings,
  testEmailSettings,
  testPaymentSettings,
  getNotifications,
  createNotification,
  updateNotification,
  exportAnalyticsReport,
  sendNotification,
  deleteNotification
} = require('../controllers/adminController');

// Import report controller functions
const {
  updateReportStatus
} = require('../controllers/reportController');

// Import payment controller functions  
const {
  updatePaymentStatus,
  processRefund
} = require('../controllers/paymentController');

// Import job category functions
const {
  getJobCategoriesForAdmin,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  toggleJobCategoryStatus,
  reorderJobCategories,
  getCategoryStats
} = require('../controllers/jobCategoryController');

// Import subscription checker utilities
const {
  checkExpiredSubscriptions,
  sendExpiryReminders,
  cleanupPendingSubscriptions,
  getSubscriptionStats: getSubscriptionStatistics
} = require('../utils/subscriptionChecker');

const router = express.Router();

router.use(protect); // All routes below require authentication
router.use(authorize('admin')); // All routes require admin access

// Dashboard & Analytics
router.get('/dashboard', getDashboardStats);
router.get('/analytics', getSystemAnalytics);
router.get('/analytics/user-growth', getUserGrowthData);
router.get('/analytics/job-stats', getJobStatistics);
router.get('/analytics/application-stats', getApplicationStatistics);
router.get('/analytics/revenue-stats', getRevenueStatistics);
router.post('/analytics/export', logAdminAction('export_analytics'), exportAnalyticsReport);
router.get('/health', getSystemHealth);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/status', logAdminAction('update_user_status'), updateUserStatus);
router.get('/export/users', logAdminAction('export_users'), exportUsers);

// User Activities
router.get('/activities', getUserActivities);

// Job Management
router.get('/jobs', getJobs);
router.put('/jobs/:id/status', logAdminAction('update_job_status'), updateJobStatus);

// Job Category Management
router.get('/job-categories', getJobCategoriesForAdmin);
router.get('/job-categories/stats', getCategoryStats);
router.post('/job-categories', logAdminAction('create_job_category'), createJobCategory);
router.put('/job-categories/:id', logAdminAction('update_job_category'), updateJobCategory);
router.delete('/job-categories/:id', logAdminAction('delete_job_category'), deleteJobCategory);
router.put('/job-categories/:id/toggle-status', logAdminAction('toggle_category_status'), toggleJobCategoryStatus);
router.put('/job-categories/reorder', logAdminAction('reorder_categories'), reorderJobCategories);

// Report Management
router.get('/reports', getReports);
router.put('/reports/:id/status', logAdminAction('update_report_status'), updateReportStatus);
router.put('/reports/:id/resolve', logAdminAction('resolve_report'), resolveReport);

// System Reports
router.get('/reports/system/:type', logAdminAction('generate_system_report'), generateReport);

// Payment Management
router.get('/payments', getPayments);
router.put('/payments/:id/status', logAdminAction('update_payment_status'), updatePaymentStatus);
router.put('/payments/:id/refund', logAdminAction('process_refund'), processRefund);

// Service Plan Management
router.get('/service-plans', getServicePlans);
router.post('/service-plans', logAdminAction('create_service_plan'), createServicePlan);
router.put('/service-plans/:id', logAdminAction('update_service_plan'), updateServicePlan);
router.delete('/service-plans/:id', logAdminAction('delete_service_plan'), deleteServicePlan);
router.put('/service-plans/:id/toggle-status', logAdminAction('toggle_service_plan_status'), toggleServicePlanStatus);

// Subscription Management
router.get('/subscriptions', getSubscriptions);
router.get('/subscriptions/stats', getSubscriptionStats);
router.put('/subscriptions/:id/status', logAdminAction('update_subscription_status'), updateSubscriptionStatus);

// Subscription Maintenance Tasks
router.post('/subscriptions/check-expired', logAdminAction('check_expired_subscriptions'), async (req, res, next) => {
  try {
    const result = await checkExpiredSubscriptions();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/subscriptions/send-reminders', logAdminAction('send_expiry_reminders'), async (req, res, next) => {
  try {
    const { days = 7 } = req.body;
    const result = await sendExpiryReminders(days);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/subscriptions/cleanup-pending', logAdminAction('cleanup_pending_subscriptions'), async (req, res, next) => {
  try {
    const { days = 3 } = req.body;
    const result = await cleanupPendingSubscriptions(days);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/subscriptions/statistics', async (req, res, next) => {
  try {
    const result = await getSubscriptionStatistics();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Email Management
router.get('/email-templates', getEmailTemplates);
router.post('/email-templates', logAdminAction('create_email_template'), createEmailTemplate);
router.put('/email-templates/:id', logAdminAction('update_email_template'), updateEmailTemplate);
router.delete('/email-templates/:id', logAdminAction('delete_email_template'), deleteEmailTemplate);
router.post('/emails/bulk', logAdminAction('send_bulk_emails'), sendBulkEmails);

// Notification Management
router.get('/notifications/unread-count', async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    const count = await Notification.countDocuments({
      recipient_id: req.user.id,
      is_read: false
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
});
router.put('/notifications/:id/read', async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { is_read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Thông báo không tồn tại' });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});
router.put('/notifications/mark-all-read', async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    await Notification.updateMany(
      { recipient_id: req.user.id, is_read: false },
      { is_read: true }
    );
    res.status(200).json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    next(error);
  }
});
router.get('/notifications', getNotifications);
router.post('/notifications', logAdminAction('create_notification'), createNotification);
router.put('/notifications/:id', logAdminAction('update_notification'), updateNotification);
router.delete('/notifications/:id', logAdminAction('delete_notification'), deleteNotification);
router.post('/notifications/:id/send', logAdminAction('send_notification'), sendNotification);
router.post('/notifications/broadcast', logAdminAction('broadcast_notification'), broadcastNotification);

// Maintenance
router.get('/maintenance/status', getSystemStatus);
router.get('/maintenance/tasks', getMaintenanceTasks);
router.post('/maintenance/tasks/:id/run', logAdminAction('run_maintenance_task'), runMaintenanceTask);
router.post('/maintenance/tasks/:id/schedule', logAdminAction('schedule_maintenance_task'), scheduleMaintenanceTask);
router.post('/maintenance/mode/enable', logAdminAction('enable_maintenance_mode'), enableMaintenanceMode);
router.post('/maintenance/mode/disable', logAdminAction('disable_maintenance_mode'), disableMaintenanceMode);
router.post('/maintenance/cleanup', logAdminAction('system_cleanup'), cleanupSystem);
router.post('/maintenance/backup', logAdminAction('system_backup'), backupSystem);

// Settings routes
router.get('/settings', logAdminAction('get_settings'), getSettings);
router.put('/settings/:section', logAdminAction('update_settings'), updateSettings);
router.post('/settings/:section/reset', logAdminAction('reset_settings'), resetSettings);
router.post('/settings/test-email', logAdminAction('test_email_settings'), testEmailSettings);
router.post('/settings/test-payment', logAdminAction('test_payment_settings'), testPaymentSettings);

module.exports = router;
