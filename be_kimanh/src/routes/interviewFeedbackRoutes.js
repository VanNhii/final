const express = require('express');
const {
  getInterviewFeedbacks,
  getInterviewFeedback,
  createInterviewFeedback,
  updateInterviewFeedback,
  deleteInterviewFeedback
} = require('../controllers/interviewFeedbackController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(authorize('recruiter', 'admin'), getInterviewFeedbacks)
  .post(authorize('recruiter', 'admin'), createInterviewFeedback);

router
  .route('/:id')
  .get(getInterviewFeedback)
  .put(authorize('recruiter', 'admin'), updateInterviewFeedback)
  .delete(authorize('recruiter', 'admin'), deleteInterviewFeedback);

module.exports = router;
