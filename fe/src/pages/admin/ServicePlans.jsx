import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';

const ServicePlans = () => {
  const [servicePlans, setServicePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    plan_type: '',
    job_posts_limit: '',
    featured_jobs: '',
    cv_downloads: '',
    candidate_search: false,
    advanced_analytics: false,
    priority_support: false,
    is_popular: false,
    color: '#007bff'
  });

  useEffect(() => {
    fetchServicePlans();
  }, []);

  const fetchServicePlans = async () => {
    try {
      setLoading(true);
      const response = await adminService.getServicePlans();
      
      console.log('Service Plans API Response:', response.data); // Debug log
      
      if (response.data) {
        const plansData = response.data || [];
        console.log('Service Plans Data:', plansData); // Debug log
        setServicePlans(plansData);
      } else {
        throw new Error('Failed to fetch service plans');
      }
    } catch (error) {
      console.error('Error fetching service plans:', error);
      toast.error('Không thể tải danh sách gói dịch vụ');
      setServicePlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(prev => ({ ...prev, submit: true }));
      
      const planData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_days: parseInt(formData.duration),
        plan_type: formData.plan_type,
        features: {
          job_posts_limit: parseInt(formData.job_posts_limit),
          featured_jobs: parseInt(formData.featured_jobs) || 0,
          cv_downloads: parseInt(formData.cv_downloads) || 0,
          candidate_search: formData.candidate_search,
          advanced_analytics: formData.advanced_analytics,
          priority_support: formData.priority_support
        },
        is_popular: formData.is_popular,
        color: formData.color,
        is_active: true
      };

      let response;
      if (editingPlan) {
        response = await adminService.updateServicePlan(editingPlan._id, planData);
      } else {
        response = await adminService.createServicePlan(planData);
      }
      
      if (response.success || response.data?.success) {
        toast.success(editingPlan ? 'Cập nhật gói dịch vụ thành công' : 'Tạo gói dịch vụ thành công');
        setIsModalOpen(false);
        setEditingPlan(null);
        resetForm();
        fetchServicePlans();
      } else {
        throw new Error('Failed to save service plan');
      }
    } catch (error) {
      console.error('Error saving service plan:', error);
      toast.error('Không thể lưu gói dịch vụ');
    } finally {
      setActionLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '',
      plan_type: '',
      job_posts_limit: '',
      featured_jobs: '',
      cv_downloads: '',
      candidate_search: false,
      advanced_analytics: false,
      priority_support: false,
      is_popular: false,
      color: '#007bff'
    });
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    const features = plan.features || {};
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price || '',
      duration: plan.duration_days || '',
      plan_type: plan.plan_type || '',
      job_posts_limit: features.job_posts_limit || '',
      featured_jobs: features.featured_jobs || '',
      cv_downloads: features.cv_downloads || '',
      candidate_search: features.candidate_search || false,
      advanced_analytics: features.advanced_analytics || false,
      priority_support: features.priority_support || false,
      is_popular: plan.is_popular || false,
      color: plan.color || '#007bff'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (planId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa gói dịch vụ này?')) {
      try {
        setActionLoading(prev => ({ ...prev, [planId]: true }));
        
        const response = await adminService.deleteServicePlan(planId);
        
        if (response.success || response.data?.success) {
          toast.success('Xóa gói dịch vụ thành công');
          fetchServicePlans();
        } else {
          throw new Error('Failed to delete service plan');
        }
      } catch (error) {
        console.error('Error deleting service plan:', error);
        toast.error('Không thể xóa gói dịch vụ');
      } finally {
        setActionLoading(prev => ({ ...prev, [planId]: false }));
      }
    }
  };

  const toggleStatus = async (planId) => {
    try {
      setActionLoading(prev => ({ ...prev, [planId]: true }));
      
      const response = await adminService.toggleServicePlanStatus(planId);
      
      if (response.success || response.data?.success) {
        toast.success('Cập nhật trạng thái thành công');
        fetchServicePlans();
      } else {
        throw new Error('Failed to toggle service plan status');
      }
    } catch (error) {
      console.error('Error toggling service plan status:', error);
      toast.error('Không thể cập nhật trạng thái');
    } finally {
      setActionLoading(prev => ({ ...prev, [planId]: false }));
    }
  };

  const getPlanId = (plan) => plan._id;
  const getPlanName = (plan) => plan.name;
  const getPlanPrice = (plan) => plan.price;
  const getPlanDuration = (plan) => plan.duration_days;
  const getPlanFeatures = (plan) => plan.features || {};
  const getPlanStatus = (plan) => plan.is_active;
  const getSubscriptionCount = (plan) => plan.subscription_count || 0;
  const getPlanType = (plan) => plan.plan_type;
  const getPlanDescription = (plan) => plan.description;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {[1, 2, 3].map((i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Quản lý gói dịch vụ</h1>
        <button
          onClick={() => {
            setEditingPlan(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Thêm gói dịch vụ
        </button>
      </div>

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng gói dịch vụ</p>
              <p className="text-2xl font-semibold text-gray-900">{servicePlans.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Gói đang hoạt động</p>
              <p className="text-2xl font-semibold text-gray-900">
                {servicePlans.filter(plan => getPlanStatus(plan)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng subscription</p>
              <p className="text-2xl font-semibold text-gray-900">
                {servicePlans.reduce((sum, plan) => sum + getSubscriptionCount(plan), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Danh sách gói dịch vụ</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên gói
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời hạn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số subscription
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
              {servicePlans.length > 0 ? (
                servicePlans.map((plan) => {
                  const planId = getPlanId(plan);
                  const isActionLoading = actionLoading[planId];
                  
                  return (
                    <tr key={planId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{getPlanName(plan)}</div>
                        <div className="text-sm text-gray-500">
                          {getPlanType(plan)} • {getPlanFeatures(plan).job_posts_limit || 0} bài đăng
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatPrice(getPlanPrice(plan))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getPlanDuration(plan)} ngày</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getSubscriptionCount(plan)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          getPlanStatus(plan)
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {getPlanStatus(plan) ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1">
                          {/* Sửa */}
                          <button
                            onClick={() => handleEdit(plan)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Sửa gói dịch vụ"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Tạm dừng/Kích hoạt */}
                          <button
                            onClick={() => toggleStatus(planId)}
                            disabled={isActionLoading}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                              getPlanStatus(plan)
                                ? 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50'
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={getPlanStatus(plan) ? 'Tạm dừng' : 'Kích hoạt'}
                          >
                            {isActionLoading ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : getPlanStatus(plan) ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          {/* Xóa */}
                          <button
                            onClick={() => handleDelete(planId)}
                            disabled={isActionLoading}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Xóa gói dịch vụ"
                          >
                            {isActionLoading ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-lg font-medium">Chưa có gói dịch vụ nào</p>
                      <p className="text-sm">Thêm gói dịch vụ đầu tiên để bắt đầu</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal thêm/sửa gói dịch vụ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPlan ? 'Sửa gói dịch vụ' : 'Thêm gói dịch vụ mới'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Thông tin cơ bản */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên gói *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại gói *
                    </label>
                    <select
                      value={formData.plan_type}
                      onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Chọn loại gói</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả *
                  </label>
                  <textarea
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mô tả chi tiết về gói dịch vụ"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá (VND) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời hạn (ngày) *
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Tính năng */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Tính năng</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Số bài đăng *
                      </label>
                      <input
                        type="number"
                        value={formData.job_posts_limit}
                        onChange={(e) => setFormData({ ...formData, job_posts_limit: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bài đăng nổi bật
                      </label>
                      <input
                        type="number"
                        value={formData.featured_jobs}
                        onChange={(e) => setFormData({ ...formData, featured_jobs: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tải CV
                      </label>
                      <input
                        type="number"
                        value={formData.cv_downloads}
                        onChange={(e) => setFormData({ ...formData, cv_downloads: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="candidate_search"
                          checked={formData.candidate_search}
                          onChange={(e) => setFormData({ ...formData, candidate_search: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="candidate_search" className="ml-2 block text-sm text-gray-900">
                          Tìm kiếm ứng viên
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="advanced_analytics"
                          checked={formData.advanced_analytics}
                          onChange={(e) => setFormData({ ...formData, advanced_analytics: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="advanced_analytics" className="ml-2 block text-sm text-gray-900">
                          Phân tích nâng cao
                        </label>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="priority_support"
                          checked={formData.priority_support}
                          onChange={(e) => setFormData({ ...formData, priority_support: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="priority_support" className="ml-2 block text-sm text-gray-900">
                          Hỗ trợ ưu tiên
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_popular"
                          checked={formData.is_popular}
                          onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_popular" className="ml-2 block text-sm text-gray-900">
                          Gói phổ biến
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Màu sắc */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Màu sắc
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading.submit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading.submit ? 'Đang xử lý...' : (editingPlan ? 'Cập nhật' : 'Thêm')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePlans;
