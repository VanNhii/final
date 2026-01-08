const express = require('express');
const {
  getInterviews,
  getInterview,
  createInterview,
  updateInterview,
  deleteInterview,
  confirmInterview,
  rejectInterview,
  updateInterviewStatus
} = require('../controllers/interviewController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router.route('/:id/confirm').put(authorize('candidate'), confirmInterview);
router.route('/:id/reject').put(authorize('candidate'), rejectInterview);
router.route('/:id/status').put(authorize('recruiter', 'admin'), updateInterviewStatus);

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
