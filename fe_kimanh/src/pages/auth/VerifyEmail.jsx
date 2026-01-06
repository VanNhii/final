import authService from '@/services/authService';
import { clearError } from '@/store/slices/authSlice';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.auth);
  
  const email = location.state?.email;
  const message = location.state?.message;

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }
    
    // Start countdown for resend button
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  // Clear error when OTP changes
  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [otp, dispatch, error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      toast.error('Vui lòng nhập mã OTP');
      return;
    }

    if (otp.length !== 6) {
      toast.error('Mã OTP phải có 6 số');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyOTP(email, otp.trim());
      toast.success('Xác thực thành công! Bạn có thể đăng nhập ngay bây giờ.');
      navigate('/login');
    } catch (error) {
      const errorMessage = error.message || 'Xác thực thất bại';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResendLoading(true);
    try {
      await authService.resendOTP(email, 'email_verification');
      toast.success('Mã OTP mới đã được gửi đến email của bạn');
      setCountdown(60);
      setOtp(''); // Clear current OTP
      
      // Start new countdown
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      const errorMessage = error.message || 'Không thể gửi lại mã OTP';
      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Xác thực email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {message || 'Nhập mã OTP được gửi đến email của bạn'}
          </p>
          <p className="mt-1 text-center text-sm font-medium text-gray-800">
            {email}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Mã OTP (6 số)
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="6"
              required
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              value={otp}
              onChange={handleOtpChange}
              autoComplete="off"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Xác thực'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Không nhận được mã?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || resendLoading}
                className="font-medium text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  'Đang gửi...'
                ) : countdown > 0 ? (
                  `Gửi lại sau ${countdown}s`
                ) : (
                  'Gửi lại mã'
                )}
              </button>
            </p>
          </div>

          <div className="text-center">
            <Link
              to="/register"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              ← Quay lại đăng ký
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;