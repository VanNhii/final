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
  deleteConversation,
  getConversationMessages
} = require('../controllers/messageController');

const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

router
  .route('/')
  .get(getMessages)
  .post(sendMessage);

router.get('/conversation/:userId', getConversationMessages);
router.get('/inbox', getInboxMessages);
router.get('/sent', getSentMessages);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read', markMessagesAsRead);
router.delete('/conversations/:userId', deleteConversation);

router
  .route('/:id')
  .get(getMessage)
  .delete(deleteMessage);

router.post('/:id/reply', replyToMessage);

module.exports = router;
