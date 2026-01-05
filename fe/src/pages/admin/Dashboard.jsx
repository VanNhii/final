import adminService from '@/services/adminService';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const [dashboardStats, setDashboardStats] = useState({
    overview: {
      totalUsers: 0,
      totalJobs: 0,
      totalApplications: 0,
      pendingReports: 0,
      totalPayments: 0,
      totalCandidates: 0,
      totalRecruiters: 0,
      activeJobs: 0,
      pendingApplications: 0
    },
    monthly: {
      newUsers: 0,
      newJobs: 0,
      newApplications: 0
    }
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard stats from backend
      const [statsResponse, healthResponse] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getSystemHealth()
      ]);

      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
        setRecentActivities(statsResponse.data.recentActivities || []);
        console.log('Dashboard Stats:', statsResponse.data); // Debug log
        console.log('Recent Activities:', statsResponse.data.recentActivities); // Debug log
      }

      if (healthResponse.success) {
        setSystemHealth(healthResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.');
      toast.error('Lỗi khi tải dữ liệu dashboard');
     
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, trend, trendValue }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className={`text-sm mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? '↗' : '↘'} {trendValue} so với tháng trước
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ActionCard = ({ title, description, icon, link, color }) => (
    <Link
      to={link}
      className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all hover:scale-105 group"
    >
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </Link>
  );

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  };

  const handleQuickAction = async (action, jobId) => {
    try {
      if (action === 'approve') {
        await adminService.updateJobStatus(jobId, { status: 'approved' });
        toast.success('Đã duyệt tin tuyển dụng');
      } else if (action === 'reject') {
        await adminService.updateJobStatus(jobId, { status: 'rejected', reason: 'Không đáp ứng tiêu chuẩn' });
        toast.success('Đã từ chối tin tuyển dụng');
      }
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Lỗi khi cập nhật trạng thái tin tuyển dụng');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Health Status */}
      {systemHealth && (
        <div className={`rounded-lg p-4 border ${
          systemHealth.status === 'healthy' 
            ? 'bg-green-50 border-green-200' 
            : systemHealth.status === 'warning'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`h-3 w-3 rounded-full ${
                systemHealth.status === 'healthy' 
                  ? 'bg-green-400' 
                  : systemHealth.status === 'warning'
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
              }`} />
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                systemHealth.status === 'healthy' 
                  ? 'text-green-800' 
                  : systemHealth.status === 'warning'
                  ? 'text-yellow-800'
                  : 'text-red-800'
              }`}>
                Trạng thái hệ thống: {systemHealth.status === 'healthy' ? 'Bình thường' : systemHealth.status === 'warning' ? 'Cảnh báo' : 'Lỗi'}
              </p>
              {systemHealth.issues && systemHealth.issues.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {systemHealth.issues.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">Chào mừng quay trở lại! Đây là tổng quan hệ thống của bạn.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={fetchDashboardData}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Làm mới
          </button>
          <Link 
            to="/admin/analytics"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tạo báo cáo
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng người dùng"
          value={dashboardStats.overview.totalUsers}
          color="text-blue-600"
          trend="up"
          trendValue={`+${dashboardStats.monthly?.newUsers || 0}`}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          }
        />
        <StatCard
          title="Việc làm đang tuyển"
          value={dashboardStats.overview.activeJobs}
          color="text-green-600"
          trend="up"
          trendValue={`+${dashboardStats.monthly?.newJobs || 0}`}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
              <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
            </svg>
          }
        />
        <StatCard
          title="Đơn ứng tuyển"
          value={dashboardStats.overview.totalApplications}
          color="text-purple-600"
          trend="up"
          trendValue={`+${dashboardStats.monthly?.newApplications || 0}`}
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" />
            </svg>
          }
        />
        <StatCard
          title="Báo cáo chờ xử lý"
          value={dashboardStats.overview.pendingReports}
          color="text-red-600"
          icon={
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="Quản lý người dùng"
            description="Xem và quản lý tài khoản"
            link="/admin/users"
            color="bg-blue-100 text-blue-600"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            }
          />
          <ActionCard
            title="Duyệt việc làm"
            description="Kiểm tra tin tuyển dụng mới"
            link="/admin/jobs"
            color="bg-green-100 text-green-600"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
              </svg>
            }
          />
          <ActionCard
            title="Xử lý báo cáo"
            description="Giải quyết khiếu nại"
            link="/admin/reports"
            color="bg-red-100 text-red-600"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
              </svg>
            }
          />
          <ActionCard
            title="Phân tích dữ liệu"
            description="Xem báo cáo chi tiết"
            link="/admin/analytics"
            color="bg-purple-100 text-purple-600"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Hoạt động gần đây</h2>
              <Link to="/admin/activities" className="text-sm text-primary-600 hover:text-primary-700">
                Xem tất cả →
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id || activity._id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-semibold text-sm">
                          {(activity.user_id?.name || activity.user_id?.email)?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 text-sm truncate">
                            {activity.description}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                            activity.user_id?.role === 'candidate' 
                              ? 'bg-blue-100 text-blue-800' 
                              : activity.user_id?.role === 'recruiter'
                              ? 'bg-green-100 text-green-800'
                              : activity.user_id?.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {activity.user_id?.role === 'candidate' ? 'Ứng viên' : 
                             activity.user_id?.role === 'recruiter' ? 'Nhà tuyển dụng' :
                             activity.user_id?.role === 'admin' ? 'Quản trị viên' : 'Khác'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2 text-sm text-gray-600">
                          <span>{activity.user_id?.name || activity.user_id?.email}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(activity.created_at)}</span>
                          {activity.ip_address && activity.ip_address !== '127.0.0.1' && activity.ip_address !== '::1' && (
                            <>
                              <span>•</span>
                              <span className="text-xs text-gray-500">IP: {activity.ip_address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Chưa có hoạt động nào</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Thống kê hệ thống</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Tài khoản đang hoạt động</span>
                <span className="text-2xl font-bold text-green-600">
                  {dashboardStats.overview.totalUsers - dashboardStats.overview.pendingReports}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Việc làm được duyệt</span>
                <span className="text-2xl font-bold text-blue-600">
                  {dashboardStats.overview.activeJobs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Đơn ứng tuyển thành công</span>
                <span className="text-2xl font-bold text-purple-600">
                  {Math.floor(dashboardStats.overview.totalApplications * 0.15)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Doanh thu tháng này</span>
                <span className="text-2xl font-bold text-green-600">
                  {(dashboardStats.overview.totalPayments * 1.2).toLocaleString()}k VND
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Hiệu suất hệ thống</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">85%</div>
              <div className="text-gray-600 font-medium">Tỷ lệ tìm được việc</div>
              <div className="text-sm text-gray-500 mt-1">Cải thiện 5% so với tháng trước</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">92%</div>
              <div className="text-gray-600 font-medium">Hài lòng của nhà tuyển dụng</div>
              <div className="text-sm text-gray-500 mt-1">Ổn định so với tháng trước</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">4.8/5</div>
              <div className="text-gray-600 font-medium">Đánh giá trung bình</div>
              <div className="text-sm text-gray-500 mt-1">Tăng 0.2 điểm so với tháng trước</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
