import apiClient from './apiClient';

class AdminService {
  // Dashboard
  async getDashboardStats() {
    return apiClient.get('/admin/dashboard');
  }

  async getSystemHealth() {
    return apiClient.get('/admin/health');
  }

  async getSystemAnalytics(period = '30') {
    return apiClient.get('/admin/analytics', { period });
  }

  // User Management
  async getUsers(params = {}) {
    return apiClient.get('/admin/users', params);
  }

  async updateUserStatus(userId, data) {
    return apiClient.put(`/admin/users/${userId}/status`, data);
  }

  async exportUsers(params = {}) {
    return apiClient.get('/admin/export/users', params);
  }

  async getUserActivities(params = {}) {
    return apiClient.get('/admin/activities', params);
  }

  // Job Management
  async getJobs(params = {}) {
    return apiClient.get('/admin/jobs', params);
  }

  async updateJobStatus(jobId, data) {
    return apiClient.put(`/admin/jobs/${jobId}/status`, data);
  }

  // Job Category Management
  async getJobCategories(params = {}) {
    return apiClient.get('/admin/job-categories', params);
  }

  async getCategoryStats() {
    return apiClient.get('/admin/job-categories/stats');
  }

  async createJobCategory(data) {
    return apiClient.post('/admin/job-categories', data);
  }

  async updateJobCategory(categoryId, data) {
    return apiClient.put(`/admin/job-categories/${categoryId}`, data);
  }

  async deleteJobCategory(categoryId) {
    return apiClient.delete(`/admin/job-categories/${categoryId}`);
  }

  async toggleJobCategoryStatus(categoryId) {
    return apiClient.put(`/admin/job-categories/${categoryId}/toggle-status`);
  }

  async reorderJobCategories(data) {
    return apiClient.put('/admin/job-categories/reorder', data);
  }

  // Report Management
  async getReports(params = {}) {
    return apiClient.get('/admin/reports', params);
  }

  async updateReportStatus(reportId, data) {
    return apiClient.put(`/admin/reports/${reportId}/status`, data);
  }

  async resolveReport(reportId, data) {
    return apiClient.put(`/admin/reports/${reportId}/resolve`, data);
  }

  async generateSystemReport(type, period = 30) {
    return apiClient.get(`/admin/reports/system/${type}`, { period });
  }

  // Payment Management
  async getPayments(params = {}) {
    return apiClient.get('/admin/payments', params);
  }

  async updatePaymentStatus(paymentId, data) {
    return apiClient.put(`/admin/payments/${paymentId}/status`, data);
  }

  async processRefund(paymentId, data) {
    return apiClient.put(`/admin/payments/${paymentId}/refund`, data);
  }

  // Service Plan Management
  async getServicePlans(params = {}) {
    return apiClient.get('/admin/service-plans', params);
  }

  async createServicePlan(data) {
    return apiClient.post('/admin/service-plans', data);
  }

  async updateServicePlan(planId, data) {
    return apiClient.put(`/admin/service-plans/${planId}`, data);
  }

  async deleteServicePlan(planId) {
    return apiClient.delete(`/admin/service-plans/${planId}`);
  }

  async toggleServicePlanStatus(planId) {
    return apiClient.put(`/admin/service-plans/${planId}/toggle-status`);
  }

  // Subscription Management
  async getSubscriptions(params = {}) {
    return apiClient.get('/admin/subscriptions', params);
  }

  async getSubscriptionStats() {
    return apiClient.get('/admin/subscriptions/stats');
  }

  async updateSubscriptionStatus(subscriptionId, data) {
    return apiClient.put(`/admin/subscriptions/${subscriptionId}/status`, data);
  }

  // Email Template Management
  async getEmailTemplates(params = {}) {
    return apiClient.get('/admin/email-templates', params);
  }

  async createEmailTemplate(data) {
    return apiClient.post('/admin/email-templates', data);
  }

  async updateEmailTemplate(templateId, data) {
    return apiClient.put(`/admin/email-templates/${templateId}`, data);
  }

  async deleteEmailTemplate(templateId) {
    return apiClient.delete(`/admin/email-templates/${templateId}`);
  }

  async sendBulkEmails(data) {
    return apiClient.post('/admin/emails/bulk', data);
  }

  // Notification Management
  async getNotifications(params = {}) {
    return apiClient.get('/admin/notifications', { params });
  }
  
  async createNotification(data) {
    return apiClient.post('/admin/notifications', data);
  }
  
  async updateNotification(id, data) {
    return apiClient.put(`/admin/notifications/${id}`, data);
  }
  
  async deleteNotification(id) {
    return apiClient.delete(`/admin/notifications/${id}`);
  }
  
  async sendNotification(id) {
    return apiClient.post(`/admin/notifications/${id}/send`);
  }
  
  async broadcastNotification(data) {
    return apiClient.post('/admin/notifications/broadcast', data);
  }

  async getUnreadNotificationCount() {
    return apiClient.get('/admin/notifications/unread-count');
  }

  async markNotificationAsRead(id) {
    return apiClient.put(`/admin/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead() {
    return apiClient.put('/admin/notifications/mark-all-read');
  }

  // Analytics & Reporting
  async getAnalytics(params = {}) {
    return apiClient.get('/admin/analytics', params);
  }
  
  async getUserGrowthData(timeRange = '7days') {
    return apiClient.get('/admin/analytics/user-growth', { timeRange });
  }
  
  async getJobStatistics(timeRange = '7days') {
    return apiClient.get('/admin/analytics/job-stats', { timeRange });
  }
  
  async getApplicationStatistics(timeRange = '7days') {
    return apiClient.get('/admin/analytics/application-stats', { timeRange });
  }
  
  async getRevenueStatistics(timeRange = '7days') {
    return apiClient.get('/admin/analytics/revenue-stats', { timeRange });
  }
  
  async exportAnalyticsReport(data) {
    return apiClient.post('/admin/analytics/export', data);
  }

  // System Maintenance
  async getSystemStatus() {
    return apiClient.get('/admin/maintenance/status');
  }
  
  async getMaintenanceTasks() {
    return apiClient.get('/admin/maintenance/tasks');
  }
  
  async runMaintenanceTask(taskId) {
    return apiClient.post(`/admin/maintenance/tasks/${taskId}/run`);
  }
  
  async scheduleMaintenanceTask(taskId, data) {
    return apiClient.post(`/admin/maintenance/tasks/${taskId}/schedule`, data);
  }
  
  async enableMaintenanceMode(data) {
    return apiClient.post('/admin/maintenance/mode/enable', data);
  }
  
  async disableMaintenanceMode() {
    return apiClient.post('/admin/maintenance/mode/disable');
  }

  // System Settings
  async getSettings() {
    return apiClient.get('/admin/settings');
  }
  
  async updateSettings(section, data) {
    return apiClient.put(`/admin/settings/${section}`, data);
  }
  
  async resetSettings(section) {
    return apiClient.post(`/admin/settings/${section}/reset`);
  }
  
  async testEmailSettings(data) {
    return apiClient.post('/admin/settings/test-email', data);
  }
  
  async testPaymentSettings(data) {
    return apiClient.post('/admin/settings/test-payment', data);
  }

  // System Maintenance
  async cleanupSystem(data) {
    return apiClient.post('/admin/maintenance/cleanup', data);
  }

  async backupSystem(data) {
    return apiClient.post('/admin/maintenance/backup', data);
  }

  // AI Management
  async getAIModelStatus() {
    return apiClient.get('/ai/model/status');
  }

  async getAIStatistics() {
    return apiClient.get('/ai/statistics');
  }

  async trainAIModel(data) {
    return apiClient.post('/ai/model/train', data);
  }
}

export default new AdminService();
