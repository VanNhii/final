import apiClient from './apiClient';

/**
 * AI Service - Handles all AI-related API calls
 */
class AIService {
  constructor() {
    this.jobRecCache = new Map();
    this.jobRecInFlight = new Map();
    this.jobRecCacheTtlMs = 60 * 1000;
  }

  buildCacheKey(params) {
    const ordered = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    return JSON.stringify(ordered);
  }
  /**
   * Get job recommendations for the logged-in candidate
   * @param {Object} options - Filter options (limit, location, job_type, etc.)
   * @returns {Promise} - Job recommendations
   */
  async getJobRecommendations(options = {}) {
    try {
      const force = options.force === true;
      const params = {
        limit: options.limit || 10,
        min_score: options.min_score,
        location: options.location,
        job_type: options.job_type
      };
      
      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) delete params[key];
      });

      const cacheKey = this.buildCacheKey(params);
      const now = Date.now();
      if (!force) {
        const cached = this.jobRecCache.get(cacheKey);
        if (cached && now - cached.timestamp < this.jobRecCacheTtlMs) {
          return cached.data;
        }

        const inFlight = this.jobRecInFlight.get(cacheKey);
        if (inFlight) {
          return inFlight;
        }
      } else {
        this.jobRecCache.delete(cacheKey);
        this.jobRecInFlight.delete(cacheKey);
      }

      const requestPromise = apiClient
        .get('/ai/recommendations/jobs', params)
        .then((response) => {
          this.jobRecCache.set(cacheKey, { timestamp: Date.now(), data: response });
          return response;
        })
        .finally(() => {
          this.jobRecInFlight.delete(cacheKey);
        });

      this.jobRecInFlight.set(cacheKey, requestPromise);
      return requestPromise;
    } catch (error) {
      console.error('Error getting job recommendations:', error);
      throw error;
    }
  }

  /**
   * Get candidate recommendations for a job (for recruiters)
   * @param {string} jobId - Job ID
   * @param {Object} options - Filter options (limit, min_score, etc.)
   * @returns {Promise} - Candidate recommendations
   */
  async getCandidateRecommendations(jobId, options = {}) {
    try {
      const params = {
        limit: options.limit || 20,
        min_score: options.min_score
      };
      
      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) delete params[key];
      });

      const response = await apiClient.get(`/ai/recommendations/candidates/${jobId}`, params);
      return response;
    } catch (error) {
      console.error('Error getting candidate recommendations:', error);
      throw error;
    }
  }

  /**
   * Get similar jobs for a given job
   * @param {string} jobId - Job ID
   * @param {number} limit - Number of similar jobs to return
   * @returns {Promise} - Similar jobs
   */
  async getSimilarJobs(jobId, limit = 5) {
    try {
      const response = await apiClient.get(`/ai/recommendations/similar/${jobId}`, { limit });
      return response;
    } catch (error) {
      console.error('Error getting similar jobs:', error);
      throw error;
    }
  }

  /**
   * Get personalized job feed for candidate
   * @param {Object} options - Pagination options (page, limit)
   * @returns {Promise} - Personalized job feed
   */
  async getPersonalizedFeed(options = {}) {
    try {
      const params = {
        page: options.page || 1,
        limit: options.limit || 20
      };

      const response = await apiClient.get('/ai/feed', params);
      return response;
    } catch (error) {
      console.error('Error getting personalized feed:', error);
      throw error;
    }
  }

  /**
   * Track recommendation interaction (view, click, apply, reject)
   * @param {string} recommendationId - Recommendation ID
   * @param {string} interactionType - Type of interaction (view, click, apply, reject)
   * @returns {Promise} - Update result
   */
  async trackInteraction(recommendationId, interactionType) {
    try {
      const response = await apiClient.post(`/ai/recommendations/${recommendationId}/interaction`, {
        interaction_type: interactionType
      });
      return response;
    } catch (error) {
      console.error('Error tracking interaction:', error);
      throw error;
    }
  }

  /**
   * Submit feedback on a recommendation
   * @param {string} recommendationId - Recommendation ID
   * @param {Object} feedbackData - Feedback data (rating, comment, etc.)
   * @returns {Promise} - Feedback result
   */
  async submitFeedback(recommendationId, feedbackData) {
    try {
      const response = await apiClient.post(`/ai/feedback`, {
        recommendation_id: recommendationId,
        ...feedbackData
      });
      return response;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get or update user preferences
   * @param {Object} preferences - User preferences to update (optional)
   * @returns {Promise} - User preferences
   */
  async getUserPreferences(preferences = null) {
    try {
      if (preferences) {
        // Update preferences
        const response = await apiClient.post('/ai/preferences', preferences);
        return response;
      } else {
        // Get preferences
        const response = await apiClient.get('/ai/preferences');
        return response;
      }
    } catch (error) {
      console.error('Error with user preferences:', error);
      throw error;
    }
  }

  /**
   * Check AI service health
   * @returns {Promise} - Health status
   */
  async checkHealth() {
    try {
      const response = await apiClient.get('/ai/health');
      return response;
    } catch (error) {
      console.error('Error checking AI service health:', error);
      throw error;
    }
  }
}

export default new AIService();
