import JobRecommendations from '@/components/common/JobRecommendations';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import candidateService from '@/services/candidateService';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router';

const CandidateDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    interviewInvitations: 0,
    savedJobs: 0,
    profileViews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch applications
      const applicationsResponse = await candidateService.getCandidateApplications({ limit: 3 });
      if (applicationsResponse.success) {
        setApplications(applicationsResponse.data || []);
      }

      // Fetch stats (you may need to create this endpoint)
      // For now, using mock data
      setStats({
        totalApplications: applicationsResponse.data?.length || 0,
        interviewInvitations: 0,
        savedJobs: 0,
        profileViews: 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-purple-100 text-purple-800',
      interview: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      accepted: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Đang chờ',
      reviewing: 'Đang xem xét',
      shortlisted: 'Đã chọn',
      interview: 'Phỏng vấn',
      rejected: 'Từ chối',
      accepted: 'Chấp nhận'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Chào mừng {user?.full_name || 'bạn'} quay trở lại! Theo dõi hoạt động ứng tuyển của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-primary-600">{stats.totalApplications}</div>
          <div className="text-gray-600">Đơn ứng tuyển</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">{stats.interviewInvitations}</div>
          <div className="text-gray-600">Được phỏng vấn</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">{stats.savedJobs}</div>
          <div className="text-gray-600">Việc làm đã lưu</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-purple-600">{stats.profileViews}</div>
          <div className="text-gray-600">Lượt xem hồ sơ</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Đơn ứng tuyển gần đây</h2>
          </div>
          <div className="p-6">
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{app.job_id?.title || 'N/A'}</h3>
                      <p className="text-gray-600 text-sm">{app.job_id?.recruiter_id?.company_name || 'N/A'}</p>
                      <p className="text-gray-500 text-xs">
                        Ứng tuyển {new Date(app.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(app.application_status)}`}>
                      {getStatusLabel(app.application_status)}
                    </span>
                  </div>
                ))}
                <Link
                  to="/candidate/applications"
                  className="block text-center text-primary-600 hover:text-primary-700 font-medium text-sm pt-2"
                >
                  Xem tất cả đơn ứng tuyển →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Chưa có đơn ứng tuyển nào</p>
                <Link to="/jobs" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
                  Khám phá việc làm →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Việc làm được đề xuất cho bạn</h2>
          </div>
          <div className="p-6">
            <JobRecommendations limit={3} showTitle={false} showReasons={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
