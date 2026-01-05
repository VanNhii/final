const axios = require('axios');

// Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_RECOMMEND_URL = process.env.AI_RECOMMEND_URL || 'http://localhost:8001';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000;

// Create axios instance with default config
const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

const aiRecommendClient = axios.create({
  baseURL: AI_RECOMMEND_URL,
  timeout: AI_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

const extractList = (response) => {
  const payload = response && response.data && response.data.data;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

// Error handler helper
const handleAIServiceError = (error, operation) => {
  if (error.response) {
    // AI service returned an error
    console.error(`AI Service Error in ${operation}:`, error.response.data);
    throw new Error(error.response.data.error || `AI service error: ${error.response.status}`);
  } else if (error.request) {
    // No response received
    console.error(`AI Service No Response in ${operation}:`, error.message);
    throw new Error('AI service is not responding. Please try again later.');
  } else {
    // Request setup error
    console.error(`AI Service Request Error in ${operation}:`, error.message);
    throw new Error('Failed to communicate with AI service');
  }
};

/**
 * Get job recommendations for a candidate
 * @param {string} candidateId - MongoDB ObjectId of the candidate
 * @param {number} limit - Number of recommendations to return (default: 10)
 * @param {object} options - Additional options (filters, etc.)
 * @returns {Promise<Array>} - Array of job recommendations
 */
const getJobRecommendations = async (candidateId, limit = 10, options = {}) => {
  try {
    const filters = options && typeof options === 'object' ? options : {};
    const response = await aiRecommendClient.post('/recommendations/jobs', {
      candidate_id: candidateId,
      limit,
      filters
    });
    return extractList(response);
  } catch (error) {
    handleAIServiceError(error, 'getJobRecommendations');
  }
};

/**
 * Get candidate recommendations for a job
 * @param {string} jobId - MongoDB ObjectId of the job
 * @param {number} limit - Number of recommendations to return (default: 10)
 * @param {object} options - Additional options (filters, etc.)
 * @returns {Promise<Array>} - Array of candidate recommendations
 */
const getCandidateRecommendations = async (jobId, limit = 10, options = {}) => {
  try {
    const response = await aiRecommendClient.post('/recommendations/candidates', {
      job_id: jobId,
      limit,
      ...options
    });
    return extractList(response);
  } catch (error) {
    handleAIServiceError(error, 'getCandidateRecommendations');
  }
};

/**
 * Get similar jobs for a given job
 * @param {string} jobId - MongoDB ObjectId of the job
 * @param {number} limit - Number of similar jobs to return (default: 5)
 * @returns {Promise<Array>} - Array of similar jobs
 */
const getSimilarJobs = async (jobId, limit = 5) => {
  try {
    const response = await aiRecommendClient.post('/recommendations/similar-jobs', {
      job_id: jobId,
      limit
    });
    return extractList(response);
  } catch (error) {
    console.error('Error in getSimilarJobs:', error.message);
    // Return empty array instead of throwing error
    return [];
  }
};

/**
 * Save user feedback on a recommendation
 * @param {string} recommendationId - MongoDB ObjectId of the recommendation
 * @param {string} feedbackType - Type of feedback (positive, negative, neutral)
 * @param {object} details - Additional feedback details
 * @returns {Promise<object>} - Feedback response
 */
const submitRecommendationFeedback = async (recommendationId, feedbackType, details = {}) => {
  return {
    success: true,
    skipped: true,
    message: 'Feedback storage handled in backend only'
  };
};

/**
 * Track user interaction with recommendation
 * @param {string} recommendationId - MongoDB ObjectId of the recommendation
 * @param {string} interactionType - Type of interaction (view, click, apply, reject)
 * @returns {Promise<object>} - Interaction response
 */
const trackRecommendationInteraction = async (recommendationId, interactionType) => {
  try {
    const feedback = {
      recommendation_id: recommendationId,
      is_viewed: interactionType === 'view' ? true : undefined,
      is_clicked: interactionType === 'click' ? true : undefined,
      is_applied: interactionType === 'apply' ? true : undefined
    };
    if (!feedback.is_viewed && !feedback.is_clicked && !feedback.is_applied) {
      return { success: true, skipped: true };
    }
    const response = await aiRecommendClient.post('/feedback', feedback);
    return response.data;
  } catch (error) {
    handleAIServiceError(error, 'trackRecommendationInteraction');
  }
};

/**
 * Trigger model training
 * @param {object} options - Training options (force_retrain, etc.)
 * @returns {Promise<object>} - Training status
 */
const triggerModelTraining = async (options = {}) => {
  try {
    const response = await aiRecommendClient.post('/model/train', options);
    return response.data;
  } catch (error) {
    handleAIServiceError(error, 'triggerModelTraining');
  }
};

/**
 * Get model training status
 * @returns {Promise<object>} - Current model status
 */
const getModelStatus = async () => {
  try {
    const response = await aiRecommendClient.get('/model/status');
    return response.data;
  } catch (error) {
    handleAIServiceError(error, 'getModelStatus');
  }
};

/**
 * Get AI service statistics
 * @returns {Promise<object>} - Service statistics
 */
const getAIStatistics = async () => {
  try {
    const response = await aiRecommendClient.get('/statistics');
    return response.data;
  } catch (error) {
    handleAIServiceError(error, 'getAIStatistics');
  }
};

/**
 * Get personalized job feed for a candidate
 * @param {string} candidateId - MongoDB ObjectId of the candidate
 * @param {number} page - Page number for pagination
 * @param {number} limit - Items per page
 * @returns {Promise<object>} - Paginated job feed
 */
const getPersonalizedJobFeed = async (candidateId, page = 1, limit = 20) => {
  try {
    const response = await aiRecommendClient.post('/recommendations/jobs', {
      candidate_id: candidateId,
      limit,
      filters: {}
    });
    return response.data;
  } catch (error) {
    handleAIServiceError(error, 'getPersonalizedJobFeed');
  }
};

/**
 * Update user preferences for AI recommendations
 * @param {string} userId - MongoDB ObjectId of the user
 * @param {object} preferences - User preferences object
 * @returns {Promise<object>} - Updated preferences
 */
const updateUserPreferences = async (userId, preferences) => {
  return {
    success: true,
    skipped: true,
    message: 'Preferences sync not enabled for AI recommend service'
  };
};

/**
 * Get user preferences
 * @param {string} userId - MongoDB ObjectId of the user
 * @returns {Promise<object>} - User preferences
 */
const getUserPreferences = async (userId) => {
  return {
    success: true,
    skipped: true,
    data: null
  };
};

/**
 * Health check for AI service
 * @returns {Promise<object>} - Health status
 */
const checkHealth = async () => {
  try {
    const response = await aiClient.get('/health');
    return response.data;
  } catch (error) {
    console.warn('AI Service health check failed:', error.message);
    return { status: 'unavailable', error: error.message };
  }
};

module.exports = {
  // Recommendation functions
  getJobRecommendations,
  getCandidateRecommendations,
  getSimilarJobs,
  getPersonalizedJobFeed,
  
  // Feedback and interaction
  submitRecommendationFeedback,
  trackRecommendationInteraction,
  
  // Model management
  triggerModelTraining,
  getModelStatus,
  getAIStatistics,
  
  // User preferences
  updateUserPreferences,
  getUserPreferences,
  
  // Health check
  checkHealth,
  
  // For direct access if needed
  aiClient,
  aiRecommendClient
};
