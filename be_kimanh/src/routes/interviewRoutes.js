const express = require('express');
const {
  getInterviews,
  getInterview,
  createInterview,
  updateInterview,
  deleteInterview
} = require('../controllers/interviewController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(getInterviews)
  .post(authorize('recruiter', 'admin'), createInterview);

router
  .route('/:id')
  .get(getInterview)
  .put(authorize('recruiter', 'admin'), updateInterview)
  .delete(authorize('recruiter', 'admin'), deleteInterview);

module.exports = router;
