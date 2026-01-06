import {useEffect, useState} from "react";
import {Link} from "react-router";
import {
  FiBriefcase,
  FiFileText,
  FiCalendar,
  FiTrendingUp,
  FiEye,
  FiClock,
  FiArrowRight,
  FiPlus,
} from "react-icons/fi";
import apiClient from "@/services/apiClient";
import {useSelector} from "react-redux";

const RecruiterDashboard = () => {
  const {user} = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, interviewsRes] = await Promise.all([
        apiClient.get("/recruiters/dashboard"),
        apiClient.get("/recruiters/interviews?limit=5&status=scheduled"),
      ]);

      if (dashboardRes.success) setStats(dashboardRes.data);
      if (interviewsRes.success) setInterviews(interviewsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-primary-500/20">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Chào mừng trở lại, {user?.first_name}! 👋</h1>
          <div className="mt-6 flex gap-3">
            <Link
              to="/recruiter/jobs/create"
              className="bg-white text-primary-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-50 transition-all shadow-lg"
            >
              <FiPlus /> Đăng tin mới
            </Link>
            <Link
              to="/recruiter/applications"
              className="bg-primary-500/30 text-white border border-primary-400/50 backdrop-blur-md px-6 py-2.5 rounded-xl font-bold hover:bg-primary-500/40 transition-all"
            >
              Xem hồ sơ ứng tuyển
            </Link>
          </div>
        </div>
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 scale-150"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-300/20 rounded-full blur-2xl mr-20 mb-10"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {label: 'Việc làm hoạt động', value: stats?.overview?.activeJobs, icon: FiBriefcase, color: 'text-blue-600', bg: 'bg-blue-100', link: '/recruiter/jobs?status=active'},
          {label: 'Tổng đơn ứng tuyển', value: stats?.overview?.totalApplications, icon: FiFileText, color: 'text-green-600', bg: 'bg-green-100', link: '/recruiter/applications'},
          {label: 'Chờ xét duyệt', value: stats?.overview?.pendingApplications, icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-100', link: '/recruiter/applications?status=pending'},
          {label: 'Lịch phỏng vấn sát', value: stats?.overview?.upcomingInterviews, icon: FiCalendar, color: 'text-purple-600', bg: 'bg-purple-100', link: '/recruiter/interviews'},
        ].map((item, i) => (
          <Link key={i} to={item.link} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className={`${item.bg} ${item.color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <FiTrendingUp className="text-gray-300 group-hover:text-primary-500" />
            </div>
            <p className="mt-4 text-gray-600 text-sm font-medium">{item.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{item.value || 0}</h3>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">Đơn ứng tuyển mới nhất</h2>
            <Link to="/recruiter/applications" className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Xem tất cả <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-4">
                  <th className="pb-4 font-bold">Ứng viên</th>
                  <th className="pb-4 font-bold">Vị trí</th>
                  <th className="pb-4 font-bold">Ngày nộp</th>
                  <th className="pb-4 font-bold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats?.recentApplications?.length > 0 ? stats.recentApplications.map((app, i) => (
                  <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {app.candidate_id?.user_id?.first_name?.[0]}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">{app.candidate_id?.user_id?.first_name} {app.candidate_id?.user_id?.last_name}</div>
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{app.candidate_id?.user_id?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="text-sm font-medium text-gray-700">{app.job_id?.title}</span>
                    </td>
                    <td className="py-4 text-xs text-gray-500">
                      {new Date(app.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-4 text-right">
                      <Link
                        to={`/recruiter/applications/${app._id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-primary-600 hover:text-white transition-all shadow-sm"
                      >
                        <FiEye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-gray-400 italic">Chưa có ứng viên mới</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 px-1">Lịch phỏng vấn sắp tới</h2>
          <div className="space-y-4">
            {interviews.length > 0 ? interviews.map((interview, i) => (
              <div key={i} className="group p-4 rounded-2xl border border-gray-50 hover:border-primary-100 hover:bg-primary-50/30 transition-all">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex flex-col items-center justify-center font-bold">
                    <span className="text-xs uppercase leading-none">{new Date(interview.interview_date).toLocaleString('vi-VN', {month: 'short'})}</span>
                    <span className="text-lg">{new Date(interview.interview_date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {interview.candidate_id?.user_id?.full_name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{interview.application_id?.job_id?.title}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs font-medium text-gray-600">
                      <FiClock className="w-3.5 h-3.5" /> {interview.interview_time}
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="capitalize">{interview.interview_method}</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-gray-400 italic bg-gray-50 rounded-2xl">
                Không có cuộc phỏng vấn nào sắp tới
              </div>
            )}
            <Link to="/recruiter/interviews" className="block text-center text-primary-600 font-bold text-sm mt-4 hover:underline">
              Xem toàn bộ lịch trình →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
