const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const { sendOTPEmail } = require('../utils/emailService');
const { generateSecureOTP, isValidOTP, createExpiryTime } = require('../utils/otpService');
const { getClientIP } = require('../utils/adminUtils');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role, phone } = req.body;
    
    // Validate required fields
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc'
      });
    }
    
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }
    
    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 8 ký tự'
      });
    }
    
    // Validate role
    if (!['candidate', 'recruiter'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Vai trò không hợp lệ'
      });
    }
    
    // Tạo user với trạng thái pending
    const userData = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      account_status: 'pending'
    };
    
    // Chỉ thêm phone nếu có giá trị
    if (phone && phone.trim()) {
      userData.phone = phone;
    }
    
    const user = await User.create(userData);
    
    // Tạo role-specific profile
    if (role === 'candidate') {
      await Candidate.create({
        user_id: user._id
      });
    } else if (role === 'recruiter') {
      await Recruiter.create({
        user_id: user._id,
        company_name: req.body.company_name || 'Not specified',
        industry: req.body.industry || 'Technology'
      });
    }

    // Tạo OTP và gửi email xác thực
    const otp = generateSecureOTP();
    console.log(`Generated OTP for ${email}: ${otp} -- ip : ${req.ip} -- user agent: ${req.get('User-Agent')}`);
    
    // Cập nhật email verification trong user document
    user.email_verification = {
      code: otp,
      expires_at: createExpiryTime(15),
      attempts: 0
    };
    await user.save();

    // Gửi OTP qua email
    await sendOTPEmail(email, otp, 'verification');
    
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
      data: {
        user_id: user._id,
        email: email,
        message: 'Mã OTP đã được gửi đến email của bạn'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for email verification
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    // muốn xác thực otp thì phải có  otp, và email của người đó
    // lúc này mình đi tìm email có tồn tại hay ko,
    // dựa vào email đó ra thì nó ra tài khoản,
    // dựa vào tafik hoản này có chứa otp, rồi mình đi so sánh otp của tài khoản này và otp nhập vào
    // trùng thì đúng, ko trùng thì sai


    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và mã OTP'
      });
    }

    if (!isValidOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ'
      });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra tài khoản đã được kích hoạt chưa
    if (user.account_status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được kích hoạt'
      });
    }

    // Kiểm tra verification code
    if (!user.email_verification.code || 
        user.email_verification.code !== otp ||
        user.email_verification.expires_at < new Date()) {
      
      // Tăng số lần thử
      user.email_verification.attempts = (user.email_verification.attempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn'
      });
    }

    // Kiểm tra số lần thử
    if (user.email_verification.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Đã vượt quá số lần thử cho phép. Vui lòng yêu cầu mã OTP mới.'
      });
    }

    // Xóa verification code và kích hoạt tài khoản
    user.email_verification.code = null;
    user.email_verification.expires_at = null;
    user.email_verification.attempts = 0;
    user.account_status = 'approved';
    await user.save();

    // Trả về token sau khi xác thực thành công
    sendTokenResponse(user, 200, res, 'Xác thực thành công! Tài khoản đã được kích hoạt.');
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email và mật khẩu'
      });
    }
    
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }

    // Kiểm tra tài khoản đã được kích hoạt
    if (user.account_status == "pending") {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để xác thực tài khoản.',
        data: {
          email: user.email,
          need_verification: true
        }
      });
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin đăng nhập không chính xác'
      });
    }
    
    sendTokenResponse(user, 200, res, 'Đăng nhập thành công');
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - Send OTP
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email'
      });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng với email này'
      });
    }

    // Kiểm tra tài khoản có được kích hoạt không
    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản chưa được kích hoạt'
      });
    }

    // Tạo OTP
    const otp = generateSecureOTP();
    
    // Cập nhật email verification trong user document với loại password_reset
    user.email_verification = {
      code: otp,
      expires_at: createExpiryTime(15),
      attempts: 0
    };
    await user.save();

    // Gửi OTP qua email
    await sendOTPEmail(email, otp, 'password_reset');
    
    res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn',
      data: {
        email: email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with OTP
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email, mã OTP và mật khẩu mới'
      });
    }

    if (!isValidOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 8 ký tự'
      });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra verification code trong user
    if (!user.email_verification.code || 
        user.email_verification.code !== otp ||
        user.email_verification.expires_at < new Date()) {
      
      // Tăng số lần thử
      user.email_verification.attempts = (user.email_verification.attempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Mã OTP không hợp lệ hoặc đã hết hạn'
      });
    }

    // Kiểm tra số lần thử
    if (user.email_verification.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Đã vượt quá số lần thử cho phép. Vui lòng yêu cầu mã OTP mới.'
      });
    }

    // Xóa verification code và cập nhật mật khẩu
    user.email_verification.code = null;
    user.email_verification.expires_at = null;
    user.email_verification.attempts = 0;
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res, next) => {
  try {
    const { email, type = 'email_verification' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp email'
      });
    }

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra type
    if (!['email_verification', 'password_reset'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại xác thực không hợp lệ'
      });
    }

    // Với email_verification, chỉ gửi nếu tài khoản chưa active
    if (type === 'email_verification' && user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được kích hoạt'
      });
    }

    // Với password_reset, chỉ gửi nếu tài khoản đã active
    if (type === 'password_reset' && !user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản chưa được kích hoạt'
      });
    }

    // Tạo OTP mới
    const otp = generateSecureOTP();
    
    // Cập nhật email verification trong user document
    user.email_verification = {
      code: otp,
      expires_at: createExpiryTime(15),
      attempts: 0
    };
    await user.save();

    // Gửi OTP qua email
    const emailType = type === 'email_verification' ? 'verification' : 'password_reset';
    await sendOTPEmail(email, otp, emailType);
    
    res.status(200).json({
      success: true,
      message: 'Mã OTP mới đã được gửi đến email của bạn',
      data: {
        email: email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    let profile = null;
    
    // Get role-specific profile
    if (user.role === 'candidate') {
      profile = await Candidate.findOne({ user_id: user._id });
    } else if (user.role === 'recruiter') {
      profile = await Recruiter.findOne({ user_id: user._id });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone,
      email: req.body.email
    };
    
    // Xử lý trường hợp frontend gửi full_name
    if (req.body.full_name && !req.body.first_name && !req.body.last_name) {
      const nameParts = req.body.full_name.trim().split(' ');
      fieldsToUpdate.first_name = nameParts[0];
      fieldsToUpdate.last_name = nameParts.slice(1).join(' ') || nameParts[0];
    }
    
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }
    
    user.password = req.body.newPassword;
    await user.save();
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, message = 'Thành công') => {
  // Create token
  const token = user.getSignedJwtToken();
  
  // Default to 7 days if JWT_COOKIE_EXPIRE is not set
  const cookieExpireDays = process.env.JWT_COOKIE_EXPIRE || 7;
  
  const options = {
    expires: new Date(
      Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }
  
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      data: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        is_verified: user.is_verified,
        is_active: user.is_active
      }
    });
};
