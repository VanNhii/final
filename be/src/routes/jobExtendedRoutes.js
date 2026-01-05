const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  getFeaturedJobs,
  getUrgentJobs,
  getRelatedJobs,
  incrementJobView,
  getJobStats,
  searchJobs,
  getJobRecommendations
} = require('../controllers/jobControllerExtended');

// Public routes
router.get('/featured', getFeaturedJobs);
router.get('/urgent', getUrgentJobs);
router.get('/search', searchJobs);
router.get('/:id/related', getRelatedJobs);
router.get('/:id/stats', getJobStats);
router.post('/:id/view', incrementJobView);

// Protected routes
router.get('/recommendations', protect, getJobRecommendations);

module.exports = router;