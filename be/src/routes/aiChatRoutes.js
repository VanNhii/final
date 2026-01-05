const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const aiChatController = require('../controllers/aiChatController');

// @desc    Candidate AI chat (general)
// @route   POST /api/v1/ai/chat/candidate
// @access  Private (Candidate/Admin)
router.post(
  '/chat/candidate',
  protect,
  authorize('candidate', 'admin'),
  aiChatController.candidateChat
);

// @desc    Candidate AI chat (fit)
// @route   POST /api/v1/ai/chat/candidate/fit
// @access  Private (Candidate/Admin)
router.post(
  '/chat/candidate/fit',
  protect,
  authorize('candidate', 'admin'),
  aiChatController.candidateChatFit
);

// @desc    Recruiter AI chat (general)
// @route   POST /api/v1/ai/chat/recruiter
// @access  Private (Recruiter/Admin)
router.post(
  '/chat/recruiter',
  protect,
  authorize('recruiter', 'admin'),
  aiChatController.recruiterChat
);

module.exports = router;
