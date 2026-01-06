import CandidateRecommendations from '@/components/common/CandidateRecommendations';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import recruiterService from '@/services/recruiterService';
import {formatLocation} from '@/utils/formatters';
import {useEffect, useState} from 'react';
import {FiArrowLeft, FiBriefcase, FiUsers} from 'react-icons/fi';
import {Link, useParams} from 'react-router';

const JobCandidateRecommendations = () => {
  const {jobId} = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recruiterService.getMyJobById(jobId);

      if (response.success) {
        setJob(response.data);
      }
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError(err.message || 'Không thể tải thông tin công việc');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Không tìm thấy công việc'}</p>
            <Link
              to="/recruiter/jobs"
              className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Quay lại danh sách công việc
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/recruiter/jobs"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách công việc
          </Link>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiBriefcase className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {job.title}
                </h1>
                <div className="flex items-center text-gray-600 space-x-4">
                  <span className="flex items-center">
                    <FiUsers className="w-4 h-4 mr-1" />
                    Tìm ứng viên phù hợp
                  </span>
                </div>
                <p className="text-gray-600 mt-3">
                  Hệ thống AI sẽ phân tích và gợi ý những ứng viên phù hợp nhất với yêu cầu công việc của bạn
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Job Info Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Vị trí</p>
            <p className="font-semibold text-gray-900">{formatLocation(job.location)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Loại hình</p>
            <p className="font-semibold text-gray-900">{job.job_type || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Kinh nghiệm yêu cầu</p>
            <p className="font-semibold text-gray-900">
              {job.experience_required
                ? `${job.experience_required} năm`
                : 'Không yêu cầu'}
            </p>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiUsers className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ứng viên được AI đề xuất
              </h2>
              <p className="text-sm text-gray-600">
                Được sắp xếp theo độ phù hợp từ cao đến thấp
              </p>
            </div>
          </div>

          <CandidateRecommendations
            jobId={jobId}
            limit={20}
            showTitle={false}
            showReasons={true}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Lưu ý</h3>
              <p className="text-sm text-blue-700 mt-1">
                Độ phù hợp được tính toán dựa trên nhiều yếu tố như kỹ năng, kinh nghiệm, học vấn và lịch sử ứng tuyển của ứng viên.
                Bạn nên xem xét kỹ hồ sơ trước khi đưa ra quyết định.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCandidateRecommendations;
