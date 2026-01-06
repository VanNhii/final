import {useEffect, useState} from 'react';
import {
    FiUsers,
    FiBriefcase,
    FiFileText,
    FiDollarSign,
    FiAlertCircle,
    FiCheckCircle,
    FiArrowRight,
    FiTrendingUp,
    FiZap,
    FiPieChart,
    FiActivity,
    FiClock,
} from 'react-icons/fi';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import {Doughnut} from 'react-chartjs-2';
import {Link} from 'react-router';
import adminService from '@/services/adminService';
import {useSelector} from 'react-redux';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AdminDashboard = () => {
    const {user} = useSelector((state) => state.auth);
    const [dashboardData, setDashboardData] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [systemStatus, setSystemStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsRes, analyticsRes, statusRes] = await Promise.all([
                adminService.getDashboardStats(),
                adminService.getAnalytics({timeRange: '30days'}),
                adminService.getSystemStatus(),
            ]);

            if (statsRes.success) setDashboardData(statsRes.data);
            if (analyticsRes.success) setAnalyticsData(analyticsRes.data);
            if (statusRes.success) setSystemStatus(statusRes.data);
        } catch (error) {
            console.error('Error fetching admin dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }



    // User Distribution Doughnut Data
    const doughnutData = {
        labels: ['Ứng viên', 'Nhà tuyển dụng', 'Admin'],
        datasets: [
            {
                data: [
                    analyticsData?.userDistribution?.candidates || 0,
                    analyticsData?.userDistribution?.recruiters || 0,
                    analyticsData?.userDistribution?.admins || 0,
                ],
                backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981'],
                borderWidth: 0,
            },
        ],
    };

    const getActivityLabel = (type) => {
        const labels = {
            'login': 'Đăng nhập',
            'logout': 'Đăng xuất',
            'job_view': 'Xem việc làm',
            'job_apply': 'Ứng tuyển',
            'profile_update': 'Cập nhật hồ sơ',
            'message_sent': 'Gửi tin nhắn',
            'interview_scheduled': 'Đặt lịch phỏng vấn',
            'admin_action': 'Thao tác quản trị'
        };
        return labels[type] || type;
    };

    const overview = dashboardData?.overview || {};
    const growth = dashboardData?.growth || {};

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
            {/* Admin Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-blue-500/20 p-2 rounded-xl backdrop-blur-md border border-white/10">
                                <FiZap className="text-blue-400 w-5 h-5 animate-pulse" />
                            </div>
                            <span className="text-blue-400 font-bold tracking-widest uppercase text-xs">Hệ thống quản trị trung tâm</span>
                        </div>
                        <h1 className="text-3xl font-bold mb-2 tracking-tight">Xin chào, {user?.first_name || 'Admin'}! 👋</h1>
                        <p className="text-slate-400 max-w-xl text-lg font-medium leading-relaxed">
                            Hiện có <span className="text-white font-bold">{overview.pendingJobs || 0} tin tuyển dụng</span> và <span className="text-white font-bold">{overview.pendingReports || 0} báo cáo</span> đang chờ bạn xử lý.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <Link
                            to="/admin/jobs"
                            className="group bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-lg shadow-blue-900/20"
                        >
                            <FiCheckCircle className="w-5 h-5" />
                            <span>Duyệt tin ngay</span>
                        </Link>
                        <Link
                            to="/admin/reports"
                            className="group bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-md px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-3"
                        >
                            <FiAlertCircle className="w-5 h-5 text-red-400" />
                            <span>{overview.pendingReports || 0} Báo cáo</span>
                        </Link>
                    </div>
                </div>

                {/* Abstract shapes */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] -mr-48 -mt-48 opacity-50"></div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    {
                        label: 'Tổng người dùng',
                        value: overview.totalUsers,
                        icon: FiUsers,
                        color: 'text-blue-500',
                        bg: 'bg-blue-50',
                        trend: `${growth.userGrowthPercent}%`,
                        isPositive: parseFloat(growth.userGrowthPercent) >= 0,
                        link: '/admin/users'
                    },
                    {
                        label: 'Tin đang chờ duyệt',
                        value: overview.pendingJobs,
                        icon: FiBriefcase,
                        color: 'text-amber-500',
                        bg: 'bg-amber-50',
                        trend: 'Cần xử lý',
                        isPositive: false,
                        link: '/admin/jobs'
                    },
                    {
                        label: 'Tổng đơn ứng tuyển',
                        value: overview.totalApplications,
                        icon: FiFileText,
                        color: 'text-emerald-500',
                        bg: 'bg-emerald-50',
                        trend: `${growth.applicationGrowthPercent}%`,
                        isPositive: parseFloat(growth.applicationGrowthPercent) >= 0,
                        link: '/admin/analytics'
                    },
                    {
                        label: 'Doanh thu (triệu)',
                        value: `${dashboardData?.totalRevenue || 0}M`,
                        icon: FiDollarSign,
                        color: 'text-violet-500',
                        bg: 'bg-violet-50',
                        trend: `${growth.revenueGrowthPercent}%`,
                        isPositive: parseFloat(growth.revenueGrowthPercent) >= 0,
                        link: '/admin/payments'
                    },
                ].map((item, i) => (
                    <Link key={i} to={item.link} className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className={`${item.bg} ${item.color} p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${item.trend === 'Cần xử lý' ? 'bg-amber-100 text-amber-700' : (item.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}`}>
                                {item.trend !== 'Cần xử lý' && <FiTrendingUp className={item.isPositive ? '' : 'rotate-180'} />}
                                {item.trend}
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-slate-500 text-xs font-bold tracking-wide uppercase">{item.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{item.value?.toLocaleString() || 0}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Analytics Center */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Structure */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                        <FiPieChart className="text-violet-500" /> Phân bổ người dùng
                    </h2>
                    <div className="h-[250px] relative flex items-center justify-center">
                        <Doughnut
                            data={doughnutData}
                            options={{
                                cutout: '75%',
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {legend: {display: false}}
                            }}
                        />
                        <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-black text-slate-900">{overview.totalUsers}</span>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Thành viên</span>
                        </div>
                    </div>
                    <div className="mt-10 grid grid-cols-3 gap-4">
                        {[
                            {label: 'Ứng viên', value: analyticsData?.userDistribution?.candidates, color: 'bg-blue-500'},
                            {label: 'Nhà tuyển dụng', value: analyticsData?.userDistribution?.recruiters, color: 'bg-violet-500'},
                            {label: 'Quản trị viên', value: analyticsData?.userDistribution?.admins, color: 'bg-emerald-500'},
                        ].map((item, i) => (
                            <div key={i} className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                <div className={`w-2 h-2 rounded-full ${item.color} mx-auto mb-2`}></div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{item.label}</div>
                                <div className="text-lg font-black text-slate-800">{item.value?.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Approval Section */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <FiBriefcase className="text-blue-500" /> Tin tuyển dụng mới nhất
                        </h2>
                        <Link to="/admin/jobs" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group">
                            Quản lý tin <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[420px] pr-2 custom-scrollbar">
                        {dashboardData?.recentPendingJobs?.length > 0 ? (
                            dashboardData.recentPendingJobs.map((job, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:shadow-lg hover:border-blue-100 transition-all group">
                                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600 font-black text-sm w-12 h-12 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {job.company_name?.charAt(0) || 'J'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                            {job.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1 truncate">
                                            {job.company_name} • <span className="text-slate-400">{new Date(job.created_at).toLocaleDateString('vi-VN')}</span>
                                        </p>
                                    </div>
                                    <Link
                                        to={`/admin/jobs?id=${job._id}`}
                                        className="opacity-0 group-hover:opacity-100 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Duyệt
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-300">
                                <FiBriefcase className="w-16 h-16 mb-4 opacity-10" />
                                <p className="font-medium italic">Không có tin nào đang chờ duyệt</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;



