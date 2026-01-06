import apiClient from './apiClient';

class RecruiterService {
  // Profile Management
  async getProfile() {
    return apiClient.get('/recruiters/profile');
  }

  async updateProfile(data) {
    return apiClient.put('/recruiters/profile', data);
  }

  async updateUserProfile(userId, data) {
    return apiClient.put(`/users/${userId}`, data);
  }

  // Dashboard
  async getDashboardStats() {
    return apiClient.get('/recruiters/dashboard');
  }

  async getJobs(params = {}) {
    return apiClient.get('/recruiters/jobs', params);
  }

  // Job CRUD operations use main jobs endpoint
  async createJob(data) {
    return apiClient.post('/jobs', data);
  }

  async updateJob(jobId, data) {
    return apiClient.put(`/jobs/${jobId}`, data);
  }

  async deleteJob(jobId) {
    return apiClient.delete(`/jobs/${jobId}`);
  }

  async getJobById(jobId) {
    return apiClient.get(`/jobs/${jobId}`);
  }

  // Application Management
  async getApplications(params = {}) {
    return apiClient.get('/recruiters/applications', params);
  }

  async updateApplicationStatus(applicationId, status) {
    return apiClient.put(`/applications/${applicationId}/status`, { status });
  }

  async bulkUpdateApplications(applicationIds, status) {
    return apiClient.put('/applications/bulk-update', { 
      applicationIds, 
      status 
    });
  }

  async getApplicationDetails(applicationId) {
    return apiClient.get(`/applications/${applicationId}`);
  }

  async getApplicationById(applicationId) {
    return apiClient.get(`/applications/${applicationId}`);
  }

  // User Info
  async getUserInfo(userId) {
    return apiClient.get(`/users/${userId}`);
  }

  // Interview Management
  async getInterviews(params = {}) {
    return apiClient.get('/recruiters/interviews', params);
  }

  async createInterview(data) {
    return apiClient.post('/interviews', data);
  }

  async updateInterview(interviewId, data) {
    return apiClient.put(`/interviews/${interviewId}`, data);
  }

  async deleteInterview(interviewId) {
    return apiClient.delete(`/interviews/${interviewId}`);
  }

  async updateInterviewStatus(interviewId, status) {
    return apiClient.put(`/interviews/${interviewId}/status`, { status });
  }

  async addInterviewFeedback(interviewId, feedback) {
    return apiClient.post(`/interviews/${interviewId}/feedback`, feedback);
  }

  // Candidate Search (Premium Feature)
  async searchCandidates(params = {}) {
    return apiClient.get('/recruiters/candidates/search', params);
  }

  async getCandidateProfile(candidateId) {
    return apiClient.get(`/recruiters/candidates/${candidateId}`);
  }

  async downloadCandidateCV(candidateId) {
    return apiClient.get(`/recruiters/candidates/${candidateId}/cv`);
  }

  async inviteCandidate(candidateId, jobId, message) {
    return apiClient.post('/candidates/invite', {
      candidateId,
      jobId,
      message
    });
  }

  // Messages (Legacy API - current backend)
  async getMessagesLegacy(params = {}) {
    return apiClient.get('/messages', params);
  }

  async getConversationMessages(userId, params = {}) {
    return apiClient.get(`/messages/conversation/${userId}`, params);
  }

  async sendMessageLegacy(messageData) {
    return apiClient.post('/messages', messageData);
  }

  async markMessagesAsRead(messageIds) {
    return apiClient.put('/messages/mark-read', { messageIds });
  }

  async getUnreadCount() {
    return apiClient.get('/messages/unread-count');
  }

  // Conversation-based Messages (if backend is upgraded)
  async getConversations(params = {}) {
    return apiClient.get('/messages/conversations', params);
  }

  async getMessages(conversationId, params = {}) {
    return apiClient.get(`/messages/conversations/${conversationId}`, params);
  }

  async sendMessage(conversationId, message) {
    return apiClient.post(`/messages/conversations/${conversationId}`, {
      message
    });
  }

  async createConversation(candidateId, message) {
    return apiClient.post('/messages/conversations', {
      candidateId,
      message
    });
  }

  // Notifications
  async getNotifications(params = {}) {
    return apiClient.get('/recruiters/notifications', params);
  }

  async getUnreadNotificationCount() {
    return apiClient.get('/recruiters/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId) {
    return apiClient.put(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return apiClient.put('/notifications/mark-all-read');
  }

  // Subscription Management
  async getSubscriptions() {
    return apiClient.get('/recruiters/subscriptions');
  }

  async getCurrentSubscription() {
    return apiClient.get('/recruiters/subscription/current');
  }

  async getServicePlans() {
    return apiClient.get('/service-plans/available');
  }

  async subscribeToPlan(planId, paymentData) {
    return apiClient.post('/subscriptions', {
      plan_id: planId,
      ...paymentData
    });
  }

  async upgradeSubscription(planId, paymentData) {
    return apiClient.put('/recruiters/subscription/upgrade', {
      planId,
      ...paymentData
    });
  }

  async cancelSubscription(reason) {
    return apiClient.put('/recruiters/subscription/cancel', { reason });
  }

  async getBillingHistory(params = {}) {
    return apiClient.get('/payments/history', params);
  }

  // Analytics & Reports
  async getAnalytics(params = {}) {
    return apiClient.get('/recruiters/analytics', params);
  }

  async getJobPerformance(jobId, params = {}) {
    return apiClient.get(`/jobs/${jobId}/analytics`, params);
  }

  async getApplicationTrends(period = '30') {
    return apiClient.get('/recruiters/analytics', { period });
  }

  async exportAnalyticsReport(params = {}) {
    return apiClient.get('/recruiters/analytics/export', params);
  }

  // Job Categories
  async getJobCategories() {
    return apiClient.get('/job-categories');
  }

  // File Upload
  async uploadFile(file, type = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    return apiClient.uploadFile('/upload', formData);
  }

  async uploadCompanyLogo(file) {
    return this.uploadFile(file, 'company_logo');
  }

  async uploadJobDocument(file) {
    return this.uploadFile(file, 'documents');
  }

  // Batch Operations
  async bulkDeleteJobs(jobIds) {
    return apiClient.delete('/jobs/bulk', { jobIds });
  }

  async bulkUpdateJobStatus(jobIds, status) {
    return apiClient.put('/jobs/bulk-status', { jobIds, status });
  }

  // Search & Filters
  async getJobFilters() {
    return apiClient.get('/jobs/filters');
  }

  async getCandidateFilters() {
    return apiClient.get('/candidates/filters');
  }

  // Statistics for Dashboard
  async getQuickStats() {
    return apiClient.get('/recruiters/stats/quick');
  }

  async getRecentActivity(limit = 10) {
    return apiClient.get('/recruiters/activity/recent', { limit });
  }

  // Schedule Management
  async getAvailableTimeSlots(date) {
    return apiClient.get('/interviews/available-slots', { date });
  }

  async checkScheduleConflict(datetime, duration) {
    return apiClient.post('/interviews/check-conflict', { 
      datetime, 
      duration 
    });
  }

  // Email Templates (for interview invitations, etc.)
  async getEmailTemplates(type) {
    return apiClient.get('/email-templates', { type });
  }

  async sendInterviewInvitation(interviewId, templateId, customMessage) {
    return apiClient.post(`/interviews/${interviewId}/send-invitation`, {
      templateId,
      customMessage
    });
  }

  // Saved Searches
  async saveSearch(searchParams, name) {
    return apiClient.post('/saved-searches', {
      searchParams,
      name,
      type: 'candidate'
    });
  }

  async getSavedSearches() {
    return apiClient.get('/saved-searches');
  }

  async deleteSavedSearch(searchId) {
    return apiClient.delete(`/saved-searches/${searchId}`);
  }

  // Contact Management
  async addCandidateToContacts(candidateId, note) {
    return apiClient.post('/contacts', {
      candidateId,
      note
    });
  }

  async getContacts(params = {}) {
    return apiClient.get('/contacts', params);
  }

  async updateContact(contactId, data) {
    return apiClient.put(`/contacts/${contactId}`, data);
  }

  async removeContact(contactId) {
    return apiClient.delete(`/contacts/${contactId}`);
  }
}

export default new RecruiterService();
