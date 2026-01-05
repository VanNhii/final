import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useSelector } from 'react-redux';
import candidateService from '@/services/candidateService';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
    
    // Check if recruiter has subscription for candidate search
    // This would be determined by their subscription status
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

      const response = await candidateService.searchCandidates(params);
      
      if (response.success) {
        setCandidates(response.data.data || []);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        });
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      
      // Handle permission errors
      if (error.response?.status === 403) {
        setHasPermission(false);
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
      fetchCandidates(1);
      
      // Update URL params
      const newParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) newParams.set(key, value);
      });
      setSearchParams(newParams);
    }
  }, [filters, hasPermission]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchCandidates(newPage);
  };

  // Format experience years
  const formatExperience = (years) => {
    if (!years) return 'Chưa có kinh nghiệm';
    if (years < 1) return 'Dưới 1 năm';
    return `${years} năm`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Permission check UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cần đăng nhập</h2>
          <p className="text-gray-600 mb-6">Bạn cần đăng nhập để tìm kiếm ứng viên</p>
          <Link
            to="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== 'recruiter') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Không có quyền truy cập</h2>
          <p className="text-gray-600 mb-6">Chỉ nhà tuyển dụng mới có thể tìm kiếm ứng viên</p>
          <Link
            to="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
        <div className="text-center">
          <div className="text-6xl mb-4">💎</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nâng cấp tài khoản</h2>
          <p className="text-gray-600 mb-6">
            Tính năng tìm kiếm ứng viên yêu cầu gói Premium
          </p>
          <Link
            to="/recruiter/subscription"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Nâng cấp ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tìm ứng viên</h1>
              <p className="text-gray-600 mt-1">
                {pagination.total > 0 ? `${pagination.total} ứng viên` : 'Đang tải...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bộ lọc</h2>
              
              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Tên, email, vị trí..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Skills */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kỹ năng
                </label>
                <input
                  type="text"
                  value={filters.skills}
                  onChange={(e) => handleFilterChange('skills', e.target.value)}
                  placeholder="React, Node.js, Python..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Phân cách bằng dấu phẩy</p>
              </div>

              {/* Experience Level */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kinh nghiệm
                </label>
                <select
                  value={filters.experience_level}
                  onChange={(e) => handleFilterChange('experience_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {experienceLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Education Level */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trình độ học vấn
                </label>
                <select
                  value={filters.education_level}
                  onChange={(e) => handleFilterChange('education_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {educationLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa điểm
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Candidates List */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">
            {/* Sort and Results */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="text-sm text-gray-600">
                {pagination.total > 0 && (
                  <>Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} của {pagination.total} ứng viên</>
                )}
              </div>
              <div className="mt-2 sm:mt-0">
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Candidates Grid */}
                {candidates.length > 0 ? (
                  <div className="grid gap-6">
                    {candidates.map((candidate) => (
                      <div key={candidate._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start flex-1">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                              {candidate.user_id?.avatar_url ? (
                                <img 
                                  src={candidate.user_id.avatar_url} 
                                  alt={candidate.user_id.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-gray-600 font-bold text-lg">
                                  {candidate.user_id?.full_name?.charAt(0) || 'U'}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {candidate.user_id?.full_name || 'Chưa cập nhật tên'}
                                </h3>
                                {candidate.user_id?.is_verified && (
                                  <span className="ml-2 text-blue-500" title="Tài khoản đã xác thực">
                                    ✓
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-gray-600 mb-2">
                                {candidate.desired_position || 'Chưa cập nhật vị trí mong muốn'}
                              </p>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                                <span className="flex items-center">
                                  📍 {candidate.contact_info?.address || 'Chưa cập nhật địa chỉ'}
                                </span>
                                <span className="flex items-center">
                                  💼 {formatExperience(candidate.experience_years)}
                                </span>
                                <span className="flex items-center">
                                  🎓 {candidate.education?.[0]?.degree_level || 'Chưa cập nhật học vấn'}
                                </span>
                                <span className="flex items-center">
                                  🕒 Cập nhật {formatDate(candidate.updated_at)}
                                </span>
                              </div>

                              {candidate.bio && (
                                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                                  {candidate.bio.length > 150 
                                    ? candidate.bio.substring(0, 150) + '...'
                                    : candidate.bio
                                  }
                                </p>
                              )}

                              {candidate.skills && candidate.skills.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {candidate.skills.slice(0, 6).map((skill, index) => (
                                    <span key={index} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                      {skill.skill_name || skill}
                                    </span>
                                  ))}
                                  {candidate.skills.length > 6 && (
                                    <span className="text-gray-500 text-xs">+{candidate.skills.length - 6} more</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-2">
                            <Link
                              to={`/recruiter/candidates/${candidate._id}`}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Xem hồ sơ
                            </Link>
                            
                            <button
                              onClick={() => {
                                // Handle contact candidate
                                window.open(`mailto:${candidate.user_id?.email}`, '_blank');
                              }}
                              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              Liên hệ
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">👨‍💻</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Không tìm thấy ứng viên nào
                    </h3>
                    <p className="text-gray-500">
                      Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Trước
                      </button>
                      
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              pageNum === pagination.page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindCandidates;