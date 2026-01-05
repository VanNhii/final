const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000;

const aiChatClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

const postWithAuth = async (path, body, token) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return aiChatClient.post(path, body, { headers });
};

const getWithAuth = async (path, params, token) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return aiChatClient.get(path, { headers, params });
};

const handleAIChatServiceError = (error, operation) => {
  if (error.response) {
    console.error(`AI Chat Service Error in ${operation}:`, error.response.data);
    throw new Error(error.response.data.error || `AI chat error: ${error.response.status}`);
  } else if (error.request) {
    console.error(`AI Chat Service No Response in ${operation}:`, error.message);
    throw new Error('AI chat service is not responding. Please try again later.');
  } else {
    console.error(`AI Chat Service Request Error in ${operation}:`, error.message);
    throw new Error('Failed to communicate with AI chat service');
  }
};

const candidateChatGeneral = async (payload, token) => {
  try {
    const response = await postWithAuth('/api/ai/candidate/chat/general', payload, token);
    return response.data;
  } catch (error) {
    handleAIChatServiceError(error, 'candidateChatGeneral');
  }
};

const candidateChatFit = async (payload, token) => {
  try {
    const response = await postWithAuth('/api/ai/candidate/chat/fit', payload, token);
    return response.data;
  } catch (error) {
    handleAIChatServiceError(error, 'candidateChatFit');
  }
};

const recruiterChatGeneral = async (payload, token) => {
  try {
    const response = await postWithAuth('/api/ai/recruiter/chat/general', payload, token);
    return response.data;
  } catch (error) {
    handleAIChatServiceError(error, 'recruiterChatGeneral');
  }
};

const candidateChatHistory = async (params, token) => {
  try {
    const response = await getWithAuth('/api/ai/candidate/chat/history', params, token);
    return response.data;
  } catch (error) {
    handleAIChatServiceError(error, 'candidateChatHistory');
  }
};

const recruiterChatHistory = async (params, token) => {
  try {
    const response = await getWithAuth('/api/ai/recruiter/chat/history', params, token);
    return response.data;
  } catch (error) {
    handleAIChatServiceError(error, 'recruiterChatHistory');
  }
};

module.exports = {
  candidateChatGeneral,
  candidateChatFit,
  recruiterChatGeneral,
  candidateChatHistory,
  recruiterChatHistory
};
