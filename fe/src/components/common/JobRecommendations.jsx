import aiService from '@/services/aiService';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import {
  FiBriefcase,
  FiDollarSign,
  FiMapPin,
  FiStar,
  FiThumbsUp,
  FiTrendingUp,
  FiX
} from 'react-icons/fi';
import { Link } from 'react-router';

/**
 * JobRecommendations Component
 * Displays AI-powered job recommendations for candidates
 */
const JobRecommendations = ({ limit = 5, showTitle = true, showReasons = true }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissedJobs, setDismissedJobs] = useState(new Set());

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await aiService.getJobRecommendations({ limit, force });
      
      if (response.success) {
        // Transform data to handle both old and new formats
        const transformedData = (response.data || []).map(rec => {
          // Check if recommended_entity_id is populated (old format from DB)
          const job = rec.recommended_entity_id && typeof rec.recommended_entity_id === 'object' 
            ? rec.recommended_entity_id 
            : null;
          
          return {
            _id: rec._id,
            job_id: job?._id || job?.id || rec.job_id || rec.recommended_entity_id,
            title: rec.title || job?.title || '',
            company_name: rec.company_name || job?.company_name || '',
            location: rec.location || job?.location?.city || (typeof job?.location === 'string' ? job.location : ''),
            salary_min: rec.salary_min ?? job?.salary_min ?? null,
            salary_max: rec.salary_max ?? job?.salary_max ?? null,
            job_type: rec.job_type || job?.job_type || '',
            work_location: rec.work_location || job?.work_location || '',
            score: rec.score || 0,
            confidence: rec.confidence || 0,
            reasons: rec.reasons || [],
            is_viewed: rec.is_viewed,
            is_clicked: rec.is_clicked,
            created_at: rec.created_at
          };
        });
        setRecommendations(transformedData);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message || 'Không thể tải gợi ý việc làm');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (recommendationId) => {
    setDismissedJobs(prev => new Set([...prev, recommendationId]));
    // Track negative interaction
    aiService.trackInteraction(recommendationId, 'reject').catch(console.error);
  };

  const handleJobClick = (recommendationId) => {
    // Track click interaction
    aiService.trackInteraction(recommendationId, 'click').catch(console.error);
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    if (min && max) {
      return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu`;
    }
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu`;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'Rất phù hợp';
    if (confidence >= 0.6) return 'Phù hợp';
    return 'Có thể phù hợp';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={() => fetchRecommendations(true)}
          className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const visibleRecommendations = recommendations.filter(
    rec => !dismissedJobs.has(rec._id)
  );
  console.log('Visible Recommendations:', visibleRecommendations);

  if (visibleRecommendations.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <FiTrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Chưa có gợi ý việc làm phù hợp</p>
        <p className="text-sm text-gray-500 mt-1">
          Hệ thống đang học về sở thích của bạn
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FiStar className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Việc làm được đề xuất cho bạn
            </h3>
          </div>
          <button 
            onClick={() => fetchRecommendations(true)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Làm mới
          </button>
        </div>
      )}

      {visibleRecommendations.map((rec) => (
        <div 
          key={rec._id} 
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 relative group"
        >
          {/* Dismiss button */}
          <button
            onClick={() => handleDismiss(rec._id)}
            className="absolute top-2 right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Ẩn gợi ý này"
          >
            <FiX className="w-4 h-4 text-gray-600" />
          </button>

          <Link 
            to={`/jobs/${rec.job_id}`}
            onClick={() => handleJobClick(rec._id)}
            className="block p-4"
          >
            {/* Confidence badge */}
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(rec.confidence)}`}>
                <FiThumbsUp className="w-3 h-3 mr-1" />
                {getConfidenceLabel(rec.confidence)} ({Math.round(rec.confidence * 100)}%)
              </span>
              <span className="text-xs text-gray-500">
                Điểm: {rec.score.toFixed(1)}
              </span>
            </div>

            {/* Job title and company */}
            <h4 className="font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
              {rec.title}
            </h4>
            <p className="text-gray-700 text-sm mb-3">{rec.company_name}</p>

            {/* Job details */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-600">
              {rec.location && (
                <div className="flex items-center">
                  <FiMapPin className="w-4 h-4 mr-1 text-gray-400" />
                  {rec.location}
                </div>
              )}
              {rec.job_type && (
                <div className="flex items-center">
                  <FiBriefcase className="w-4 h-4 mr-1 text-gray-400" />
                  {rec.job_type}
                </div>
              )}
              {(rec.salary_min || rec.salary_max) && (
                <div className="flex items-center col-span-2">
                  <FiDollarSign className="w-4 h-4 mr-1 text-gray-400" />
                  {formatSalary(rec.salary_min, rec.salary_max)}
                </div>
              )}
            </div>

            {/* Recommendation reasons */}
            {showReasons && rec.reasons && rec.reasons.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1 font-medium">Tại sao phù hợp:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {rec.reasons.slice(0, 3).map((reason, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-primary-500 mr-1">•</span>
                      <span>{typeof reason === 'string' ? reason : reason.description || reason.factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Link>
        </div>
      ))}
    </div>
  );
};

JobRecommendations.propTypes = {
  limit: PropTypes.number,
  showTitle: PropTypes.bool,
  showReasons: PropTypes.bool
};

export default JobRecommendations;
