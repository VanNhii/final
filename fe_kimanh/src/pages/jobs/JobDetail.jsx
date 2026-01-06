import LoadingSpinner from '@/components/common/LoadingSpinner';
import SimilarJobs from '@/components/common/SimilarJobs';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import {useEffect, useState} from 'react';
import {BsBookmark, BsBookmarkFill, BsBuilding, BsFire} from 'react-icons/bs';
import {
  FiBriefcase,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiGlobe,
  FiHome,
  FiMapPin,
  FiSend,
  FiMessageSquare,
  FiShare2,
  FiUsers
} from 'react-icons/fi';
import {MdWorkOutline} from 'react-icons/md';
import {useSelector} from 'react-redux';
import {Link, useNavigate, useParams} from 'react-router';
import {toast} from 'react-toastify';
import {formatLocation} from '@/utils/formatters';

const JobDetail = () => {
  const {id} = useParams();
  const navigate = useNavigate();
  const {user, isAuthenticated} = useSelector((state) => state.auth);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState([]);

  // Fetch saved jobs status
  const fetchSavedStatus = async () => {
    if (!isAuthenticated || user?.role !== 'candidate') return;

    try {
      const response = await candidateService.getSavedJobs();
      if (response.success && response.data) {
        const jobsArray = response.data.data || response.data;
        const isSavedJob = jobsArray.some(item => item._id === id);
        setIsSaved(isSavedJob);
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    }
  };

  // Fetch application status for this job
  const fetchApplicationStatus = async () => {
    if (!isAuthenticated || user?.role !== 'candidate') return;

    try {
      const response = await candidateService.getCandidateApplications();
      if (response.success && response.data) {
        const applications = response.data.data || response.data;
        const hasAppliedToJob = applications.some(app => {
          const jobId = app.job_id && typeof app.job_id === 'object' ? app.job_id._id : app.job_id;
          return jobId === id;
        });
        setHasApplied(hasAppliedToJob);
      }
    } catch (error) {
      console.error('Error fetching application status:', error);
    }
  };

  // Fetch job details
  useEffect(() => {
    const fetchJobDetail = async () => {
      try {
        setLoading(true);
        setHasApplied(false); // reset when navigating between jobs
        const response = await jobService.getJobById(id);

        if (response.success) {
          setJob(response.data);

          // Fetch related jobs
          fetchRelatedJobs(response.data.category_id?._id);

          // Check if job is saved and application status
          if (isAuthenticated && user?.role === 'candidate') {
            fetchSavedStatus();
            fetchApplicationStatus();
          }
        } else {
          navigate('/404');
        }
      } catch (error) {
        console.error('Error fetching job details:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJobDetail();
    }
  }, [id, navigate, isAuthenticated, user]);

  // Fetch related jobs
  const fetchRelatedJobs = async (categoryId) => {
    try {
      if (categoryId) {
        const response = await jobService.getJobs({
          category: categoryId,
          limit: 4
        });

        if (response.success) {
          // Filter out current job
          const related = response.data.data.filter(relatedJob => relatedJob._id !== id);
          setRelatedJobs(related);
        }
      }
    } catch (error) {
      console.error('Error fetching related jobs:', error);
    }
  };

  // Handle job application
  const handleApply = () => {
    if (!isAuthenticated) {
      navigate('/login', {state: {from: `/jobs/${id}`}});
      return;
    }

    if (user?.role !== 'candidate') {
      alert('Chỉ ứng viên mới có thể ứng tuyển vào vị trí này.');
      return;
    }

    // Navigate to application form
    navigate(`/candidate/apply/${id}`);
  };

  // Handle message recruiter
  const handleMessage = () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để nhắn tin');
      navigate('/login', {state: {from: `/jobs/${id}`}});
      return;
    }

    if (user?.role !== 'candidate') {
      toast.warning('Chỉ ứng viên mới có thể nhắn tin cho nhà tuyển dụng');
      return;
    }

    if (job.recruiter_id) {
      // Get the ACTUAL user ID of the recruiter, not the recruiter profile ID
      const targetUserId = job.recruiter_id.user_id?._id || job.recruiter_id.user_id;

      if (!targetUserId) {
        alert('Không tìm thấy thông tin định danh của nhà tuyển dụng');
        return;
      }

      const recruiterInfo = {
        company_name: job.recruiter_id.company_name || job.company_name,
        company_logo_url: job.recruiter_id.company_logo_url || job.recruiter_id.logo_url,
        first_name: job.recruiter_id.user_id?.first_name,
        last_name: job.recruiter_id.user_id?.last_name,
        email: job.recruiter_id.user_id?.email
      };

      navigate('/candidate/messages', {
        state: {
          startConversationWith: targetUserId,
          recruiterInfo: recruiterInfo,
          initialMessage: `Chào bạn, tôi quan tâm đến vị trí ${job.title}`,
          jobId: id
        }
      });
    }
  };

  // Handle save job
  const handleSaveJob = async () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để lưu việc làm');
      navigate('/login', {state: {from: `/jobs/${id}`}});
      return;
    }

    if (user?.role !== 'candidate') {
      toast.warning('Chỉ ứng viên mới có thể lưu việc làm');
      return;
    }

    try {
      if (isSaved) {
        await candidateService.unsaveJob(id);
        setIsSaved(false);
        toast.success('Đã bỏ lưu công việc');
      } else {
        await candidateService.saveJob(id);
        setIsSaved(true);
        toast.success('Đã lưu công việc');
      }
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error(error.message || 'Không thể thực hiện thao tác');
    }
  };

  // Format salary
  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    if (min && max) {
      return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu VND`;
    }
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu VND`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu VND`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Không tìm thấy việc làm</h2>
          <Link to="/jobs" className="text-blue-400 hover:text-blue-300 transition-colors">
            ← Quay lại danh sách việc làm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header Gradient Background */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 bg-slate-900/50 backdrop-blur-sm py-2 px-4 rounded-full border border-slate-800 inline-flex">
              <li>
                <Link to="/" className="flex items-center text-slate-400 hover:text-blue-400 transition-colors">
                  <FiHome className="w-4 h-4 mr-1.5" />
                  Trang chủ
                </Link>
              </li>
              <li>
                <FiChevronRight className="w-4 h-4 text-slate-600" />
              </li>
              <li>
                <Link to="/jobs" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Việc làm
                </Link>
              </li>
              <li>
                <FiChevronRight className="w-4 h-4 text-slate-600" />
              </li>
              <li className="text-blue-400 font-medium truncate max-w-[200px] md:max-w-xs">
                {job.title}
              </li>
            </ol>
          </nav>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

              <div className="flex flex-col md:flex-row md:items-start gap-6 relative z-10">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10">
                    {job.recruiter_id?.company_logo_url ? (
                      <img
                        src={job.recruiter_id.company_logo_url}
                        alt={job.recruiter_id.company_name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <BsBuilding className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="flex-grow">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                      {job.title}
                    </h1>
                    <div className="flex flex-col gap-2">
                      {job.is_urgent && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          <BsFire className="w-3 h-3 mr-1" />
                          Tuyển gấp
                        </span>
                      )}
                      {job.is_featured && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          <BsFire className="w-3 h-3 mr-1" />
                          Nổi bật
                        </span>
                      )}
                    </div>
                  </div>

                  <Link to={`/companies/${job.recruiter_id?._id}`} className="text-lg text-blue-400 hover:text-blue-300 font-medium mb-4 block transition-colors">
                    {job.recruiter_id?.company_name}
                  </Link>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-300 mb-6">
                    <span className="flex items-center bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      <FiMapPin className="w-4 h-4 mr-2 text-red-400" />
                      {formatLocation(job.location)}
                    </span>
                    <span className="flex items-center bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      <FiBriefcase className="w-4 h-4 mr-2 text-green-400" />
                      {job.job_type || 'Full-time'}
                    </span>
                    <span className="flex items-center bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      <FiDollarSign className="w-4 h-4 mr-2 text-yellow-400" />
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                    <span className="flex items-center bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      <FiClock className="w-4 h-4 mr-2 text-purple-400" />
                      {formatDate(job.created_at)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800">
                    <button
                      onClick={handleApply}
                      disabled={hasApplied || applying}
                      className={`flex-1 md:flex-none flex items-center justify-center px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg ${hasApplied
                        ? 'bg-green-500/20 text-green-400 cursor-not-allowed border border-green-500/50'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5'
                        }`}
                    >
                      {hasApplied ? (
                        <>
                          <FiCheckCircle className="w-5 h-5 mr-2" />
                          Đã ứng tuyển
                        </>
                      ) : (
                        <>
                          <FiSend className="w-5 h-5 mr-2" />
                          Ứng tuyển ngay
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSaveJob}
                      className={`flex items-center justify-center px-6 py-3 rounded-xl font-semibold border transition-all duration-300 ${isSaved
                        ? 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                      {isSaved ? (
                        <>
                          <BsBookmarkFill className="w-5 h-5 mr-2" />
                          Đã lưu
                        </>
                      ) : (
                        <>
                          <BsBookmark className="w-5 h-5 mr-2" />
                          Lưu tin
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleMessage}
                      className="flex items-center justify-center px-6 py-3 rounded-xl font-semibold border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300"
                    >
                      <FiMessageSquare className="w-5 h-5 mr-2" />
                      Nhắn tin
                    </button>

                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: job.title,
                            text: `${job.title} tại ${job.recruiter_id?.company_name}`,
                            url: window.location.href
                          }).catch(() => { });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success('Đã sao chép liên kết');
                        }
                      }}
                      className="flex items-center justify-center px-4 py-3 rounded-xl border border-slate-700 text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all"
                      title="Chia sẻ"
                    >
                      <FiShare2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-800">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center border-b border-slate-800 pb-4">
                <div className="bg-blue-500/10 p-2 rounded-lg mr-3">
                  <MdWorkOutline className="w-6 h-6 text-blue-400" />
                </div>
                Mô tả công việc
              </h2>
              <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed">
                {job.description ? (
                  <div dangerouslySetInnerHTML={{__html: job.description.replace(/\n/g, '<br />')}} />
                ) : (
                  <p className="italic text-slate-500">Chưa có mô tả chi tiết cho vị trí này.</p>
                )}
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center border-b border-slate-800 pb-4">
                  <div className="bg-green-500/10 p-2 rounded-lg mr-3">
                    <FiCheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  Yêu cầu ứng viên
                </h2>
                <ul className="grid gap-4">
                  {job.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                        <FiCheckCircle className="w-3.5 h-3.5 text-green-400" />
                      </div>
                      <span className="text-slate-300 leading-relaxed">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center border-b border-slate-800 pb-4">
                  <div className="bg-purple-500/10 p-2 rounded-lg mr-3">
                    <FiCheckCircle className="w-6 h-6 text-purple-400" />
                  </div>
                  Quyền lợi
                </h2>
                <ul className="grid md:grid-cols-2 gap-4">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                      <div className="flex-shrink-0 w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                        <FiCheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <span className="text-slate-300 leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center border-b border-slate-800 pb-4">
                  <div className="bg-yellow-500/10 p-2 rounded-lg mr-3">
                    <FiBriefcase className="w-6 h-6 text-yellow-400" />
                  </div>
                  Kỹ năng yêu cầu
                </h2>
                <div className="flex flex-wrap gap-3">
                  {job.skills.map((skill, index) => (
                    <span key={index} className="bg-slate-800 text-blue-300 px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 hover:border-blue-500/50 hover:text-blue-200 transition-colors cursor-default">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-8 lg:mt-0 space-y-6">
            {/* Job Info Card */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-800 sticky top-24">
              <h3 className="text-lg font-bold text-white mb-5 flex items-center">
                <FiBriefcase className="w-5 h-5 mr-3 text-blue-400" />
                Thông tin chung
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                  <span className="text-slate-400 text-sm">Cấp bậc</span>
                  <span className="text-white font-medium text-sm text-right">
                    {job.experience_required ?
                      (typeof job.experience_required === 'object' && job.experience_required.min !== undefined ?
                        `${job.experience_required.min}-${job.experience_required.max} năm` :
                        job.experience_required
                      ) : 'Không yêu cầu'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                  <span className="text-slate-400 text-sm">Kinh nghiệm</span>
                  <span className="text-white font-medium text-sm text-right">
                    {job.experience_years ? `${job.experience_years} năm` : 'Không yêu cầu'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                  <span className="text-slate-400 text-sm">Số lượng</span>
                  <span className="text-white font-medium text-sm text-right">
                    {job.positions_available || 1} người
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                  <span className="text-slate-400 text-sm">Hình thức</span>
                  <span className="text-white font-medium text-sm text-right">
                    {job.work_location || 'Tại văn phòng'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                  <span className="text-slate-400 text-sm">Giới tính</span>
                  <span className="text-white font-medium text-sm text-right">
                    {job.gender_requirement || 'Không yêu cầu'}
                  </span>
                </div>
                {job.application_deadline && (
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0 last:pb-0">
                    <span className="text-slate-400 text-sm">Hạn nộp</span>
                    <span className="text-red-400 font-bold text-sm text-right">
                      {formatDate(job.application_deadline)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info Card */}
            {job.recruiter_id && (
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center">
                  <BsBuilding className="w-5 h-5 mr-3 text-purple-400" />
                  Về công ty
                </h3>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-white p-2 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/10">
                    {job.recruiter_id.company_logo_url ? (
                      <img
                        src={job.recruiter_id.company_logo_url}
                        alt={job.recruiter_id.company_name}
                        className="w-full h-full object-contain text-slate-900"
                      />
                    ) : (
                      <BsBuilding className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <h4 className="font-bold text-white text-lg mb-1">{job.recruiter_id.company_name}</h4>
                  {job.recruiter_id.industry && (
                    <p className="text-sm text-slate-400">{job.recruiter_id.industry}</p>
                  )}
                </div>

                {job.recruiter_id.company_description && (
                  <p className="text-sm text-slate-300 mb-6 line-clamp-4 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                    {job.recruiter_id.company_description}
                  </p>
                )}

                <div className="space-y-3 text-sm mb-6">
                  {job.recruiter_id.company_size && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center">
                        <FiUsers className="w-4 h-4 mr-2" />
                        Quy mô
                      </span>
                      <span className="text-white font-medium">{job.recruiter_id.company_size}</span>
                    </div>
                  )}
                  {job.recruiter_id.website && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center">
                        <FiGlobe className="w-4 h-4 mr-2" />
                        Website
                      </span>
                      <a
                        href={job.recruiter_id.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-medium truncate max-w-[150px]"
                      >
                        {job.recruiter_id.website.replace(/https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                <Link
                  to={`/companies/${job.recruiter_id._id}`}
                  className="flex items-center justify-center w-full bg-slate-800 text-white py-3 rounded-xl hover:bg-slate-700 transition-all font-semibold border border-slate-700 hover:border-slate-600"
                >
                  <BsBuilding className="w-4 h-4 mr-2" />
                  Xem trang công ty
                </Link>
              </div>
            )}

            {/* AI-Powered Similar Jobs */}
            <SimilarJobs jobId={id} limit={5} />

            {/* Related Jobs */}
            {relatedJobs.length > 0 && (
              <div className="bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center">
                  <FiBriefcase className="w-5 h-5 mr-3 text-green-400" />
                  Việc làm liên quan
                </h3>
                <div className="space-y-4">
                  {relatedJobs.map((relatedJob) => (
                    <Link
                      key={relatedJob._id}
                      to={`/jobs/${relatedJob._id}`}
                      className="block p-4 bg-slate-950/30 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-950 transition-all duration-300 group"
                    >
                      <h4 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {relatedJob.title}
                      </h4>
                      <p className="text-xs text-slate-400 mb-2 flex items-center">
                        <BsBuilding className="w-3 h-3 mr-1.5" />
                        {relatedJob.recruiter_id?.company_name}
                      </p>
                      <p className="text-xs text-green-400 font-medium flex items-center">
                        <FiDollarSign className="w-3 h-3 mr-1" />
                        {formatSalary(relatedJob.salary_min, relatedJob.salary_max)}
                      </p>
                    </Link>
                  ))}
                </div>
                <Link
                  to={`/jobs?category=${job.category_id?._id}`}
                  className="flex items-center justify-center w-full mt-6 text-center text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors py-2"
                >
                  Xem thêm việc làm tương tự
                  <FiChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;