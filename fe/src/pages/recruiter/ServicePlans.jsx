import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import servicePlanService from '../../services/servicePlanService';
import { formatCurrency, formatDate } from '../../utils/formatters';

const ServicePlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, currentSubRes] = await Promise.all([
        servicePlanService.getAvailablePlans(),
        servicePlanService.getRecruiterSubscriptions()
      ]);
      
      setPlans(plansRes.data || []);
      
      // Find current active subscription
      const subscriptions = currentSubRes.data || [];
      const activeSub = subscriptions.find(sub => sub.subscription_status === 'active');
      setCurrentSubscription(activeSub || null);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Không thể tải dữ liệu gói dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (currentSubscription) {
      // Redirect to subscription management page for upgrades/changes
      navigate('/recruiter/subscription', { state: { selectedPlan: plan } });
    } else {
      // Allow new subscription
      setSelectedPlan(plan);
      setShowPlanModal(true);
    }
  };

    const confirmSubscription = async (paymentMethod) => {
    try {
      setSubscribing(selectedPlan._id);
      console.log('Creating subscription for plan:', selectedPlan._id, 'with payment method:', paymentMethod);
      
      if (paymentMethod === 'momo') {
        // Create MoMo payment
        const momoPaymentData = {
          subscription_id: 'new',
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
        // Other payment methods
        const response = await servicePlanService.subscribeToServicePlan(selectedPlan._id, {
          payment_method: paymentMethod
        });
        
        console.log('Subscription created successfully:', response);
        toast.success('Đăng ký gói dịch vụ thành công! Subscription ID: ' + response.data._id);
        
        // Wait a moment before navigating
        setTimeout(() => {
          setShowPlanModal(false);
          setSelectedPlan(null);
          // Navigate to subscription page to show the new subscription
          navigate('/recruiter/subscription');
        }, 1000);
      }
      
    } catch (error) {
      console.error('Subscription creation failed:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi đăng ký gói dịch vụ');
    } finally {
      setSubscribing(null);
    }
  };

  // Check if user has active subscription
  const hasActiveSubscription = !!currentSubscription;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gói Dịch Vụ</h1>
        <p className="mt-2 text-gray-600">
          {hasActiveSubscription 
            ? 'Khám phá các gói dịch vụ khác hoặc quản lý gói hiện tại'
            : 'Chọn gói dịch vụ phù hợp để tối ưu hóa việc tuyển dụng của bạn'
          }
        </p>
        {hasActiveSubscription && (
          <div className="mt-4">
            <Link
              to="/recruiter/subscription"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Quản lý gói của tôi
            </Link>
          </div>
        )}
      </div>

      {/* Current Subscription - Quick Overview */}
      {currentSubscription && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">
                Gói hiện tại: {currentSubscription.service_plan_id?.name || 'N/A'}
              </h3>
              <p className="text-blue-600">
                Hết hạn: {formatDate(currentSubscription.end_date)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                Đang hoạt động
              </span>
              <p className="text-sm text-blue-600 mt-1">
                <Link 
                  to="/recruiter/subscription" 
                  className="hover:text-blue-800 underline"
                >
                  Xem chi tiết →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className={`bg-white rounded-lg shadow-lg border-2 ${
              plan.is_popular ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
            } overflow-hidden relative`}
          >
            {plan.is_popular && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Phổ biến
                </span>
              </div>
            )}

            <div className="p-6">
              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-gray-500 ml-1">
                    / {plan.duration_days} ngày
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    {plan.features.job_posts_limit} tin đăng tuyển
                  </span>
                </div>

                {plan.features.featured_jobs > 0 && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">
                      {plan.features.featured_jobs} tin nổi bật
                    </span>
                  </div>
                )}

                {plan.features.candidate_search && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Tìm kiếm ứng viên</span>
                  </div>
                )}

                {plan.features.cv_downloads > 0 && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">
                      {plan.features.cv_downloads} lượt tải CV
                    </span>
                  </div>
                )}

                {plan.features.advanced_analytics && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Thống kê nâng cao</span>
                  </div>
                )}

                {plan.features.priority_support && (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Hỗ trợ ưu tiên</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={subscribing === plan._id}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  currentSubscription?.service_plan_id?._id === plan._id
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-blue-300'
                    : hasActiveSubscription
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : plan.is_popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } ${subscribing === plan._id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {subscribing === plan._id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Đang xử lý...
                  </div>
                ) : currentSubscription?.service_plan_id?._id === plan._id ? (
                  'Gói hiện tại'
                ) : hasActiveSubscription ? (
                  'So sánh / Nâng cấp'
                ) : (
                  'Chọn gói này'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-12">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quản lý dịch vụ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/recruiter/subscription"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Quản lý Subscription</p>
                <p className="text-sm text-gray-500">Xem chi tiết, nâng cấp hoặc hủy gói</p>
              </div>
            </Link>

            <Link
              to="/recruiter/payments"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM13 8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Lịch sử thanh toán</p>
                <p className="text-sm text-gray-500">Xem hóa đơn và giao dịch</p>
              </div>
            </Link>

            <div className="flex items-center p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Hỗ trợ khách hàng</p>
                <p className="text-sm text-gray-400">Liên hệ nếu cần hỗ trợ</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Modal */}
      {showPlanModal && selectedPlan && (
        <div className="fixed inset-0   bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Xác nhận đăng ký gói {selectedPlan.name}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Chọn phương thức thanh toán:</p>
                <div className="space-y-2">
                  <button
                    onClick={() => confirmSubscription('momo')}
                    disabled={subscribing === selectedPlan._id}
                    className="w-full text-left px-4 py-2 border-2 border-pink-300 bg-pink-50 rounded-lg hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {subscribing === selectedPlan._id ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600 mr-2"></div>
                        Đang xử lý...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="font-semibold text-pink-600">💳 MoMo Wallet</span>
                        <span className="ml-auto text-xs text-pink-500">(Khuyên dùng)</span>
                      </div>
                    )}
                  </button>
                  
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPlanModal(false);
                    setSelectedPlan(null);
                  }}
                  disabled={subscribing === selectedPlan._id}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePlans;
