import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';

const ReportsManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    type: '',
    page: 1,
    limit: 10
  });
  const [totalReports, setTotalReports] = useState(0);
  const [selectedReports, setSelectedReports] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Add filters to params
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.type) params.type = filters.type;
      if (filters.search) params.search = filters.search;
      
      const response = await adminService.getReports(params);
      
      if (response.data) {
        const reportsData = response.data || [];
        setReports(reportsData);
        setTotalReports(reportsData.length);
      } else {
        throw new Error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Không thể tải danh sách báo cáo');
      setReports([]);
      setTotalReports(0);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reportId, newStatus, notes = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [reportId]: true }));
      
      const response = await adminService.updateReportStatus(reportId, {
        status: newStatus,
        admin_notes: notes
      });
      
      if (response.data?.success) {
        // Update local state
        setReports(reports.map(report => 
          report._id === reportId || report.id === reportId
            ? { 
                ...report, 
                status: newStatus,
                resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
                admin_notes: notes || report.admin_notes
              } 
            : report
        ));
        
        const statusLabels = {
          pending: 'chờ xử lý',
          investigating: 'đang điều tra',
          resolved: 'đã giải quyết',
          dismissed: 'đã bác bỏ'
        };
        
        toast.success(`Đã cập nhật báo cáo thành ${statusLabels[newStatus]}`);
      } else {
        throw new Error('Failed to update report status');
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Không thể cập nhật trạng thái báo cáo');
    } finally {
      setActionLoading(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handleSelectReport = (reportId) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    setSelectedReports(
      selectedReports.length === reports.length 
        ? [] 
        : reports.map(report => report._id || report.id)
    );
  };

  const handleExportReports = async () => {
    try {
      const reportDate = new Date().toLocaleDateString('vi-VN');
      
      // Summary section
      const summaryHeaders = ['Thông tin báo cáo', 'Giá trị'];
      const summaryRows = [
        ['Ngày xuất báo cáo', reportDate],
        ['Tổng báo cáo', totalReports],
        ['Chờ xử lý', reports.filter(r => r.status === 'pending').length],
        ['Đang điều tra', reports.filter(r => r.status === 'investigating').length],
        ['Đã giải quyết', reports.filter(r => r.status === 'resolved').length],
        ['Đã bác bỏ', reports.filter(r => r.status === 'dismissed').length]
      ];
      
      // Details section
      const headers = ['STT', 'Tiêu đề', 'Loại vi phạm', 'Mức độ', 'Người báo cáo', 'Đối tượng bị báo cáo', 'Trạng thái', 'Ngày tạo'];
      const rows = reports.map((report, index) => {
        const reporterInfo = getReporterInfo(report);
        const reportedUserInfo = getReportedUserInfo(report);
        return [
          index + 1,
          report.title || '',
          (report.type || report.report_type) === 'job_content' ? 'Nội dung việc làm' :
          (report.type || report.report_type) === 'spam' ? 'Spam' :
          (report.type || report.report_type) === 'harassment' ? 'Quấy rối' :
          (report.type || report.report_type) === 'fraud' ? 'Lừa đảo' : 'Khác',
          report.priority === 'urgent' ? 'Khẩn cấp' :
          report.priority === 'high' ? 'Cao' :
          report.priority === 'medium' ? 'Trung bình' : 'Thấp',
          reporterInfo.name,
          reportedUserInfo.name,
          report.status === 'pending' ? 'Chờ xử lý' :
          report.status === 'investigating' ? 'Đang điều tra' :
          report.status === 'resolved' ? 'Đã giải quyết' : 'Đã bác bỏ',
          formatDate(report.created_at)
        ];
      });
      
      const BOM = '\uFEFF';
      const csvContent = BOM + 
        'BÁO CÁO VI PHẠM\n\n' +
        [summaryHeaders, ...summaryRows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nCHI TIẾT BÁO CÁO\n' +
        [headers, ...rows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao_cao_vi_pham_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Xuất báo cáo Excel thành công');
    } catch (error) {
      console.error('Error exporting reports:', error);
      toast.error('Không thể xuất báo cáo');
    }
  };

  const handleShowStats = () => {
    const stats = {
      total: reports.length,
      byStatus: {
        pending: reports.filter(r => r.status === 'pending').length,
        investigating: reports.filter(r => r.status === 'investigating').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
        dismissed: reports.filter(r => r.status === 'dismissed').length
      },
      byPriority: {
        urgent: reports.filter(r => r.priority === 'urgent').length,
        high: reports.filter(r => r.priority === 'high').length,
        medium: reports.filter(r => r.priority === 'medium').length,
        low: reports.filter(r => r.priority === 'low').length
      },
      byType: {
        job_content: reports.filter(r => (r.type || r.report_type) === 'job_content').length,
        spam: reports.filter(r => (r.type || r.report_type) === 'spam').length,
        harassment: reports.filter(r => (r.type || r.report_type) === 'harassment').length,
        fraud: reports.filter(r => (r.type || r.report_type) === 'fraud').length,
        other: reports.filter(r => (r.type || r.report_type) === 'other').length
      }
    };
    
    toast.info(`Thống kê vi phạm:\n- Tổng: ${stats.total}\n- Chờ xử lý: ${stats.byStatus.pending}\n- Đang điều tra: ${stats.byStatus.investigating}\n- Đã giải quyết: ${stats.byStatus.resolved}`, {
      autoClose: 5000
    });
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedReports.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một báo cáo');
      return;
    }

    const statusLabels = {
      investigating: 'đang xử lý',
      resolved: 'đã giải quyết',
      dismissed: 'bác bỏ'
    };

    if (!window.confirm(`Bạn có chắc muốn đánh dấu ${selectedReports.length} báo cáo là "${statusLabels[newStatus]}"?`)) return;

    try {
      setActionLoading(prev => ({ ...prev, bulk: true }));
      
      const promises = selectedReports.map(reportId => 
        adminService.updateReportStatus(reportId, { status: newStatus })
      );

      await Promise.all(promises);
      
      setReports(reports.map(report => {
        const reportId = getReportId(report);
        if (selectedReports.includes(reportId)) {
          return { ...report, status: newStatus };
        }
        return report;
      }));

      setSelectedReports([]);
      toast.success(`Đã cập nhật ${selectedReports.length} báo cáo thành công`);
    } catch (error) {
      console.error('Error in bulk status change:', error);
      toast.error('Có lỗi xảy ra khi cập nhật hàng loạt');
    } finally {
      setActionLoading(prev => ({ ...prev, bulk: false }));
    }
  };

  const getReportId = (report) => report._id || report.id;

  const getReporterInfo = (report) => {
    if (report.reporter_id && typeof report.reporter_id === 'object') {
      return {
        name: report.reporter_id.full_name || report.reporter_id.name || 'N/A',
        email: report.reporter_id.email || 'N/A',
        role: report.reporter_id.role || 'user'
      };
    }
    return report.reporter || {
      name: 'N/A',
      email: 'N/A', 
      role: 'user'
    };
  };

  const getReportedUserInfo = (report) => {
    if (report.reported_user_id && typeof report.reported_user_id === 'object') {
      return {
        name: report.reported_user_id.full_name || report.reported_user_id.name || 'N/A',
        email: report.reported_user_id.email || 'N/A',
        role: report.reported_user_id.role || 'user'
      };
    }
    return report.reported_user || {
      name: 'N/A',
      email: 'N/A',
      role: 'user'
    };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      investigating: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      dismissed: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      pending: 'Chờ xử lý',
      investigating: 'Đang điều tra',
      resolved: 'Đã giải quyết',
      dismissed: 'Đã bác bỏ'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
      urgent: 'bg-purple-100 text-purple-800'
    };
    
    const labels = {
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      urgent: 'Khẩn cấp'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const styles = {
      job_content: 'bg-blue-100 text-blue-800',
      spam: 'bg-orange-100 text-orange-800',
      harassment: 'bg-red-100 text-red-800',
      fraud: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      job_content: 'Nội dung việc làm',
      spam: 'Spam',
      harassment: 'Quấy rối',
      fraud: 'Lừa đảo',
      other: 'Khác'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý báo cáo & khiếu nại</h1>
          <p className="mt-1 text-gray-600">Xử lý các báo cáo vi phạm từ người dùng</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={handleExportReports}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Xuất báo cáo
          </button>
          <button 
            onClick={handleShowStats}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thống kê vi phạm
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tiêu đề, mô tả..."
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
              <option value="pending">Chờ xử lý</option>
              <option value="investigating">Đang điều tra</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="dismissed">Đã bác bỏ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mức độ ưu tiên
            </label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tất cả</option>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại vi phạm
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tất cả</option>
              <option value="job_content">Nội dung việc làm</option>
              <option value="spam">Spam</option>
              <option value="harassment">Quấy rối</option>
              <option value="fraud">Lừa đảo</option>
              <option value="other">Khác</option>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{totalReports}</div>
          <div className="text-sm text-gray-600">Tổng báo cáo</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {reports.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Chờ xử lý</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {reports.filter(r => r.status === 'investigating').length}
          </div>
          <div className="text-sm text-gray-600">Đang điều tra</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">
            {reports.filter(r => r.priority === 'high' || r.priority === 'urgent').length}
          </div>
          <div className="text-sm text-gray-600">Ưu tiên cao</div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-medium text-gray-900 mb-2 sm:mb-0">
              Danh sách báo cáo ({totalReports})
            </h3>
            {selectedReports.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <span className="text-sm text-gray-600">
                  Đã chọn {selectedReports.length} báo cáo
                </span>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleBulkStatusChange('investigating')}
                    disabled={actionLoading.bulk}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading.bulk ? 'Đang xử lý...' : 'Đánh dấu đang xử lý'}
                  </button>
                  <button 
                    onClick={() => handleBulkStatusChange('resolved')}
                    disabled={actionLoading.bulk}
                    className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading.bulk ? 'Đang xử lý...' : 'Đánh dấu đã giải quyết'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedReports.length === reports.length && reports.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Báo cáo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người báo cáo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đối tượng bị báo cáo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.length > 0 ? (
                reports.map((report) => {
                  const reportId = getReportId(report);
                  const isActionLoading = actionLoading[reportId];
                  const reporterInfo = getReporterInfo(report);
                  const reportedUserInfo = getReportedUserInfo(report);
                  
                  return (
                    <tr key={reportId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(reportId)}
                          onChange={() => handleSelectReport(reportId)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {report.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {report.description}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            {getTypeBadge(report.type || report.report_type)}
                            {getPriorityBadge(report.priority)}
                          </div>
                          {(report.evidence_files?.length > 0 || report.attachments?.length > 0) && (
                            <div className="flex items-center mt-1 text-xs text-gray-400">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              {(report.evidence_files?.length || report.attachments?.length || 0)} tệp đính kèm
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{reporterInfo.name}</div>
                        <div className="text-sm text-gray-500">{reporterInfo.email}</div>
                        <div className="text-xs text-gray-400 capitalize">{reporterInfo.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{reportedUserInfo.name}</div>
                        <div className="text-sm text-gray-500">{reportedUserInfo.email}</div>
                        <div className="text-xs text-gray-400 capitalize">{reportedUserInfo.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                        {report.resolved_at && (
                          <div className="text-xs text-gray-400 mt-1">
                            Giải quyết: {formatDate(report.resolved_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Xem chi tiết */}
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowReportModal(true);
                            }}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          
                          {report.status === 'pending' && (
                            <>
                              {/* Điều tra */}
                              <button
                                onClick={() => handleStatusChange(reportId, 'investigating')}
                                disabled={isActionLoading}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Bắt đầu điều tra"
                              >
                                {isActionLoading ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                )}
                              </button>
                              {/* Bác bỏ */}
                              <button
                                onClick={() => handleStatusChange(reportId, 'dismissed')}
                                disabled={isActionLoading}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Bác bỏ báo cáo"
                              >
                                {isActionLoading ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                          
                          {report.status === 'investigating' && (
                            <>
                              {/* Giải quyết */}
                              <button
                                onClick={() => handleStatusChange(reportId, 'resolved')}
                                disabled={isActionLoading}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Đánh dấu đã giải quyết"
                              >
                                {isActionLoading ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                              {/* Bác bỏ */}
                              <button
                                onClick={() => handleStatusChange(reportId, 'dismissed')}
                                disabled={isActionLoading}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Bác bỏ báo cáo"
                              >
                                {isActionLoading ? (
                                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                          
                          {(report.status === 'resolved' || report.status === 'dismissed') && (
                            <button
                              onClick={() => handleStatusChange(reportId, 'investigating')}
                              disabled={isActionLoading}
                              className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Mở lại báo cáo"
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">Chưa có báo cáo nào</p>
                      <p className="text-sm">Hệ thống chưa nhận được báo cáo vi phạm</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {reports.length > 0 ? (
            reports.map((report) => {
              const reportId = getReportId(report);
              const isActionLoading = actionLoading[reportId];
              const reporterInfo = getReporterInfo(report);
              const reportedUserInfo = getReportedUserInfo(report);
              
              return (
                <div key={reportId} className="border-b border-gray-200 p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedReports.includes(reportId)}
                        onChange={() => handleSelectReport(reportId)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {report.title}
                        </h4>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {getTypeBadge(report.type || report.report_type)}
                    {getPriorityBadge(report.priority)}
                    {(report.evidence_files?.length > 0 || report.attachments?.length > 0) && (
                      <span className="inline-flex items-center text-xs text-gray-400">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {(report.evidence_files?.length || report.attachments?.length || 0)} tệp
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <div className="text-gray-500">Người báo cáo:</div>
                      <div className="font-medium">{reporterInfo.name}</div>
                      <div className="text-xs text-gray-400">{reporterInfo.email}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Bị báo cáo:</div>
                      <div className="font-medium">{reportedUserInfo.name}</div>
                      <div className="text-xs text-gray-400">{reportedUserInfo.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {formatDate(report.created_at)}
                    </span>
                    <div className="flex items-center space-x-1">
                      {/* Xem chi tiết */}
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setShowReportModal(true);
                        }}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      
                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(reportId, 'investigating')}
                            disabled={isActionLoading}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Bắt đầu điều tra"
                          >
                            {isActionLoading ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleStatusChange(reportId, 'dismissed')}
                            disabled={isActionLoading}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Bác bỏ"
                          >
                            {isActionLoading ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                      
                      {report.status === 'investigating' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(reportId, 'resolved')}
                            disabled={isActionLoading}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Giải quyết"
                          >
                            {isActionLoading ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleStatusChange(reportId, 'dismissed')}
                            disabled={isActionLoading}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            title="Bác bỏ"
                          >
                            {isActionLoading ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            )}
                          </button>
                        </>
                      )}
                      
                      {(report.status === 'resolved' || report.status === 'dismissed') && (
                        <button
                          onClick={() => handleStatusChange(reportId, 'investigating')}
                          disabled={isActionLoading}
                          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Mở lại"
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
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">Chưa có báo cáo nào</p>
                <p className="text-sm">Hệ thống chưa nhận được báo cáo vi phạm</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between items-center sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Trước
            </button>
            <span className="text-sm text-gray-700">
              Trang 1 của 1
            </span>
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị <span className="font-medium">1</span> đến{' '}
                <span className="font-medium">{reports.length}</span> trong{' '}
                <span className="font-medium">{totalReports}</span> kết quả
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết báo cáo</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Report Header */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedReport.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">ID: {getReportId(selectedReport)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(selectedReport.status)}
                    {getPriorityBadge(selectedReport.priority)}
                  </div>
                </div>
              </div>

              {/* Report Type */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Loại vi phạm:</span>
                {getTypeBadge(selectedReport.type || selectedReport.report_type)}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả chi tiết</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {selectedReport.description}
                  </p>
                </div>
              </div>

              {/* Reporter & Reported User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Người báo cáo</h4>
                  <div className="space-y-1">
                    <p className="text-sm"><span className="text-gray-600">Tên:</span> {getReporterInfo(selectedReport).name}</p>
                    <p className="text-sm"><span className="text-gray-600">Email:</span> {getReporterInfo(selectedReport).email}</p>
                    <p className="text-sm"><span className="text-gray-600">Vai trò:</span> {getReporterInfo(selectedReport).role}</p>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">Đối tượng bị báo cáo</h4>
                  <div className="space-y-1">
                    <p className="text-sm"><span className="text-gray-600">Tên:</span> {getReportedUserInfo(selectedReport).name}</p>
                    <p className="text-sm"><span className="text-gray-600">Email:</span> {getReportedUserInfo(selectedReport).email}</p>
                    <p className="text-sm"><span className="text-gray-600">Vai trò:</span> {getReportedUserInfo(selectedReport).role}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày tạo</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.created_at)}</p>
                </div>
                {selectedReport.resolved_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày giải quyết</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.resolved_at)}</p>
                  </div>
                )}
                {selectedReport.updated_at && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cập nhật lần cuối</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReport.updated_at)}</p>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              {selectedReport.admin_notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú của Admin</label>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedReport.admin_notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Evidence Files */}
              {(selectedReport.evidence_files?.length > 0 || selectedReport.attachments?.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tệp đính kèm</label>
                  <div className="flex flex-wrap gap-2">
                    {(selectedReport.evidence_files || selectedReport.attachments || []).map((file, index) => (
                      <a
                        key={index}
                        href={typeof file === 'string' ? file : file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {typeof file === 'string' ? `Tệp ${index + 1}` : file.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                
                {selectedReport.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusChange(getReportId(selectedReport), 'investigating');
                        setShowReportModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Bắt đầu điều tra
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(getReportId(selectedReport), 'dismissed');
                        setShowReportModal(false);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                    >
                      Bác bỏ
                    </button>
                  </>
                )}
                
                {selectedReport.status === 'investigating' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusChange(getReportId(selectedReport), 'resolved');
                        setShowReportModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Đánh dấu đã giải quyết
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(getReportId(selectedReport), 'dismissed');
                        setShowReportModal(false);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                    >
                      Bác bỏ
                    </button>
                  </>
                )}
                
                {(selectedReport.status === 'resolved' || selectedReport.status === 'dismissed') && (
                  <button
                    onClick={() => {
                      handleStatusChange(getReportId(selectedReport), 'investigating');
                      setShowReportModal(false);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700"
                  >
                    Mở lại báo cáo
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

export default ReportsManagement;
