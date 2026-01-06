import LoadingSpinner from '@/components/common/LoadingSpinner';
import aiService from '@/services/aiService';
import candidateService from '@/services/candidateService';
import {formatLocation, formatSalary} from '@/utils/formatters';
import {useEffect, useState} from 'react';
import {
  FaBriefcase,
  FaCheckCircle,
  FaClock,
  FaHeart,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaRegHeart,
  FaStar,
  FaSync
} from 'react-icons/fa';
import {Link} from 'react-router';
import {toast} from 'react-toastify';

const RecommendedJobs = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    limit: 20,
    min_score: 0.5,
    location: '',
    job_type: ''
  });

  useEffect(() => {
    fetchRecommendations();
    fetchSavedJobs();
    fetchApplications();
  }, []);

  const fetchRecommendations = async (showLoader = true, filterOverride = null) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      const filtersToUse = filterOverride || filters;
      const response = await aiService.getJobRecommendations(filtersToUse);

      if (response.success) {
        setRecommendations(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Không thể tải danh sách gợi ý việc làm');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const response = await candidateService.getSavedJobs();
      if (response.success && response.data) {
        // response.data.data is the array of saved jobs with pagination
        const jobsArray = response.data.data || response.data;
        const savedIds = new Set(jobsArray.map(item => item._id));
        setSavedJobIds(savedIds);
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
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

  const handleSaveJob = async (jobId, recommendationId) => {
    try {
      if (savedJobIds.has(jobId)) {
        const response = await candidateService.unsaveJob(jobId);
        console.log('Unsave job response:', response);
        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        toast.success('Đã bỏ lưu việc làm');
      } else {
        const response = await candidateService.saveJob(jobId);
        console.log('Save job response:', response);
        setSavedJobIds(prev => new Set([...prev, jobId]));
        toast.success('Đã lưu việc làm');

        // Track interaction
        if (recommendationId) {
          await aiService.trackInteraction(recommendationId, 'click');
        }
      }
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleViewJob = async (recommendationId) => {
    try {
      if (recommendationId) {
        await aiService.trackInteraction(recommendationId, 'view');
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleRefresh = () => {
    fetchRecommendations(false);
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    return 'text-gray-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Rất phù hợp';
    if (score >= 0.6) return 'Phù hợp';
    return 'Có thể phù hợp';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Việc làm được gợi ý cho bạn
            </h1>
            <p className="text-gray-600">
              Dựa trên hồ sơ, kỹ năng và sở thích của bạn
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <FaSync className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">AI đang giúp bạn tìm việc phù hợp nhất!</p>
            <p>Hệ thống của chúng tôi phân tích hồ sơ, kỹ năng, kinh nghiệm của bạn và gợi ý những công việc phù hợp nhất.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Điểm tối thiểu
            </label>
            <select
              value={filters.min_score}
              onChange={(e) => {
                setFilters({...filters, min_score: parseFloat(e.target.value)});
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Tất cả</option>
              <option value="0.5">Điểm ≥ 0.5</option>
              <option value="0.6">Điểm ≥ 0.6</option>
              <option value="0.7">Điểm ≥ 0.7</option>
              <option value="0.8">Điểm ≥ 0.8</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Địa điểm
            </label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              placeholder="VD: Hà Nội"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại công việc
            </label>
            <select
              value={filters.job_type}
              onChange={(e) => setFilters({...filters, job_type: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="full_time">Toàn thời gian</option>
              <option value="part_time">Bán thời gian</option>
              <option value="contract">Hợp đồng</option>
              <option value="internship">Thực tập</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => fetchRecommendations(true, filters)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Áp dụng
            </button>
            <button
              onClick={() => {
                const defaultFilters = {limit: 20, min_score: 0, location: '', job_type: ''};
                setFilters(defaultFilters);
                fetchRecommendations(true, defaultFilters);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">

          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Chưa có gợi ý việc làm
          </h3>
          <p className="text-gray-500">
            Hãy hoàn thiện hồ sơ của bạn để nhận được gợi ý tốt hơn
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recommendations.map((rec) => {
            // API returns flat structure, not nested job object
            const jobId = rec._id || rec.job_id;
            const isSaved = savedJobIds.has(jobId);
            const isApplied = appliedJobIds.has(jobId);

            return (
              <div
                key={rec._id || rec.job_id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Job Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      {/* Company Logo */}
                      {rec.company_logo && (
                        <img
                          src={rec.company_logo}
                          alt={rec.company_name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}

                      <div className="flex-1">
                        <Link
                          to={`/jobs/${jobId}`}
                          onClick={() => handleViewJob(rec._id)}
                          className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {rec.title}
                        </Link>
                        <p className="text-gray-600 mt-1">{rec.company_name}</p>
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      {rec.location && (
                        <div className="flex items-center gap-1">
                          <FaMapMarkerAlt className="text-gray-400" />
                          <span>{typeof rec.location === 'object' ? formatLocation(rec.location) : rec.location}</span>
                        </div>
                      )}
                      {rec.job_type && (
                        <div className="flex items-center gap-1">
                          <FaBriefcase className="text-gray-400" />
                          <span>{rec.job_type}</span>
                        </div>
                      )}
                      {(rec.salary_min || rec.salary_max) && (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-green-600">
                            {formatSalary(rec.salary_min, rec.salary_max)}
                          </span>
                        </div>
                      )}
                      {rec.created_at && (
                        <div className="flex items-center gap-1">
                          <FaClock className="text-gray-400" />
                          <span>
                            {new Date(rec.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* AI Score & Reasons */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaStar className={`${getScoreColor(rec.score)}`} />
                        <span className={`font-semibold ${getScoreColor(rec.score)}`}>
                          {getScoreLabel(rec.score)} ({Math.round(rec.score * 100)}%)
                        </span>
                        {rec.confidence && (
                          <span className="text-xs text-gray-500">
                            Độ tin cậy: {Math.round(rec.confidence * 100)}%
                          </span>
                        )}
                      </div>

                      {rec.reasons && rec.reasons.length > 0 && (
                        <div className="bg-blue-50 rounded p-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Tại sao phù hợp:
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {rec.reasons.slice(0, 3).map((reason, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/jobs/${jobId}`}
                        onClick={() => handleViewJob(rec._id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Xem chi tiết
                      </Link>

                      <button
                        onClick={() => handleSaveJob(jobId, rec._id)}
                        className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${isSaved
                            ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {isSaved ? <FaHeart /> : <FaRegHeart />}
                        {isSaved ? 'Đã lưu' : 'Lưu'}
                      </button>

                      {isApplied && (
                        <div className="flex items-center gap-2 text-green-600">
                          <FaCheckCircle />
                          <span className="text-sm font-medium">Đã ứng tuyển</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecommendedJobs;
