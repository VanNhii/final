import apiClient from './apiClient';

const contentService = {
  // Get all content with filters and pagination
  getAllContent: async (params = {}) => {
    return await apiClient.get('/content', params);
  },

  // Get content by ID or slug
  getContentById: async (identifier) => {
    return await apiClient.get(`/content/${identifier}`);
  },

  // Get featured content
  getFeaturedContent: async (params = {}) => {
    return await apiClient.get('/content/featured', params);
  },

  // Get pinned content
  getPinnedContent: async (params = {}) => {
    return await apiClient.get('/content/pinned', params);
  },

  // Get content categories by type
  getCategoriesByType: async (type) => {
    return await apiClient.get(`/content/categories/${type}`);
  },

  // Get content by category
  getContentByCategory: async (category, params = {}) => {
    return await apiClient.get('/content', { ...params, category });
  },

  // Get content by type (blog, guide, news, etc.)
  getContentByType: async (contentType, params = {}) => {
    return await apiClient.get('/content', { ...params, content_type: contentType });
  },

  // Search content
  searchContent: async (searchTerm, params = {}) => {
    return await apiClient.get('/content', { ...params, search: searchTerm });
  },

  // Get related content
  getRelatedContent: async (contentId, params = {}) => {
    return await apiClient.get(`/content/${contentId}/related`, params);
  },

  // Get content by tags
  getContentByTags: async (tags, params = {}) => {
    const tagsParam = Array.isArray(tags) ? tags.join(',') : tags;
    return await apiClient.get('/content', { ...params, tags: tagsParam });
  },

  // User actions (protected routes)
  createContent: async (contentData) => {
    return await apiClient.post('/content', contentData);
  },

  updateContent: async (contentId, contentData) => {
    return await apiClient.put(`/content/${contentId}`, contentData);
  },

  deleteContent: async (contentId) => {
    return await apiClient.delete(`/content/${contentId}`);
  },

  // Get user's own content
  getMyContent: async (params = {}) => {
    return await apiClient.get('/content/user/my-content', params);
  },

  // Admin/Editor actions
  publishContent: async (contentId) => {
    return await apiClient.put(`/content/${contentId}/publish`);
  },

  archiveContent: async (contentId) => {
    return await apiClient.put(`/content/${contentId}/archive`);
  },

  toggleFeatured: async (contentId) => {
    return await apiClient.put(`/content/${contentId}/featured`);
  },

  togglePinned: async (contentId) => {
    return await apiClient.put(`/content/${contentId}/pinned`);
  },

  // Analytics
  getContentAnalytics: async () => {
    return await apiClient.get('/content/admin/analytics');
  },

  // Bulk operations
  bulkUpdateStatus: async (updateData) => {
    return await apiClient.put('/content/bulk-update', updateData);
  }
};

export default contentService;