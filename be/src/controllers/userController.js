const User = require('../models/User');
const { sendOTPEmail, sendOTPSMS } = require('../utils/emailService');
const { generateSecureOTP, isValidOTP, createExpiryTime } = require('../utils/otpService');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('candidate_profile', 'bio skills experience_years job_status')
      .populate('recruiter_profile', 'company_name industry subscription_plan');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('candidate_profile')
      .populate('recruiter_profile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create user
// @route   POST /api/v1/users
// @access  Public
exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
exports.updateUser = async (req, res, next) => {
  try {
    // Remove sensitive fields from update
    const { password, resetPasswordToken, resetPasswordExpire, ...updateData } = req.body;
    
    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).select('-password -resetPasswordToken -resetPasswordExpire')
      .populate('candidate_profile')
      .populate('recruiter_profile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send email verification code
// @route   POST /api/v1/users/verify-email/send
// @access  Private
exports.sendEmailVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.account_status === 'approved' && !user.email_verification.code) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate OTP
    const otp = generateSecureOTP();
    
    // Update verification fields
    user.email_verification = {
      code: otp,
      expires_at: createExpiryTime(15),
      attempts: 0
    };
    await user.save();

    // Send OTP via email
    await sendOTPEmail(user.email, otp, 'verification');

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email with code
// @route   POST /api/v1/users/verify-email
// @access  Private
exports.verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if code is valid
    if (!user.email_verification.code || 
        user.email_verification.code !== code ||
        user.email_verification.expires_at < new Date()) {
      
      // Increment attempts
      user.email_verification.attempts = (user.email_verification.attempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Check max attempts
    if (user.email_verification.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new code.'
      });
    }

    // Clear verification and approve if needed
    user.email_verification.code = null;
    user.email_verification.expires_at = null;
    user.email_verification.attempts = 0;
    
    if (user.account_status === 'pending') {
      user.account_status = 'approved';
    }
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send phone verification code
// @route   POST /api/v1/users/verify-phone/send
// @access  Private
exports.sendPhoneVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number not provided'
      });
    }

    // Generate OTP
    const otp = generateSecureOTP();
    
    // Update verification fields
    user.phone_verification = {
      code: otp,
      expires_at: createExpiryTime(15),
      attempts: 0
    };
    await user.save();

    // Send OTP via SMS (implement sendOTPSMS function)
    // await sendOTPSMS(user.phone, otp);
    
    // For now, just log the code (remove in production)
    console.log(`Phone verification code for ${user.phone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your phone'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify phone with code
// @route   POST /api/v1/users/verify-phone
// @access  Private
exports.verifyPhone = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if code is valid
    if (!user.phone_verification.code || 
        user.phone_verification.code !== code ||
        user.phone_verification.expires_at < new Date()) {
      
      // Increment attempts
      user.phone_verification.attempts = (user.phone_verification.attempts || 0) + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Check max attempts
    if (user.phone_verification.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new code.'
      });
    }

    // Clear verification
    user.phone_verification.code = null;
    user.phone_verification.expires_at = null;
    user.phone_verification.attempts = 0;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Phone verified successfully'
    });
  } catch (error) {
    next(error);
  }
};
