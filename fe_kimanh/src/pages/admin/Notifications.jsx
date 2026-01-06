import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import adminService from '../../services/adminService';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({
    form: false,
    delete: {},
    send: {}
  });
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: '',
    target: '',
    scheduledAt: ''
  });

  const notificationTypes = {
    system: { label: 'Hệ thống', color: 'bg-blue-100 text-blue-800' },
    system_announcement: { label: 'Thông báo hệ thống', color: 'bg-blue-100 text-blue-800' },
    feature: { label: 'Tính năng', color: 'bg-green-100 text-green-800' },
    promotion: { label: 'Khuyến mãi', color: 'bg-purple-100 text-purple-800' },
    warning: { label: 'Cảnh báo', color: 'bg-yellow-100 text-yellow-800' },
    urgent: { label: 'Khẩn cấp', color: 'bg-red-100 text-red-800' },
    application_update: { label: 'Cập nhật đơn ứng tuyển', color: 'bg-indigo-100 text-indigo-800' },
    interview_reminder: { label: 'Nhắc lịch phỏng vấn', color: 'bg-cyan-100 text-cyan-800' },
    job_recommendation: { label: 'Gợi ý việc làm', color: 'bg-teal-100 text-teal-800' },
    payment_reminder: { label: 'Nhắc thanh toán', color: 'bg-orange-100 text-orange-800' }
  };

  const targetOptions = {
    all: 'Tất cả người dùng',
    candidates: 'Ứng viên',
    recruiters: 'Nhà tuyển dụng',
    premium: 'Người dùng Premium'
  };

  const statusTypes = {
    draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-800' },
    scheduled: { label: 'Đã lên lịch', color: 'bg-yellow-100 text-yellow-800' },
    sent: { label: 'Đã gửi', color: 'bg-green-100 text-green-800' },
    failed: { label: 'Thất bại', color: 'bg-red-100 text-red-800' }
  };

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await adminService.getNotifications();

      if (response.data) {
        setNotifications(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(prev => ({ ...prev, form: true }));
      
      const submitData = {
        ...formData,
        scheduled_at: formData.scheduledAt || null
      };
      
      if (editingNotification) {
        const response = await adminService.updateNotification(
          getNotificationId(editingNotification), 
          submitData
        );
        
        if (response?.success || response?.data?.success) {
          toast.success('Cập nhật thông báo thành công');
          setIsModalOpen(false);
          fetchNotifications();
          setFormData({ title: '', message: '', type: '', target: '', scheduledAt: '' });
        }
      } else {
        const response = await adminService.createNotification(submitData);
        
        if (response?.success || response?.data?.success) {
          toast.success('Tạo thông báo thành công');
          setIsModalOpen(false);
          fetchNotifications();
          setFormData({ title: '', message: '', type: '', target: '', scheduledAt: '' });
        }
      }
    } catch (error) {
      console.error('Error saving notification:', error);
      toast.error('Không thể lưu thông báo');
    } finally {
      setActionLoading(prev => ({ ...prev, form: false }));
    }
  };

  // Helper functions for data mapping
  const getNotificationId = (notification) => notification._id || notification.id;
  const getNotificationTitle = (notification) => notification.title;
  const getNotificationMessage = (notification) => notification.message || notification.content;
  const getNotificationType = (notification) => notification.type;
  const getNotificationTarget = (notification) => notification.target || notification.target_audience;
  const getNotificationStatus = (notification) => notification.status;
  const getNotificationCreatedAt = (notification) => {
    const date = notification.created_at || notification.createdAt || notification.createdDate;
    return date ? new Date(date).toLocaleDateString('vi-VN') : '';
  };
  const getNotificationSentAt = (notification) => {
    const date = notification.sent_at || notification.sentAt || notification.sentDate;
    return date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa gửi';
  };
  const getRecipientCount = (notification) => notification.recipient_count || notification.recipientCount || 0;

  const handleEdit = (notification) => {
    setEditingNotification(notification);
    setFormData({
      title: getNotificationTitle(notification),
      message: getNotificationMessage(notification),
      type: getNotificationType(notification),
      target: getNotificationTarget(notification),
      scheduledAt: notification.scheduled_at || notification.scheduledAt || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (notificationId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      try {
        setActionLoading(prev => ({ ...prev, delete: { ...prev.delete, [notificationId]: true } }));
        
        const response = await adminService.deleteNotification(notificationId);
        
        if (response?.success || response?.data?.success) {
          toast.success('Xóa thông báo thành công');
          fetchNotifications();
        } else {
          throw new Error('Failed to delete notification');
        }
      } catch (error) {
        console.error('Error deleting notification:', error);
        toast.error('Không thể xóa thông báo');
      } finally {
        setActionLoading(prev => ({ ...prev, delete: { ...prev.delete, [notificationId]: false } }));
      }
    }
  };

  const handleSend = async (notificationId) => {
    if (window.confirm('Bạn có chắc chắn muốn gửi thông báo này?')) {
      try {
        setActionLoading(prev => ({ ...prev, send: { ...prev.send, [notificationId]: true } }));
        
        const response = await adminService.sendNotification(notificationId);
        
        if (response?.success || response?.data?.success) {
          toast.success('Gửi thông báo thành công');
          fetchNotifications();
        } else {
          throw new Error('Failed to send notification');
        }
      } catch (error) {
        console.error('Error sending notification:', error);
        toast.error('Không thể gửi thông báo');
      } finally {
        setActionLoading(prev => ({ ...prev, send: { ...prev.send, [notificationId]: false } }));
      }
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(notif => getNotificationStatus(notif) === filter);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý thông báo</h1>
        <button
          onClick={() => {
            setEditingNotification(null);
            setFormData({ title: '', message: '', type: '', target: '', scheduledAt: '' });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Tạo thông báo
        </button>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l10.586 10.586c.781.781 2.047.781 2.828 0l.586-.586c.781-.781.781-2.047 0-2.828L8.242 4.828c-.781-.781-2.047-.781-2.828 0l-.586.586c-.781.781-.781 2.047 0 2.828z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng thông báo</p>
              <p className="text-2xl font-semibold text-gray-900">{notifications.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Đã gửi</p>
              <p className="text-2xl font-semibold text-gray-900">
                {notifications.filter(n => getNotificationStatus(n) === 'sent').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Đã lên lịch</p>
              <p className="text-2xl font-semibold text-gray-900">
                {notifications.filter(n => getNotificationStatus(n) === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng người nhận</p>
              <p className="text-2xl font-semibold text-gray-900">
                {notifications.reduce((sum, n) => sum + getRecipientCount(n), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Danh sách thông báo</h3>
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tất cả</option>
                <option value="draft">Nháp</option>
                <option value="scheduled">Đã lên lịch</option>
                <option value="sent">Đã gửi</option>
                <option value="failed">Thất bại</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Đang tải thông báo...</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiêu đề
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đối tượng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người nhận
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Không có thông báo nào
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notification) => (
                  <tr key={getNotificationId(notification)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{getNotificationTitle(notification)}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {getNotificationMessage(notification)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${notificationTypes[getNotificationType(notification)]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {notificationTypes[getNotificationType(notification)]?.label || getNotificationType(notification)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {targetOptions[getNotificationTarget(notification)] || getNotificationTarget(notification)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getRecipientCount(notification)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getNotificationCreatedAt(notification)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusTypes[getNotificationStatus(notification)]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {statusTypes[getNotificationStatus(notification)]?.label || getNotificationStatus(notification)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        {/* Sửa */}
                        <button
                          onClick={() => handleEdit(notification)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Sửa thông báo"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Gửi ngay */}
                        {(getNotificationStatus(notification) === 'draft' || getNotificationStatus(notification) === 'scheduled') && (
                          <button
                            onClick={() => handleSend(getNotificationId(notification))}
                            disabled={actionLoading.send[getNotificationId(notification)]}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Gửi thông báo"
                          >
                            {actionLoading.send[getNotificationId(notification)] ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            )}
                          </button>
                        )}
                        {/* Xóa */}
                        <button
                          onClick={() => handleDelete(getNotificationId(notification))}
                          disabled={actionLoading.delete[getNotificationId(notification)]}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Xóa thông báo"
                        >
                          {actionLoading.delete[getNotificationId(notification)] ? (
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Modal thêm/sửa thông báo */}
      {isModalOpen && (
        <div className="fixed inset-0   bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingNotification ? 'Sửa thông báo' : 'Tạo thông báo mới'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại thông báo
                    </label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Chọn loại thông báo</option>
                      {Object.entries(notificationTypes).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Đối tượng
                    </label>
                    <select 
                      value={formData.target}
                      onChange={(e) => setFormData({...formData, target: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Chọn đối tượng</option>
                      {Object.entries(targetOptions).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nội dung thông báo
                  </label>
                  <textarea
                    rows="4"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lên lịch gửi (tùy chọn)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading.form}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading.form 
                      ? (editingNotification ? 'Đang cập nhật...' : 'Đang tạo...') 
                      : (editingNotification ? 'Cập nhật' : 'Tạo thông báo')
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
