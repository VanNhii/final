import recruiterService from '@/services/recruiterService';
import { formatDate, formatDateTime } from '@/utils/formatters';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchApplicationDetail();
  }, [id]);

  const fetchApplicationDetail = async () => {
    try {
      setLoading(true);
      const response = await recruiterService.getApplicationById(id);
      
      if (response.success) {
        setApplication(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch application');
      }
    } catch (error) {
      console.error('Application fetch error:', error);
      toast.error('Không thể tải thông tin ứng viên');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      const response = await recruiterService.updateApplicationStatus(id, newStatus);
      
      if (response.success) {
        toast.success('Cập nhật trạng thái thành công');
        setApplication(prev => ({ ...prev, application_status: newStatus }));
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendMessage = async () => {
    try {
      const recipientId = application.candidate_id?.user_id?._id;
      if (!recipientId) {
        toast.error('Không tìm thấy thông tin ứng viên');
        return;
      }

      // Navigate to messages page - the Messages component will handle creating conversation
      navigate(`/recruiter/messages?userId=${recipientId}`);
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Không thể mở tin nhắn');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'shortlisted':
        return 'bg-purple-100 text-purple-800';
      case 'interviewed':
        return 'bg-indigo-100 text-indigo-800';
      case 'offered':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Chờ xử lý';
      case 'reviewing':
        return 'Đang xem xét';
      case 'shortlisted':
        return 'Lọt vòng';
      case 'interviewed':
        return 'Đã phỏng vấn';
      case 'offered':
        return 'Đã gửi đề nghị';
      case 'rejected':
        return 'Từ chối';
      case 'withdrawn':
        return 'Đã rút';
      default:
        return status;
    }
  };

  const getCVUrl = (cvPath) => {
    if (!cvPath) return null;
    // If already a full URL, return as is
    if (cvPath.startsWith('http://') || cvPath.startsWith('https://')) {
      return cvPath;
    }
    // Otherwise, prepend backend URL
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${cvPath}`;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Không tìm thấy đơn ứng tuyển</h3>
          <Link
            to="/recruiter/applications"
            className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/recruiter/applications"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại danh sách ứng viên
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Chi tiết đơn ứng tuyển
          </h1>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={handleSendMessage}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Nhắn tin
          </button>
          {application.cv_url && (
            <a
              href={getCVUrl(application.cv_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-white hover:bg-blue-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Tải CV
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Candidate Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {application.candidate_id?.user_id?.avatar_url ? (
                  <img
                    src={application.candidate_id.user_id.avatar_url}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl font-medium text-blue-600">
                      {application.candidate_id?.user_id?.first_name?.[0] || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {application.candidate_id?.user_id?.first_name} {application.candidate_id?.user_id?.last_name}
                </h2>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {application.candidate_id?.user_id?.email}
                  </div>
                  {application.candidate_id?.user_id?.phone && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {application.candidate_id.user_id.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {application.candidate_id?.bio && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Giới thiệu</h3>
                <p className="text-gray-600">{application.candidate_id.bio}</p>
              </div>
            )}
          </div>

          {/* Job Info */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Công việc ứng tuyển</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Vị trí:</span>
                <span className="font-medium text-gray-900">{application.job_id?.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ngày ứng tuyển:</span>
                <span className="font-medium text-gray-900">{formatDate(application.applied_at)}</span>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          {application.cover_letter && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thư xin việc</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{application.cover_letter}</p>
            </div>
          )}
        </div>

        {/* Right Column - Status & Actions */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái</h3>
            <div className="flex items-center justify-center py-4">
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusClass(application.application_status)}`}>
                {getStatusText(application.application_status)}
              </span>
            </div>
          </div>

          {/* Change Status */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cập nhật trạng thái</h3>
            <div className="space-y-2">
              {['reviewing', 'shortlisted', 'interviewed', 'offered', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updating || application.application_status === status}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    application.application_status === status
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {getStatusText(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Ngày ứng tuyển</p>
                <p className="font-medium text-gray-900">{formatDateTime(application.applied_at)}</p>
              </div>
              {application.reviewed_at && (
                <div>
                  <p className="text-gray-600">Ngày xem xét</p>
                  <p className="font-medium text-gray-900">{formatDateTime(application.reviewed_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;
