const express = require('express');
const {
  getApplications,
  getApplication,
  createApplication,
  updateApplicationStatus,
  deleteApplication
} = require('../controllers/applicationController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(getApplications)
  .post(authorize('candidate'), createApplication);

router
  .route('/:id')
  .get(getApplication)
  .delete(authorize('candidate', 'admin'), deleteApplication);

router
  .route('/:id/status')
  .put(authorize('recruiter', 'admin'), updateApplicationStatus);

module.exports = router;
