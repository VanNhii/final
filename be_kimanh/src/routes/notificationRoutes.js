const express = require('express');
const {
  getNotifications,
  getNotification,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(getNotifications)
  .post(authorize('admin'), createNotification);

router.put('/mark-all-read', markAllAsRead);

router
  .route('/:id')
  .get(getNotification)
  .delete(deleteNotification);

router.put('/:id/read', markAsRead);

module.exports = router;
