const express = require('express');
const {
  getReports,
  getMyReports,
  getReport,
  createReport,
  updateReportStatus,
  deleteReport
} = require('../controllers/reportController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(authorize('admin'), getReports)
  .post(createReport);

router.get('/my-reports', getMyReports);

router
  .route('/:id')
  .get(getReport)
  .delete(authorize('admin'), deleteReport);

router.put('/:id/status', authorize('admin'), updateReportStatus);

module.exports = router;
