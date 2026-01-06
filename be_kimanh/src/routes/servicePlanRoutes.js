const express = require('express');
const {
  getServicePlans,
  getServicePlan,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  subscribeToServicePlan,
  getAvailablePlans
} = require('../controllers/servicePlanController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/available', getAvailablePlans);
router.get('/:id', getServicePlan);

// Protected routes
router.use(protect);

// Subscription routes
router.post('/:id/subscribe', authorize('recruiter'), subscribeToServicePlan);

// Admin only routes
router.use(authorize('admin'));

router
  .route('/')
  .get(getServicePlans)
  .post(createServicePlan);

router
  .route('/:id')
  .put(updateServicePlan)
  .delete(deleteServicePlan);

module.exports = router;
