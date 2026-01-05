import aiService from '@/services/aiService';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import {
    FiAward,
    FiBriefcase,
    FiStar,
    FiThumbsUp,
    FiTrendingUp,
    FiUser,
    FiX
} from 'react-icons/fi';

/**
 * CandidateRecommendations Component
 * Displays AI-powered candidate recommendations for recruiters
 */
const CandidateRecommendations = ({ jobId, limit = 10, showTitle = true, showReasons = true }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissedCandidates, setDismissedCandidates] = useState(new Set());

  useEffect(() => {
    if (jobId) {
      fetchRecommendations();
    }
  }, [jobId, limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await aiService.getCandidateRecommendations(jobId, { limit });
      
      if (response.success) {
        setRecommendations(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching candidate recommendations:', err);
      setError(err.message || 'Không thể tải gợi ý ứng viên');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (recommendationId) => {
    setDismissedCandidates(prev => new Set([...prev, recommendationId]));
    // Track negative interaction
    aiService.trackInteraction(recommendationId, 'reject').catch(console.error);
  };

  const handleCandidateClick = (recommendationId) => {
    // Track click interaction
    aiService.trackInteraction(recommendationId, 'click').catch(console.error);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'Rất phù hợp';
    if (confidence >= 0.6) return 'Phù hợp';
    return 'Có thể phù hợp';
  };

  const getReasonText = (reason) => {
    if (!reason) return '';
    if (typeof reason === 'string') return reason;
    if (typeof reason.description === 'string' && reason.description.trim()) {
      return reason.description;
    }
    if (typeof reason.factor === 'string' && reason.factor.trim()) {
      return reason.factor;
    }
    return JSON.stringify(reason);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
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
          onClick={fetchRecommendations}
          className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const visibleRecommendations = recommendations.filter(
    rec => !dismissedCandidates.has(rec._id)
  );

  if (visibleRecommendations.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <FiTrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Chưa có gợi ý ứng viên phù hợp</p>
        <p className="text-sm text-gray-500 mt-1">
          Hệ thống đang tìm kiếm ứng viên phù hợp cho công việc này
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FiStar className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Ứng viên được đề xuất
            </h3>
          </div>
          <button 
            onClick={fetchRecommendations}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Làm mới
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleRecommendations.map((rec) => (
          <div 
            key={rec._id} 
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 relative group"
          >
            {/* Dismiss button */}
            <button
              onClick={() => handleDismiss(rec._id)}
              className="absolute top-2 right-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              title="Ẩn gợi ý này"
            >
              <FiX className="w-4 h-4 text-gray-600" />
            </button>

            <div 
              onClick={() => handleCandidateClick(rec._id)}
              className="p-5 cursor-pointer"
            >
              {/* Confidence badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(rec.confidence)}`}>
                  <FiThumbsUp className="w-3 h-3 mr-1" />
                  {getConfidenceLabel(rec.confidence)}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  Điểm: {rec.score.toFixed(1)}
                </span>
              </div>

              {/* Candidate info */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <FiUser className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    Ứng viên #{rec.candidate_id?.slice(-6)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {rec.experience_years || 0} năm kinh nghiệm
                  </p>
                </div>
              </div>

              {/* Candidate details */}
              <div className="space-y-2 mb-3 text-sm">
                {rec.education_level && (
                  <div className="flex items-center text-gray-600">
                    <FiAward className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="capitalize">{rec.education_level}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <FiBriefcase className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Độ phù hợp: {Math.round(rec.confidence * 100)}%</span>
                </div>
              </div>

              {/* Recommendation reasons */}
              {showReasons && rec.reasons && rec.reasons.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Lý do phù hợp:</p>
                  <ul className="text-xs text-gray-600 space-y-1.5">
                    {rec.reasons.slice(0, 3).map((reason, idx) => {
                      const reasonText = getReasonText(reason);
                      if (!reasonText) return null;
                      return (
                        <li key={idx} className="flex items-start">
                          <span className="text-primary-500 mr-1.5">•</span>
                          <span className="flex-1">{reasonText}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* View Profile Button */}
              <button className="mt-4 w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                Xem hồ sơ chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

CandidateRecommendations.propTypes = {
  jobId: PropTypes.string.isRequired,
  limit: PropTypes.number,
  showTitle: PropTypes.bool,
  showReasons: PropTypes.bool
};

export default CandidateRecommendations;
