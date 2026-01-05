import aiService from '@/services/aiService';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import {
  FiBriefcase,
  FiClock,
  FiDollarSign,
  FiMapPin,
  FiTrendingUp
} from 'react-icons/fi';
import { Link } from 'react-router';

/**
 * SimilarJobs Component
 * Displays similar jobs based on AI recommendations
 */
const SimilarJobs = ({ jobId, limit = 5 }) => {
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (jobId) {
      fetchSimilarJobs();
    }
  }, [jobId, limit]);

  const fetchSimilarJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await aiService.getSimilarJobs(jobId, limit);
      
      if (response.success) {
        // Handle nested data structure: response.data.data contains the actual jobs array
        const jobsData = response.data?.data || response.data || [];
        const jobs = Array.isArray(jobsData) ? jobsData : [];
        setSimilarJobs(jobs);
      }
    } catch (err) {
      console.error('Error fetching similar jobs:', err);
      setError(err.message || 'Không thể tải việc làm tương tự');
      setSimilarJobs([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (min, max) => {
    if (!min && !max) return 'Thỏa thuận';
    if (min && max) {
      return `${(min / 1000000).toFixed(0)} - ${(max / 1000000).toFixed(0)} triệu`;
    }
    if (min) return `Từ ${(min / 1000000).toFixed(0)} triệu`;
    if (max) return `Đến ${(max / 1000000).toFixed(0)} triệu`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
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
    return null; // Silent fail for similar jobs
  }

  if (similarJobs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-4">
        <FiTrendingUp className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Việc làm tương tự
        </h3>
      </div>

      <div className="space-y-4">
        {similarJobs.map((job) => (
          <Link
            key={job._id || job.job_id}
            to={`/jobs/${job._id || job.job_id}`}
            className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
              {job.title}
            </h4>
            <p className="text-gray-700 text-sm mb-3">{job.company_name}</p>

            <div className="space-y-2 text-sm text-gray-600">
              {job.location && (
                <div className="flex items-center">
                  <FiMapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {job.location?.city || job.location}
                </div>
              )}
              {job.job_type && (
                <div className="flex items-center">
                  <FiBriefcase className="w-4 h-4 mr-2 text-gray-400" />
                  {job.job_type}
                </div>
              )}
              {(job.salary_min || job.salary_max) && (
                <div className="flex items-center">
                  <FiDollarSign className="w-4 h-4 mr-2 text-gray-400" />
                  {formatSalary(job.salary_min, job.salary_max)}
                </div>
              )}
              {job.created_at && (
                <div className="flex items-center">
                  <FiClock className="w-4 h-4 mr-2 text-gray-400" />
                  {formatDate(job.created_at)}
                </div>
              )}
            </div>

            {/* Similarity score if available */}
            {job.similarity_score && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Độ tương đồng:</span>
                  <span className="text-xs font-medium text-primary-600">
                    {Math.round(job.similarity_score * 100)}%
                  </span>
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

SimilarJobs.propTypes = {
  jobId: PropTypes.string.isRequired,
  limit: PropTypes.number
};

export default SimilarJobs;
