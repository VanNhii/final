import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    userGrowth: {
      labels: [],
      datasets: []
    },
    jobStats: {
      labels: [],
      datasets: []
    },
    applicationStats: {
      labels: [],
      datasets: []
    },
    userDistribution: {
      labels: [],
      datasets: []
    },
    revenueStats: {
      labels: [],
      datasets: []
    }
  });
  const [keyMetrics, setKeyMetrics] = useState({
    userGrowthPercent: 0,
    newJobsCount: 0,
    applicationRate: 0,
    monthlyRevenue: 0
  });
  const [summaryStats, setSummaryStats] = useState({
    topSkills: [],
    topLocations: [],
    salaryRanges: []
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch analytics data from backend
      const [
        analyticsResponse,
        userGrowthResponse,
        jobStatsResponse,
        applicationStatsResponse,
        revenueStatsResponse
      ] = await Promise.all([
        adminService.getAnalytics({ timeRange }),
        adminService.getUserGrowthData(timeRange),
        adminService.getJobStatistics(timeRange),
        adminService.getApplicationStatistics(timeRange),
        adminService.getRevenueStatistics(timeRange)
      ]);
      
      console.log('Analytics Response:', analyticsResponse);
      console.log('User Growth Response:', userGrowthResponse);
      console.log('Job Stats Response:', jobStatsResponse);
      console.log('Application Stats Response:', applicationStatsResponse);
      console.log('Revenue Stats Response:', revenueStatsResponse);

      // Process analytics data - response is direct from apiClient (no .data wrapper)
      if (analyticsResponse?.success) {
        const data = analyticsResponse.data;
        setKeyMetrics({
          userGrowthPercent: data.userGrowthPercent || 0,
          newJobsCount: data.newJobsCount || 0,
          applicationRate: data.applicationRate || 0,
          monthlyRevenue: data.monthlyRevenue || 0
        });
        
        setSummaryStats({
          topSkills: data.topSkills || [],
          topLocations: data.topLocations || [],
          salaryRanges: data.salaryRanges || []
        });
      }

      // Process chart data
      const chartData = {};
      
      if (userGrowthResponse?.success) {
        const data = userGrowthResponse.data;
        chartData.userGrowth = {
          labels: data.labels || [],
          datasets: [
            {
              label: 'Ứng viên',
              data: data.candidates || [],
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
            },
            {
              label: 'Nhà tuyển dụng',
              data: data.recruiters || [],
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
            },
          ],
        };
      }

      if (jobStatsResponse?.success) {
        const data = jobStatsResponse.data;
        chartData.jobStats = {
          labels: data.labels || [],
          datasets: [
            {
              label: 'Số lượng việc làm',
              data: data.values || [],
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)',
              ],
            },
          ],
        };
      }

      if (applicationStatsResponse?.success) {
        const data = applicationStatsResponse.data;
        chartData.applicationStats = {
          labels: data.labels || [],
          datasets: [
            {
              label: 'Đơn ứng tuyển',
              data: data.applications || [],
              backgroundColor: 'rgba(139, 92, 246, 0.8)',
            },
            {
              label: 'Đơn được chấp nhận',
              data: data.accepted || [],
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
            },
          ],
        };
      }

      if (revenueStatsResponse?.success) {
        const data = revenueStatsResponse.data;
        chartData.revenueStats = {
          labels: data.labels || [],
          datasets: [
            {
              label: 'Doanh thu (triệu VNĐ)',
              data: data.values || [],
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
            },
          ],
        };
      }

      // User distribution chart (from analytics response)
      if (analyticsResponse?.success && analyticsResponse.data?.userDistribution) {
        const dist = analyticsResponse.data.userDistribution;
        chartData.userDistribution = {
          labels: ['Ứng viên', 'Nhà tuyển dụng', 'Admin'],
          datasets: [
            {
              data: [dist.candidates || 0, dist.recruiters || 0, dist.admins || 0],
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
              ],
              borderWidth: 2,
            },
          ],
        };
      }

      setAnalyticsData(prevData => ({ ...prevData, ...chartData }));
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Không thể tải dữ liệu phân tích');
      
      // Fallback to mock data if backend fails
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Fallback mock data (keeping original mock data as backup)
    const userGrowthData = {
      labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
      datasets: [
        {
          label: 'Ứng viên',
          data: [12, 19, 8, 15, 20, 25, 18],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Nhà tuyển dụng',
          data: [3, 5, 2, 4, 6, 8, 5],
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
      ],
    };

    const jobStatsData = {
      labels: ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'Mobile', 'AI/ML'],
      datasets: [
        {
          label: 'Số lượng việc làm',
          data: [45, 38, 25, 15, 22, 12],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
        },
      ],
    };

    const applicationStatsData = {
      labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
      datasets: [
        {
          label: 'Đơn ứng tuyển',
          data: [65, 78, 45, 89, 67, 92, 55],
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
        },
        {
          label: 'Đơn được chấp nhận',
          data: [15, 22, 12, 25, 18, 28, 16],
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
        },
      ],
    };

    const userDistributionData = {
      labels: ['Ứng viên', 'Nhà tuyển dụng', 'Admin'],
      datasets: [
        {
          data: [756, 123, 5],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
          ],
          borderWidth: 2,
        },
      ],
    };

    const revenueStatsData = {
      labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6'],
      datasets: [
        {
          label: 'Doanh thu (triệu VNĐ)',
          data: [45, 52, 38, 65, 58, 72],
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
        },
      ],
    };

    setAnalyticsData({
      userGrowth: userGrowthData,
      jobStats: jobStatsData,
      applicationStats: applicationStatsData,
      userDistribution: userDistributionData,
      revenueStats: revenueStatsData
    });

    setKeyMetrics({
      userGrowthPercent: 15.3,
      newJobsCount: 23,
      applicationRate: 67.8,
      monthlyRevenue: 72
    });

    setSummaryStats({
      topSkills: [
        { skill: 'React', count: 145, percent: 85 },
        { skill: 'Node.js', count: 128, percent: 75 },
        { skill: 'Python', count: 98, percent: 57 },
        { skill: 'Java', count: 87, percent: 51 },
        { skill: 'TypeScript', count: 76, percent: 44 }
      ],
      topLocations: [
        { location: 'TP. Hồ Chí Minh', count: 234, percent: 100 },
        { location: 'Hà Nội', count: 198, percent: 85 },
        { location: 'Đà Nẵng', count: 67, percent: 29 },
        { location: 'Cần Thơ', count: 23, percent: 10 },
        { location: 'Hải Phòng', count: 15, percent: 6 }
      ],
      salaryRanges: [
        { range: '10-15M VNĐ', count: 89, percent: 100 },
        { range: '15-25M VNĐ', count: 76, percent: 85 },
        { range: '25-40M VNĐ', count: 45, percent: 51 },
        { range: '40-60M VNĐ', count: 23, percent: 26 },
        { range: '60M+ VNĐ', count: 12, percent: 13 }
      ]
    });
  };

  const handleExportReport = async () => {
    try {
      setExportLoading(true);
      
      const reportDate = new Date().toLocaleDateString('vi-VN');
      const timeRangeLabel = timeRange === '7days' ? '7 ngày' : 
                            timeRange === '30days' ? '30 ngày' : 
                            timeRange === '90days' ? '90 ngày' : '12 tháng';
      
      // Summary section
      const summaryHeaders = ['Thông tin báo cáo', 'Giá trị'];
      const summaryRows = [
        ['Ngày xuất báo cáo', reportDate],
        ['Khoảng thời gian', timeRangeLabel],
        ['Tăng trưởng người dùng (%)', keyMetrics.userGrowthPercent],
        ['Số việc làm mới', keyMetrics.newJobsCount],
        ['Tỷ lệ ứng tuyển (%)', keyMetrics.applicationRate],
        ['Doanh thu tháng (triệu VNĐ)', keyMetrics.monthlyRevenue]
      ];
      
      // Top skills section
      const skillsHeaders = ['Kỹ năng', 'Số lượng', 'Tỷ lệ (%)'];
      const skillsRows = summaryStats.topSkills.map(item => [
        item.skill,
        item.count,
        item.percent
      ]);
      
      // Top locations section
      const locationsHeaders = ['Địa điểm', 'Số lượng', 'Tỷ lệ (%)'];
      const locationsRows = summaryStats.topLocations.map(item => [
        item.location,
        item.count,
        item.percent
      ]);
      
      // Salary ranges section
      const salaryHeaders = ['Mức lương', 'Số lượng', 'Tỷ lệ (%)'];
      const salaryRows = summaryStats.salaryRanges.map(item => [
        item.range,
        item.count,
        item.percent
      ]);
      
      const BOM = '\uFEFF';
      const csvContent = BOM + 
        'BÁO CÁO PHÂN TÍCH\n\n' +
        'TỔNG QUAN\n' +
        [summaryHeaders, ...summaryRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nKỸ NĂNG PHỔ BIẾN\n' +
        [skillsHeaders, ...skillsRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nĐỊA ĐIỂM PHỔ BIẾN\n' +
        [locationsHeaders, ...locationsRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nMỨC LƯƠNG\n' +
        [salaryHeaders, ...salaryRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao_cao_phan_tich_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Xuất báo cáo Excel thành công');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Không thể xuất báo cáo');
    } finally {
      setExportLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phân tích & Báo cáo</h1>
          <p className="mt-1 text-gray-600">Theo dõi hiệu suất và xu hướng của hệ thống</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
            <option value="90days">90 ngày qua</option>
            <option value="1year">1 năm qua</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tăng trưởng người dùng</p>
              <p className="text-2xl font-bold text-gray-900">+{keyMetrics.userGrowthPercent}%</p>
              <p className="text-sm text-green-600">↗ So với tuần trước</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Việc làm mới</p>
              <p className="text-2xl font-bold text-gray-900">+{keyMetrics.newJobsCount}</p>
              <p className="text-sm text-green-600">↗ +8.7% so với tuần trước</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tỷ lệ ứng tuyển</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.applicationRate}%</p>
              <p className="text-sm text-red-600">↘ -2.1% so với tuần trước</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Doanh thu tháng</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.monthlyRevenue}M VNĐ</p>
              <p className="text-sm text-green-600">↗ +24.1% so với tháng trước</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tăng trưởng người dùng</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Ứng viên</span>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Nhà tuyển dụng</span>
            </div>
          </div>
          <div className="h-80">
            {analyticsData.userGrowth?.labels?.length > 0 ? (
              <Line data={analyticsData.userGrowth} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Không có dữ liệu tăng trưởng người dùng
              </div>
            )}
          </div>
        </div>

        {/* Job Categories Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Việc làm theo danh mục</h3>
          </div>
          <div className="h-80">
            {analyticsData.jobStats?.labels?.length > 0 ? (
              <Bar data={analyticsData.jobStats} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Không có dữ liệu việc làm theo danh mục
              </div>
            )}
          </div>
        </div>

        {/* Application Stats Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Thống kê ứng tuyển</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Đơn ứng tuyển</span>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Được chấp nhận</span>
            </div>
          </div>
          <div className="h-80">
            {analyticsData.applicationStats?.labels?.length > 0 ? (
              <Bar data={analyticsData.applicationStats} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Không có dữ liệu thống kê ứng tuyển
              </div>
            )}
          </div>
        </div>

        {/* User Distribution Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Phân bố người dùng</h3>
          </div>
          <div className="h-80">
            {analyticsData.userDistribution?.labels?.length > 0 && 
             analyticsData.userDistribution?.datasets?.[0]?.data?.some(d => d > 0) ? (
              <Doughnut data={analyticsData.userDistribution} options={doughnutOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Không có dữ liệu phân bố người dùng
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Doanh thu theo tháng</h3>
          <button 
            onClick={handleExportReport}
            disabled={exportLoading}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {exportLoading ? 'Đang xuất...' : 'Xuất báo cáo'}
          </button>
        </div>
        <div className="h-80">
          {analyticsData.revenueStats?.labels?.length > 0 ? (
            <Line data={analyticsData.revenueStats} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Không có dữ liệu doanh thu
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Kỹ năng được yêu cầu</h3>
          <div className="space-y-3">
            {summaryStats.topSkills?.length > 0 ? (
              summaryStats.topSkills.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.skill}</span>
                      <span className="text-gray-500">{item.count} việc làm</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Không có dữ liệu</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Địa điểm hot nhất</h3>
          <div className="space-y-3">
            {summaryStats.topLocations?.length > 0 ? (
              summaryStats.topLocations.map((item, index) => {
                // Handle location as string or object
                const locationName = typeof item.location === 'object' 
                  ? (item.location?.city || item.location?.address || 'Không xác định')
                  : (item.location || 'Không xác định');
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-900">{locationName}</span>
                        <span className="text-gray-500">{item.count} việc làm</span>
                      </div>
                      <div className="mt-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${item.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center py-4">Không có dữ liệu</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mức lương phổ biến</h3>
          <div className="space-y-3">
            {summaryStats.salaryRanges?.length > 0 ? (
              summaryStats.salaryRanges.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.range}</span>
                      <span className="text-gray-500">{item.count} việc làm</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Không có dữ liệu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
