import LoadingSpinner from '@/components/common/LoadingSpinner';
import candidateService from '@/services/candidateService';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const CandidateInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comments: '',
    would_recommend: true
  });

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getCandidateInterviews();
      if (response.success) {
        setInterviews(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
      toast.error(error.message || 'Không thể tải danh sách lịch phỏng vấn');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (interview) => {
    setSelectedInterview(interview);
    setShowDetailModal(true);
  };

  const handleSubmitFeedback = async () => {
    try {
      // TODO: Implement feedback submission API
      toast.success('Đã gửi đánh giá thành công!');
      setShowFeedbackModal(false);
      setFeedback({ rating: 5, comments: '', would_recommend: true });
    } catch (error) {
      toast.error(error.message || 'Không thể gửi đánh giá');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      scheduled: 'Đã lên lịch',
      in_progress: 'Đang diễn ra',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      no_show: 'Không tham gia'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const badges = {
      phone: 'bg-blue-100 text-blue-800',
      video: 'bg-purple-100 text-purple-800',
      onsite: 'bg-green-100 text-green-800',
      online_test: 'bg-orange-100 text-orange-800'
    };

    const labels = {
      phone: 'Điện thoại',
      video: 'Video call',
      onsite: 'Trực tiếp',
      online_test: 'Bài test online'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    return timeString || '';
  };

  const isUpcoming = (interview) => {
    const interviewDateTime = new Date(`${interview.interview_date} ${interview.interview_time}`);
    return interview.status === 'scheduled' && interviewDateTime > new Date();
  };

  const filteredInterviews = filter === 'all' 
    ? interviews 
    : interviews.filter(interview => interview.status === filter);

  const upcomingInterviews = interviews.filter(isUpcoming);

  if (loading) {
    return <LoadingSpinner />;
  }
  console.log('interviews', interviews);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Lịch phỏng vấn</h1>
        <div className="text-sm text-gray-500">
          {upcomingInterviews.length} cuộc phỏng vấn sắp tới
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Tổng cộng</p>
          <p className="text-2xl font-semibold text-gray-900">{interviews.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Đã lên lịch</p>
          <p className="text-2xl font-semibold text-blue-600">
            {interviews.filter(i => i.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Hoàn thành</p>
          <p className="text-2xl font-semibold text-green-600">
            {interviews.filter(i => i.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Đậu phỏng vấn</p>
          <p className="text-2xl font-semibold text-green-600">
            {interviews.filter(i => i.result === 'passed').length}
          </p>
        </div>
      </div>

      {/* Lịch phỏng vấn sắp tới */}
      {upcomingInterviews.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Phỏng vấn sắp tới</h3>
          <div className="space-y-3">
            {upcomingInterviews.slice(0, 2).map((interview) => (
              <div key={interview._id} className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {interview.application_id?.job_id?.title || 'N/A'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {interview.recruiter_id?.company_name || 'N/A'}
                    </p>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      {formatDate(interview.interview_date)} lúc {formatTime(interview.interview_time)}
                    </p>
                    {interview.duration_minutes && (
                      <p className="text-xs text-gray-500 mt-1">
                        Thời lượng: {interview.duration_minutes} phút
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    {getTypeBadge(interview.interview_type)}
                    {getStatusBadge(interview.status)}
                  </div>
                </div>
                {interview.meeting_link && (
                  <div className="mt-3 pt-3 border-t border-blue-100">
                    <a 
                      href={interview.meeting_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Tham gia phỏng vấn
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Tất cả lịch phỏng vấn</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredInterviews.map((interview) => (
            <div key={interview._id} className="p-6 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {interview.application_id?.job_id?.title || 'N/A'}
                    </h3>
                    <div className="flex space-x-2">
                      {getTypeBadge(interview.interview_type)}
                      {getStatusBadge(interview.status)}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{interview.recruiter_id?.company_name || 'N/A'}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="space-y-1">
                      <p className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <strong>Ngày giờ:</strong> 
                        <span className="ml-1">{formatDate(interview.interview_date)} lúc {formatTime(interview.interview_time)}</span>
                      </p>
                      {interview.duration_minutes && (
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <strong>Thời lượng:</strong> 
                          <span className="ml-1">{interview.duration_minutes} phút</span>
                        </p>
                      )}
                      {interview.recruiter_id?.user_id?.full_name && (
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <strong>Người phỏng vấn:</strong> 
                          <span className="ml-1">{interview.recruiter_id.user_id.full_name}</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      {interview.meeting_link && (
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <strong>Link:</strong> 
                          <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" 
                             className="text-blue-600 hover:text-blue-800 ml-1 underline">
                            Tham gia
                          </a>
                        </p>
                      )}
                      {interview.location && (
                        <p className="flex items-start">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <strong>Địa chỉ:</strong> 
                          <span className="ml-1">{interview.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {interview.notes && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm flex items-start">
                        <svg className="w-4 h-4 mr-2 mt-0.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span><strong>Ghi chú:</strong> {interview.notes}</span>
                      </p>
                    </div>
                  )}

                  {interview.interviewers && interview.interviewers.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Người phỏng vấn:</p>
                      <div className="space-y-1">
                        {interview.interviewers.map((interviewer, idx) => (
                          <p key={idx} className="text-sm text-gray-600">
                            • {interviewer.name || interviewer.user_id?.full_name || 'N/A'}
                            {interviewer.role && ` - ${interviewer.role}`}
                            {interviewer.email && ` (${interviewer.email})`}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button 
                    onClick={() => handleViewDetail(interview)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                  >
                    Xem chi tiết
                  </button>
                  {interview.status === 'completed' && (
                    <button 
                      onClick={() => {
                        setSelectedInterview(interview);
                        setShowFeedbackModal(true);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
                    >
                      Đánh giá
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredInterviews.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có lịch phỏng vấn</h3>
            <p className="text-gray-500 mb-4">Bạn chưa có lịch phỏng vấn nào hoặc không có lịch nào phù hợp với bộ lọc.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">Chi tiết lịch phỏng vấn</h3>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {selectedInterview.application_id?.job_id?.title || 'N/A'}
                  </h4>
                  <p className="text-gray-600">{selectedInterview.recruiter_id?.company_name || 'N/A'}</p>
                </div>

                <div className="flex space-x-2">
                  {getTypeBadge(selectedInterview.interview_type)}
                  {getStatusBadge(selectedInterview.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-500">Ngày phỏng vấn</p>
                    <p className="font-medium">{formatDate(selectedInterview.interview_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Giờ phỏng vấn</p>
                    <p className="font-medium">{formatTime(selectedInterview.interview_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Thời lượng</p>
                    <p className="font-medium">{selectedInterview.duration_minutes} phút</p>
                  </div>
                  {selectedInterview.recruiter_id?.user_id?.full_name && (
                    <div>
                      <p className="text-sm text-gray-500">Người liên hệ</p>
                      <p className="font-medium">{selectedInterview.recruiter_id.user_id.full_name}</p>
                    </div>
                  )}
                </div>

                {selectedInterview.meeting_link && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Link phỏng vấn</p>
                    <a 
                      href={selectedInterview.meeting_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Tham gia phỏng vấn
                    </a>
                  </div>
                )}

                {selectedInterview.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Địa điểm</p>
                    <p className="text-gray-900">{selectedInterview.location}</p>
                  </div>
                )}

                {selectedInterview.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Ghi chú</p>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-gray-900">{selectedInterview.notes}</p>
                    </div>
                  </div>
                )}

                {selectedInterview.interviewers && selectedInterview.interviewers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Người phỏng vấn</p>
                    <div className="space-y-2">
                      {selectedInterview.interviewers.map((interviewer, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="font-medium text-gray-900">
                            {interviewer.name || interviewer.user_id?.full_name || 'N/A'}
                          </p>
                          {interviewer.role && <p className="text-sm text-gray-600">Chức vụ: {interviewer.role}</p>}
                          {(interviewer.email || interviewer.user_id?.email) && (
                            <p className="text-sm text-gray-600">
                              Email: {interviewer.email || interviewer.user_id?.email}
                            </p>
                          )}
                          {interviewer.user_id?.phone && (
                            <p className="text-sm text-gray-600">SĐT: {interviewer.user_id.phone}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">Đánh giá buổi phỏng vấn</h3>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đánh giá <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedback({ ...feedback, rating: star })}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`w-8 h-8 ${star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    <span className="text-sm text-gray-600 ml-2">
                      {feedback.rating}/5 sao
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nhận xét
                  </label>
                  <textarea
                    value={feedback.comments}
                    onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Chia sẻ trải nghiệm của bạn về buổi phỏng vấn..."
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={feedback.would_recommend}
                      onChange={(e) => setFeedback({ ...feedback, would_recommend: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Tôi muốn giới thiệu công ty này cho bạn bè
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Gửi đánh giá
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateInterviews;
