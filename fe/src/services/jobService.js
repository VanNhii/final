import apiClient from './apiClient';

const jobService = {
  // Get all jobs with filters and pagination
  getJobs: async (params = {}) => {
    return await apiClient.get('/jobs', params);
  },

  // Get job by ID
  getJobById: async (jobId) => {
    return await apiClient.get(`/jobs/${jobId}`);
  },

  // Create new job (Recruiter only)
  createJob: async (jobData) => {
    return await apiClient.post('/jobs', jobData);
  },

  // Update job (Recruiter only)
  updateJob: async (jobId, jobData) => {
    return await apiClient.put(`/jobs/${jobId}`, jobData);
  },

  // Delete job (Recruiter only)
  deleteJob: async (jobId) => {
    return await apiClient.delete(`/jobs/${jobId}`);
  },

  // Get jobs by recruiter
  getJobsByRecruiter: async (recruiterId, params = {}) => {
    return await apiClient.get(`/jobs/recruiter/${recruiterId}`, params);
  },

  // Search jobs
  searchJobs: async (searchParams) => {
    return await apiClient.get('/jobs/search', searchParams);
  },

  // Get featured jobs
  getFeaturedJobs: async () => {
    return await apiClient.get('/jobs/featured');
  },

  // Get recent jobs
  getRecentJobs: async (limit = 10) => {
    return await apiClient.get('/jobs/recent', { limit });
  },

  // Get job categories
  getJobCategories: async () => {
    return await apiClient.get('/job-categories');
  },

  // Get job statistics
  getJobStats: async () => {
    return await apiClient.get('/jobs/stats');
  },

  // Apply to job
  applyToJob: async (jobId, applicationData) => {
    return await apiClient.post(`/jobs/${jobId}/apply`, applicationData);
  },

  // Save job
  saveJob: async (jobId) => {
    return await apiClient.post(`/candidates/jobs/${jobId}/save`);
  },

  // Unsave job
  unsaveJob: async (jobId) => {
    return await apiClient.delete(`/candidates/jobs/${jobId}/unsave`);
  },

  // Get saved jobs
  getSavedJobs: async () => {
    return await apiClient.get('/candidates/saved-jobs');
  },

  // Get job applications
  getJobApplications: async (jobId, params = {}) => {
    return await apiClient.get(`/jobs/${jobId}/applications`, params);
  },
};

export default jobService;
