const express = require('express');
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob
} = require('../controllers/jobController');

const {
  getFeaturedJobs,
  getUrgentJobs,
  getRelatedJobs,
  incrementJobView,
  getJobStats,
  searchJobs,
  getJobRecommendations,
  getGlobalStats
} = require('../controllers/jobControllerExtended');

const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { checkJobPostingLimit, checkFeaturedJobPermission } = require('../middleware/subscription');

const router = express.Router();

// Extended/Public routes
router.get('/featured', getFeaturedJobs);
router.get('/urgent', getUrgentJobs);
router.get('/search', searchJobs);
router.get('/stats/global', getGlobalStats);
router.get('/:id/related', getRelatedJobs);
router.get('/:id/stats', getJobStats);
router.post('/:id/view', incrementJobView);

// Recommendations (Protected)
router.get('/recommendations', protect, getJobRecommendations);

// Base routes
router
  .route('/')
  .get(optionalAuth, getJobs)
  .post(protect, authorize('recruiter', 'admin'), checkJobPostingLimit, checkFeaturedJobPermission, createJob);

router
  .route('/:id')
  .get(optionalAuth, getJob)
  .put(protect, authorize('recruiter', 'admin'), checkFeaturedJobPermission, updateJob)
  .delete(protect, authorize('recruiter', 'admin'), deleteJob);

module.exports = router;
