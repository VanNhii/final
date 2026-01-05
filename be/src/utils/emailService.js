const nodemailer = require('nodemailer');

// Tạo transporter cho gửi email
const createTransporter = () => {
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Gửi OTP qua email
const sendOTPEmail = async (email, otp, type = 'verification') => {
  try {
    const transporter = createTransporter();
    
    let subject, htmlContent;
    
    if (type === 'verification') {
      subject = 'Xác thực tài khoản - Hệ thống Việc Làm IT';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Xác thực tài khoản</h2>
          <p>Chào bạn,</p>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Hệ thống Việc Làm IT. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP sau:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otp}</span>
          </div>
          <p><strong>Lưu ý:</strong> Mã OTP này có hiệu lực trong 15 phút.</p>
          <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời email này.</p>
        </div>
      `;
    } else if (type === 'password_reset') {
      subject = 'Đặt lại mật khẩu - Hệ thống Việc Làm IT';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Đặt lại mật khẩu</h2>
          <p>Chào bạn,</p>
          <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP sau để tiếp tục:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; color: #dc3545; letter-spacing: 5px;">${otp}</span>
          </div>
          <p><strong>Lưu ý:</strong> Mã OTP này có hiệu lực trong 15 phút.</p>
          <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này và đảm bảo tài khoản của bạn an toàn.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời email này.</p>
        </div>
      `;
    }

    const mailOptions = {
      from: `"Hệ thống Việc Làm IT" <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Gửi email thất bại');
  }
};

// Gửi email với template tùy chỉnh
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Gửi email thất bại');
  }
};

module.exports = {
  sendOTPEmail,
  sendEmail
};