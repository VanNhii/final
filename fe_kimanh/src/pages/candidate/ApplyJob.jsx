import React, {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router';
import {toast} from 'react-toastify';
import jobService from '@/services/jobService';
import candidateService from '@/services/candidateService';
import uploadService from '@/services/uploadService';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const ApplyJob = () => {
    const {jobId} = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState(null);

    // Form state
    const [coverLetter, setCoverLetter] = useState('');
    const [useProfileCv, setUseProfileCv] = useState(true);
    const [cvFile, setCvFile] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch job details and profile in parallel
                const [jobRes, profileRes] = await Promise.all([
                    jobService.getJobById(jobId),
                    candidateService.getCandidateProfile()
                ]);

                if (jobRes.success) {
                    setJob(jobRes.data);
                } else {
                    toast.error('Không tìm thấy thông tin công việc');
                    navigate('/candidate/jobs');
                }

                if (profileRes.success) {
                    setProfile(profileRes.data);
                    // If user has no CV, default to upload new
                    if (!profileRes.data?.cv_url) {
                        setUseProfileCv(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Có lỗi xảy ra khi tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        if (jobId) {
            fetchData();
        }
    }, [jobId, navigate]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File không được quá 5MB');
                return;
            }
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Chỉ chấp nhận file PDF hoặc Word');
                return;
            }
            setCvFile(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!useProfileCv && !cvFile) {
            toast.error('Vui lòng tải lên CV của bạn');
            return;
        }

        if (useProfileCv && !profile?.cv_url) {
            toast.error('Bạn chưa có CV trong hồ sơ. Vui lòng tải lên CV mới.');
            setUseProfileCv(false);
            return;
        }

        try {
            setSubmitting(true);
            let cvUrl = profile?.cv_url;

            // Upload new CV if selected
            if (!useProfileCv && cvFile) {
                const uploadRes = await uploadService.uploadCV(cvFile);
                if (uploadRes.success) {
                    cvUrl = uploadRes.data.file_url;
                } else {
                    throw new Error('Upload CV thất bại');
                }
            }

            // Submit application
            const applicationData = {
                cv_url: cvUrl,
                cover_letter: coverLetter,
                job_id: jobId
            };

            const response = await candidateService.applyForJob(jobId, applicationData);

            if (response.success) {
                toast.success('Ứng tuyển thành công!');
                navigate('/candidate/applications');
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi ứng tuyển');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>;
    if (!job) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-6">
                        <h1 className="text-2xl font-bold text-white">Ứng tuyển công việc</h1>
                        <p className="text-indigo-100 mt-2">Hoàn thành form bên dưới để gửi hồ sơ của bạn</p>
                    </div>

                    <div className="p-8">
                        {/* Job Summary */}
                        <div className="mb-8 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">{job.title}</h2>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {job.company?.company_name || 'Công ty ẩn danh'}
                                </div>
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {typeof job.location === 'object'
                                        ? [job.location.address, job.location.city, job.location.country].filter(Boolean).join(', ')
                                        : job.location}
                                </div>
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {job.salary_range || 'Thỏa thuận'}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* CV Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Hồ sơ đính kèm (CV)</label>
                                <div className="space-y-4">
                                    {/* Option 1: Existing CV */}
                                    {profile?.cv_url && (
                                        <div
                                            className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all ${useProfileCv
                                                ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            onClick={() => setUseProfileCv(true)}
                                        >
                                            <div className="flex items-center h-5">
                                                <input
                                                    type="radio"
                                                    name="cv-option"
                                                    checked={useProfileCv}
                                                    onChange={() => setUseProfileCv(true)}
                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                                />
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <label className="font-medium text-gray-900 cursor-pointer">
                                                    Sử dụng CV trong hồ sơ
                                                </label>
                                                <div className="text-sm text-gray-500 flex items-center mt-1">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Hiện có: {profile.cv_url.split('/').pop()}
                                                </div>
                                            </div>
                                            {useProfileCv && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <a
                                                        href={profile.cv_url.startsWith('http') ? profile.cv_url : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${profile.cv_url}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        Xem CV
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Option 2: Upload New */}
                                    <div
                                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${!useProfileCv
                                            ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        onClick={() => setUseProfileCv(false)}
                                    >
                                        <div className="flex items-center h-5">
                                            <input
                                                type="radio"
                                                name="cv-option"
                                                checked={!useProfileCv}
                                                onChange={() => setUseProfileCv(false)}
                                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                            />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <label className="font-medium text-gray-900 cursor-pointer">
                                                Tải lên CV mới
                                            </label>
                                            {!useProfileCv && (
                                                <div className="mt-3">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx"
                                                        onChange={handleFileChange}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">Hỗ trợ PDF, DOC, DOCX (Tối đa 5MB)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Cover Letter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Thư giới thiệu (Cover Letter)
                                </label>
                                <textarea
                                    rows={6}
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Viết ngắn gọn về lý do bạn phù hợp với vị trí này..."
                                    className="shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-xl p-3"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`px-8 py-2.5 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] ${submitting ? 'opacity-70 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {submitting ? (
                                        <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Đang xử lý...
                                        </span>
                                    ) : 'Nộp hồ sơ ứng tuyển'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyJob;
