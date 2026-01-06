const crypto = require('crypto');
const axios = require('axios');

class MomoService {
  constructor() {
    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;
    this.endpoint = process.env.MOMO_ENDPOINT;
    this.redirectUrl = process.env.MOMO_REDIRECT_URL;
    this.ipnUrl = process.env.MOMO_IPN_URL;
  }

  /**
   * Generate signature for MoMo request
   * @param {Object} data - Request data
   * @returns {string} Signature
   */
  generateSignature(data) {
    const rawSignature = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Create payment request to MoMo
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} MoMo response
   */
  async createPayment(paymentData) {
    try {
      const {
        orderId,
        amount,
        orderInfo,
        extraData = '',
        requestType = 'payWithMethod',
        autoCapture = true,
        lang = 'vi'
      } = paymentData;

      const requestId = `${orderId}_${Date.now()}`;
      
      // Prepare request body
      const rawData = {
        partnerCode: this.partnerCode,
        partnerName: 'Recruitment Platform',
        storeId: this.partnerCode,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: this.redirectUrl,
        ipnUrl: this.ipnUrl,
        lang: lang,
        requestType: requestType,
        autoCapture: autoCapture,
        extraData: Buffer.from(JSON.stringify(extraData)).toString('base64')
      };

      // Generate signature
      const signatureData = {
        accessKey: this.accessKey,
        amount: rawData.amount,
        extraData: rawData.extraData,
        ipnUrl: rawData.ipnUrl,
        orderId: rawData.orderId,
        orderInfo: rawData.orderInfo,
        partnerCode: rawData.partnerCode,
        redirectUrl: rawData.redirectUrl,
        requestId: rawData.requestId,
        requestType: rawData.requestType
      };

      const signature = this.generateSignature(signatureData);

      // Final request body
      const requestBody = {
        ...rawData,
        signature: signature
      };

      console.log('MoMo Payment Request:', JSON.stringify(requestBody, null, 2));

      // Send request to MoMo
      const response = await axios.post(this.endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('MoMo Payment Response:', JSON.stringify(response.data, null, 2));

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('MoMo Payment Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  }

  /**
   * Verify MoMo callback signature
   * @param {Object} callbackData - Callback data from MoMo
   * @returns {boolean} Is signature valid
   */
  verifySignature(callbackData) {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
      } = callbackData;

      const rawSignature = [
        `accessKey=${this.accessKey}`,
        `amount=${amount}`,
        `extraData=${extraData}`,
        `message=${message}`,
        `orderId=${orderId}`,
        `orderInfo=${orderInfo}`,
        `orderType=${orderType}`,
        `partnerCode=${partnerCode}`,
        `payType=${payType}`,
        `requestId=${requestId}`,
        `responseTime=${responseTime}`,
        `resultCode=${resultCode}`,
        `transId=${transId}`
      ].join('&');

      const generatedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(rawSignature)
        .digest('hex');

      return generatedSignature === signature;
    } catch (error) {
      console.error('Signature Verification Error:', error);
      return false;
    }
  }

  /**
   * Check transaction status with MoMo
   * @param {string} orderId - Order ID
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Transaction status
   */
  async checkTransactionStatus(orderId, requestId) {
    try {
      const endpoint = 'https://test-payment.momo.vn/v2/gateway/api/query';
      
      const rawData = {
        partnerCode: this.partnerCode,
        requestId: `${requestId}_status`,
        orderId: orderId,
        lang: 'vi'
      };

      const signatureData = {
        accessKey: this.accessKey,
        orderId: rawData.orderId,
        partnerCode: rawData.partnerCode,
        requestId: rawData.requestId
      };

      const signature = this.generateSignature(signatureData);

      const requestBody = {
        ...rawData,
        signature: signature
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  }

  /**
   * Refund transaction
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} Refund response
   */
  async refundTransaction(refundData) {
    try {
      const endpoint = 'https://test-payment.momo.vn/v2/gateway/api/refund';
      
      const {
        orderId,
        transId,
        amount,
        description
      } = refundData;

      const requestId = `${orderId}_refund_${Date.now()}`;

      const rawData = {
        partnerCode: this.partnerCode,
        orderId: orderId,
        requestId: requestId,
        amount: amount,
        transId: transId,
        lang: 'vi',
        description: description || 'Hoàn tiền giao dịch'
      };

      const signatureData = {
        accessKey: this.accessKey,
        amount: rawData.amount,
        description: rawData.description,
        orderId: rawData.orderId,
        partnerCode: rawData.partnerCode,
        requestId: rawData.requestId,
        transId: rawData.transId
      };

      const signature = this.generateSignature(signatureData);

      const requestBody = {
        ...rawData,
        signature: signature
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { message: error.message }
      };
    }
  }

  /**
   * Parse MoMo result code to payment status
   * @param {number} resultCode - MoMo result code
   * @returns {string} Payment status
   */
  parseResultCode(resultCode) {
    const resultCodeMap = {
      0: 'completed',      // Success
      9000: 'processing',  // Transaction is being processed
      1001: 'failed',      // Transaction failed
      1002: 'failed',      // Transaction failed (system error)
      1003: 'failed',      // Invalid data
      1004: 'failed',      // Invalid amount
      1005: 'failed',      // Invalid signature
      1006: 'failed',      // Transaction not found
      1007: 'cancelled',   // User cancelled
      1008: 'failed',      // Timeout
      1009: 'failed',      // Insufficient balance
      1010: 'failed',      // Over limit
      1011: 'failed',      // Invalid OTP
      1012: 'failed',      // User blocked
      1013: 'failed',      // User not registered
      1014: 'failed',      // Duplicate requestId
      1015: 'failed',      // Order already paid
      1016: 'failed',      // Account suspended
      1017: 'failed',      // Transaction rejected
      1080: 'cancelled',   // User cancelled
      2001: 'failed',      // Invalid transaction
      3001: 'pending',     // Pending confirmation
      3002: 'pending',     // Pending payment
      4001: 'failed',      // Transaction expired
      4100: 'failed',      // Invalid card information
      default: 'failed'
    };

    return resultCodeMap[resultCode] || resultCodeMap.default;
  }

  /**
   * Get result message in Vietnamese
   * @param {number} resultCode - MoMo result code
   * @returns {string} Result message
   */
  getResultMessage(resultCode) {
    const messages = {
      0: 'Giao dịch thành công',
      9000: 'Giao dịch đang được xử lý',
      1001: 'Giao dịch thất bại',
      1002: 'Lỗi hệ thống',
      1003: 'Dữ liệu không hợp lệ',
      1004: 'Số tiền không hợp lệ',
      1005: 'Chữ ký không hợp lệ',
      1006: 'Không tìm thấy giao dịch',
      1007: 'người dùng đã hủy giao dịch',
      1008: 'Giao dịch hết thời gian',
      1009: 'Số dư không đủ',
      1010: 'Vượt quá hạn mức giao dịch',
      1011: 'Mã OTP không hợp lệ',
      1012: 'Tài khoản bị khóa',
      1013: 'Tài khoản chưa đăng ký',
      1014: 'Mã yêu cầu trùng lặp',
      1015: 'Đơn hàng đã được thanh toán',
      1016: 'Tài khoản bị tạm ngưng',
      1017: 'Giao dịch bị từ chối',
      1080: 'Người dùng đã hủy giao dịch',
      2001: 'Giao dịch không hợp lệ',
      3001: 'Đang chờ xác nhận',
      3002: 'Đang chờ thanh toán',
      4001: 'Giao dịch đã hết hạn',
      4100: 'Thông tin thẻ không hợp lệ',
      default: 'Giao dịch thất bại'
    };

    return messages[resultCode] || messages.default;
  }
}

module.exports = new MomoService();
