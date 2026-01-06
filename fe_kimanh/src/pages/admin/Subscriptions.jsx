import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [stats, setStats] = useState({
    active: 0,
    expired: 0,
    autoRenewal: 0,
    total: 0
  });

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, []);

  const handleExportSubscriptions = async () => {
    try {
      const reportDate = new Date().toLocaleDateString('vi-VN');
      
      // Summary section
      const summaryHeaders = ['Thông tin báo cáo', 'Giá trị'];
      const summaryRows = [
        ['Ngày xuất báo cáo', reportDate],
        ['Tổng subscription', stats.total],
        ['Đang hoạt động', stats.active],
        ['Hết hạn', stats.expired],
        ['Tự động gia hạn', stats.autoRenewal]
      ];
      
      // Details section
      const headers = ['STT', 'Nhà tuyển dụng', 'Email', 'Gói dịch vụ', 'Ngày bắt đầu', 'Ngày kết thúc', 'Trạng thái', 'Thanh toán', 'Tự động gia hạn'];
      const rows = subscriptions.map((sub, index) => [
        index + 1,
        getRecruiterInfo(sub).name,
        getRecruiterInfo(sub).email,
        getServicePlanInfo(sub),
        formatDate(sub.start_date || sub.startDate),
        formatDate(sub.end_date || sub.endDate),
        (sub.subscription_status || sub.status) === 'active' ? 'Đang hoạt động' : 
        (sub.subscription_status || sub.status) === 'expired' ? 'Hết hạn' : 
        (sub.subscription_status || sub.status) === 'cancelled' ? 'Đã hủy' : sub.subscription_status || sub.status,
        (sub.payment_status || sub.paymentStatus) === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
        (sub.auto_renewal !== undefined ? sub.auto_renewal : sub.autoRenewal) ? 'Bật' : 'Tắt'
      ]);
      
      const BOM = '\uFEFF';
      const csvContent = BOM + 
        'BÁO CÁO SUBSCRIPTION\n\n' +
        [summaryHeaders, ...summaryRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nCHI TIẾT SUBSCRIPTION\n' +
        [headers, ...rows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao_cao_subscription_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Xuất báo cáo Excel thành công');
    } catch (error) {
      console.error('Error exporting subscriptions:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSubscriptions();
      
      if (response.data) {
        const subscriptionsData = response.data || [];
        setSubscriptions(subscriptionsData);
      } else {
        throw new Error('Failed to fetch subscriptions');
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Không thể tải danh sách subscription');
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminService.getSubscriptionStats();
      
      if (response.data?.success) {
        setStats(response.data.data || {
          active: 0,
          expired: 0,
          autoRenewal: 0,
          total: 0
        });
      }
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
    }
  };

  const updateSubscriptionStatus = async (subscriptionId, newStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [subscriptionId]: true }));
      
      const response = await adminService.updateSubscriptionStatus(subscriptionId, {
        status: newStatus
      });
      
      if (response.data?.success) {
        setSubscriptions(subscriptions.map(sub => 
          (sub._id === subscriptionId || sub.id === subscriptionId)
            ? { ...sub, subscription_status: newStatus, status: newStatus }
            : sub
        ));
        toast.success('Cập nhật trạng thái subscription thành công');
        fetchStats(); // Refresh stats
      } else {
        throw new Error('Failed to update subscription status');
      }
    } catch (error) {
      console.error('Error updating subscription status:', error);
      toast.error('Không thể cập nhật trạng thái subscription');
    } finally {
      setActionLoading(prev => ({ ...prev, [subscriptionId]: false }));
    }
  };

  const getSubscriptionId = (subscription) => subscription._id || subscription.id;
  
  const getRecruiterInfo = (subscription) => {
    if (subscription.recruiter_id && typeof subscription.recruiter_id === 'object') {
      const email = subscription.recruiter_id.user_id?.email || subscription.recruiter_id.email || 'N/A';
      return {
        name: subscription.recruiter_id.company_name || subscription.recruiter_id.name || 'N/A',
        email: email
      };
    }
    return {
      name: subscription.recruiterName || subscription.recruiter_name || 'N/A',
      email: subscription.email || subscription.recruiter_email || 'N/A'
    };
  };

  const getServicePlanInfo = (subscription) => {
    if (subscription.service_plan_id && typeof subscription.service_plan_id === 'object') {
      return subscription.service_plan_id.name || subscription.service_plan_id.plan_name || 'N/A';
    }
    return subscription.planName || subscription.plan_name || 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      active: 'Đang hoạt động',
      expired: 'Hết hạn',
      cancelled: 'Đã hủy',
      pending: 'Chờ kích hoạt'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      paid: 'Đã thanh toán',
      unpaid: 'Chưa thanh toán',
      partial: 'Thanh toán một phần'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredSubscriptions = filter === 'all' 
    ? subscriptions 
    : subscriptions.filter(sub => (sub.subscription_status || sub.status) === filter);

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
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Subscription</h1>
      </div>

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Đang hoạt động</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.active}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Hết hạn</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.expired}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tự động gia hạn</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.autoRenewal}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng subscription</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Danh sách Subscription</h3>
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="expired">Hết hạn</option>
                <option value="cancelled">Đã hủy</option>
                <option value="pending">Chờ kích hoạt</option>
              </select>
              <button 
                onClick={handleExportSubscriptions}
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
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thanh toán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tự động gia hạn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.length > 0 ? (
                filteredSubscriptions.map((subscription) => {
                  const subscriptionId = getSubscriptionId(subscription);
                  const isActionLoading = actionLoading[subscriptionId];
                  const recruiterInfo = getRecruiterInfo(subscription);
                  const servicePlan = getServicePlanInfo(subscription);
                  
                  return (
                    <tr key={subscriptionId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {recruiterInfo.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {recruiterInfo.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {recruiterInfo.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{servicePlan}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(subscription.start_date || subscription.startDate)} - {formatDate(subscription.end_date || subscription.endDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(subscription.payment_status || subscription.paymentStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(subscription.subscription_status || subscription.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (subscription.auto_renewal !== undefined ? subscription.auto_renewal : subscription.autoRenewal)
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {(subscription.auto_renewal !== undefined ? subscription.auto_renewal : subscription.autoRenewal) ? 'Bật' : 'Tắt'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1">
                          {/* Chi tiết */}
                          <button 
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setShowSubscriptionModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {/* Gia hạn */}
                          {(subscription.subscription_status || subscription.status) === 'expired' && (
                            <button 
                              onClick={() => updateSubscriptionStatus(subscriptionId, 'active')}
                              disabled={isActionLoading}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Gia hạn subscription"
                            >
                              {isActionLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              )}
                            </button>
                          )}
                          {/* Hủy */}
                          {(subscription.subscription_status || subscription.status) === 'active' && (
                            <button 
                              onClick={() => updateSubscriptionStatus(subscriptionId, 'cancelled')}
                              disabled={isActionLoading}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Hủy subscription"
                            >
                              {isActionLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </button>
                          )}
                          {/* Kích hoạt lại */}
                          {subscription.status === 'cancelled' && (
                            <button 
                              onClick={() => updateSubscriptionStatus(subscriptionId, 'active')}
                              disabled={isActionLoading}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Kích hoạt lại"
                            >
                              {isActionLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-lg font-medium">Chưa có subscription nào</p>
                      <p className="text-sm">Hệ thống chưa có đăng ký dịch vụ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Detail Modal */}
      {showSubscriptionModal && selectedSubscription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết Subscription</h3>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Status */}
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <p className="text-sm text-gray-600">Mã subscription</p>
                  <p className="text-lg font-semibold">{getSubscriptionId(selectedSubscription)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedSubscription.subscription_status || selectedSubscription.status)}
                  {getPaymentStatusBadge(selectedSubscription.payment_status || selectedSubscription.paymentStatus)}
                </div>
              </div>

              {/* Recruiter Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Thông tin nhà tuyển dụng</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tên công ty</p>
                    <p className="text-sm font-medium">{getRecruiterInfo(selectedSubscription).name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm font-medium">{getRecruiterInfo(selectedSubscription).email}</p>
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gói dịch vụ</label>
                  <p className="mt-1 text-sm text-gray-900">{getServicePlanInfo(selectedSubscription)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tự động gia hạn</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (selectedSubscription.auto_renewal !== undefined ? selectedSubscription.auto_renewal : selectedSubscription.autoRenewal)
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(selectedSubscription.auto_renewal !== undefined ? selectedSubscription.auto_renewal : selectedSubscription.autoRenewal) ? 'Bật' : 'Tắt'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSubscription.start_date || selectedSubscription.startDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSubscription.end_date || selectedSubscription.endDate)}</p>
                </div>
              </div>

              {/* Usage Info */}
              {selectedSubscription.usage && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Thông tin sử dụng</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{selectedSubscription.usage.job_posts_used || 0}</p>
                      <p className="text-sm text-gray-600">Tin đã đăng</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{selectedSubscription.usage.cv_downloads_used || 0}</p>
                      <p className="text-sm text-gray-600">CV đã tải</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{selectedSubscription.usage.featured_jobs_used || 0}</p>
                      <p className="text-sm text-gray-600">Tin nổi bật</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                {(selectedSubscription.subscription_status === 'expired' || selectedSubscription.status === 'expired') && (
                  <button
                    onClick={() => {
                      updateSubscriptionStatus(getSubscriptionId(selectedSubscription), 'active');
                      setShowSubscriptionModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Gia hạn
                  </button>
                )}
                {(selectedSubscription.subscription_status === 'active' || selectedSubscription.status === 'active') && (
                  <button
                    onClick={() => {
                      updateSubscriptionStatus(getSubscriptionId(selectedSubscription), 'cancelled');
                      setShowSubscriptionModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Hủy subscription
                  </button>
                )}
                {(selectedSubscription.subscription_status === 'cancelled' || selectedSubscription.status === 'cancelled') && (
                  <button
                    onClick={() => {
                      updateSubscriptionStatus(getSubscriptionId(selectedSubscription), 'active');
                      setShowSubscriptionModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Kích hoạt lại
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
