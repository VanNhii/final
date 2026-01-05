const express = require('express');
const {
  getPayments,
  getPayment,
  createPayment,
  updatePaymentStatus,
  processRefund,
  deletePayment,
  createMomoPayment,
  handleMomoCallback,
  checkMomoPaymentStatus,
  refundMomoPayment,
  verifyMomoPayment
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// MoMo callback - no authentication required (called by MoMo server)
router.post('/momo/callback', handleMomoCallback);

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(getPayments)
  .post(authorize('recruiter'), createPayment);

router
  .route('/:id')
  .get(getPayment)
  .delete(authorize('admin'), deletePayment);

router.put('/:id/status', authorize('admin'), updatePaymentStatus);
router.put('/:id/refund', authorize('admin'), processRefund);

// MoMo specific routes
router.post('/momo/create', authorize('recruiter'), createMomoPayment);
router.get('/momo/:id/status', checkMomoPaymentStatus);
router.post('/momo/:id/verify', verifyMomoPayment);
router.post('/momo/:id/refund', authorize('admin'), refundMomoPayment);

module.exports = router;
