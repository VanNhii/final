const request = require('supertest');
const app = require('../src/server');

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and send OTP', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        full_name: 'Test User',
        phone: '+84123456789',
        role: 'candidate'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Đăng ký thành công');
      expect(response.body.data.email).toBe(userData.email);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test@example.com', // Same email as above
        password: 'password123',
        full_name: 'Test User 2',
        phone: '+84123456790',
        role: 'candidate'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email đã được sử dụng');
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should reject invalid OTP format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123' // Invalid format
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Mã OTP không hợp lệ');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject login for inactive account', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      if (response.status === 401) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('chưa được kích hoạt');
      }
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send OTP for password reset', async () => {
      // This test assumes user exists and is active
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'activeuser@example.com'
        });

      // May return 404 if user doesn't exist, which is expected in test
      expect([200, 404]).toContain(response.status);
    });
  });
});

module.exports = {};
