import LoadingSpinner from '@/components/common/LoadingSpinner';
import candidateService from '@/services/candidateService';
import { useEffect, useState } from 'react';
import { FiBriefcase, FiCalendar, FiClock, FiDollarSign, FiEye, FiFileText, FiMapPin, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

const CandidateApplications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Helper to get full URL for uploaded files
  const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    // Remove /api/v1 from base URL to get server root
    const serverRoot = baseUrl.replace('/api/v1', '');
    return `${serverRoot}${path}`;
  };

  // Fetch applications
  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getCandidateApplications();

      if (response.success) {
        setApplications(response.data.data || response.data);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Không thể tải danh sách đơn ứng tuyển');
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
  };

  // Handle withdraw application
  const handleWithdraw = async (applicationId) => {
    if (!window.confirm('Bạn có chắc chắn muốn rút đơn ứng tuyển này?')) {
      return;
    }

    try {
      await candidateService.withdrawApplication(applicationId);
      toast.success('Đã rút đơn ứng tuyển thành công');

      // Remove from list
      setApplications(applications.filter(app => app._id !== applicationId));

      // Close modal if open
      if (selectedApplication?._id === applicationId) {
        setShowDetailModal(false);
        setSelectedApplication(null);
      }
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error(error.message || 'Không thể rút đơn ứng tuyển');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Format salary
  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    if (min && max) {
      return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu`;
    }
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      interview: 'bg-blue-100 text-blue-800',
      offer: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      pending: 'Chờ duyệt',
      interview: 'Phỏng vấn',
      offer: 'Nhận offer',
      rejected: 'Từ chối',
      withdrawn: 'Đã rút'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filteredApplications = filter === 'all'
    ? applications
    : applications.filter(app => app.application_status === filter);

  const statsData = {
    total: applications.length,
    pending: applications.filter(app => app.application_status === 'pending').length,
    reviewing: applications.filter(app => app.application_status === 'reviewing').length,
    shortlisted: applications.filter(app => app.application_status === 'shortlisted').length,
    interviewed: applications.filter(app => app.application_status === 'interviewed').length,
    offered: applications.filter(app => app.application_status === 'offered').length,
    rejected: applications.filter(app => app.application_status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Đơn ứng tuyển của tôi</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Tìm việc làm mới
        </button>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Tổng cộng</p>
          <p className="text-2xl font-semibold text-gray-900">{statsData.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Chờ duyệt</p>
          <p className="text-2xl font-semibold text-yellow-600">{statsData.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Đang xét</p>
          <p className="text-2xl font-semibold text-blue-600">{statsData.reviewing}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Phỏng vấn</p>
          <p className="text-2xl font-semibold text-purple-600">{statsData.interviewed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Nhận offer</p>
          <p className="text-2xl font-semibold text-green-600">{statsData.offered}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Từ chối</p>
          <p className="text-2xl font-semibold text-red-600">{statsData.rejected}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Danh sách đơn ứng tuyển</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="reviewing">Đang xét</option>
              <option value="shortlisted">Đã chọn</option>
              <option value="interviewed">Phỏng vấn</option>
              <option value="offered">Nhận offer</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredApplications.map((application) => (
            <div key={application._id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {application.job_id?.title || 'N/A'}
                    </h3>
                    {getStatusBadge(application.application_status)}
                  </div>
                  <p className="text-gray-600 mb-3 flex items-center">
                    <FiBriefcase className="w-4 h-4 mr-2" />
                    {application.job_id?.recruiter_id?.company_name || 'N/A'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <FiDollarSign className="w-4 h-4 mr-1" />
                      {formatSalary(application.job_id?.salary_min, application.job_id?.salary_max)}
                    </span>
                    <span className="flex items-center">
                      <FiMapPin className="w-4 h-4 mr-1" />
                      {application.job_id?.location?.city || application.job_id?.location || 'Remote'}
                    </span>
                    <span className="flex items-center">
                      <FiBriefcase className="w-4 h-4 mr-1" />
                      {application.job_id?.job_type || 'Full-time'}
                    </span>
                    <span className="flex items-center">
                      <FiCalendar className="w-4 h-4 mr-1" />
                      Ứng tuyển: {formatDate(application.applied_at || application.created_at)}
                    </span>
                    {application.reviewed_at && (
                      <span className="flex items-center">
                        <FiClock className="w-4 h-4 mr-1" />
                        Xét duyệt: {formatDate(application.reviewed_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleViewDetails(application)}
                    className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                  >
                    <FiEye className="w-4 h-4 mr-2" />
                    Xem chi tiết
                  </button>
                  {(application.application_status === 'pending' || application.application_status === 'reviewing') && (
                    <button
                      onClick={() => handleWithdraw(application._id)}
                      className="flex items-center px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      <FiTrash2 className="w-4 h-4 mr-2" />
                      Rút đơn
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredApplications.length === 0 && (
          <div className="text-center py-12">
            <FiFileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn ứng tuyển</h3>
            <p className="text-gray-500 mb-4">Bạn chưa ứng tuyển công việc nào hoặc không có đơn nào phù hợp với bộ lọc.</p>
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Tìm việc làm ngay
            </button>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {showDetailModal && selectedApplication && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Chi tiết đơn ứng tuyển</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Job Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedApplication.job_id?.title}
                </h3>
                <p className="text-lg text-gray-700 mb-4 flex items-center">
                  <FiBriefcase className="w-5 h-5 mr-2" />
                  {selectedApplication.job_id?.recruiter_id?.company_name}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="bg-white px-3 py-1.5 rounded-lg flex items-center">
                    <FiMapPin className="w-4 h-4 mr-1.5 text-blue-600" />
                    {selectedApplication.job_id?.location?.city || selectedApplication.job_id?.location || 'Remote'}
                  </span>
                  <span className="bg-white px-3 py-1.5 rounded-lg flex items-center">
                    <FiBriefcase className="w-4 h-4 mr-1.5 text-green-600" />
                    {selectedApplication.job_id?.job_type || 'Full-time'}
                  </span>
                  <span className="bg-white px-3 py-1.5 rounded-lg flex items-center">
                    <FiDollarSign className="w-4 h-4 mr-1.5 text-yellow-600" />
                    {formatSalary(selectedApplication.job_id?.salary_min, selectedApplication.job_id?.salary_max)}
                  </span>
                </div>
              </div>

              {/* Application Status */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Trạng thái</h4>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedApplication.application_status)}
                  {selectedApplication.reviewed_at && (
                    <span className="text-sm text-gray-500">
                      Xét duyệt lúc: {formatDate(selectedApplication.reviewed_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Application Date */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Ngày ứng tuyển</h4>
                <p className="text-gray-900">{formatDate(selectedApplication.applied_at || selectedApplication.created_at)}</p>
              </div>

              {/* Cover Letter */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Thư giới thiệu</h4>
                <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedApplication.cover_letter || 'Không có thư giới thiệu'}
                  </p>
                </div>
              </div>

              {/* CV */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">CV đã nộp</h4>
                {selectedApplication.cv_url ? (
                  <a
                    href={getFileUrl(selectedApplication.cv_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiFileText className="w-4 h-4 mr-2" />
                    Xem CV
                  </a>
                ) : (
                  <p className="text-gray-500">Không có CV</p>
                )}
              </div>

              {/* Interviewer Notes */}
              {selectedApplication.interviewer_notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Ghi chú từ nhà tuyển dụng</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedApplication.interviewer_notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedApplication.application_status === 'rejected' && selectedApplication.rejection_reason && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Lý do từ chối</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-gray-700">
                      {selectedApplication.rejection_reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Salary Offered */}
              {selectedApplication.salary_offered && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Mức lương đề xuất</h4>
                  <p className="text-xl font-bold text-green-600">
                    {(selectedApplication.salary_offered / 1000000).toFixed(0)} triệu VND/tháng
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
              {(selectedApplication.application_status === 'pending' || selectedApplication.application_status === 'reviewing') && (
                <button
                  onClick={() => handleWithdraw(selectedApplication._id)}
                  className="flex items-center px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4 mr-2" />
                  Rút đơn ứng tuyển
                </button>
              )}
              <div className="flex-1"></div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateApplications;
