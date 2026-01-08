import recruiterService from '@/services/recruiterService';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const RecruiterApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchApplications();
  }, [filters, pagination.page]);

  // Transform backend data to frontend format
  const transformApplicationData = (application) => {
    const candidate = application.candidate_id || {};
    const user = candidate.user_id || {};
    const job = application.job_id || {};

    // Get education information - take the first or most recent education entry
    const educationInfo = candidate.education && candidate.education.length > 0
      ? `${candidate.education[0].degree} - ${candidate.education[0].major} (${candidate.education[0].school_name})`
      : '';

    // Get salary expectation
    const salaryExpectation = candidate.salary_expectation
      ? (candidate.salary_expectation.min && candidate.salary_expectation.max
        ? `${candidate.salary_expectation.min}-${candidate.salary_expectation.max}`
        : candidate.salary_expectation.min || candidate.salary_expectation.max || '')
      : '';

    // Get skills from skills_detailed
    const skills = candidate.skills_detailed && candidate.skills_detailed.length > 0
      ? candidate.skills_detailed.map(s => s.skill_name)
      : [];

    // Handle location - it might be a string or an object
    let locationString = '';
    if (job.location) {
      if (typeof job.location === 'string') {
        locationString = job.location;
      } else if (typeof job.location === 'object') {
        // Location is an object like {address, city, country}
        const parts = [
          job.location.address,
          job.location.city,
          job.location.country
        ].filter(Boolean);
        locationString = parts.join(', ');
      }
    }

    const transformed = {
      id: application._id,
      candidateName: user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.email || 'Không có tên',
      candidateEmail: user.email || '',
      avatar: user.avatar_url || null,
      jobTitle: job.title || 'Vị trí không xác định',
      jobLocation: locationString,
      status: application.application_status || 'pending',
      appliedDate: application.applied_at || application.created_at,
      reviewDate: application.reviewed_at,
      expectedSalary: salaryExpectation,
      experience: candidate.experience_years ? `${candidate.experience_years} năm` : '',
      education: educationInfo,
      availableDate: candidate.available_from || null,
      rating: 0, // Rating feature may need to be implemented separately
      skills: skills,
      notes: application.interviewer_notes || '',
      coverLetter: application.cover_letter || '',
      cvUrl: application.cv_url || '',
      // Keep original data for reference
      _original: application
    };

    return transformed;
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      const response = await recruiterService.getApplications(params);

      if (response.success) {
        // Transform the data to match component expectations
        const transformedData = (response.data || []).map(transformApplicationData);
        setApplications(transformedData);
        setPagination(prev => ({
          ...prev,
          total: response.total || 0,
          totalPages: response.totalPages || 1
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch applications');
      }
    } catch (error) {
      console.error('Applications fetch error:', error);
      toast.error('Không thể tải danh sách đơn ứng tuyển');

      // Fallback to empty data on error
      setApplications([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        totalPages: 1
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      const response = await recruiterService.updateApplicationStatus(applicationId, newStatus);

      if (response.success) {
        setApplications(prevApps =>
          prevApps.map(app =>
            app.id === applicationId
              ? { ...app, status: newStatus, reviewDate: new Date().toISOString() }
              : app
          )
        );
        toast.success('Cập nhật trạng thái thành công');
      } else {
        throw new Error(response.message || 'Failed to update application status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Không thể cập nhật trạng thái đơn ứng tuyển');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleScheduleInterview = (application) => {
    console.log('Opening interview modal for application:', application);
    setSelectedApplicationForInterview(application);
    setShowInterviewModal(true);
  };

  const handleCreateInterview = async () => {
    if (!selectedApplicationForInterview) {
      console.log('[INTERVIEW] No application selected');
      return;
    }

    console.log('[INTERVIEW] Creating interview for:', selectedApplicationForInterview);
    console.log('[INTERVIEW] Interview data:', interviewData);

    try {
      const interviewPayload = {
        application_id: selectedApplicationForInterview._original._id,
        candidate_id: selectedApplicationForInterview._original.candidate_id._id,
        interview_date: interviewData.interview_date,
        interview_time: interviewData.interview_time,
        location: interviewData.location,
        interview_type: interviewData.interview_type,
        notes: interviewData.notes
      };

      console.log('[INTERVIEW] Sending payload:', interviewPayload);

      const response = await recruiterService.createInterview(interviewPayload);

      console.log('[INTERVIEW] Response:', response);

      if (response.success) {
        toast.success('Đã tạo lịch phỏng vấn thành công!');
        setShowInterviewModal(false);
        setInterviewData({
          interview_date: '',
          interview_time: '',
          location: '',
          interview_type: 'onsite',
          notes: ''
        });
        // Update application status to interviewed
        await handleStatusUpdate(selectedApplicationForInterview.id, 'interviewed');
      } else {
        throw new Error(response.message || 'Failed to create interview');
      }
    } catch (error) {
      console.error('[INTERVIEW] Create interview error:', error);
      console.error('[INTERVIEW] Error details:', error.response || error.message);
      toast.error('Không thể tạo lịch phỏng vấn');
    }
  };

  const [selectedApplications, setSelectedApplications] = useState([]);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, rating, salary
  const [showApplicationDetail, setShowApplicationDetail] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApplicationForInterview, setSelectedApplicationForInterview] = useState(null);
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    interview_time: '',
    location: '',
    interview_type: 'onsite',
    notes: ''
  });

  // Helper function to get full CV URL
  const getCVUrl = (cvPath) => {
    if (!cvPath) return '';
    if (cvPath.startsWith('http')) return cvPath;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${cvPath.startsWith('/') ? '' : '/'}${cvPath}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewing: 'bg-blue-100 text-blue-800',
      interviewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'Chờ xử lý',
      reviewing: 'Đang xem xét',
      interviewed: 'Đã phỏng vấn',
      accepted: 'Đã chấp nhận',
      rejected: 'Từ chối'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getRatingStars = (rating) => {
    if (!rating) return <span className="text-gray-400">Chưa đánh giá</span>;

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const filteredApplications = applications.filter(app => app && typeof app === 'object').filter(app => {
    if (filters.search &&
      !(app.candidateName && app.candidateName.toLowerCase().includes(filters.search.toLowerCase())) &&
      !(app.jobTitle && app.jobTitle.toLowerCase().includes(filters.search.toLowerCase()))) {
      return false;
    }
    if (filters.status && app.status !== filters.status) return false;
    if (filters.rating && app.rating !== parseInt(filters.rating)) return false;
    return true;
  });

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.appliedDate || 0) - new Date(b.appliedDate || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'salary':
        return parseInt(b.expectedSalary || 0) - parseInt(a.expectedSalary || 0);
      case 'newest':
      default:
        return new Date(b.appliedDate || 0) - new Date(a.appliedDate || 0);
    }
  });

  const applicationStats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    interviewed: applications.filter(a => a.status === 'interviewed').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    await handleStatusUpdate(applicationId, newStatus);
  };

  const updateApplicationRating = (applicationId, rating) => {
    setApplications(applications.map(app =>
      app.id === applicationId
        ? { ...app, rating }
        : app
    ));
  };

  const addNote = (applicationId, note) => {
    setApplications(applications.map(app =>
      app.id === applicationId
        ? { ...app, notes: note }
        : app
    ));
  };

  const bulkUpdateStatus = (status) => {
    setApplications(applications.map(app =>
      selectedApplications.includes(app.id)
        ? { ...app, status, reviewDate: new Date().toISOString().split('T')[0] }
        : app
    ));
    setSelectedApplications([]);
  };

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Đơn ứng tuyển</h1>
          <div className="flex space-x-3">
            {selectedApplications.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => bulkUpdateStatus('reviewing')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Đánh dấu đang xem xét ({selectedApplications.length})
                </button>
                <button
                  onClick={() => bulkUpdateStatus('rejected')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Từ chối ({selectedApplications.length})
                </button>
              </div>
            )}
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Xuất báo cáo
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-500">Tổng đơn</p>
            <p className="text-2xl font-semibold text-gray-900">{applicationStats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-500">Chờ xử lý</p>
            <p className="text-2xl font-semibold text-yellow-600">{applicationStats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-500">Đang xem xét</p>
            <p className="text-2xl font-semibold text-blue-600">{applicationStats.reviewing}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-500">Đã phỏng vấn</p>
            <p className="text-2xl font-semibold text-purple-600">{applicationStats.interviewed}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-500">Đã chấp nhận</p>
            <p className="text-2xl font-semibold text-green-600">{applicationStats.accepted}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-500">Từ chối</p>
            <p className="text-2xl font-semibold text-red-600">{applicationStats.rejected}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Tìm theo tên ứng viên, vị trí..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="reviewing">Đang xem xét</option>
                <option value="interviewed">Đã phỏng vấn</option>
                <option value="accepted">Đã chấp nhận</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>

            <div>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Tất cả đánh giá</option>
                <option value="5">⭐ 5 sao</option>
                <option value="4">⭐ 4 sao</option>
                <option value="3">⭐ 3 sao</option>
                <option value="2">⭐ 2 sao</option>
                <option value="1">⭐ 1 sao</option>
              </select>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="rating">Đánh giá cao</option>
                <option value="salary">Mức lương</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white shadow rounded-lg">
          {sortedApplications.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedApplications.length === sortedApplications.length}
                  onChange={() => {
                    if (selectedApplications.length === sortedApplications.length) {
                      setSelectedApplications([]);
                    } else {
                      setSelectedApplications(sortedApplications.map(a => a.id));
                    }
                  }}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Chọn tất cả ({sortedApplications.length} đơn)
                </label>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-200">
            {sortedApplications.map((application) => (
              <div key={application.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedApplications.includes(application.id)}
                    onChange={() => {
                      if (selectedApplications.includes(application.id)) {
                        setSelectedApplications(selectedApplications.filter(id => id !== application.id));
                      } else {
                        setSelectedApplications([...selectedApplications, application.id]);
                      }
                    }}
                    className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />

                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {application.avatar ? (
                      <img src={application.avatar} alt={application.candidateName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-xl text-gray-400">👤</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{application.candidateName || 'Tên ứng viên không có'}</h3>
                        <p className="text-green-600 font-medium">Ứng tuyển: {application.jobTitle || 'Vị trí không xác định'}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(application.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4V7a2 2 0 012-2h4a2 2 0 012 2v4M8 7h8M8 7v4a2 2 0 002 2h4a2 2 0 002-2V7" />
                        </svg>
                        {application.appliedDate ? new Date(application.appliedDate).toLocaleDateString('vi-VN') : 'N/A'}
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {application.jobLocation || 'N/A'}
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        {application.expectedSalary ? `${application.expectedSalary} triệu/tháng` : 'Chưa cung cấp'}
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4V7a2 2 0 012-2h4a2 2 0 012 2v4M8 7h8M8 7v4a2 2 0 002 2h4a2 2 0 002-2V7" />
                        </svg>
                        {application.experience || 'N/A'}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Email:</strong> {application.candidateEmail || 'Chưa cung cấp'}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Học vấn:</strong> {application.education || 'Chưa cung cấp'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Có thể bắt đầu:</strong> {application.availableDate ? new Date(application.availableDate).toLocaleDateString('vi-VN') : 'Chưa cung cấp'}
                      </p>
                    </div>

                    <div className="mb-3">
                      {getRatingStars(application.rating)}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {application.skills && application.skills.length > 0 ? (
                        application.skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">Chưa có thông tin kỹ năng</span>
                      )}
                    </div>

                    {application.notes && (
                      <div className="mb-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">
                          <strong>Ghi chú:</strong> {application.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-4 text-sm">
                        <button
                          onClick={() => setShowApplicationDetail(application)}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Xem chi tiết
                        </button>
                        {application.cvUrl && (
                          <a
                            href={getCVUrl(application.cvUrl)}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700 font-medium flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Xem CV
                          </a>
                        )}
                        {application.portfolioUrl && (
                          <a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700 font-medium">
                            Portfolio
                          </a>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'reviewing')}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Xem xét
                            </button>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Từ chối
                            </button>
                          </>
                        )}

                        {application.status === 'reviewing' && (
                          <>
                            <button
                              onClick={() => handleScheduleInterview(application)}
                              className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                            >
                              Mời phỏng vấn
                            </button>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Từ chối
                            </button>
                          </>
                        )}

                        {application.status === 'interviewed' && (
                          <>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'accepted')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Chấp nhận
                            </button>
                            <button
                              onClick={() => updateApplicationStatus(application.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Từ chối
                            </button>
                          </>
                        )}

                        <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50">
                          Ghi chú
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sortedApplications.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn ứng tuyển nào</h3>
              <p className="text-gray-500 mb-4">Khi có ứng viên ứng tuyển vào công việc của bạn, chúng sẽ hiển thị ở đây.</p>
            </div>
          )}
        </div>

        {/* Interview Schedule Modal */}
        {showInterviewModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Tạo lịch phỏng vấn</h3>
                <button
                  onClick={() => {
                    setShowInterviewModal(false);
                    setInterviewData({
                      interview_date: '',
                      interview_time: '',
                      location: '',
                      interview_type: 'in-person',
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedApplicationForInterview && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Ứng viên:</strong> {selectedApplicationForInterview.candidateName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Vị trí:</strong> {selectedApplicationForInterview.jobTitle}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="interview_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày phỏng vấn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="interview_date"
                      value={interviewData.interview_date}
                      onChange={(e) => setInterviewData(prev => ({ ...prev, interview_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="interview_time" className="block text-sm font-medium text-gray-700 mb-1">
                      Giờ phỏng vấn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="interview_time"
                      value={interviewData.interview_time}
                      onChange={(e) => setInterviewData(prev => ({ ...prev, interview_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="interview_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Hình thức phỏng vấn
                  </label>
                  <select
                    id="interview_type"
                    value={interviewData.interview_type}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, interview_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="in-person">Trực tiếp</option>
                    <option value="video">Video call</option>
                    <option value="phone">Điện thoại</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Địa điểm / Link phỏng vấn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={interviewData.location}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={interviewData.interview_type === 'video' ? 'Link video call (Zoom, Google Meet, ...)' : 'Địa chỉ phỏng vấn'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="interview_notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    id="interview_notes"
                    rows={3}
                    value={interviewData.notes}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Thông tin bổ sung, yêu cầu chuẩn bị tài liệu..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowInterviewModal(false);
                      setInterviewData({
                        interview_date: '',
                        interview_time: '',
                        location: '',
                        interview_type: 'in-person',
                        notes: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreateInterview}
                    disabled={!interviewData.interview_date || !interviewData.interview_time || !interviewData.location}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Tạo lịch phỏng vấn
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application Detail Modal */}
        {showApplicationDetail && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Chi tiết đơn ứng tuyển</h3>
                <button
                  onClick={() => setShowApplicationDetail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ứng viên</label>
                    <p className="text-sm text-gray-900">{showApplicationDetail.candidateName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vị trí ứng tuyển</label>
                    <p className="text-sm text-gray-900">{showApplicationDetail.jobTitle || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thư xin việc</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900">{showApplicationDetail.coverLetter || 'Chưa có thư xin việc'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Đánh giá</label>
                    <div className="mt-1">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => updateApplicationRating(showApplicationDetail.id, star)}
                            className={`w-6 h-6 ${star <= (showApplicationDetail.rating || 0)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                              }`}
                          >
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                    <div className="mt-1">
                      {getStatusBadge(showApplicationDetail.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Ghi chú</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={showApplicationDetail.notes || ''}
                    onChange={(e) => {
                      const updatedApp = { ...showApplicationDetail, notes: e.target.value };
                      setShowApplicationDetail(updatedApp);
                      addNote(showApplicationDetail.id, e.target.value);
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Thêm ghi chú về ứng viên..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowApplicationDetail(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                  <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RecruiterApplications;
