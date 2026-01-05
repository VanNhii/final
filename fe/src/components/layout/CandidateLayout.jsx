import candidateService from '@/services/candidateService';
import uploadService from '@/services/uploadService';
import { logout, updateUserData } from '@/store/slices/authSlice';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Navigation configuration for candidate
const navigationConfig = [
  {
    name: 'Dashboard',
    href: '/candidate/dashboard',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z',
  },
  {
    name: 'Tìm việc làm',
    href: '/candidate/jobs',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 00-2 2H10a2 2 0 00-2-2V4',
  },
  {
    name: 'Việc làm gợi ý',
    href: '/candidate/recommended-jobs',
    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
  {
    name: 'Đơn ứng tuyển',
    href: '/candidate/applications',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    name: 'Lịch phỏng vấn',
    href: '/candidate/interviews',
    icon: 'M8 7V3a4 4 0 118 0v4a1 1 0 102 0V3a6 6 0 10-12 0v4a3 3 0 00-3 3v8a3 3 0 003 3h8a3 3 0 003-3v-8a3 3 0 00-3-3z',
  },
  {
    name: 'Tin nhắn',
    href: '/candidate/messages',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    name: 'AI Chat',
    href: '/candidate/ai-chat',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
  {
    name: 'Hồ sơ cá nhân',
    href: '/candidate/profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
];

// Icon component for reusability
const Icon = ({ paths, className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {Array.isArray(paths) ? paths.map((path, index) => (
      <path key={index} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    )) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths} />
    )}
  </svg>
);

// Navigation item component
const NavigationItem = ({ item, isActive, isCollapsed, onClick }) => {
  const baseClasses = "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200";
  const activeClasses = isActive 
    ? "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 border-l-4 border-blue-600 shadow-md" 
    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm";
  
  return (
    <Link
      to={item.href}
      className={`${baseClasses} ${activeClasses} ${isCollapsed ? 'justify-center px-3' : ''}`}
      title={isCollapsed ? item.name : ''}
      onClick={onClick}
    >
      <Icon 
        paths={item.icon} 
        className={`h-6 w-6 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-blue-700 stroke-[2.5]' : 'text-gray-500'}`} 
      />
      {!isCollapsed && <span className="truncate font-semibold">{item.name}</span>}
    </Link>
  );
};

// Sidebar component
const Sidebar = ({ navigation, location, isCollapsed, isMobileOpen, onMobileClose }) => {  
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        {/* Logo/Brand */}
        <div className={`flex items-center flex-shrink-0 px-4 mb-6 ${isCollapsed ? 'justify-center' : ''}`}>
          {isCollapsed ? (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">C</span>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg mr-3">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">JobPortal</h1>
                <p className="text-xs text-gray-500 font-medium">Ứng viên</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
                           (item.href !== '/candidate/dashboard' && location.pathname.startsWith(item.href));
            return (
              <NavigationItem 
                key={item.name} 
                item={item} 
                isActive={isActive}
                isCollapsed={isCollapsed}
                onClick={onMobileClose}
              />
            );
          })}
        </nav>
      </div>
    </div>
  );
};

// Header component  
const Header = ({ onToggleSidebar, onMobileMenuToggle, isCollapsed, user, onLogout, onAvatarUpdate }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await candidateService.getNotifications({ limit: 10 });
      if (response.success && response.data) {
        const notificationsList = response.data.data || response.data;
        setNotifications(notificationsList);
        const unread = notificationsList.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await candidateService.getUnreadNotificationCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      // Silently fail if notification API is not available
      // console.error('Error fetching unread count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await candidateService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await candidateService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Không thể đánh dấu thông báo');
    }
  };

  // Load notifications on mount
  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    // Temporarily disabled until backend route is added
    // const interval = setInterval(fetchUnreadCount, 30000);
    // return () => clearInterval(interval);
  }, []);

  // Load full notifications when dropdown opens
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.relative')) {
        setShowNotifications(false);
      }
      if (showUserMenu && !event.target.closest('.relative')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showUserMenu]);

  // Handle avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await uploadService.uploadAvatar(file);
      
      if (response.success && response.data) {
        // Backend returns relative path like: /uploads/profile_avatar/filename.jpg
        const avatarUrl = response.data.file_url;
        
        // Save relative path to database (no CORS issues when loading from same origin)
        await candidateService.updateUserProfile(user._id, { avatar_url: avatarUrl });
        
        toast.success('Cập nhật ảnh đại diện thành công!');
        // Notify parent to refresh user data
        if (onAvatarUpdate) {
          onAvatarUpdate(avatarUrl);
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Không thể tải ảnh lên');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Format notification time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Get full avatar URL
  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    // If already a full URL, return as is
    if (avatarPath.startsWith('http')) return avatarPath;
    // Convert relative path to full URL
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatarPath}`;
  };

  return (
    <div className="sticky top-0 z-30 shadow-sm border-b border-gray-200 backdrop-blur-lg bg-white/95">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-10 w-10 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              onClick={onMobileMenuToggle}
            >
              <Icon paths="M4 6h16M4 12h16M4 18h16" className="h-6 w-6" />
            </button>
            
            {/* Desktop sidebar toggle */}
            <button
              type="button"
              className="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              onClick={onToggleSidebar}
            >
              <Icon 
                paths={isCollapsed 
                  ? "M13 5l7 7-7 7M5 5l7 7-7 7" 
                  : "M11 19l-7-7 7-7m8 14l-7-7 7-7"
                } 
                className="h-5 w-5" 
              />
            </button>
          </div>
        
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-lg transition-colors duration-200"
              >
                <Icon paths="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>
                  </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification._id);
                          }
                        }}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.is_read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start">
                          <div className={`flex-shrink-0 h-2 w-2 rounded-full mt-2 mr-3 ${
                            !notification.is_read ? 'bg-blue-500' : 'bg-gray-300'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <Icon paths="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm">Không có thông báo</p>
                    </div>
                  )}
                </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative flex items-center space-x-3 pl-3 border-gray-200">
            <div className="relative group">
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
              <button
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="relative w-10 h-10 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:opacity-80"
                title="Thay đổi ảnh đại diện"
              >
                {user?.avatar_url ? (
                  <img 
                    src={getAvatarUrl(user.avatar_url)} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover shadow-md"
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    {user?.full_name?.charAt(0)?.toUpperCase() || user?.first_name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                  <Icon paths="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Ứng viên'}
              </div>
              <div className="text-xs text-gray-500">Ứng viên</div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-lg transition-colors duration-200"
              title="Đăng xuất"
            >
              <Icon paths="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

// Main layout component
const CandidateLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await candidateService.getCandidateProfile();
        if (response.success && response.data) {
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Handle avatar update
  const handleAvatarUpdate = async (avatarUrl) => {
    try {
      // Update Redux store immediately
      dispatch(updateUserData({ avatar_url: avatarUrl }));
      
      // Also fetch fresh profile data
      const response = await candidateService.getCandidateProfile();
      if (response.success && response.data) {
        setUserProfile(response.data);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        // Close any dropdowns
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      toast.success('Đăng xuất thành công');
      navigate('/');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${isMobileOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setIsMobileOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <Icon paths="M6 18L18 6M6 6l12 12" className="h-6 w-6 text-white" />
            </button>
          </div>
          <Sidebar 
            navigation={navigationConfig} 
            location={location} 
            isCollapsed={false}
            isMobileOpen={isMobileOpen}
            onMobileClose={() => setIsMobileOpen(false)}
          />
        </div>
        <div className="flex-shrink-0 w-14" />
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex flex-col w-full">
          <Sidebar 
            navigation={navigationConfig} 
            location={location} 
            isCollapsed={isCollapsed}
            isMobileOpen={false}
            onMobileClose={() => {}}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header 
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
          onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)}
          isCollapsed={isCollapsed}
          user={user}
          onLogout={handleLogout}
          onAvatarUpdate={handleAvatarUpdate}
        />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default CandidateLayout;
