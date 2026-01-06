import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import {toast} from 'react-toastify';
import PaymentMethodModal from '../../components/PaymentMethodModal';
import recruiterService from '../../services/recruiterService';
import servicePlanService from '../../services/servicePlanService';

const RecruiterSubscription = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedPlanFromNav = location.state?.selectedPlan;

  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(selectedPlanFromNav || null);
  const [upgrading, setUpgrading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Load data from API
  useEffect(() => {
    loadData();
    // Show upgrade modal if selected plan from navigation
    if (selectedPlanFromNav) {
      setShowUpgradeModal(true);
    }
  }, [selectedPlanFromNav]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current subscription first
      const currentSubResponse = await recruiterService.getCurrentSubscription().catch(() => null);
      console.log('Current Subscription Response:', currentSubResponse);
      setCurrentSubscription(currentSubResponse?.data || null);

      // Usage data might be included in current subscription
      if (currentSubResponse?.data?.usage) {
        setSubscriptionUsage(currentSubResponse.data.usage);
      }

      // Load subscription history
      const subscriptionHistoryResponse = await servicePlanService.getRecruiterSubscriptions().catch(() => ({data: []}));
      setSubscriptionHistory(subscriptionHistoryResponse?.data || []);
      // Load available plans for comparison/upgrade
      let plansResponse;
      try {
        plansResponse = await servicePlanService.getAvailablePlans();
      } catch (error) {
        console.log('Public service plans failed, trying recruiter service plans:', error);
        plansResponse = await recruiterService.getServicePlans().catch(() => ({data: []}));
      }
      setAvailablePlans(plansResponse?.data || []);

      // Load billing history
      const billingResponse = await servicePlanService.getPayments().catch(() => ({data: []}));
      setBillingHistory(billingResponse?.data || []);

    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };
  console.log('Current Subscription:', billingHistory);
  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    const labels = {
      active: 'Đang hoạt động',
      expired: 'Đã hết hạn',
      cancelled: 'Đã hủy',
      pending: 'Chờ xử lý'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || badges.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      paid: 'Đã thanh toán',
      pending: 'Chờ thanh toán',
      failed: 'Thất bại',
      refunded: 'Đã hoàn tiền'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || badges.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === -1 || limit === null) return 0; // unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getRemainingDays = () => {
    if (!currentSubscription?.end_date) return 0;
    const endDate = new Date(currentSubscription.end_date);
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  const upgradePlan = async (planId) => {
    if (!planId) {
      setShowUpgradeModal(true);
      return;
    }

    const plan = availablePlans.find(p => p._id === planId);
    if (!plan) return;

    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;
    // Show payment method modal
    setShowUpgradeModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentMethodConfirm = async (paymentMethod) => {
    if (!selectedPlan) return;

    try {
      setUpgrading(true);

      // Get recruiter data
      const recruiter = await recruiterService.getCurrentSubscription().catch(() => null);
      const recruiterId = recruiter?.data?.recruiter_id;

      if (paymentMethod === 'momo') {
        // Create MoMo payment
        const momoPaymentData = {
          subscription_id: currentSubscription?._id || 'new',
          plan_id: selectedPlan._id,
          amount: selectedPlan.price,
          orderInfo: `Thanh toán gói ${selectedPlan.name}`
        };

        const response = await servicePlanService.createMomoPayment(momoPaymentData);

        if (response.data?.payUrl) {
          // Save payment info to localStorage for verification later
          localStorage.setItem('pending_payment', JSON.stringify({
            payment_id: response.data.payment_id,
            plan_id: selectedPlan._id,
            plan_name: selectedPlan.name,
            amount: selectedPlan.price,
            timestamp: Date.now()
          }));

          // Redirect to MoMo payment page
          window.location.href = response.data.payUrl;
        } else {
          throw new Error('Không nhận được link thanh toán từ MoMo');
        }
      } else {
        // Other payment methods (not implemented yet)
        if (currentSubscription) {
          await recruiterService.upgradeSubscription(selectedPlan._id, {
            payment_method: paymentMethod
          });
        } else {
          await servicePlanService.subscribeToServicePlan(selectedPlan._id, {
            payment_method: paymentMethod
          });
        }

        await loadData();
        setShowPaymentModal(false);
        setSelectedPlan(null);
        toast.success('Nâng cấp thành công!');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại.');
      setShowPaymentModal(false);
    } finally {
      setUpgrading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!currentSubscription) return;

    if (window.confirm('Bạn có chắc chắn muốn hủy gói đăng ký? Bạn sẽ mất quyền truy cập vào tất cả tính năng premium.')) {
      try {
        await recruiterService.cancelSubscription('User requested cancellation');
        await loadData();
        toast.success('Đã hủy đăng ký thành công.');
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        toast.error('Có lỗi xảy ra khi hủy đăng ký. Vui lòng liên hệ hỗ trợ.');
      }
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Lỗi</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={loadData}
                  className="bg-red-100 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Subscription</h1>
          <p className="mt-1 text-sm text-gray-600">
            Theo dõi và quản lý gói đăng ký của bạn
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/recruiter/service-plans"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            Xem tất cả gói
          </Link>
          {!currentSubscription && (
            <button
              onClick={() => upgradePlan()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              Đăng ký gói
            </button>
          )}
        </div>
      </div>


      {currentSubscription ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Gói hiện tại: {currentSubscription.service_plan_id?.name || 'Không xác định'}
              </h2>
              <div className="flex items-center space-x-4">
                {getStatusBadge(currentSubscription.subscription_status)}
                <span className="text-sm text-gray-600">
                  Hết hạn: {currentSubscription.end_date ? new Date(currentSubscription.end_date).toLocaleDateString('vi-VN') : 'Không xác định'}
                </span>
                <span className="text-sm text-gray-600">
                  Còn lại: {getRemainingDays()} ngày
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentSubscription.service_plan_id?.price || 0)}
              </div>
              <div className="text-sm text-gray-600">
                /{currentSubscription.service_plan_id?.duration_days === 30 ? 'tháng' : 'năm'}
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          {subscriptionUsage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tin tuyển dụng</h3>
                {subscriptionUsage.job_postings_limit === -1 ? (
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{subscriptionUsage.job_postings_used || 0}</div>
                    <div className="text-sm text-green-600">Không giới hạn</div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">
                        {subscriptionUsage.job_postings_used || 0}/{subscriptionUsage.job_postings_limit || 0}
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.round(getUsagePercentage(subscriptionUsage.job_postings_used || 0, subscriptionUsage.job_postings_limit || 0))}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{width: `${getUsagePercentage(subscriptionUsage.job_postings_used || 0, subscriptionUsage.job_postings_limit || 0)}%`}}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">CV Downloads</h3>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      {subscriptionUsage.cv_download_used || 0}/{subscriptionUsage.cv_download_limit || 0}
                    </span>
                    <span className="text-sm text-gray-600">
                      {Math.round(getUsagePercentage(subscriptionUsage.cv_download_used || 0, subscriptionUsage.cv_download_limit || 0))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{width: `${getUsagePercentage(subscriptionUsage.cv_download_used || 0, subscriptionUsage.cv_download_limit || 0)}%`}}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tìm kiếm ứng viên</h3>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      {subscriptionUsage.candidate_search_used || 0}/{subscriptionUsage.candidate_search_limit || 0}
                    </span>
                    <span className="text-sm text-gray-600">
                      {Math.round(getUsagePercentage(subscriptionUsage.candidate_search_used || 0, subscriptionUsage.candidate_search_limit || 0))}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{width: `${getUsagePercentage(subscriptionUsage.candidate_search_used || 0, subscriptionUsage.candidate_search_limit || 0)}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Features */}
          {currentSubscription.service_plan_id?.features && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Tính năng hiện tại</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(currentSubscription.service_plan_id.features).map(([key, value], index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-700">
                      {key}: {typeof value === 'boolean' ? (value ? 'Có' : 'Không') : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={() => upgradePlan()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                So sánh gói khác
              </button>
              <Link
                to="/recruiter/service-plans"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Xem tất cả gói
              </Link>
            </div>
            <button
              onClick={cancelSubscription}
              className="px-4 py-2 text-red-600 hover:text-red-700"
            >
              Hủy đăng ký
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Chưa có gói đăng ký</h3>
            <p className="mt-1 text-sm text-gray-500">
              Đăng ký gói để sử dụng các tính năng premium và tối ưu hóa việc tuyển dụng
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/recruiter/service-plans"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Xem tất cả gói
              </Link>
              <button
                onClick={() => upgradePlan()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Đăng ký nhanh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans for Comparison */}
      {availablePlans.length > 0 && currentSubscription && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">So sánh với gói khác</h2>
            <Link
              to="/recruiter/service-plans"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Xem chi tiết →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availablePlans.slice(0, 3).map((plan) => (
              <div
                key={plan._id}
                className={`relative border-2 rounded-lg p-4 ${plan.is_recommended ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                  } ${currentSubscription?.service_plan_id?._id === plan._id ? 'ring-2 ring-blue-500' : ''
                  }`}
              >
                {currentSubscription?.service_plan_id?._id === plan._id && (
                  <div className="absolute top-0 left-0 -mt-2 -ml-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
                      Hiện tại
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
                    <span className="text-sm text-gray-600">/{plan.duration_days === 30 ? 'tháng' : 'năm'}</span>
                  </div>
                </div>

                <button
                  onClick={() => upgradePlan(plan._id)}
                  disabled={currentSubscription?.service_plan_id?._id === plan._id}
                  className={`w-full py-2 px-4 rounded font-medium text-sm ${currentSubscription?.service_plan_id?._id === plan._id
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {currentSubscription?.service_plan_id?._id === plan._id ? 'Gói hiện tại' : 'So sánh'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscription History */}
      {subscriptionHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Lịch sử đăng ký gói</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày đăng ký
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gói dịch vụ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời hạn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Giá
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subscriptionHistory.map((subscription) => (
                  <tr key={subscription._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.created_at ? new Date(subscription.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.service_plan_id?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.start_date && subscription.end_date ? (
                        <>
                          {new Date(subscription.start_date).toLocaleDateString('vi-VN')} - {new Date(subscription.end_date).toLocaleDateString('vi-VN')}
                        </>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(subscription.subscription_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(subscription.price || subscription.service_plan_id?.price || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Lịch sử thanh toán</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gói
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Giao dịch
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.created_at ? new Date(payment.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.subscription?.service_plan?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(payment.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="text-green-600">
                        {payment.transaction_id || payment._id}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-md overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedPlan ? `${currentSubscription ? 'Nâng cấp' : 'Đăng ký'} lên ${selectedPlan.name}` : 'Chọn gói đăng ký'}
              </h3>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedPlan(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedPlan ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Chi tiết {currentSubscription ? 'nâng cấp' : 'đăng ký'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {currentSubscription && (
                      <div>
                        <p className="text-sm text-gray-600">Gói hiện tại:</p>
                        <p className="font-medium">
                          {currentSubscription.service_plan_id?.name} - {formatCurrency(currentSubscription.service_plan_id?.price || 0)}/tháng
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Gói mới:</p>
                      <p className="font-medium">{selectedPlan.name} - {formatCurrency(selectedPlan.price)}/tháng</p>
                    </div>
                  </div>
                  {currentSubscription && (
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <p className="text-sm text-blue-700">
                        {selectedPlan.price > currentSubscription.service_plan_id?.price ? 'Chênh lệch' : 'Giảm giá'}:
                        <strong> {formatCurrency(Math.abs(selectedPlan.price - (currentSubscription.service_plan_id?.price || 0)))}/tháng</strong>
                      </p>
                    </div>
                  )}
                </div>

                {selectedPlan.features && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Tính năng</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedPlan.features).map(([key, value], index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-gray-700">
                            {key}: {typeof value === 'boolean' ? (value ? 'Có' : 'Không') : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      setSelectedPlan(null);
                    }}
                    disabled={upgrading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmUpgrade}
                    disabled={upgrading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {upgrading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xử lý...
                      </div>
                    ) : (
                      `Xác nhận ${currentSubscription ? 'nâng cấp' : 'đăng ký'}`
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availablePlans.map((plan) => (
                  <div
                    key={plan._id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`border-2 rounded-lg p-4 cursor-pointer hover:border-green-500 ${plan.is_recommended ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                  >
                    <h4 className="font-medium text-gray-900">{plan.name}</h4>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(plan.price)}</p>
                    <p className="text-sm text-gray-600">/{plan.duration_days === 30 ? 'tháng' : 'năm'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      <PaymentMethodModal
        show={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPlan(null);
        }}
        onConfirm={handlePaymentMethodConfirm}
        planName={selectedPlan?.name || ''}
        amount={selectedPlan?.price || 0}
        loading={upgrading}
      />
    </div>
  );
};

export default RecruiterSubscription;
