import apiClient from './apiClient';

class ServicePlanService {
  // Get all available service plans (public)
  async getAvailablePlans() {
    try {
      const response = await apiClient.get('/service-plans/available');
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Get single service plan
  async getServicePlan(id) {
    try {
      const response = await apiClient.get(`/service-plans/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Subscribe to service plan
  async subscribeToServicePlan(planId, paymentData) {
    try {
      const response = await apiClient.post(`/subscriptions`, {
        plan_id: planId,
        ...paymentData
      });
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Get recruiter subscriptions
  async getRecruiterSubscriptions() {
    try {
      const response = await apiClient.get('/recruiters/subscriptions');
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Get recruiter analytics
  async getRecruiterAnalytics(period = '30') {
    try {
      const response = await apiClient.get(`/recruiters/analytics?period=${period}`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Get payments history
  async getPayments() {
    try {
      const response = await apiClient.get('/payments');
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Get single payment
  async getPayment(id) {
    try {
      const response = await apiClient.get(`/payments/${id}`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // Create payment
  async createPayment(paymentData) {
    try {
      const response = await apiClient.post('/payments', paymentData);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  // MoMo Payment Methods
  async createMomoPayment(paymentData) {
    try {
      const response = await apiClient.post('/payments/momo/create', paymentData);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async checkMomoPaymentStatus(paymentId) {
    try {
      const response = await apiClient.get(`/payments/momo/${paymentId}/status`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async verifyMomoPayment(paymentId) {
    try {
      const response = await apiClient.post(`/payments/momo/${paymentId}/verify`);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  async refundMomoPayment(paymentId, refundData) {
    try {
      const response = await apiClient.post(`/payments/momo/${paymentId}/refund`, refundData);
      return response;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new ServicePlanService();
