const express = require('express');
const {
  getJobCategories,
  getJobCategory,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  getJobCategoriesForAdmin,
  toggleJobCategoryStatus,
  reorderJobCategories,
  getCategoryStats
} = require('../controllers/jobCategoryController');

const { protect, authorize } = require('../middleware/auth');
const { logAdminAction } = require('../middleware/activityTracker');

const router = express.Router();

// Public routes
router.get('/', getJobCategories);
router.get('/:id', getJobCategory);

// Admin routes
router.use(protect);
router.use(authorize('admin'));

router.post('/', logAdminAction('create_job_category'), createJobCategory);
router.put('/:id', logAdminAction('update_job_category'), updateJobCategory);
router.delete('/:id', logAdminAction('delete_job_category'), deleteJobCategory);

// Admin specific routes
router.get('/admin/list', getJobCategoriesForAdmin);
router.get('/admin/stats', getCategoryStats);
router.put('/:id/toggle-status', logAdminAction('toggle_category_status'), toggleJobCategoryStatus);
router.put('/admin/reorder', logAdminAction('reorder_categories'), reorderJobCategories);

module.exports = router;
