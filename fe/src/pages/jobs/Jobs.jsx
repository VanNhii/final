import JobRecommendations from '@/components/common/JobRecommendations';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useDebounce } from '@/hooks';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import { useEffect, useState } from 'react';
import { BsBuilding, BsFire } from 'react-icons/bs';
import {
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiFilter,
  FiHeart,
  FiMapPin,
  FiSearch
} from 'react-icons/fi';
import { MdCategory, MdWorkOutline } from 'react-icons/md';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 500); // 500ms delay
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    job_type: searchParams.get('job_type') || '',
    salary_min: searchParams.get('salary_min') || '',
    salary_max: searchParams.get('salary_max') || '',
    sort: searchParams.get('sort') || '-created_at'
  });
  
  const [loading, setLoading] = useState(false);

  // Filter options
  const jobTypes = [
    { value: '', label: 'Tất cả loại hình' },
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Remote', label: 'Remote' }
  ];

  const salaryRanges = [
    { value: '', label: 'Tất cả mức lương' },
    { value: '0', label: 'Dưới 15 triệu', max: 15000000 },
    { value: '15000000', label: '15 - 25 triệu', max: 25000000 },
    { value: '25000000', label: '25 - 40 triệu', max: 40000000 },
    { value: '40000000', label: '40 - 60 triệu', max: 60000000 },
    { value: '60000000', label: 'Trên 60 triệu' }
  ];

  const locations = [
    { value: '', label: 'Tất cả địa điểm' },
    { value: 'Hà Nội', label: 'Hà Nội' },
    { value: 'Hồ Chí Minh', label: 'Hồ Chí Minh' },
    { value: 'Đà Nẵng', label: 'Đà Nẵng' },
    { value: 'Remote', label: 'Remote' }
  ];

  const sortOptions = [
    { value: '-created_at', label: 'Mới nhất' },
    { value: 'created_at', label: 'Cũ nhất' },
    { value: '-salary_max', label: 'Lương cao nhất' },
    { value: 'salary_min', label: 'Lương thấp nhất' },
    { value: '-views_count', label: 'Xem nhiều nhất' }
  ];

  // Fetch jobs from API
  const fetchJobs = async (page = 1) => {
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

      const response = await jobService.getJobs(params);
      
      if (response.success) {
        setJobs(response.data.data || response.data || []);
        
        // Safely access pagination data with fallbacks
        const paginationData = response.data.pagination || {};
        setPagination({
          page: paginationData.page || page,
          limit: paginationData.limit || pagination.limit,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
      // Reset pagination to safe defaults on error
      setPagination({
        page: 1,
        limit: pagination.limit,
        total: 0,
        totalPages: 1
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await jobService.getJobCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch saved jobs
  const fetchSavedJobs = async () => {
    if (!isAuthenticated || user?.role !== 'candidate') return;
    try {
      const response = await candidateService.getSavedJobs();
      if (response.success && response.data) {
        const jobsArray = response.data.data || response.data;
        const savedIds = new Set(jobsArray.map(item => item._id));
        setSavedJobIds(savedIds);
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    }
  };

  // Toggle bookmark
  const toggleBookmark = async (jobId) => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để lưu việc làm');
      navigate('/login', { state: { from: '/jobs' } });
      return;
    }

    if (user?.role !== 'candidate') {
      toast.warning('Chỉ ứng viên mới có thể lưu việc làm');
      return;
    }

    try {
      const isSaved = savedJobIds.has(jobId);
      
      if (isSaved) {
        await candidateService.unsaveJob(jobId);
        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        toast.success('Đã bỏ lưu công việc');
      } else {
        await candidateService.saveJob(jobId);
        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast.success('Đã lưu công việc');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error(error.message || 'Không thể thực hiện thao tác');
    }
  };

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearch
    }));
  }, [debouncedSearch]);

  // Load initial data
  useEffect(() => {
    fetchJobs(1);
    fetchCategories();
    if (isAuthenticated && user?.role === 'candidate') {
      fetchSavedJobs();
    }
  }, [isAuthenticated, user]);

  // Refetch when filters change
  useEffect(() => {
    fetchJobs(1);
    
    // Update URL params
    const newParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
    });
    setSearchParams(newParams);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchJobs(newPage);
  };

  // Format salary
  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    if (min && max) {
      return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu VND`;
    }
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu VND`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu VND`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiSearch className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Tìm việc làm IT</h1>
                <p className="text-gray-600 mt-1">Khám phá hàng ngàn cơ hội việc làm IT hấp dẫn</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            {/* AI Recommendations for logged in users */}
            {isAuthenticated && user?.role === 'candidate' && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
                <JobRecommendations limit={3} showTitle={true} showReasons={false} />
              </div>
            )}

            <div className="bg-white rounded-xl shadow-md p-6 sticky top-4 border border-gray-100">
              <div className="flex items-center space-x-2 mb-6">
                <FiFilter className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Bộ lọc</h2>
              </div>
              
              {/* Search */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FiSearch className="w-4 h-4 mr-1.5" />
                  Từ khóa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tìm kiếm theo vị trí, công ty..."
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MdCategory className="w-4 h-4 mr-1.5" />
                  Danh mục
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="w-4 h-4 mr-1.5" />
                  Địa điểm
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Type */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MdWorkOutline className="w-4 h-4 mr-1.5" />
                  Loại hình
                </label>
                <select
                  value={filters.job_type}
                  onChange={(e) => handleFilterChange('job_type', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {jobTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Range */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FiDollarSign className="w-4 h-4 mr-1.5" />
                  Mức lương
                </label>
                <select
                  value={filters.salary_min}
                  onChange={(e) => {
                    const selected = salaryRanges.find(range => range.value === e.target.value);
                    handleFilterChange('salary_min', selected?.value || '');
                    handleFilterChange('salary_max', selected?.max || '');
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {salaryRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">
            {/* Sort and Results */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 font-medium flex items-center">
                {pagination.total > 0 && (
                  <>
                    <FiSearch className="w-4 h-4 mr-2 text-blue-600" />
                    Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} của {pagination.total} việc làm
                  </>
                )}
              </div>
              <div className="mt-2 sm:mt-0">
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                {/* Jobs Grid */}
                {jobs.length > 0 ? (
                  <div className="grid gap-6">
                    {jobs.map((job) => (
                      <div key={job._id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-3">
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center mr-4 shadow-sm">
                                {job.recruiter_id?.company_logo_url ? (
                                  <img 
                                    src={job.recruiter_id.company_logo_url} 
                                    alt={job.recruiter_id.company_name}
                                    className="w-10 h-10 object-contain rounded"
                                  />
                                ) : (
                                  <BsBuilding className="w-7 h-7 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                                  <Link to={`/jobs/${job._id}`}>
                                    {job.title}
                                  </Link>
                                </h3>
                                <p className="text-gray-600 font-medium">{job.recruiter_id?.company_name}</p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                              <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                                <FiMapPin className="w-4 h-4 mr-1.5 text-blue-600" />
                                {job.location?.city || job.location || 'Remote'}
                              </span>
                              <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                                <FiBriefcase className="w-4 h-4 mr-1.5 text-green-600" />
                                {job.job_type || 'Full-time'}
                              </span>
                              <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                                <FiDollarSign className="w-4 h-4 mr-1.5 text-yellow-600" />
                                {formatSalary(job.salary_min, job.salary_max)}
                              </span>
                              <span className="flex items-center bg-gray-50 px-3 py-1.5 rounded-lg">
                                <FiClock className="w-4 h-4 mr-1.5 text-purple-600" />
                                {formatDate(job.created_at)}
                              </span>
                            </div>

                            {job.description && (
                              <p className="text-gray-600 text-sm line-clamp-2 mb-4 leading-relaxed">
                                {job.description.length > 150 
                                  ? job.description.substring(0, 150) + '...'
                                  : job.description
                                }
                              </p>
                            )}

                            {job.skills && job.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {job.skills.slice(0, 4).map((skill, index) => (
                                  <span key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                                    {skill}
                                  </span>
                                ))}
                                {job.skills.length > 4 && (
                                  <span className="text-gray-500 text-xs font-medium bg-gray-100 px-3 py-1 rounded-full">+{job.skills.length - 4} kỹ năng</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end ml-4">
                            {job.is_urgent && (
                              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-2 shadow-md flex items-center">
                                <BsFire className="w-3 h-3 mr-1" />
                                Gấp
                              </span>
                            )}
                            {job.is_featured && (
                              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs font-bold px-3 py-1.5 rounded-full mb-3 shadow-md">
                                ⭐ Nổi bật
                              </span>
                            )}
                            <div className="flex gap-2">
                              {isAuthenticated && user?.role === 'candidate' && (
                                <button
                                  onClick={() => toggleBookmark(job._id)}
                                  className={`p-2.5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg ${
                                    savedJobIds.has(job._id)
                                      ? 'bg-red-500 text-white hover:bg-red-600'
                                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
                                  }`}
                                  title={savedJobIds.has(job._id) ? 'Bỏ lưu' : 'Lưu việc làm'}
                                >
                                  <FiHeart className={`w-5 h-5 ${
                                    savedJobIds.has(job._id) ? 'fill-current' : ''
                                  }`} />
                                </button>
                              )}
                              <Link
                                to={`/jobs/${job._id}`}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 text-sm font-semibold shadow-md hover:shadow-lg"
                              >
                                Xem chi tiết
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                    <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                      <FiSearch className="w-16 h-16 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Không tìm thấy việc làm nào
                    </h3>
                    <p className="text-gray-500">
                      Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <nav className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2 border border-gray-100">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronLeft className="w-4 h-4 mr-1" />
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
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              pageNum === pagination.page
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Sau
                        <FiChevronRight className="w-4 h-4 ml-1" />
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

export default Jobs;