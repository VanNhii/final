const express = require('express');
const {
  getMessages,
  getInboxMessages,
  getSentMessages,
  getMessage,
  sendMessage,
  replyToMessage,
  deleteMessage,
  markMessagesAsRead,
  getUnreadCount,
  getConversationMessages,
  deleteConversation
} = require('../controllers/messageController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(getMessages)
  .post(sendMessage);

router.get('/inbox', getInboxMessages);
router.get('/sent', getSentMessages);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read', markMessagesAsRead);

router
  .route('/:id')
  .get(getMessage)
  .delete(deleteMessage);

router.post('/:id/reply', replyToMessage);

// Conversation-specific routes
router.get('/conversation/:userId', getConversationMessages);
router.delete('/conversations/:userId', deleteConversation);

module.exports = router;
