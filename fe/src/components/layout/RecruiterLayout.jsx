import recruiterService from '@/services/recruiterService';
import { logout } from '@/store/slices/authSlice';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Navigation configuration for recruiter
const navigationConfig = [
  {
    name: 'Dashboard',
    href: '/recruiter/dashboard',
    icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z',
  },
  {
    name: 'Quản lý việc làm',
    href: '/recruiter/jobs',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    name: 'Ứng viên',
    href: '/recruiter/candidates',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  
  {
    name: 'Đơn ứng tuyển',
    href: '/recruiter/applications',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    name: 'Tin nhắn',
    href: '/recruiter/messages',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
  {
    name: 'Gói dịch vụ',
    href: '/recruiter/subscription',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    name: 'Thống kê',
    href: '/recruiter/analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    name: 'AI Chat',
    href: '/recruiter/ai-chat',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  },
  {
    name: 'Hồ sơ',
    href: '/recruiter/profile',
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
  const baseClasses = "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 mb-1";
  const activeClasses = isActive 
    ? "bg-green-50 text-green-700 shadow-sm" 
    : "text-gray-600 hover:bg-gray-50 hover:text-green-700 hover:translate-x-1";
  
  return (
    <Link
      to={item.href}
      className={`${baseClasses} ${activeClasses} ${isCollapsed ? 'justify-center px-2' : ''}`}
      title={isCollapsed ? item.name : ''}
      onClick={onClick}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        <Icon 
          paths={item.icon} 
          className={`h-5 w-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-green-700' : 'text-gray-400 group-hover:text-green-600'}`} 
        />
      </div>
      {!isCollapsed && <span className="truncate font-medium">{item.name}</span>}
    </Link>
  );
};

// Sidebar component
const Sidebar = ({ navigation, location, isCollapsed, onMobileClose }) => {  
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 shadow-sm transition-all duration-300">
      <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        {/* Logo/Brand */}
        <Link to="/" className={`flex items-center flex-shrink-0 px-5 mb-8 ${isCollapsed ? 'justify-center' : ''} group`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900 leading-none group-hover:text-green-700 transition-colors">
                  Recruiter
                </h1>
                <span className="text-xs text-gray-500 mt-1">Portal</span>
              </div>
            )}
          </div>
        </Link>

        {/* Navigation */}
        <nav className="mt-2 flex-1 px-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavigationItem
              key={item.name}
              item={item}
              isActive={location.pathname === item.href || location.pathname.startsWith(item.href + '/')}
              isCollapsed={isCollapsed}
              onClick={onMobileClose}
            />
          ))}
        </nav>
      </div>
    </div>
  );
};

// Header component
const Header = ({ 
  user, 
  sidebarCollapsed, 
  onSidebarToggle, 
  onMobileSidebarOpen, 
  onLogout 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await recruiterService.getNotifications({ limit: 10 });
      if (response?.success || response?.data) {
        const notificationsList = response.data || response;
        setNotifications(Array.isArray(notificationsList) ? notificationsList : notificationsList.data || []);
        const unread = (Array.isArray(notificationsList) ? notificationsList : []).filter(n => !n.is_read).length;
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
      const response = await recruiterService.getUnreadNotificationCount();
      if (response?.success) {
        setUnreadCount(response.count || 0);
      }
    } catch {
      // Silently fail
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await recruiterService.markNotificationAsRead(notificationId);
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
      await recruiterService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Không thể đánh dấu thông báo');
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

  // Load unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="sticky top-0 z-30 shadow-sm border-b border-gray-200 backdrop-blur-lg bg-white/95">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {/* Mobile sidebar toggle */}
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-10 w-10 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
              onClick={onMobileSidebarOpen}
            >
              <Icon paths="M4 6h16M4 12h16M4 18h16" className="h-6 w-6" />
            </button>
            
            {/* Desktop sidebar collapse toggle */}
            <button
              type="button"
              className="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
              onClick={onSidebarToggle}
            >
              <Icon 
                paths={sidebarCollapsed 
                  ? "M13 5l7 7-7 7M5 5l7 7-7 7" 
                  : "M11 19l-7-7 7-7m8 14l-7-7 7-7"
                } 
                className="h-5 w-5" 
              />
            </button>

            {/* Quick actions */}
            <div className="hidden md:flex items-center space-x-2">
              <Link
                to="/recruiter/jobs/create"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              >
                <Icon paths="M12 4v16m8-8H4" className="h-4 w-4 mr-1" />
                Đăng tin mới
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-lg transition-colors duration-200"
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
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
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
                            !notification.is_read ? 'bg-green-50' : ''
                          }`}
                        >
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 h-2 w-2 rounded-full mt-2 mr-3 ${
                              !notification.is_read ? 'bg-green-500' : 'bg-gray-300'
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
            <div className="relative flex items-center space-x-3 pl-3 border-l border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                {user?.full_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "R"}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                  {user?.full_name || user?.username || 'Recruiter'}
                </div>
                <div className="text-xs text-gray-500">Nhà tuyển dụng</div>
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

// Mobile sidebar overlay
const MobileSidebar = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex z-50 lg:hidden">
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button
            type="button"
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white text-white hover:bg-white/10 transition-colors duration-200"
            onClick={onClose}
          >
            <Icon paths="M6 18L18 6M6 6l12 12" className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const RecruiterLayout = () => {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Redux and routing
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint
        setSidebarOpen(false);
      }
      
      // Auto-collapse on medium screens
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setSidebarCollapsed(true);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist sidebar state in localStorage (only for desktop)
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      const savedCollapsed = localStorage.getItem('recruiterSidebarCollapsed') === 'true';
      setSidebarCollapsed(savedCollapsed);
    }
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      localStorage.setItem('recruiterSidebarCollapsed', sidebarCollapsed.toString());
    }
  }, [sidebarCollapsed]);

  // Handlers
  const handleLogout = () => {
    dispatch(logout());
    toast.success("Đăng xuất thành công");
    navigate("/");
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileSidebarOpen = () => {
    setSidebarOpen(true);
  };

  const handleMobileSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={handleMobileSidebarClose}>
        <Sidebar
          navigation={navigationConfig}
          location={location}
          isCollapsed={false}
          isMobileOpen={sidebarOpen}
          onMobileClose={handleMobileSidebarClose}
        />
      </MobileSidebar>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
      }`}>
        <Sidebar
          navigation={navigationConfig}
          location={location}
          isCollapsed={sidebarCollapsed}
          isMobileOpen={false}
          onMobileClose={() => {}}
        />
      </div>

      {/* Main Content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        {/* Header */}
        <Header
          user={user}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={handleSidebarToggle}
          onMobileSidebarOpen={handleMobileSidebarOpen}
          onLogout={handleLogout}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <Outlet />
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

export default RecruiterLayout;
