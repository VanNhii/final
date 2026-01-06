import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import servicePlanService from '../../services/servicePlanService';
import { formatDate } from '../../utils/formatters';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await servicePlanService.getRecruiterAnalytics(period);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Chờ xử lý',
      reviewing: 'Đang xem xét',
      accepted: 'Chấp nhận',
      rejected: 'Từ chối',
      withdrawn: 'Đã rút'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Thống kê & Phân tích</h1>
            <p className="mt-2 text-gray-600">
              Xem hiệu suất tuyển dụng và phân tích dữ liệu của bạn
            </p>
          </div>
          
          {/* Period Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Thời gian:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="90">90 ngày qua</option>
              <option value="365">1 năm qua</option>
            </select>
          </div>
        </div>
      </div>

      {analytics && (
        <>
          {/* Application Trend Chart */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Xu hướng ứng tuyển ({analytics.period})
            </h2>
            
            {analytics.applicationTrend && analytics.applicationTrend.length > 0 ? (
              <div className="space-y-4">
                {/* Simple Bar Chart */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                  {analytics.applicationTrend.map((item) => {
                    const maxCount = Math.max(...analytics.applicationTrend.map(d => d.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={item._id} className="text-center">
                        <div 
                          className="bg-blue-500 rounded-t-md mx-auto mb-2"
                          style={{ 
                            height: `${Math.max(height, 5)}px`,
                            width: '30px'
                          }}
                        ></div>
                        <div className="text-xs text-gray-600">
                          {new Date(item._id).toLocaleDateString('vi-VN', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.applicationTrend.reduce((sum, item) => sum + item.count, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Tổng ứng tuyển</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(analytics.applicationTrend.reduce((sum, item) => sum + item.count, 0) / analytics.applicationTrend.length)}
                      </div>
                      <div className="text-sm text-gray-600">Trung bình/ngày</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.max(...analytics.applicationTrend.map(item => item.count))}
                      </div>
                      <div className="text-sm text-gray-600">Cao nhất</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.min(...analytics.applicationTrend.map(item => item.count))}
                      </div>
                      <div className="text-sm text-gray-600">Thấp nhất</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Chưa có dữ liệu ứng tuyển trong khoảng thời gian này
              </div>
            )}
          </div>

          {/* Applications by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Phân bố theo trạng thái
              </h2>
              
              {analytics.applicationsByStatus && analytics.applicationsByStatus.length > 0 ? (
                <div className="space-y-4">
                  {analytics.applicationsByStatus.map((item) => {
                    const total = analytics.applicationsByStatus.reduce((sum, status) => sum + status.count, 0);
                    const percentage = total > 0 ? (item.count / total) * 100 : 0;
                    
                    return (
                      <div key={item._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item._id)}`}>
                            {getStatusLabel(item._id)}
                          </span>
                          <span className="text-sm text-gray-600">
                            {item.count} ứng tuyển
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-10 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Chưa có dữ liệu ứng tuyển
                </div>
              )}
            </div>

            {/* Top Performing Jobs */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Tin tuyển dụng hiệu quả nhất
              </h2>
              
              {analytics.topJobs && analytics.topJobs.length > 0 ? (
                <div className="space-y-4">
                  {analytics.topJobs.map((job, index) => (
                    <div key={job._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate">
                            {job.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {job.views_count || 0} lượt xem
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {job.applicationCount}
                        </div>
                        <div className="text-sm text-gray-500">ứng tuyển</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Chưa có dữ liệu tin tuyển dụng
                </div>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Tổng ứng tuyển</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.applicationTrend ? 
                      analytics.applicationTrend.reduce((sum, item) => sum + item.count, 0) : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Được chấp nhận</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.applicationsByStatus ? 
                      (analytics.applicationsByStatus.find(s => s._id === 'accepted')?.count || 0) : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Đang xử lý</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.applicationsByStatus ? 
                      (analytics.applicationsByStatus.find(s => s._id === 'pending')?.count || 0) +
                      (analytics.applicationsByStatus.find(s => s._id === 'reviewing')?.count || 0) : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Tin hiệu quả nhất</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics.topJobs && analytics.topJobs.length > 0 ? 
                      analytics.topJobs[0].applicationCount : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
