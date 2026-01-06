import React, {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {useSelector} from 'react-redux';
import candidateService from '@/services/candidateService';
import {formatLocation} from '@/utils/formatters';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const CandidateDashboard = () => {
  const {user} = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    applications_count: 0,
    saved_jobs_count: 0,
    interviews_count: 0,
    profile_views: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch all lists to get accurate counts
        const [applicationsRes, savedJobsRes, interviewsRes, jobsRes, dashboardRes] = await Promise.allSettled([
          candidateService.getCandidateApplications(),
          candidateService.getSavedJobs(),
          candidateService.getCandidateInterviews(),
          candidateService.searchJobs({limit: 6}),
          candidateService.getCandidateDashboard() // Keep for profile_views if available
        ]);

        // Process Applications
        let appCount = 0;
        if (applicationsRes.status === 'fulfilled' && applicationsRes.value.success) {
          const apps = applicationsRes.value.data.data || applicationsRes.value.data || [];
          appCount = apps.length;
          // Sort by date desc and take top 5
          setRecentApplications(apps.slice(0, 5));
        }

        // Process Saved Jobs
        let savedCount = 0;
        if (savedJobsRes.status === 'fulfilled' && savedJobsRes.value.success) {
          const saved = savedJobsRes.value.data.data || savedJobsRes.value.data || [];
          savedCount = saved.length;
        }

        // Process Interviews
        let interviewCount = 0;
        if (interviewsRes.status === 'fulfilled' && interviewsRes.value.success) {
          const interviews = interviewsRes.value.data.data || interviewsRes.value.data || [];
          interviewCount = interviews.length;
        }

        // Process Recommended Jobs
        if (jobsRes.status === 'fulfilled' && jobsRes.value.success) {
          const jobs = jobsRes.value.data.data || jobsRes.value.data || [];
          setRecommendedJobs(jobs);
        }

        // Process direct Dashboard stats (mainly for profile_views)
        let viewsCount = 0;
        if (dashboardRes.status === 'fulfilled' && dashboardRes.value.success) {
          viewsCount = dashboardRes.value.data.profile_views || 0;
        }

        setStats({
          applications_count: appCount,
          saved_jobs_count: savedCount,
          interviews_count: interviewCount,
          profile_views: viewsCount
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Xin chào, {user?.full_name || user?.username || 'Ứng viên'}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Dưới đây là tổng quan về hoạt động tìm việc của bạn.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            to="/candidate/profile"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cập nhật hồ sơ
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/candidate/applications" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-blue-200">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">Đã ứng tuyển</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.applications_count || 0}</h3>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link to="/candidate/interviews" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-100 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-purple-200">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4a1 1 0 102 0V3a6 6 0 10-12 0v4a3 3 0 00-3 3v8a3 3 0 003 3h8a3 3 0 003-3v-8a3 3 0 00-3-3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Lịch phỏng vấn</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.interviews_count || 0}</h3>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link to="/candidate/saved-jobs" className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-100 transition-all group flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-pink-200">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-pink-600 transition-colors">Việc làm đã lưu</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.saved_jobs_count || 0}</h3>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-pink-50 group-hover:text-pink-600 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications Section - Replaced Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Đơn ứng tuyển gần đây</h2>
            <Link to="/candidate/applications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Xem tất cả
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Việc làm</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Công ty</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nộp</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentApplications.length > 0 ? (
                  recentApplications.map((app) => (
                    <tr key={app._id || app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{app.job_id?.title || app.job_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{app.job_id?.recruiter_id?.company_name || app.company_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(app.created_at || app.applied_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${(app.application_status || app.status) === 'accepted' ? 'bg-green-100 text-green-800' :
                            (app.application_status || app.status) === 'rejected' ? 'bg-red-100 text-red-800' :
                              (app.application_status || app.status) === 'interview' ? 'bg-purple-100 text-purple-800' :
                                'bg-yellow-100 text-yellow-800'}`}>
                          {(app.application_status || app.status) === 'pending' ? 'Đang chờ' :
                            (app.application_status || app.status) === 'viewed' ? 'Đã xem' :
                              (app.application_status || app.status) === 'interview' ? 'Phỏng vấn' :
                                (app.application_status || app.status) === 'accepted' ? 'Được nhận' :
                                  (app.application_status || app.status) === 'rejected' ? 'Từ chối' : (app.application_status || app.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      <p>Bạn chưa ứng tuyển công việc nào.</p>
                      <Link to="/candidate/jobs" className="text-blue-600 mt-2 inline-block hover:underline font-medium">Tìm việc ngay</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommended Jobs */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Việc làm gợi ý</h2>
            <Link to="/candidate/recommended-jobs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
            {recommendedJobs.length > 0 ? (
              recommendedJobs.map((job) => (
                <div key={job._id || job.id} className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm hover:shadow-md">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-700 clamp-1">{job.title || job.job_title}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-2 font-medium">{job.company_name || 'Công ty ẩn danh'}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">{formatLocation(job.location)}</span>
                    <span className="bg-green-100 px-2 py-1 rounded-md text-green-700 font-medium">{job.salary_range || 'Thỏa thuận'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p>Chưa có việc làm gợi ý phù hợp.</p>
                <Link to="/candidate/profile" className="text-blue-600 text-sm mt-2 inline-block font-medium hover:underline">Cập nhật hồ sơ để nhận gợi ý</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
