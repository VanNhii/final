const Candidate = require('../models/Candidate');
const aiChatService = require('../services/aiChatService');

const getBearerToken = (req) => {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.split(' ')[1];
  }
  return null;
};

const resolveCandidateId = async (req) => {
  let candidateId = req.body.candidate_id || req.query.candidate_id;
  if (candidateId) {
    return candidateId;
  }

  const candidate = await Candidate.findOne({ user_id: req.user.id }).select('_id');
  if (!candidate) {
    return null;
  }
  return candidate._id.toString();
};

const candidateChat = async (req, res) => {
  try {
    const { question, session_id, ttl_minutes } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: 'question required', data: {} });
    }
    const ttlMinutes = ttl_minutes || parseInt(process.env.AI_CHAT_TTL_MINUTES || '10080', 10);

    const candidateId = await resolveCandidateId(req);
    if (!candidateId) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found', data: {} });
    }

    const payload = {
      candidate_id: candidateId,
      question,
      session_id,
      ttl_minutes: ttlMinutes
    };

    const token = getBearerToken(req);
    const data = await aiChatService.candidateChatGeneral(payload, token);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: {} });
  }
};

const candidateChatFit = async (req, res) => {
  try {
    const { question, session_id, ttl_minutes, job_id } = req.body;
    if (!question || !job_id) {
      return res.status(400).json({ success: false, message: 'job_id and question required', data: {} });
    }
    const ttlMinutes = ttl_minutes || parseInt(process.env.AI_CHAT_TTL_MINUTES || '10080', 10);

    const candidateId = await resolveCandidateId(req);
    if (!candidateId) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found', data: {} });
    }

    const payload = {
      candidate_id: candidateId,
      job_id,
      question,
      session_id,
      ttl_minutes: ttlMinutes
    };

    const token = getBearerToken(req);
    const data = await aiChatService.candidateChatFit(payload, token);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: {} });
  }
};

const candidateChatHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '200', 10);

    const candidateId = await resolveCandidateId(req);
    if (!candidateId) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found', data: {} });
    }

    const payload = {
      candidate_id: candidateId,
      limit
    };

    const token = getBearerToken(req);
    const data = await aiChatService.candidateChatHistory(payload, token);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: {} });
  }
};

const recruiterChatHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '200', 10);
    const payload = {
      recruiter_user_id: req.user.id,
      limit
    };

    const token = getBearerToken(req);
    const data = await aiChatService.recruiterChatHistory(payload, token);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: {} });
  }
};

const recruiterChat = async (req, res) => {
  try {
    const {
      question,
      session_id,
      ttl_minutes,
      job_id,
      candidate_ids,
      use_applications,
      application_statuses
    } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, message: 'question required', data: {} });
    }
    const ttlMinutes = ttl_minutes || parseInt(process.env.AI_CHAT_TTL_MINUTES || '10080', 10);

    const payload = {
      question,
      session_id,
      ttl_minutes: ttlMinutes,
      job_id,
      candidate_ids,
      use_applications,
      application_statuses,
      recruiter_user_id: req.user.id
    };

    const token = getBearerToken(req);
    const data = await aiChatService.recruiterChatGeneral(payload, token);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, data: {} });
  }
};

module.exports = {
  candidateChat,
  candidateChatFit,
  candidateChatHistory,
  recruiterChatHistory,
  recruiterChat
};
