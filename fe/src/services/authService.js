import apiClient from './apiClient';

const authService = {
  // Login
  login: async (email, password) => {
    return await apiClient.post('/auth/login', { email, password });
  },

  // Register
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response; // Backend returns { success, message, data }
  },

  // Logout
  logout: async () => {
    return await apiClient.post('/auth/logout');
  },

  // Forgot Password
  forgotPassword: async (email) => {
    return await apiClient.post('/auth/forgot-password', { email });
  },

  // Reset Password with OTP
  resetPassword: async (email, otp, newPassword) => {
    return await apiClient.post('/auth/reset-password', { email, otp, newPassword });
  },

  // Change Password
  changePassword: async (currentPassword, newPassword) => {
    return await apiClient.put('/auth/updatepassword', {
      currentPassword,
      newPassword,
    });
  },

  // Verify Email/OTP
  verifyOTP: async (email, otp) => {
    return await apiClient.post('/auth/verify-otp', { email, otp });
  },

  // Resend Verification OTP
  resendOTP: async (email, type = 'email_verification') => {
    return await apiClient.post('/auth/resend-otp', { email, type });
  },

  // Get Current User
  getCurrentUser: async () => {
    return await apiClient.get('/auth/me');
  },

  // Update Profile
  updateProfile: async (profileData) => {
    return await apiClient.put('/auth/updatedetails', profileData);
  },
};

export default authService;
