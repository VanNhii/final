import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import servicePlanService from '../../services/servicePlanService';

const PaymentResult = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking'); // checking, success, failed
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      // Get payment info from localStorage
      const pendingPayment = localStorage.getItem('pending_payment');
      if (!pendingPayment) {
        setStatus('failed');
        setError('Không tìm thấy thông tin thanh toán');
        return;
      }

      const paymentData = JSON.parse(pendingPayment);
      setPaymentInfo(paymentData);

      // Get payment status from URL params (from MoMo redirect)
      const resultCode = searchParams.get('resultCode');
      const orderId = searchParams.get('orderId');
      const message = searchParams.get('message');

      console.log('MoMo callback params:', { resultCode, orderId, message });

      // Always verify payment with backend
      if (paymentData.payment_id) {
        try {
          console.log('Verifying payment with backend:', paymentData.payment_id);
          const verifyResponse = await servicePlanService.verifyMomoPayment(paymentData.payment_id);
          console.log('Verify response:', verifyResponse);
          
          if (verifyResponse.data?.new_status === 'completed') {
            setStatus('success');
            toast.success('Thanh toán thành công!');
            
            // Clear pending payment
            localStorage.removeItem('pending_payment');

            // Wait 3 seconds then redirect
            setTimeout(() => {
              navigate('/recruiter/subscription');
            }, 3000);
          } else {
            setStatus('failed');
            setError(verifyResponse.data?.momo_response?.message || message || 'Thanh toán không thành công');
          }
        } catch (err) {
          console.error('Error verifying payment:', err);
          // Fallback to URL params
          if (resultCode === '0') {
            setStatus('success');
            toast.success('Thanh toán thành công!');
            localStorage.removeItem('pending_payment');
            setTimeout(() => navigate('/recruiter/subscription'), 3000);
          } else {
            setStatus('failed');
            setError(message || 'Thanh toán không thành công');
          }
        }
      } else if (resultCode === '0') {
        setStatus('success');
        toast.success('Thanh toán thành công!');
        localStorage.removeItem('pending_payment');
        setTimeout(() => navigate('/recruiter/subscription'), 3000);
      } else {
        setStatus('failed');
        setError(message || 'Thanh toán không thành công');
      }
    } catch (err) {
      console.error('Error processing payment result:', err);
      setStatus('failed');
      setError('Có lỗi xảy ra khi xử lý kết quả thanh toán');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleRetry = () => {
    localStorage.removeItem('pending_payment');
    navigate('/recruiter/subscription');
  };

  const handleBackToHome = () => {
    localStorage.removeItem('pending_payment');
    navigate('/recruiter/subscription');
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Đang xử lý thanh toán</h2>
          <p className="mt-2 text-gray-600">Vui lòng đợi trong giây lát...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h2>
            <p className="text-gray-600 mb-6">
              Cảm ơn bạn đã đăng ký gói dịch vụ
            </p>

            {/* Payment Details */}
            {paymentInfo && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gói dịch vụ:</span>
                    <span className="font-medium text-gray-900">{paymentInfo.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-bold text-green-600">{formatCurrency(paymentInfo.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phương thức:</span>
                    <span className="font-medium text-gray-900">Ví MoMo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Thành công
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>✓</strong> Gói dịch vụ của bạn đã được kích hoạt<br/>
                <strong>✓</strong> Bạn có thể bắt đầu sử dụng ngay bây giờ<br/>
                <strong>✓</strong> Hóa đơn đã được gửi qua email
              </p>
            </div>

            {/* Redirect Message */}
            <p className="text-sm text-gray-500 mb-6">
              Đang chuyển hướng về trang quản lý subscription...
            </p>

            {/* Action Button */}
            <button
              onClick={handleBackToHome}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Về trang quản lý
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Thanh toán không thành công</h2>
            <p className="text-gray-600 mb-6">
              {error || 'Có lỗi xảy ra trong quá trình thanh toán'}
            </p>

            {/* Payment Details */}
            {paymentInfo && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gói dịch vụ:</span>
                    <span className="font-medium text-gray-900">{paymentInfo.plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số tiền:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(paymentInfo.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Thất bại
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Reasons */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-yellow-800 mb-2">Nguyên nhân có thể:</p>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Số dư ví không đủ</li>
                <li>Thông tin thanh toán không chính xác</li>
                <li>Hủy giao dịch trong quá trình thanh toán</li>
                <li>Hết thời gian chờ thanh toán</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={handleBackToHome}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Quay lại
              </button>
            </div>

            {/* Support */}
            <p className="mt-6 text-sm text-gray-500">
              Cần hỗ trợ? <a href="mailto:support@example.com" className="text-blue-600 hover:text-blue-700">Liên hệ chúng tôi</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentResult;
