import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  const handleExportPayments = async () => {
    try {
      const reportDate = new Date().toLocaleDateString('vi-VN');

      // Summary section
      const summaryHeaders = ['Thông tin báo cáo', 'Giá trị'];
      const summaryRows = [
        ['Ngày xuất báo cáo', reportDate],
        ['Tổng doanh thu', formatCurrency(totalRevenue, 'VND')],
        ['Giao dịch thành công', stats.completed],
        ['Đang xử lý', stats.pending],
        ['Thất bại', stats.failed]
      ];

      // Details section
      const headers = ['STT', 'Mã giao dịch', 'Nhà tuyển dụng', 'Gói dịch vụ', 'Số tiền', 'Phương thức', 'Trạng thái', 'Ngày giao dịch'];
      const rows = payments.map((payment, index) => [
        index + 1,
        payment.transaction_id || payment.transactionId || getPaymentId(payment),
        getRecruiterInfo(payment).name,
        getServicePlanInfo(payment),
        formatCurrency(payment.amount, payment.currency || 'VND'),
        getPaymentMethodLabel(payment.payment_method || payment.paymentMethod),
        (payment.payment_status || payment.status) === 'completed' ? 'Hoàn thành' :
          (payment.payment_status || payment.status) === 'pending' ? 'Đang xử lý' :
            (payment.payment_status || payment.status) === 'failed' ? 'Thất bại' : payment.payment_status || payment.status,
        payment.payment_date || payment.paymentDate || new Date(payment.created_at).toLocaleDateString('vi-VN')
      ]);

      const BOM = '\uFEFF';
      const csvContent = BOM +
        'BÁO CÁO THANH TOÁN\n\n' +
        [summaryHeaders, ...summaryRows].map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nCHI TIẾT GIAO DỊCH\n' +
        [headers, ...rows].map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao_cao_thanh_toan_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Xuất báo cáo Excel thành công');
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filter !== 'all') {
        params.payment_status = filter;
      }

      const response = await adminService.getPayments(params);

      if (response.data) {
        const paymentsData = response.data || [];
        setPayments(paymentsData);

        // Calculate stats
        const completedPayments = paymentsData.filter(p => p.payment_status === 'completed');
        const revenue = completedPayments.reduce((sum, p) => sum + (parseInt(p.amount) || 0), 0);

        setTotalRevenue(revenue);
        setStats({
          total: paymentsData.length,
          completed: paymentsData.filter(p => p.payment_status === 'completed').length,
          pending: paymentsData.filter(p => p.payment_status === 'pending').length,
          failed: paymentsData.filter(p => p.payment_status === 'failed').length
        });
      } else {
        throw new Error('Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Không thể tải danh sách thanh toán');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [paymentId]: true }));

      const response = await adminService.updatePaymentStatus(paymentId, {
        payment_status: newStatus
      });

      if (response.success || response.data?.success) {
        setPayments(payments.map(payment =>
          (payment._id === paymentId || payment.id === paymentId)
            ? { ...payment, payment_status: newStatus }
            : payment
        ));

        toast.success('Đã cập nhật trạng thái thanh toán');
        fetchPayments(); // Refresh to update stats
      } else {
        throw new Error('Failed to update payment status');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Không thể cập nhật trạng thái thanh toán');
    } finally {
      setActionLoading(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  const handleRefund = async (paymentId, refundAmount) => {
    try {
      setActionLoading(prev => ({ ...prev, [paymentId]: true }));

      const response = await adminService.processRefund(paymentId, {
        refund_amount: refundAmount
      });

      if (response.success || response.data?.success) {
        setPayments(payments.map(payment =>
          (payment._id === paymentId || payment.id === paymentId)
            ? { ...payment, payment_status: 'refunded', refund_amount: refundAmount }
            : payment
        ));

        toast.success('Đã xử lý hoàn tiền thành công');
        fetchPayments(); // Refresh to update stats
      } else {
        throw new Error('Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Không thể xử lý hoàn tiền');
    } finally {
      setActionLoading(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  const getPaymentId = (payment) => payment._id || payment.id;

  const getRecruiterInfo = (payment) => {
    if (payment.recruiter_id && typeof payment.recruiter_id === 'object') {
      return {
        name: payment.recruiter_id.company_name || payment.recruiter_id.name || 'N/A',
        email: payment.recruiter_id.email || 'N/A'
      };
    }
    return {
      name: payment.recruiterName || payment.recruiter_name || 'N/A',
      email: payment.recruiter_email || 'N/A'
    };
  };

  const getServicePlanInfo = (payment) => {
    // Check subscription_id.service_plan_id first (from backend populate)
    if (payment.subscription_id?.service_plan_id && typeof payment.subscription_id.service_plan_id === 'object') {
      return payment.subscription_id.service_plan_id.name || payment.subscription_id.service_plan_id.plan_name || 'N/A';
    }
    // Fallback to direct service_plan_id
    if (payment.service_plan_id && typeof payment.service_plan_id === 'object') {
      return payment.service_plan_id.name || payment.service_plan_id.plan_name || 'N/A';
    }
    return payment.plan || payment.service_plan || 'N/A';
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      completed: 'Hoàn thành',
      pending: 'Đang xử lý',
      failed: 'Thất bại',
      refunded: 'Đã hoàn tiền'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      momo: 'MoMo',
      bank_transfer: 'Chuyển khoản',
      credit_card: 'Thẻ tín dụng',
      paypal: 'PayPal'
    };
    return methods[method] || method;
  };

  const formatCurrency = (amount, currency) => {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(amount);
    }
    return `${amount} ${currency}`;
  };

  const filteredPayments = filter === 'all'
    ? payments
    : payments.filter(payment => (payment.payment_status || payment.status) === filter);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý thanh toán</h1>
      </div>

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng doanh thu</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalRevenue, 'VND')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Giao dịch thành công</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Đang xử lý</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.pending}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Thất bại</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.failed}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Lịch sử giao dịch</h3>
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="completed">Hoàn thành</option>
                <option value="pending">Đang xử lý</option>
                <option value="failed">Thất bại</option>
                <option value="refunded">Đã hoàn tiền</option>
              </select>
              <button
                onClick={handleExportPayments}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
              >
                Xuất báo cáo
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhà tuyển dụng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gói dịch vụ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phương thức
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày giao dịch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => {
                  const paymentId = getPaymentId(payment);
                  const isActionLoading = actionLoading[paymentId];
                  const recruiterInfo = getRecruiterInfo(payment);
                  const servicePlan = getServicePlanInfo(payment);

                  return (
                    <tr key={paymentId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {recruiterInfo.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {payment.transaction_id || payment.transactionId || paymentId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{servicePlan}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount, payment.currency || 'VND')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getPaymentMethodLabel(payment.payment_method || payment.paymentMethod)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {payment.payment_date || payment.paymentDate || new Date(payment.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.payment_status || payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded hover:bg-gray-100"
                            title="Xem chi tiết"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {(payment.payment_status === 'completed' || payment.status === 'completed') && (
                            <button
                              onClick={() => handleRefund(paymentId, payment.amount)}
                              disabled={isActionLoading}
                              className="text-orange-600 hover:text-orange-900 disabled:opacity-50 p-1.5 rounded hover:bg-gray-100"
                              title="Hoàn tiền"
                            >
                              {isActionLoading ? (
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              )}
                            </button>
                          )}
                          {(payment.payment_status === 'pending' || payment.status === 'pending') && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(paymentId, 'completed')}
                                disabled={isActionLoading}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 p-1.5 rounded hover:bg-gray-100"
                                title="Xác nhận thanh toán"
                              >
                                {isActionLoading ? (
                                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(paymentId, 'failed')}
                                disabled={isActionLoading}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 p-1.5 rounded hover:bg-gray-100"
                                title="Từ chối thanh toán"
                              >
                                {isActionLoading ? (
                                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-lg font-medium">Chưa có giao dịch nào</p>
                      <p className="text-sm">Hệ thống chưa có lịch sử thanh toán</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết giao dịch</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Transaction Info */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Mã giao dịch</p>
                    <p className="text-lg font-semibold">{selectedPayment.transaction_id || selectedPayment.transactionId || getPaymentId(selectedPayment)}</p>
                  </div>
                  {getStatusBadge(selectedPayment.payment_status || selectedPayment.status)}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nhà tuyển dụng</label>
                  <p className="mt-1 text-sm text-gray-900">{getRecruiterInfo(selectedPayment).name}</p>
                  <p className="text-xs text-gray-500">{getRecruiterInfo(selectedPayment).email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gói dịch vụ</label>
                  <p className="mt-1 text-sm text-gray-900">{getServicePlanInfo(selectedPayment)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số tiền</label>
                  <p className="mt-1 text-lg font-bold text-green-600">
                    {formatCurrency(selectedPayment.amount, selectedPayment.currency || 'VND')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phương thức</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {getPaymentMethodLabel(selectedPayment.payment_method || selectedPayment.paymentMethod)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày giao dịch</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedPayment.payment_date || selectedPayment.paymentDate || new Date(selectedPayment.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày tạo</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedPayment.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              {selectedPayment.description && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <p className="mt-1 text-sm text-gray-600">{selectedPayment.description}</p>
                </div>
              )}

              {selectedPayment.refund_amount && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700">Số tiền hoàn</label>
                  <p className="mt-1 text-sm font-medium text-red-600">
                    {formatCurrency(selectedPayment.refund_amount, selectedPayment.currency || 'VND')}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                {(selectedPayment.payment_status === 'completed' || selectedPayment.status === 'completed') && (
                  <button
                    onClick={() => {
                      handleRefund(getPaymentId(selectedPayment), selectedPayment.amount);
                      setShowPaymentModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Hoàn tiền
                  </button>
                )}
                {(selectedPayment.payment_status === 'pending' || selectedPayment.status === 'pending') && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusUpdate(getPaymentId(selectedPayment), 'completed');
                        setShowPaymentModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Xác nhận
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(getPaymentId(selectedPayment), 'failed');
                        setShowPaymentModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
