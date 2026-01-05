import adminService from '@/services/adminService';
import { formatLocation } from '@/utils/formatters';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const JobsManagement = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    page: 1,
    limit: 10,
  });
  const [totalJobs, setTotalJobs] = useState(0);
  const [pagination, setPagination] = useState({});
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    rejected: 0
  });

  useEffect(() => {
    // Only show full page loading on first load
    const isInitial = jobs.length === 0 && loading;
    fetchJobs(isInitial);
  }, [filters]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchJobs = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setTableLoading(true);
      }
      
      // Build query parameters
      const params = {
        page: filters.page,
        limit: filters.limit
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category_id = filters.category;

      const response = await adminService.getJobs(params);
      
      if (response.success) {
        setJobs(response.data || []);
        setTotalJobs(response.pagination?.total || 0);
        setPagination(response.pagination || {});
        
        // Calculate stats
        const allJobs = response.data || [];
        setStats({
          total: allJobs.length,
          pending: allJobs.filter(j => j.status === 'pending').length,
          active: allJobs.filter(j => j.status === 'approved').length,
          rejected: allJobs.filter(j => j.status === 'rejected').length
        });
      } else {
        throw new Error(response.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Không thể tải danh sách việc làm');
      
      // Fallback to empty state
      setJobs([]);
      setTotalJobs(0);
      setStats({ total: 0, pending: 0, active: 0, rejected: 0 });
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await adminService.getJobCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleStatusChange = async (jobId, newStatus, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [jobId]: true }));
      
      const response = await adminService.updateJobStatus(jobId, {
        status: newStatus,
        reason: reason || `Cập nhật trạng thái thành ${newStatus} bởi admin`
      });

      if (response.success) {
        setJobs(jobs.map((job) => {
          const id = job._id || job.id;
          return id === jobId ? { ...job, status: newStatus } : job;
        }));

        const statusLabels = {
          approved: 'duyệt',
          rejected: 'từ chối',
          pending: 'chờ duyệt',
        };

        toast.success(`Đã ${statusLabels[newStatus]} tin tuyển dụng`);
        
        // Refresh stats
        fetchJobs();
      } else {
        throw new Error(response.message || 'Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Không thể cập nhật trạng thái tin tuyển dụng');
    } finally {
      setActionLoading(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleExportJobs = async () => {
    try {
      // Create CSV content for Excel compatibility
      const headers = ['STT', 'Tiêu đề', 'Công ty', 'Địa điểm', 'Mức lương', 'Trạng thái', 'Số đơn ứng tuyển', 'Lượt xem', 'Hạn nộp', 'Ngày tạo'];
      const rows = jobs.map((job, index) => [
        index + 1,
        job.title || '',
        job.recruiter_id?.company_name || job.company || '',
        formatLocation(job.location) || '',
        formatSalary(job.salary_min, job.salary_max),
        job.status === 'approved' ? 'Đã duyệt' : job.status === 'pending' ? 'Chờ duyệt' : job.status === 'rejected' ? 'Từ chối' : job.status,
        job.application_count || 0,
        job.views || 0,
        formatDate(job.application_deadline || job.deadline),
        formatDate(job.created_at)
      ]);
      
      // Create CSV string with BOM for Excel UTF-8 support
      const BOM = '\uFEFF';
      const csvContent = BOM + [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh_sach_viec_lam_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Xuất dữ liệu Excel thành công');
    } catch (error) {
      console.error('Error exporting jobs:', error);
      toast.error('Không thể xuất dữ liệu việc làm');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const reportDate = new Date().toLocaleDateString('vi-VN');
      
      // Create report summary
      const summaryHeaders = ['Thông tin báo cáo', 'Giá trị'];
      const summaryRows = [
        ['Ngày tạo báo cáo', reportDate],
        ['Tổng số việc làm', totalJobs],
        ['Chờ duyệt', stats.pending],
        ['Đã duyệt', stats.active],
        ['Từ chối', stats.rejected]
      ];
      
      // Create job details
      const detailHeaders = ['STT', 'Tiêu đề', 'Công ty', 'Trạng thái', 'Số đơn ứng tuyển', 'Lượt xem', 'Hạn nộp'];
      const detailRows = jobs.map((job, index) => [
        index + 1,
        job.title || '',
        job.recruiter_id?.company_name || 'N/A',
        job.status === 'approved' ? 'Đã duyệt' : job.status === 'pending' ? 'Chờ duyệt' : job.status === 'rejected' ? 'Từ chối' : job.status,
        job.application_count || 0,
        job.views || 0,
        formatDate(job.application_deadline || job.deadline)
      ]);
      
      // Combine into CSV
      const BOM = '\uFEFF';
      const csvContent = BOM + 
        'BÁO CÁO VIỆC LÀM\n\n' +
        [summaryHeaders, ...summaryRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nCHI TIẾT VIỆC LÀM\n' +
        [detailHeaders, ...detailRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao_cao_viec_lam_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Tạo báo cáo Excel thành công');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Không thể tạo báo cáo');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedJobs.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một việc làm');
      return;
    }

    const confirmMessage = action === 'approved' 
      ? `Bạn có chắc muốn duyệt ${selectedJobs.length} việc làm đã chọn?`
      : `Bạn có chắc muốn từ chối ${selectedJobs.length} việc làm đã chọn?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(prev => ({ ...prev, bulk: true }));
      
      const promises = selectedJobs.map(jobId => 
        adminService.updateJobStatus(jobId, {
          status: action,
          reason: `Cập nhật hàng loạt bởi admin`
        })
      );

      await Promise.all(promises);
      
      // Update local state
      setJobs(jobs.map(job => {
        const jobId = job._id || job.id;
        if (selectedJobs.includes(jobId)) {
          return { ...job, status: action };
        }
        return job;
      }));

      setSelectedJobs([]);
      toast.success(`${action === 'approved' ? 'Duyệt' : 'Từ chối'} ${selectedJobs.length} việc làm thành công`);
      
      // Refresh data
      fetchJobs();
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Có lỗi xảy ra khi thực hiện thao tác hàng loạt');
    } finally {
      setActionLoading(prev => ({ ...prev, bulk: false }));
    }
  };

  const handleSelectJob = (jobId) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    );
  };

  const handleSelectAll = () => {
    setSelectedJobs(
      selectedJobs.length === jobs.length
        ? []
        : jobs.map((job) => job._id || job.id)
    );
  };

  const getJobId = (job) => {
    return job._id || job.id;
  };

  const getCompanyName = (job) => {
    return job.recruiter_id?.company_name || job.company || 'N/A';
  };

  const getRecruiterName = (job) => {
    return job.recruiter_id?.user_id?.full_name || 
           job.recruiter_id?.user_id?.first_name + ' ' + job.recruiter_id?.user_id?.last_name ||
           job.recruiter?.name || 'N/A';
  };

  const getCategoryName = (job) => {
    return job.category_id?.name || job.category || 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatSalary = (min, max) => {
    const formatNumber = (num) => {
      if (!num) return '0';
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(0)}M`;
      }
      return num.toLocaleString();
    };
    return `${formatNumber(min)} - ${formatNumber(max)} VNĐ`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      active: 'Đã duyệt',
      rejected: 'Từ chối',
      expired: 'Hết hạn',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || 'Không xác định'}
      </span>
    );
  };

  const getJobTypeBadge = (type) => {
    const styles = {
      'full-time': 'bg-blue-100 text-blue-800',
      'part-time': 'bg-purple-100 text-purple-800',
      'contract': 'bg-orange-100 text-orange-800',
      'freelance': 'bg-green-100 text-green-800',
    };

    const labels = {
      'full-time': 'Toàn thời gian',
      'part-time': 'Bán thời gian',
      'contract': 'Hợp đồng',
      'freelance': 'Freelance',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý việc làm</h1>
          <p className="mt-1 text-gray-600">Duyệt và quản lý các tin tuyển dụng</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={handleExportJobs}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Xuất dữ liệu
          </button>
          <button
            onClick={handleGenerateReport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tạo báo cáo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tiêu đề, công ty..."
              value={filters.search}
              onChange={handleSearch}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng thái
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="active">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="expired">Hết hạn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh mục
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tất cả</option>
              {categories.map((category) => (
                <option key={category._id || category.id} value={category._id || category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số lượng/trang
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Tổng việc làm</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Chờ duyệt</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Đã duyệt</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-600">Từ chối</div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
        {/* Table loading overlay */}
        {tableLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 z-10 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-600">Đang tải...</span>
            </div>
          </div>
        )}
        
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Danh sách việc làm ({totalJobs})
            </h3>
            {selectedJobs.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Đã chọn {selectedJobs.length} việc làm
                </span>
                <button 
                  onClick={() => handleBulkAction('approved')}
                  disabled={actionLoading.bulk}
                  className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading.bulk ? 'Đang xử lý...' : 'Duyệt hàng loạt'}
                </button>
                <button 
                  onClick={() => handleBulkAction('rejected')}
                  disabled={actionLoading.bulk}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading.bulk ? 'Đang xử lý...' : 'Từ chối hàng loạt'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedJobs.length === jobs.length && jobs.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 Rounded"
                  />
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Việc làm
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Công ty
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Trạng thái
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 hidden sm:table-cell">
                  Thống kê
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 hidden md:table-cell">
                  Hạn nộp
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.length > 0 ? (
                jobs.map((job) => {
                  const jobId = getJobId(job);
                  const isActionLoading = actionLoading[jobId];
                  
                  return (
                    <tr key={jobId} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(jobId)}
                          onChange={() => handleSelectJob(jobId)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {job.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatLocation(job.location)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatSalary(job.salary_min, job.salary_max)}
                          </div>
                          <div className="mt-1">{getJobTypeBadge(job.job_type || job.employment_type)}</div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{getCompanyName(job)}</div>
                        <div className="text-sm text-gray-500">{getRecruiterName(job)}</div>
                        <div className="text-xs text-gray-400">{getCategoryName(job)}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(job.status)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{job.application_count || 0} ứng tuyển</span>
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            <span>{job.views || 0} lượt xem</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {formatDate(job.application_deadline || job.deadline)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Xem chi tiết */}
                          <button
                            onClick={() => {
                              setSelectedJob(job);
                              setShowJobModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {job.status === 'pending' && (
                            <>
                              {/* Duyệt */}
                              <button
                                onClick={() => handleStatusChange(jobId, 'approved')}
                                disabled={isActionLoading}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Duyệt tin"
                              >
                                {isActionLoading ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              {/* Từ chối */}
                              <button
                                onClick={() => handleStatusChange(jobId, 'rejected')}
                                disabled={isActionLoading}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Từ chối"
                              >
                                {isActionLoading ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                          {(job.status === 'approved' || job.status === 'active') && (
                            <button
                              onClick={() => handleStatusChange(jobId, 'rejected')}
                              disabled={isActionLoading}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Gỡ bỏ tin"
                            >
                              {isActionLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          )}
                          {job.status === 'rejected' && (
                            <button
                              onClick={() => handleStatusChange(jobId, 'approved')}
                              disabled={isActionLoading}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Khôi phục tin"
                            >
                              {isActionLoading ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6" />
                      </svg>
                      <p className="text-lg font-medium">Chưa có việc làm nào</p>
                      <p className="text-sm">Hệ thống chưa có tin tuyển dụng</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 sm:px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button 
              onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
              disabled={filters.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Trước
            </button>
            <button 
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={!pagination.hasNext}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">{((filters.page - 1) * filters.limit) + 1}</span> đến{' '}
                <span className="font-medium">{Math.min(filters.page * filters.limit, totalJobs)}</span> trong{' '}
                <span className="font-medium">{totalJobs}</span> kết quả
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button 
                  onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                  disabled={filters.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {pagination.totalPages && [...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                  const pageNumber = Math.max(1, filters.page - 2) + index;
                  if (pageNumber > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                        pageNumber === filters.page
                          ? 'bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={!pagination.hasNext}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Job Detail Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết việc làm</h3>
              <button
                onClick={() => setShowJobModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Job Title and Status */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                    <p className="text-sm text-gray-600">{getCompanyName(selectedJob)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(selectedJob.status)}
                    {getJobTypeBadge(selectedJob.job_type || selectedJob.employment_type)}
                  </div>
                </div>
              </div>

              {/* Job Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nhà tuyển dụng</label>
                  <p className="mt-1 text-sm text-gray-900">{getRecruiterName(selectedJob)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Danh mục</label>
                  <p className="mt-1 text-sm text-gray-900">{getCategoryName(selectedJob)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mức lương</label>
                  <p className="mt-1 text-sm text-gray-900">{formatSalary(selectedJob.salary_min, selectedJob.salary_max)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Địa điểm</label>
                  <p className="mt-1 text-sm text-gray-900">{formatLocation(selectedJob.location)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hạn nộp hồ sơ</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedJob.application_deadline || selectedJob.deadline)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày đăng</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedJob.created_at)}</p>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedJob.application_count || 0}</p>
                  <p className="text-sm text-gray-600">Đơn ứng tuyển</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedJob.views || 0}</p>
                  <p className="text-sm text-gray-600">Lượt xem</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{selectedJob.experience_required || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Kinh nghiệm</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{selectedJob.vacancies || 1}</p>
                  <p className="text-sm text-gray-600">Vị trí tuyển</p>
                </div>
              </div>

              {/* Description */}
              {selectedJob.description && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Mô tả công việc</h4>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedJob.description}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedJob.requirements && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Yêu cầu</h4>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedJob.requirements}
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Kỹ năng yêu cầu</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {typeof skill === 'object' ? skill.name : skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                {selectedJob.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusChange(getJobId(selectedJob), 'approved');
                        setShowJobModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(getJobId(selectedJob), 'rejected');
                        setShowJobModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                    >
                      Từ chối
                    </button>
                  </>
                )}
                {(selectedJob.status === 'approved' || selectedJob.status === 'active') && (
                  <button
                    onClick={() => {
                      handleStatusChange(getJobId(selectedJob), 'rejected');
                      setShowJobModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    Gỡ bỏ
                  </button>
                )}
                {selectedJob.status === 'rejected' && (
                  <button
                    onClick={() => {
                      handleStatusChange(getJobId(selectedJob), 'approved');
                      setShowJobModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                  >
                    Khôi phục
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsManagement;