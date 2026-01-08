import apiClient from './apiClient';

class ReportService {
  // Create a new report
  async createReport(data) {
    return apiClient.post('/reports', data);
  }

  // Get current user's reports
  async getMyReports() {
    return apiClient.get('/reports/my-reports');
  }

  // Get single report details
  async getReport(id) {
    return apiClient.get(`/reports/${id}`);
  }
}

export default new ReportService();
