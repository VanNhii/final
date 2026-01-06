const express = require('express');
const router = express.Router();
const {
  createContent,
  getAllContent,
  getContentById,
  updateContent,
  deleteContent,
  publishContent,
  archiveContent,
  toggleFeatured,
  togglePinned,
  getFeaturedContent,
  getPinnedContent,
  getCategoriesByType,
  getContentAnalytics,
  getMyContent,
  bulkUpdateStatus
} = require('../controllers/contentController');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getAllContent);
router.get('/featured', getFeaturedContent);
router.get('/pinned', getPinnedContent);
router.get('/categories/:type', getCategoriesByType);
router.get('/:identifier', getContentById); // Can be ID or slug

// Protected routes - User must be logged in
router.use(protect);

// User routes (authenticated users)
router.get('/user/my-content', getMyContent);

// Editor/Admin routes - Content creation and management
router.post('/', authorize('admin', 'editor'), createContent);
router.put('/:id', authorize('admin', 'editor', 'user'), updateContent); // Users can edit their own content
router.delete('/:id', authorize('admin', 'editor', 'user'), deleteContent); // Users can delete their own content

// Admin/Editor only routes - Publishing and status management
router.put('/:id/publish', authorize('admin', 'editor'), publishContent);
router.put('/:id/archive', authorize('admin', 'editor'), archiveContent);
router.put('/:id/featured', authorize('admin', 'editor'), toggleFeatured);
router.put('/:id/pinned', authorize('admin', 'editor'), togglePinned);
router.put('/bulk-update', authorize('admin', 'editor'), bulkUpdateStatus);

// Analytics - Admin/Editor only
router.get('/admin/analytics', authorize('admin', 'editor'), getContentAnalytics);

module.exports = router;