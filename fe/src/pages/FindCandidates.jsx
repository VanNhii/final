import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSelector } from 'react-redux';
import recruiterService from '@/services/recruiterService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const FindCandidates = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    skills: searchParams.get('skills') || '',
    experience_level: searchParams.get('experience_level') || '',
    education_level: searchParams.get('education_level') || '',
    location: searchParams.get('location') || '',
    sort: searchParams.get('sort') || '-updated_at'
  });

  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);

  // Filter options
  const experienceLevels = [
    { value: '', label: 'Tất cả kinh nghiệm' },
    { value: 'entry', label: 'Fresher (0-1 năm)' },
    { value: 'junior', label: 'Junior (1-3 năm)' },
    { value: 'mid', label: 'Mid-level (3-5 năm)' },
    { value: 'senior', label: 'Senior (5+ năm)' },
    { value: 'lead', label: 'Lead/Manager (7+ năm)' }
  ];

  const educationLevels = [
    { value: '', label: 'Tất cả trình độ' },
    { value: 'high_school', label: 'Trung học phổ thông' },
    { value: 'associate', label: 'Cao đẳng' },
    { value: 'bachelor', label: 'Cử nhân' },
    { value: 'master', label: 'Thạc sĩ' },
    { value: 'phd', label: 'Tiến sĩ' }
  ];

  const locations = [
    { value: '', label: 'Tất cả địa điểm' },
    { value: 'Hà Nội', label: 'Hà Nội' },
    { value: 'Hồ Chí Minh', label: 'Hồ Chí Minh' },
    { value: 'Đà Nẵng', label: 'Đà Nẵng' },
    { value: 'Hải Phòng', label: 'Hải Phòng' },
    { value: 'Cần Thơ', label: 'Cần Thơ' }
  ];

  const sortOptions = [
    { value: '-updated_at', label: 'Cập nhật gần đây' },
    { value: '-created_at', label: 'Mới tham gia' },
    { value: 'full_name', label: 'Tên A-Z' },
    { value: '-experience_years', label: 'Kinh nghiệm nhiều nhất' }
  ];

  // Check if user has permission to search candidates
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'recruiter') {
      setHasPermission(false);
      return;
    }
    setHasPermission(true);
  }, [isAuthenticated, user]);

  // Fetch candidates from API
  const fetchCandidates = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await recruiterService.searchCandidates(params);
      
      if (response.success) {
        setCandidates(response.data.data || []);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        });
      } else {
        // Fallback for demo/error handling if backend returns non-standard success false
        // toast.error('Không tìm thấy dữ liệu'); 
        // We don't want to spam toasts, maybe just empty list
        setCandidates([]);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      
      // Handle permission errors
      if (error.response?.status === 403) {
        setHasPermission(false);
        toast.error('Bạn không có quyền truy cập tính năng này');
      } else {
        toast.error('Có lỗi xảy ra khi tải danh sách ứng viên');
      }
      
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (hasPermission) {
      fetchCandidates(1);
    }
  }, [hasPermission]);

  // Refetch when filters change
  useEffect(() => {
    if (hasPermission) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        fetchCandidates(1);
        
        // Update URL params
        const newParams = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) newParams.set(key, value);
        });
        setSearchParams(newParams);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters, hasPermission]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Permission check UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cần đăng nhập</h2>
          <p className="text-gray-600 mb-6">Bạn cần đăng nhập tài khoản nhà tuyển dụng để tìm kiếm ứng viên tiềm năng.</p>
          <div className="flex flex-col space-y-3">
            <Link
              to="/login"
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-blue-500/30"
            >
              Đăng nhập ngay
            </Link>
            <Link
              to="/"
              className="w-full text-gray-600 hover:text-gray-900 transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user?.role !== 'recruiter') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600 mb-6">Chỉ tài khoản nhà tuyển dụng mới có thể sử dụng tính năng này.</p>
          <Link
            to="/"
            className="inline-block bg-gray-100 text-gray-900 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Nâng cấp tài khoản</h2>
          <p className="text-gray-600 mb-6">
            Để tìm kiếm và xem hồ sơ ứng viên không giới hạn, vui lòng nâng cấp lên gói Premium.
          </p>
          <Link
            to="/recruiter/subscription"
            className="block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg hover:shadow-purple-500/30"
          >
            Xem các gói dịch vụ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tìm kiếm nhân tài</h1>
              <p className="text-gray-500 mt-1">
                Kết nối với {pagination.total > 0 ? pagination.total.toLocaleString() : 'hàng ngàn'} ứng viên tiềm năng cho doanh nghiệp của bạn
              </p>
            </div>
            {/* Quick Actions (if any) */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          
          {/* Filters Sidebar */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-32">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Bộ lọc
                </h2>
                <button 
                  onClick={() => setFilters({
                    search: '',
                    skills: '',
                    experience_level: '',
                    education_level: '',
                    location: '',
                    sort: '-updated_at'
                  })}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Đặt lại
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Từ khóa
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Tên, chức danh..."
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kỹ năng
                  </label>
                  <input
                    type="text"
                    value={filters.skills}
                    onChange={(e) => handleFilterChange('skills', e.target.value)}
                    placeholder="VD: React, Java, AWS"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  />
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kinh nghiệm
                  </label>
                  <select
                    value={filters.experience_level}
                    onChange={(e) => handleFilterChange('experience_level', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  >
                    {experienceLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Education Level */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Trình độ
                  </label>
                  <select
                    value={filters.education_level}
                    onChange={(e) => handleFilterChange('education_level', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  >
                    {educationLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Địa điểm
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                  >
                    {locations.map((location) => (
                      <option key={location.value} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-9 mt-8 lg:mt-0">
            {/* Sort Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between">
              <p className="text-gray-600 font-medium mb-2 sm:mb-0">
                Tìm thấy <span className="text-blue-600 font-bold">{pagination.total}</span> ứng viên phù hợp
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sắp xếp theo:</span>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="border-none bg-gray-50 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <LoadingSpinner />
                <p className="mt-4 text-gray-500">Đang tìm kiếm ứng viên tài năng...</p>
              </div>
            ) : candidates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map((candidate) => (
                  <div key={candidate._id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group flex flex-col h-full transform hover:-translate-y-1">
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md">
                            {candidate.user_id?.avatar_url ? (
                              <img 
                                src={candidate.user_id.avatar_url} 
                                alt={candidate.user_id.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-xl">
                                {candidate.user_id?.full_name?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                          {candidate.user_id?.is_verified && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white" title="Đã xác thực">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100">
                            {candidate.experience_years ? `${candidate.experience_years} năm KN` : 'Fresher'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {candidate.user_id?.full_name || 'Chưa cập nhật tên'}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4 line-clamp-1">
                        {candidate.title || 'Chưa cập nhật chức danh'}
                      </p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {candidate.location?.city || 'Toàn quốc'}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {candidate.education && candidate.education.length > 0 ? candidate.education[0].degree : 'Không có thông tin'}
                        </div>
                      </div>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4 max-h-16 overflow-hidden">
                        {candidate.skills && candidate.skills.length > 0 ? (
                          candidate.skills.slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded border border-gray-100">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa cập nhật kỹ năng</span>
                        )}
                        {candidate.skills && candidate.skills.length > 4 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded border border-gray-100">
                            +{candidate.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex justify-between items-center">
                      <Link 
                        to={`/recruiter/candidates/${candidate._id}`}
                        className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        Xem chi tiết
                      </Link>
                      <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-blue-500/30">
                        Liên hệ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy ứng viên</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Không có ứng viên nào phù hợp với tiêu chí tìm kiếm của bạn. Hãy thử thay đổi bộ lọc hoặc từ khóa.
                </p>
                <button 
                  onClick={() => setFilters({
                    search: '',
                    skills: '',
                    experience_level: '',
                    education_level: '',
                    location: '',
                    sort: '-updated_at'
                  })}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => fetchCandidates(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Only show current, first, last, and surrounding pages
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => fetchCandidates(pageNum)}
                          className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${
                            pagination.page === pageNum
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === pagination.page - 2 ||
                      pageNum === pagination.page + 2
                    ) {
                      return <span key={pageNum} className="text-gray-400">...</span>;
                    }
                    return null;
                  })}

                  <button
                    onClick={() => fetchCandidates(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindCandidates;