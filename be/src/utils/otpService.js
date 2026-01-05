const crypto = require('crypto');

// Tạo mã OTP 6 chữ số
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Tạo mã OTP an toàn hơn sử dụng crypto
const generateSecureOTP = () => {
  const buffer = crypto.randomBytes(3);
  const otp = parseInt(buffer.toString('hex'), 16) % 1000000;
  return otp.toString().padStart(6, '0');
};

// Tạo token ngẫu nhiên
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash một chuỗi sử dụng SHA256
const hashString = (string) => {
  return crypto.createHash('sha256').update(string).digest('hex');
};

// Kiểm tra xem OTP có hợp lệ không (6 chữ số)
const isValidOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

// Tạo expiry time (mặc định 15 phút)
const createExpiryTime = (minutes = 15) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

module.exports = {
  generateOTP,
  generateSecureOTP,
  generateRandomToken,
  hashString,
  isValidOTP,
  createExpiryTime
};
