import LoadingSpinner from '@/components/common/LoadingSpinner';
import ReportModal from '@/components/common/ReportModal';
import SimilarJobs from '@/components/common/SimilarJobs';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import { useEffect, useState } from 'react';
import { BsBookmark, BsBookmarkFill, BsBuilding, BsChatDots, BsFire, BsFlag } from 'react-icons/bs';
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
  FiShare2,
  FiUsers
} from 'react-icons/fi';
import { MdWorkOutline } from 'react-icons/md';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);

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
      navigate('/login', { state: { from: `/jobs/${id}` } });
      return;
    }

    if (user?.role !== 'candidate') {
      alert('Chỉ ứng viên mới có thể ứng tuyển vào vị trí này.');
      return;
    }

    // Navigate to application form
    navigate(`/candidate/apply/${id}`);
  };

  // Handle save job
  const handleSaveJob = async () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để lưu việc làm');
      navigate('/login', { state: { from: `/jobs/${id}` } });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy việc làm</h2>
          <Link to="/jobs" className="text-blue-600 hover:text-blue-700">
            ← Quay lại danh sách việc làm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-3">
              <li>
                <Link to="/" className="flex items-center text-gray-400 hover:text-blue-600 transition-colors">
                  <FiHome className="w-4 h-4 mr-1" />
                  Trang chủ
                </Link>
              </li>
              <li>
                <FiChevronRight className="w-4 h-4 text-gray-400" />
              </li>
              <li>
                <Link to="/jobs" className="text-gray-400 hover:text-blue-600 transition-colors">
                  Việc làm
                </Link>
              </li>
              <li>
                <FiChevronRight className="w-4 h-4 text-gray-400" />
              </li>
              <li className="text-gray-600 font-medium truncate">
                {job.title}
              </li>
            </ol>
          </nav>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Job Header */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mr-5 shadow-md">
                    {job.recruiter_id?.company_logo_url ? (
                      <img
                        src={job.recruiter_id.company_logo_url}
                        alt={job.recruiter_id.company_name}
                        className="w-14 h-14 object-contain rounded"
                      />
                    ) : (
                      <BsBuilding className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
                      {job.title}
                    </h1>
                    <p className="text-xl text-gray-700 mb-4 font-semibold flex items-center">
                      <BsBuilding className="w-5 h-5 mr-2 text-blue-600" />
                      {job.recruiter_id?.company_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
                        <FiMapPin className="w-4 h-4 mr-2 text-blue-600" />
                        {job.location?.city || (typeof job.location === 'string' ? job.location : 'Remote')}
                      </span>
                      <span className="flex items-center bg-green-50 px-3 py-2 rounded-lg">
                        <FiBriefcase className="w-4 h-4 mr-2 text-green-600" />
                        {job.job_type || 'Full-time'}
                      </span>
                      <span className="flex items-center bg-yellow-50 px-3 py-2 rounded-lg">
                        <FiDollarSign className="w-4 h-4 mr-2 text-yellow-600" />
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                      <span className="flex items-center bg-purple-50 px-3 py-2 rounded-lg">
                        <FiClock className="w-4 h-4 mr-2 text-purple-600" />
                        Đăng {formatDate(job.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  {job.is_urgent && (
                    <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-2 rounded-full shadow-md flex items-center">
                      <BsFire className="w-3 h-3 mr-1.5" />
                      Tuyển gấp
                    </span>
                  )}
                  {job.is_featured && (
                    <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs font-bold px-3 py-2 rounded-full shadow-md">
                      ⭐ Nổi bật
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleApply}
                  disabled={hasApplied || applying}
                  className={`flex items-center px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 shadow-md ${hasApplied
                    ? 'bg-green-100 text-green-800 cursor-not-allowed border-2 border-green-300'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg'
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
                  className={`flex items-center px-6 py-3.5 rounded-lg font-semibold border-2 transition-all duration-300 shadow-md ${isSaved
                    ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
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
                      Lưu việc làm
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.info('Vui lòng đăng nhập để liên hệ');
                      navigate('/login', { state: { from: `/jobs/${id}` } });
                      return;
                    }

                    if (user?.role !== 'candidate') {
                      toast.warning('Chỉ ứng viên mới có thể liên hệ với nhà tuyển dụng');
                      return;
                    }

                    // Debug: log the full recruiter_id structure
                    console.log('Recruiter data:', job.recruiter_id);
                    console.log('Recruiter user_id:', job.recruiter_id?.user_id);

                    // Get recruiter user ID - user_id should be populated with _id
                    let recruiterUserId = null;

                    // Check if user_id is populated as an object with _id
                    if (job.recruiter_id?.user_id?._id) {
                      recruiterUserId = job.recruiter_id.user_id._id;
                      console.log('Found user_id._id:', recruiterUserId);
                    }
                    // Check if user_id is a string (just the ID)
                    else if (job.recruiter_id?.user_id && typeof job.recruiter_id.user_id === 'string') {
                      recruiterUserId = job.recruiter_id.user_id;
                      console.log('Found user_id string:', recruiterUserId);
                    }

                    if (!recruiterUserId) {
                      toast.error('Không tìm thấy thông tin liên hệ nhà tuyển dụng. Vui lòng tải lại trang.');
                      console.error('Could not extract recruiter user ID. Full recruiter data:', job.recruiter_id);
                      return;
                    }

                    console.log('Opening chat with recruiter user:', recruiterUserId);
                    navigate(`/candidate/messages?userId=${recruiterUserId}`);
                  }}
                  className="flex items-center px-6 py-3.5 rounded-lg font-semibold border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-50 transition-all duration-300 shadow-md"
                >
                  <BsChatDots className="w-5 h-5 mr-2" />
                  Chat với NTD
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
                      toast.success('Đã sao chép liên kết vào clipboard');
                    }
                  }}
                  className="flex items-center px-6 py-3.5 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-all duration-300 shadow-md"
                >
                  <FiShare2 className="w-5 h-5 mr-2" />
                  Chia sẻ
                </button>

                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.info('Vui lòng đăng nhập để báo cáo vi phạm');
                      navigate('/login', { state: { from: `/jobs/${id}` } });
                      return;
                    }
                    setShowReportModal(true);
                  }}
                  className="flex items-center px-6 py-3.5 rounded-lg font-semibold border-2 border-gray-300 text-gray-500 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-300 shadow-md"
                  title="Báo cáo tin tuyển dụng này"
                >
                  <BsFlag className="w-5 h-5 mr-2" />
                  Báo cáo
                </button>
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <MdWorkOutline className="w-6 h-6 mr-3 text-blue-600" />
                Mô tả công việc
              </h2>
              <div className="prose prose-sm max-w-none text-gray-600">
                {job.description ? (
                  <div dangerouslySetInnerHTML={{ __html: job.description.replace(/\n/g, '<br />') }} />
                ) : (
                  <p>Chưa có mô tả chi tiết cho vị trí này.</p>
                )}
              </div>
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FiCheckCircle className="w-6 h-6 mr-3 text-blue-600" />
                  Yêu cầu ứng viên
                </h2>
                <ul className="space-y-3">
                  {job.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <FiCheckCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-gray-700 leading-relaxed">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FiCheckCircle className="w-6 h-6 mr-3 text-green-600" />
                  Quyền lợi
                </h2>
                <ul className="space-y-3">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <FiCheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-gray-700 leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-8 mb-6 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FiBriefcase className="w-6 h-6 mr-3 text-blue-600" />
                  Kỹ năng yêu cầu
                </h2>
                <div className="flex flex-wrap gap-3">
                  {job.skills.map((skill, index) => (
                    <span key={index} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium border border-blue-200 hover:bg-blue-100 transition-colors">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            {/* Job Info Card */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                <FiBriefcase className="w-5 h-5 mr-2 text-blue-600" />
                Thông tin chung
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cấp bậc:</span>
                  <span className="text-gray-900 font-medium">
                    {job.experience_required ?
                      (typeof job.experience_required === 'object' && job.experience_required.min !== undefined ?
                        `${job.experience_required.min}-${job.experience_required.max} năm` :
                        job.experience_required
                      ) : 'Không yêu cầu'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kinh nghiệm:</span>
                  <span className="text-gray-900 font-medium">
                    {job.experience_years ? `${job.experience_years} năm` : 'Không yêu cầu'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số lượng:</span>
                  <span className="text-gray-900 font-medium">
                    {job.positions_available || 1} người
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hình thức:</span>
                  <span className="text-gray-900 font-medium">
                    {job.work_location || 'Tại văn phòng'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Giới tính:</span>
                  <span className="text-gray-900 font-medium">
                    {job.gender_requirement || 'Không yêu cầu'}
                  </span>
                </div>
                {job.application_deadline && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hạn nộp:</span>
                    <span className="text-red-600 font-medium">
                      {formatDate(job.application_deadline)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info Card */}
            {job.recruiter_id && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                  <BsBuilding className="w-5 h-5 mr-2 text-blue-600" />
                  Về công ty
                </h3>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    {job.recruiter_id.company_logo_url ? (
                      <img
                        src={job.recruiter_id.company_logo_url}
                        alt={job.recruiter_id.company_name}
                        className="w-14 h-14 object-contain rounded"
                      />
                    ) : (
                      <BsBuilding className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900">{job.recruiter_id.company_name}</h4>
                  {job.recruiter_id.industry && (
                    <p className="text-sm text-gray-500">{job.recruiter_id.industry}</p>
                  )}
                </div>

                {job.recruiter_id.company_description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-4">
                    {job.recruiter_id.company_description}
                  </p>
                )}

                <div className="space-y-3 text-sm">
                  {job.recruiter_id.company_size && (
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="text-gray-600 flex items-center">
                        <FiUsers className="w-4 h-4 mr-2" />
                        Quy mô:
                      </span>
                      <span className="text-gray-900 font-medium">{job.recruiter_id.company_size}</span>
                    </div>
                  )}
                  {job.recruiter_id.website && (
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="text-gray-600 flex items-center">
                        <FiGlobe className="w-4 h-4 mr-2" />
                        Website:
                      </span>
                      <a
                        href={job.recruiter_id.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 font-medium truncate max-w-[120px] flex items-center"
                      >
                        {job.recruiter_id.website.replace(/https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>

                <Link
                  to={`/companies/${job.recruiter_id._id}`}
                  className="flex items-center justify-center w-full mt-4 text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-semibold shadow-md"
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
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                  <FiBriefcase className="w-5 h-5 mr-2 text-blue-600" />
                  Việc làm liên quan
                </h3>
                <div className="space-y-4">
                  {relatedJobs.map((relatedJob) => (
                    <Link
                      key={relatedJob._id}
                      to={`/jobs/${relatedJob._id}`}
                      className="block p-4 border border-gray-200 rounded-xl hover:shadow-lg hover:border-blue-200 transition-all duration-300"
                    >
                      <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-blue-600">
                        {relatedJob.title}
                      </h4>
                      <p className="text-xs text-gray-600 mb-2 flex items-center">
                        <BsBuilding className="w-3 h-3 mr-1.5" />
                        {relatedJob.recruiter_id?.company_name}
                      </p>
                      <p className="text-xs text-blue-600 font-medium flex items-center">
                        <FiDollarSign className="w-3 h-3 mr-1" />
                        {formatSalary(relatedJob.salary_min, relatedJob.salary_max)}
                      </p>
                    </Link>
                  ))}
                </div>
                <Link
                  to={`/jobs?category=${job.category_id?._id}`}
                  className="flex items-center justify-center w-full mt-4 text-center text-blue-600 text-sm font-semibold hover:text-blue-700 py-2 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Xem thêm việc làm tương tự
                  <FiChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Report Modal */}
      {job && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          entityType="Job"
          entityId={job._id}
          entityTitle={job.title}
        />
      )}
    </div>
  );
};

export default JobDetail;