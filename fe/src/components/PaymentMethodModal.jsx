import { useState } from 'react';

const PaymentMethodModal = ({ show, onClose, onConfirm, planName, amount, loading = false }) => {
  const [selectedMethod, setSelectedMethod] = useState('momo');

  if (!show) return null;

  const paymentMethods = [
    {
      id: 'momo',
      name: 'Ví MoMo',
      icon: '📱',
      description: 'Thanh toán qua ví điện tử MoMo',
      popular: true
    },
    {
      id: 'vnpay',
      name: 'VNPay',
      icon: '💳',
      description: 'Thanh toán qua cổng VNPay',
      disabled: true
    },
    {
      id: 'zalopay',
      name: 'ZaloPay',
      icon: '💰',
      description: 'Thanh toán qua ví ZaloPay',
      disabled: true
    },
    {
      id: 'bank_transfer',
      name: 'Chuyển khoản',
      icon: '🏦',
      description: 'Chuyển khoản ngân hàng',
      disabled: true
    },
    {
      id: 'credit_card',
      name: 'Thẻ tín dụng',
      icon: '💳',
      description: 'Thanh toán bằng thẻ tín dụng/ghi nợ',
      disabled: true
    }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleConfirm = () => {
    const method = paymentMethods.find(m => m.id === selectedMethod);
    if (method && !method.disabled) {
      onConfirm(selectedMethod);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Chọn phương thức thanh toán</h3>
            <p className="mt-1 text-sm text-gray-500">Vui lòng chọn phương thức thanh toán phù hợp</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Payment Info */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gói dịch vụ</p>
              <p className="text-lg font-semibold text-gray-900">{planName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Tổng thanh toán</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(amount)}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6">
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                onClick={() => !method.disabled && setSelectedMethod(method.id)}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  method.disabled
                    ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                    : selectedMethod === method.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center">
                  {/* Radio Button */}
                  <div className="flex items-center h-5">
                    <input
                      type="radio"
                      name="payment-method"
                      value={method.id}
                      checked={selectedMethod === method.id}
                      onChange={() => !method.disabled && setSelectedMethod(method.id)}
                      disabled={method.disabled}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Icon */}
                  <div className="ml-4 text-3xl">
                    {method.icon}
                  </div>

                  {/* Method Info */}
                  <div className="ml-4 flex-1">
                    <div className="flex items-center">
                      <p className="text-base font-semibold text-gray-900">{method.name}</p>
                      {method.popular && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Phổ biến
                        </span>
                      )}
                      {method.disabled && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          Sắp ra mắt
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                  </div>

                  {/* Checkmark for selected */}
                  {selectedMethod === method.id && !method.disabled && (
                    <div className="ml-4">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Security Note */}
          <div className="mt-6 flex items-start p-4 bg-green-50 rounded-lg">
            <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Thanh toán an toàn</p>
              <p className="text-xs text-green-700 mt-1">
                Thông tin thanh toán của bạn được mã hóa và bảo mật theo tiêu chuẩn quốc tế
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || paymentMethods.find(m => m.id === selectedMethod)?.disabled}
            className="px-6 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </>
            ) : (
              <>
                Xác nhận thanh toán
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodModal;
