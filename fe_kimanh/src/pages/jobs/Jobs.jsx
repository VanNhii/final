import JobRecommendations from '@/components/common/JobRecommendations';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {useDebounce} from '@/hooks';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import {useEffect, useState} from 'react';
import {BsBuilding, BsFire} from 'react-icons/bs';
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
import {MdCategory, MdWorkOutline} from 'react-icons/md';
import {useSelector} from 'react-redux';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {toast} from 'react-toastify';
import {formatLocation} from '@/utils/formatters';

const Jobs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {isAuthenticated, user} = useSelector((state) => state.auth);
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
    {value: '', label: 'Tất cả loại hình'},
    {value: 'Full-time', label: 'Full-time'},
    {value: 'Part-time', label: 'Part-time'},
    {value: 'Contract', label: 'Contract'},
    {value: 'Remote', label: 'Remote'}
  ];

  const salaryRanges = [
    {value: '', label: 'Tất cả mức lương'},
    {value: '0', label: 'Dưới 15 triệu', max: 15000000},
    {value: '15000000', label: '15 - 25 triệu', max: 25000000},
    {value: '25000000', label: '25 - 40 triệu', max: 40000000},
    {value: '40000000', label: '40 - 60 triệu', max: 60000000},
    {value: '60000000', label: 'Trên 60 triệu'}
  ];

  const locations = [
    {value: '', label: 'Tất cả địa điểm'},
    {value: 'Hà Nội', label: 'Hà Nội'},
    {value: 'Hồ Chí Minh', label: 'Hồ Chí Minh'},
    {value: 'Đà Nẵng', label: 'Đà Nẵng'},
    {value: 'Remote', label: 'Remote'}
  ];

  const sortOptions = [
    {value: '-created_at', label: 'Mới nhất'},
    {value: 'created_at', label: 'Cũ nhất'},
    {value: '-salary_max', label: 'Lương cao nhất'},
    {value: 'salary_min', label: 'Lương thấp nhất'},
    {value: '-views_count', label: 'Xem nhiều nhất'}
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
      navigate('/login', {state: {from: '/jobs'}});
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
      return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu`;
    }
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu`;
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
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 relative overflow-hidden">
        {/* Background Blobs (Optional to match Home) */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-slate-800 rounded-2xl shadow-lg shadow-blue-900/10">
                <FiSearch className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Tìm việc làm IT</h1>
                <p className="text-slate-400 mt-1 text-lg">Khám phá hàng ngàn cơ hội hấp dẫn đang chờ đón bạn</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            {/* AI Recommendations for logged in users */}
            {isAuthenticated && user?.role === 'candidate' && (
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 mb-6 border border-slate-800">
                {/* Note: JobRecommendations inside will need valid props or styling updates if it has internal styles */}
                <JobRecommendations limit={3} showTitle={true} showReasons={false} />
              </div>
            )}

            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 sticky top-24 border border-slate-800">
              <div className="flex items-center space-x-2 mb-6 border-b border-slate-800 pb-4">
                <FiFilter className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">Bộ lọc tìm kiếm</h2>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-slate-400 mb-2">
                  <FiSearch className="w-4 h-4 mr-2" />
                  Từ khóa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Vị trí, công ty..."
                    className="w-full pl-10 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white placeholder-slate-500 outline-none"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-slate-400 mb-2">
                  <MdCategory className="w-4 h-4 mr-2" />
                  Danh mục
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white outline-none cursor-pointer"
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
                <label className="flex items-center text-sm font-medium text-slate-400 mb-2">
                  <FiMapPin className="w-4 h-4 mr-2" />
                  Địa điểm
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white outline-none cursor-pointer"
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
                <label className="flex items-center text-sm font-medium text-slate-400 mb-2">
                  <MdWorkOutline className="w-4 h-4 mr-2" />
                  Loại hình
                </label>
                <select
                  value={filters.job_type}
                  onChange={(e) => handleFilterChange('job_type', e.target.value)}
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white outline-none cursor-pointer"
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
                <label className="flex items-center text-sm font-medium text-slate-400 mb-2">
                  <FiDollarSign className="w-4 h-4 mr-2" />
                  Mức lương
                </label>
                <select
                  value={filters.salary_min}
                  onChange={(e) => {
                    const selected = salaryRanges.find(range => range.value === e.target.value);
                    handleFilterChange('salary_min', selected?.value || '');
                    handleFilterChange('salary_max', selected?.max || '');
                  }}
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white outline-none cursor-pointer"
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 bg-slate-900 rounded-xl p-4 shadow-lg border border-slate-800">
              <div className="text-sm text-slate-400 font-medium flex items-center">
                {pagination.total > 0 && (
                  <>
                    <FiSearch className="w-4 h-4 mr-2 text-blue-500" />
                    Hiển thị <span className="text-white font-bold mx-1">{((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> của <span className="text-white font-bold mx-1">{pagination.total}</span> việc làm
                  </>
                )}
              </div>
              <div className="mt-2 sm:mt-0">
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-700 transition-colors"
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
              <div className="flex justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Jobs Grid */}
                {jobs.length > 0 ? (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div key={job._id} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 group">
                        <div className="flex flex-col md:flex-row md:items-start gap-5">
                          {/* Logo */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden p-1">
                              {job.recruiter_id?.company_logo_url ? (
                                <img
                                  src={job.recruiter_id.company_logo_url}
                                  alt={job.recruiter_id.company_name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <BsBuilding className="w-8 h-8 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-grow">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                              <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-1">
                                  <Link to={`/jobs/${job._id}`}>
                                    {job.title}
                                  </Link>
                                </h3>
                                <Link to={`/companies/${job.recruiter_id?._id}`} className="text-slate-400 hover:text-white transition-colors text-sm font-medium mb-3 block">
                                  {job.recruiter_id?.company_name}
                                </Link>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-2 items-center">
                                {job.is_urgent && (
                                  <span className="bg-red-500/10 text-red-500 text-xs font-bold px-3 py-1 rounded-full border border-red-500/20 flex items-center">
                                    <BsFire className="w-3 h-3 mr-1" /> Gấp
                                  </span>
                                )}
                                {job.is_featured && (
                                  <span className="bg-yellow-500/10 text-yellow-500 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/20">
                                    Note bật
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Job Metas */}
                            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 mb-4">
                              <span className="flex items-center text-slate-400 text-sm bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                <FiDollarSign className="w-4 h-4 mr-2 text-green-400" />
                                <span className="text-green-400 font-semibold">{formatSalary(job.salary_min, job.salary_max)}</span>
                              </span>
                              <span className="flex items-center text-slate-400 text-sm bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                <FiMapPin className="w-4 h-4 mr-2 text-blue-400" />
                                {formatLocation(job.location)}
                              </span>
                              <span className="flex items-center text-slate-400 text-sm bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                <FiBriefcase className="w-4 h-4 mr-2 text-purple-400" />
                                {job.job_type || 'Full-time'}
                              </span>
                              <span className="flex items-center text-slate-400 text-sm bg-slate-800/50 px-3 py-1.5 rounded-lg">
                                <FiClock className="w-4 h-4 mr-2 text-orange-400" />
                                {formatDate(job.created_at)}
                              </span>
                            </div>

                            {/* Skills */}
                            {job.skills && job.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {job.skills.slice(0, 4).map((skill, index) => (
                                  <span key={index} className="bg-slate-800 text-slate-300 px-3 py-1 rounded-md text-xs font-medium border border-slate-700">
                                    {skill}
                                  </span>
                                ))}
                                {job.skills.length > 4 && (
                                  <span className="text-slate-500 text-xs font-medium px-2 py-1">+{job.skills.length - 4}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-row md:flex-col gap-3 min-w-[120px]">
                            <Link
                              to={`/jobs/${job._id}`}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all text-center flex items-center justify-center text-sm"
                            >
                              Ứng tuyển
                            </Link>

                            {isAuthenticated && user?.role === 'candidate' && (
                              <button
                                onClick={() => toggleBookmark(job._id)}
                                className={`flex-1 px-4 py-2 rounded-xl font-semibold border transition-all flex items-center justify-center gap-2 text-sm ${savedJobIds.has(job._id)
                                  ? 'bg-transparent border-red-500 text-red-500 hover:bg-red-500/10'
                                  : 'bg-transparent border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                                  }`}
                              >
                                <FiHeart className={`${savedJobIds.has(job._id) ? 'fill-current' : ''}`} />
                                {savedJobIds.has(job._id) ? 'Đã lưu' : 'Lưu tin'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-900 rounded-2xl shadow-sm border border-slate-800">
                    <div className="inline-block p-6 bg-slate-800 rounded-full mb-6">
                      <FiSearch className="w-12 h-12 text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Không tìm thấy việc làm nào
                    </h3>
                    <p className="text-slate-400">
                      Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <nav className="flex items-center space-x-2 bg-slate-900 rounded-xl shadow-lg p-2 border border-slate-800">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronLeft className="w-5 h-5" />
                      </button>

                      {Array.from({length: Math.min(5, pagination.totalPages)}, (_, i) => {
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
                            className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-all ${pageNum === pagination.page
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                              }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronRight className="w-5 h-5" />
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