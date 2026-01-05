import LoadingSpinner from '@/components/common/LoadingSpinner';
import candidateService from '@/services/candidateService';
import jobService from '@/services/jobService';
import uploadService from '@/services/uploadService';
import { useEffect, useState } from 'react';
import { BsBuilding, BsCheckCircle } from 'react-icons/bs';
import { FiAlertCircle, FiArrowLeft, FiBriefcase, FiFileText, FiMapPin, FiSend, FiUpload } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';

const ApplyJob = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState(null);
  
  const [formData, setFormData] = useState({
    cover_letter: '',
    cv_url: ''
  });
  
  const [cvFile, setCvFile] = useState(null);
  const [useProfileCV, setUseProfileCV] = useState(true);

  // Fetch job details and candidate profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch job details
        const jobResponse = await jobService.getJobById(jobId);
        if (jobResponse.success) {
          setJob(jobResponse.data);
          
          // Check if already applied
          const userApplication = jobResponse.data.applications?.find(
            app => app.candidate_id?.user_id === localStorage.getItem('userId')
          );
          
          if (userApplication) {
            toast.info('Bạn đã ứng tuyển vào vị trí này rồi!');
            navigate(`/jobs/${jobId}`);
            return;
          }
        }
        
        // Fetch candidate profile
        const profileResponse = await candidateService.getCandidateProfile();
        if (profileResponse.success) {
          setCandidateProfile(profileResponse.data);
          
          // Set default CV from profile
          if (profileResponse.data.cv_url) {
            setFormData(prev => ({ ...prev, cv_url: profileResponse.data.cv_url }));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Không thể tải thông tin việc làm');
        navigate('/candidate/jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, navigate]);

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file PDF hoặc Word');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File không được vượt quá 5MB');
      return;
    }

    setCvFile(file);
    setUseProfileCV(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      let cvUrl = formData.cv_url;
      
      // Upload new CV if selected
      if (cvFile && !useProfileCV) {
        const uploadResult = await uploadService.uploadCV(cvFile);
        
        if (uploadResult.success && uploadResult.data) {
          cvUrl = uploadResult.data.file_url;
        } else {
          throw new Error(uploadResult.message || 'Upload CV thất bại');
        }
      }
      
      // Validate CV
      if (!cvUrl && !candidateProfile?.cv_url) {
        toast.error('Vui lòng upload CV hoặc cập nhật CV trong hồ sơ của bạn');
        return;
      }
      
      // Submit application
      const applicationData = {
        cover_letter: formData.cover_letter.trim(),
        cv_url: cvUrl || candidateProfile?.cv_url
      };
      
      await candidateService.applyForJob(jobId, applicationData);
      
      toast.success('Ứng tuyển thành công!');
      navigate(`/jobs/${jobId}`);
      
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Không thể ứng tuyển. Vui lòng thử lại');
    } finally {
      setSubmitting(false);
    }
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
          <button
            onClick={() => navigate('/candidate/jobs')}
            className="text-blue-600 hover:text-blue-700"
          >
            ← Quay lại danh sách việc làm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => navigate(`/jobs/${jobId}`)}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <FiArrowLeft className="w-5 h-5 mr-2" />
          Quay lại chi tiết việc làm
        </button>

        {/* Job Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex items-start">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center mr-4">
              {job.recruiter_id?.company_logo_url ? (
                <img 
                  src={job.recruiter_id.company_logo_url} 
                  alt={job.recruiter_id.company_name}
                  className="w-12 h-12 object-contain rounded"
                />
              ) : (
                <BsBuilding className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <p className="text-lg text-gray-700 font-semibold mb-3 flex items-center">
                <BsBuilding className="w-4 h-4 mr-2 text-blue-600" />
                {job.recruiter_id?.company_name}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <span className="flex items-center bg-blue-50 px-3 py-1.5 rounded-lg">
                  <FiMapPin className="w-4 h-4 mr-1.5 text-blue-600" />
                  {job.location?.city || job.location || 'Remote'}
                </span>
                <span className="flex items-center bg-green-50 px-3 py-1.5 rounded-lg">
                  <FiBriefcase className="w-4 h-4 mr-1.5 text-green-600" />
                  {job.job_type || 'Full-time'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FiSend className="w-6 h-6 mr-3 text-blue-600" />
            Đơn ứng tuyển
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Letter */}
            <div>
              <label htmlFor="cover_letter" className="block text-sm font-semibold text-gray-700 mb-2">
                <FiFileText className="inline w-4 h-4 mr-1.5" />
                Thư giới thiệu
                <span className="text-gray-400 font-normal ml-2">(Không bắt buộc)</span>
              </label>
              <textarea
                id="cover_letter"
                rows={8}
                value={formData.cover_letter}
                onChange={(e) => setFormData(prev => ({ ...prev, cover_letter: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Giới thiệu bản thân, kinh nghiệm và lý do bạn phù hợp với vị trí này..."
                maxLength={2000}
              />
              <p className="text-sm text-gray-500 mt-2">
                {formData.cover_letter.length}/2000 ký tự
              </p>
            </div>

            {/* CV Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <FiUpload className="inline w-4 h-4 mr-1.5" />
                CV của bạn
                <span className="text-red-500 ml-1">*</span>
              </label>

              {/* Option 1: Use profile CV */}
              {candidateProfile?.cv_url && (
                <div className="mb-4">
                  <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <input
                      type="radio"
                      name="cvOption"
                      checked={useProfileCV}
                      onChange={() => {
                        setUseProfileCV(true);
                        setCvFile(null);
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">Sử dụng CV từ hồ sơ</p>
                      <a 
                        href={candidateProfile.cv_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Xem CV hiện tại →
                      </a>
                    </div>
                    {useProfileCV && <BsCheckCircle className="w-5 h-5 text-green-600" />}
                  </label>
                </div>
              )}

              {/* Option 2: Upload new CV */}
              <div>
                <label className="flex items-center p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="radio"
                    name="cvOption"
                    checked={!useProfileCV}
                    onChange={() => setUseProfileCV(false)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">Upload CV mới</p>
                    {!useProfileCV && (
                      <div className="mt-2">
                        <input
                          type="file"
                          id="cv_file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {cvFile && (
                          <p className="text-sm text-green-600 mt-2 flex items-center">
                            <BsCheckCircle className="w-4 h-4 mr-1.5" />
                            Đã chọn: {cvFile.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {!useProfileCV && cvFile && <BsCheckCircle className="w-5 h-5 text-green-600" />}
                </label>
              </div>

              <p className="text-sm text-gray-500 mt-2 flex items-start">
                <FiAlertCircle className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" />
                Chấp nhận file PDF hoặc Word, tối đa 5MB
              </p>
            </div>

            {/* Warning if no CV */}
            {!candidateProfile?.cv_url && !cvFile && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Chưa có CV</p>
                    <p>Bạn cần upload CV để có thể ứng tuyển vào vị trí này.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/jobs/${jobId}`)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || (!useProfileCV && !cvFile) || (!candidateProfile?.cv_url && !cvFile)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5 mr-2" />
                    Gửi đơn ứng tuyển
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Note */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiAlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Lưu ý:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Đơn ứng tuyển của bạn sẽ được gửi đến nhà tuyển dụng</li>
                <li>Bạn có thể theo dõi trạng thái đơn trong mục "Đơn ứng tuyển"</li>
                <li>Nhà tuyển dụng sẽ liên hệ với bạn qua email hoặc số điện thoại</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyJob;
