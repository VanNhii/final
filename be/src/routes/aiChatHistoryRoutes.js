const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const aiChatController = require('../controllers/aiChatController');

// @desc    Candidate AI chat history
// @route   GET /api/v1/ai/chat/candidate/history
// @access  Private (Candidate/Admin)
router.get(
  '/chat/candidate/history',
  protect,
  authorize('candidate', 'admin'),
  aiChatController.candidateChatHistory
);

// @desc    Recruiter AI chat history
// @route   GET /api/v1/ai/chat/recruiter/history
// @access  Private (Recruiter/Admin)
router.get(
  '/chat/recruiter/history',
  protect,
  authorize('recruiter', 'admin'),
  aiChatController.recruiterChatHistory
);

module.exports = router;
