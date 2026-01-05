import LoadingSpinner from '@/components/common/LoadingSpinner';
import candidateService from '@/services/candidateService';
import { formatLocation, formatSalary } from '@/utils/formatters';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-toastify';

const CandidateJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchSavedJobs();
    fetchApplications();
    // eslint-disable-next-line
  }, [pagination.page]);

  // Fetch saved jobs - this is now the main data source
  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getSavedJobs({
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (response.success && response.data) {
        const jobsArray = response.data.data || response.data;
        setJobs(jobsArray);
        
        if (response.data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.data.pagination.total || 0,
            totalPages: response.data.pagination.totalPages || 0,
            page: response.data.pagination.page || prev.page
          }));
        } else {
          // If no pagination in response, set total based on array length
          setPagination(prev => ({
            ...prev,
            total: jobsArray.length,
            totalPages: 1
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      toast.error('Không thể tải danh sách việc làm đã lưu');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await candidateService.getCandidateApplications();
      if (response.success && response.data) {
        // response.data.data contains paginated results, or response.data is the array
        const applications = response.data.data || response.data;
        // job_id is populated, so we need job_id._id
        const appliedIds = new Set(applications.map(item => {
          if (item.job_id && typeof item.job_id === 'object') {
            return item.job_id._id;
          }
          return item.job_id;
        }));
        setAppliedJobIds(appliedIds);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const removeBookmark = async (jobId) => {
    try {
      await candidateService.unsaveJob(jobId);
      toast.success('Đã bỏ lưu công việc');
      // Refresh the list
      fetchSavedJobs();
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error(error.message || 'Không thể bỏ lưu công việc');
    }
  };

  const applyToJob = (jobId) => {
    // Navigate to application form instead of applying directly
    navigate(`/candidate/apply/${jobId}`);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getJobTypeBadge = (type) => {
    const badges = {
      'Full-time': 'bg-green-100 text-green-800',
      'Part-time': 'bg-yellow-100 text-yellow-800',
      'Contract': 'bg-purple-100 text-purple-800',
      'Remote': 'bg-blue-100 text-blue-800',
      'Internship': 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  const getDaysRemaining = (deadline) => {
    if (!deadline) return 'Không giới hạn';
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Đã hết hạn';
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Còn 1 ngày';
    return `Còn ${diffDays} ngày`;
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Việc làm đã lưu</h1>
          <p className="text-sm text-gray-500 mt-1">Danh sách các công việc bạn đã lưu</p>
        </div>
        <div className="text-sm text-gray-500">
          {pagination.total} việc làm
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Việc làm đã lưu</p>
          <p className="text-2xl font-semibold text-yellow-600">{pagination.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-500">Đã ứng tuyển</p>
          <p className="text-2xl font-semibold text-blue-600">{appliedJobIds.size}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isApplied = appliedJobIds.has(job._id);

            return (
              <div key={job._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {job.recruiter?.company_logo ? (
                        <img 
                          src={job.recruiter.company_logo} 
                          alt={job.recruiter?.company_name} 
                          className="w-full h-full object-contain rounded-lg" 
                        />
                      ) : (
                        <span className="text-xl text-gray-400">🏢</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <Link 
                          to={`/jobs/${job._id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {job.title}
                        </Link>
                        <button
                          onClick={() => removeBookmark(job._id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 ml-2 transition-colors"
                          title="Bỏ lưu"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <p className="text-blue-600 font-medium mb-2">
                        {job.recruiter?.company_name || 'Công ty'}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {formatLocation(job.location)}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {formatSalary(job.salary_min, job.salary_max)}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M8 6a2 2 0 00-2 2v6.002" />
                          </svg>
                          {job.experience_level || 'Không yêu cầu'}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {getDaysRemaining(job.application_deadline)}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 line-clamp-2">{job.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {getJobTypeBadge(job.job_type)}
                          {job.skills?.slice(0, 3).map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                          {job.skills?.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{job.skills.length - 3} khác
                            </span>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <Link
                            to={`/jobs/${job._id}`}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            Xem chi tiết
                          </Link>
                          {isApplied ? (
                            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                              Đã ứng tuyển
                            </span>
                          ) : (
                            <button
                              onClick={() => applyToJob(job._id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Ứng tuyển
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {jobs.length === 0 && (
            <div className="text-center py-16 bg-white rounded-lg">
              <svg className="w-20 h-20 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có việc làm đã lưu</h3>
              <p className="text-gray-500 mb-6">Hãy bắt đầu lưu các việc làm bạn quan tâm để ứng tuyển sau.</p>
              <Link
                to="/jobs"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Khám phá việc làm
              </Link>
            </div>
          )}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Trước
          </button>
          
          <div className="flex space-x-1">
            {[...Array(pagination.totalPages)].map((_, index) => {
              const pageNum = index + 1;
              if (
                pageNum === 1 ||
                pageNum === pagination.totalPages ||
                (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 border rounded-lg ${
                      pageNum === pagination.page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                pageNum === pagination.page - 2 ||
                pageNum === pagination.page + 2
              ) {
                return <span key={pageNum} className="px-2">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau →
          </button>
        </div>
      )}
      
      <div className="text-sm text-gray-600">Xem danh sách việc làm phù hợp với hồ sơ của bạn</div>
    </div>
  );
};

export default CandidateJobs;
