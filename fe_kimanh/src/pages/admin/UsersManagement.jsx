import adminService from '@/services/adminService';
import {useEffect, useState} from 'react';
import {toast} from 'react-toastify';
import {formatLocation} from '@/utils/formatters';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    page: 1,
    limit: 10
  });
  const [totalUsers, setTotalUsers] = useState(0);
  const [pagination, setPagination] = useState({});
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    candidates: 0,
    recruiters: 0,
    inactive: 0
  });
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = {
        page: filters.page,
        limit: filters.limit
      };

      if (filters.search) params.search = filters.search;
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;

      const response = await adminService.getUsers(params);

      if (response.success) {
        setUsers(response.data || []);
        setTotalUsers(response?.total || 0);
        setPagination(response.pagination || {});

        // Use stats from backend response if available
        if (response.stats) {
          setStats({
            total: response.stats.total || 0,
            candidates: response.stats.candidates || 0,
            recruiters: response.stats.recruiters || 0,
            inactive: response.stats.inactive || 0
          });
        } else {
          // Fallback to calculating from current page (not accurate for pagination)
          const allUsers = response.data || [];
          setStats({
            total: response.total || allUsers.length,
            candidates: allUsers.filter(u => u.role === 'candidate').length,
            recruiters: allUsers.filter(u => u.role === 'recruiter').length,
            inactive: allUsers.filter(u => !u.is_active).length
          });
        }
      } else {
        throw new Error(response.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách người dùng');

      // Fallback to empty state
      setUsers([]);
      setTotalUsers(0);
      setStats({total: 0, candidates: 0, recruiters: 0, inactive: 0});
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus, reason = '') => {
    try {
      setActionLoading(prev => ({...prev, [userId]: true}));

      const statusText = newStatus ? 'approved' : 'suspended';
      const response = await adminService.updateUserStatus(userId, {
        status: statusText,
        reason: reason || (newStatus ? 'Tài khoản được kích hoạt bởi admin' : 'Tài khoản bị khóa bởi admin')
      });

      if (response.success) {
        setUsers(users.map(user =>
          user._id === userId || user.id === userId
            ? {...user, is_active: newStatus, account_status: statusText}
            : user
        ));
        toast.success(`${newStatus ? 'Kích hoạt' : 'Khóa'} tài khoản thành công`);
      } else {
        throw new Error(response.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Không thể cập nhật trạng thái tài khoản');
    } finally {
      setActionLoading(prev => ({...prev, [userId]: false}));
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setFilters({...filters, search: value, page: 1});
  };

  const handleFilterChange = (key, value) => {
    setFilters({...filters, [key]: value, page: 1});
  };

  const handlePageChange = (newPage) => {
    setFilters({...filters, page: newPage});
  };

  const handleExportUsers = async () => {
    try {
      const reportDate = new Date().toLocaleDateString('vi-VN');

      // Summary section
      const summaryHeaders = ['Thông tin báo cáo', 'Giá trị'];
      const summaryRows = [
        ['Ngày xuất báo cáo', reportDate],
        ['Tổng người dùng', totalUsers],
        ['Ứng viên', stats.candidates],
        ['Nhà tuyển dụng', stats.recruiters],
        ['Tài khoản bị khóa', stats.inactive]
      ];

      // Details section
      const headers = ['STT', 'Họ tên', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tạo', 'Lần đăng nhập cuối'];
      const rows = users.map((user, index) => [
        index + 1,
        getUserDisplayName(user),
        user.email || '',
        user.role === 'candidate' ? 'Ứng viên' :
          user.role === 'recruiter' ? 'Nhà tuyển dụng' :
            user.role === 'admin' ? 'Quản trị viên' : user.role,
        user.is_active ? 'Hoạt động' : 'Bị khóa',
        formatDate(user.created_at),
        user.last_login ? formatDate(user.last_login) : 'Chưa đăng nhập'
      ]);

      const BOM = '\uFEFF';
      const csvContent = BOM +
        'BÁO CÁO NGƯỜI DÙNG\n\n' +
        [summaryHeaders, ...summaryRows].map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n') +
        '\n\nCHI TIẾT NGƯỜI DÙNG\n' +
        [headers, ...rows].map(row =>
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

      const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao_cao_nguoi_dung_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Xuất báo cáo Excel thành công');
    } catch (error) {
      console.error('Error exporting users:', error);
      toast.error('Không thể xuất dữ liệu người dùng');
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === users.length
        ? []
        : users.map(user => user._id || user.id)
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một người dùng');
      return;
    }

    const confirmMessage = action === 'suspend'
      ? `Bạn có chắc muốn khóa ${selectedUsers.length} tài khoản đã chọn?`
      : `Bạn có chắc muốn kích hoạt ${selectedUsers.length} tài khoản đã chọn?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(prev => ({...prev, bulk: true}));

      const promises = selectedUsers.map(userId =>
        adminService.updateUserStatus(userId, {
          status: action === 'suspend' ? 'suspended' : 'approved',
          reason: action === 'suspend' ? 'Khóa hàng loạt bởi admin' : 'Kích hoạt hàng loạt bởi admin'
        })
      );

      await Promise.all(promises);

      // Update local state
      setUsers(users.map(user => {
        const userId = user._id || user.id;
        if (selectedUsers.includes(userId)) {
          return {
            ...user,
            is_active: action !== 'suspend',
            account_status: action === 'suspend' ? 'suspended' : 'approved'
          };
        }
        return user;
      }));

      setSelectedUsers([]);
      toast.success(`${action === 'suspend' ? 'Khóa' : 'Kích hoạt'} ${selectedUsers.length} tài khoản thành công`);
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast.error('Có lỗi xảy ra khi thực hiện thao tác hàng loạt');
    } finally {
      setActionLoading(prev => ({...prev, bulk: false}));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserDisplayName = (user) => {
    return user.full_name || user.first_name + ' ' + user.last_name || user.email || 'N/A';
  };

  const getUserId = (user) => {
    return user._id || user.id;
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-100 text-red-800',
      recruiter: 'bg-green-100 text-green-800',
      candidate: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      admin: 'Quản trị viên',
      recruiter: 'Nhà tuyển dụng',
      candidate: 'Ứng viên'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const getStatusBadge = (isActive) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
      {isActive ? 'Hoạt động' : 'Bị khóa'}
    </span>
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="mt-1 text-gray-600">Quản lý tài khoản và quyền truy cập của người dùng</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleExportUsers}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Xuất dữ liệu
          </button>
        </div>
      </div>



      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Tổng người dùng</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{stats.candidates}</div>
          <div className="text-sm text-gray-600">Ứng viên</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.recruiters}</div>
          <div className="text-sm text-gray-600">Nhà tuyển dụng</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          <div className="text-sm text-gray-600">Tài khoản bị khóa</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Danh sách người dùng ({totalUsers})
            </h3>
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Đã chọn {selectedUsers.length} người dùng
                </span>
                <button
                  onClick={() => handleBulkAction('suspend')}
                  disabled={actionLoading.bulk}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading.bulk ? 'Đang xử lý...' : 'Khóa tài khoản'}
                </button>
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={actionLoading.bulk}
                  className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading.bulk ? 'Đang xử lý...' : 'Kích hoạt'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vai trò
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
              {users.map((user) => {
                const userId = getUserId(user);
                const displayName = getUserDisplayName(user);
                const isLoading = actionLoading[userId];

                return (
                  <tr key={userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(userId)}
                        onChange={() => handleSelectUser(userId)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-primary-600 font-semibold text-sm">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{displayName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.candidate_profile?.phone && (
                            <div className="text-xs text-gray-400">{user.candidate_profile.phone}</div>
                          )}
                          {user.recruiter_profile?.phone && (
                            <div className="text-xs text-gray-400">{user.recruiter_profile.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                      {user.recruiter_profile?.company_name && (
                        <div className="text-xs text-gray-500 mt-1">
                          {user.recruiter_profile.company_name}
                        </div>
                      )}
                      {user.candidate_profile?.location && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatLocation(user.candidate_profile.location)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.is_active)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Khóa/Mở khóa */}
                        <button
                          onClick={() => handleStatusChange(userId, !user.is_active)}
                          disabled={isLoading}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${user.is_active
                            ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                          title={user.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {isLoading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : user.is_active ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                <span className="font-medium">
                  {Math.min(filters.page * filters.limit, totalUsers)}
                </span> trong{' '}
                <span className="font-medium">{totalUsers}</span> kết quả
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
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${pageNumber === filters.page
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

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-md overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Chi tiết người dùng</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên hiển thị</label>
                  <p className="mt-1 text-sm text-gray-900">{getUserDisplayName(selectedUser)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vai trò</label>
                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                  <div className="mt-1">{getStatusBadge(selectedUser.is_active)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày tạo</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedUser.created_at)}</p>
                </div>

              </div>

              {selectedUser.candidate_profile && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Thông tin ứng viên</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.candidate_profile.phone || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                      <p className="mt-1 text-sm text-gray-900">{formatLocation(selectedUser.candidate_profile.location)}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedUser.recruiter_profile && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Thông tin nhà tuyển dụng</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tên công ty</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.recruiter_profile.company_name || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedUser.recruiter_profile.phone || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    const userId = getUserId(selectedUser);
                    handleStatusChange(userId, !selectedUser.is_active);
                    setShowUserModal(false);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium text-white ${selectedUser.is_active
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  {selectedUser.is_active ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
