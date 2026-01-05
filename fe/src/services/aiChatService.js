import apiClient from './apiClient';

class AIChatService {
  async recruiterChat(payload = {}) {
    try {
      const response = await apiClient.post('/ai/chat/recruiter', payload);
      return response;
    } catch (error) {
      console.error('Error in recruiter chat:', error);
      throw error;
    }
  }

  async candidateChat(payload = {}) {
    try {
      const response = await apiClient.post('/ai/chat/candidate', payload);
      return response;
    } catch (error) {
      console.error('Error in candidate chat:', error);
      throw error;
    }
  }

  async candidateChatFit(payload = {}) {
    try {
      const response = await apiClient.post('/ai/chat/candidate/fit', payload);
      return response;
    } catch (error) {
      console.error('Error in candidate fit chat:', error);
      throw error;
    }
  }

  async candidateChatHistory(params = {}) {
    try {
      const response = await apiClient.get('/ai/chat/candidate/history', params);
      return response;
    } catch (error) {
      console.error('Error in candidate chat history:', error);
      throw error;
    }
  }

  async recruiterChatHistory(params = {}) {
    try {
      const response = await apiClient.get('/ai/chat/recruiter/history', params);
      return response;
    } catch (error) {
      console.error('Error in recruiter chat history:', error);
      throw error;
    }
  }
}

export default new AIChatService();
