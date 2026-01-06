import {useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {useSelector, useDispatch} from 'react-redux';
import {logout} from '@/store/slices/authSlice';
import {toast} from 'react-toastify';

const Header = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const {user, isAuthenticated} = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await dispatch(logout()).unwrap();
            toast.success('Đăng xuất thành công');
            navigate('/login');
        } catch (error) {
            toast.error('Có lỗi xảy ra khi đăng xuất');
        }
    };

    const getDashboardLink = () => {
        if (!user) return '/';
        if (user.role === 'candidate') return '/candidate/dashboard';
        if (user.role === 'recruiter') return '/recruiter/dashboard';
        if (user.role === 'admin') return '/admin/dashboard';
        return '/';
    };

    return (
        <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="text-2xl font-bold text-blue-600">
                                JobPortal
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                to="/"
                                className="border-transparent text-gray-500 hover:border-blue-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Trang chủ
                            </Link>
                            <Link
                                to="/jobs"
                                className="border-transparent text-gray-500 hover:border-blue-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Việc làm
                            </Link>
                            <Link
                                to="/find-candidates"
                                className="border-transparent text-gray-500 hover:border-blue-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Tìm ứng viên
                            </Link>
                            <Link
                                to="/blog"
                                className="border-transparent text-gray-500 hover:border-blue-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Blog
                            </Link>
                            <Link
                                to="/about"
                                className="border-transparent text-gray-500 hover:border-blue-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Về chúng tôi
                            </Link>
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        {isAuthenticated ? (
                            <div className="flex items-center space-x-4">
                                <Link
                                    to={getDashboardLink()}
                                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Dashboard
                                </Link>
                                <div className="relative ml-3">
                                    <div className="flex items-center">
                                        <span className="mr-2 text-sm font-medium text-gray-700">
                                            {user?.full_name || user?.email}
                                        </span>
                                        <button
                                            onClick={handleLogout}
                                            className="text-gray-500 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
                                        >
                                            Đăng xuất
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex space-x-4">
                                <Link
                                    to="/login"
                                    className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Đăng nhập
                                </Link>
                                <Link
                                    to="/register"
                                    className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                                >
                                    Đăng ký
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            <svg
                                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <svg
                                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div className="sm:hidden">
                    <div className="pt-2 pb-3 space-y-1">
                        <Link
                            to="/"
                            className="bg-blue-50 border-blue-500 text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        >
                            Trang chủ
                        </Link>
                        <Link
                            to="/jobs"
                            className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        >
                            Việc làm
                        </Link>
                        <Link
                            to="/find-candidates"
                            className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        >
                            Tìm ứng viên
                        </Link>
                        <Link
                            to="/blog"
                            className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        >
                            Blog
                        </Link>
                        <Link
                            to="/about"
                            className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                        >
                            Về chúng tôi
                        </Link>
                    </div>
                    <div className="pt-4 pb-4 border-t border-gray-200">
                        {isAuthenticated ? (
                            <div className="space-y-1">
                                <div className="flex items-center px-4">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-gray-600">
                                            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </div>
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-base font-medium text-gray-800">{user?.full_name}</div>
                                        <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <Link
                                        to={getDashboardLink()}
                                        className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                    >
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-1 px-4">
                                <Link
                                    to="/login"
                                    className="block text-center w-full px-4 py-2 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                                >
                                    Đăng nhập
                                </Link>
                                <Link
                                    to="/register"
                                    className="block text-center w-full mt-2 px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    Đăng ký
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
