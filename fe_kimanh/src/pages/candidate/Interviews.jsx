import LoadingSpinner from '@/components/common/LoadingSpinner';
import candidateService from '@/services/candidateService';
import {useEffect, useState} from 'react';
import {formatLocation} from '@/utils/formatters';
import {FiCalendar, FiClock, FiMapPin, FiVideo, FiMonitor, FiUser, FiInfo, FiX, FiCheckCircle} from 'react-icons/fi';
import {toast} from 'react-toastify';

const CandidateInterviews = () => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        try {
            setLoading(true);
            const response = await candidateService.getCandidateInterviews();
            if (response.success) {
                setInterviews(response.data.data || response.data);
            }
        } catch (error) {
            console.error('Error fetching interviews:', error);
            toast.error('Không thể tải lịch phỏng vấn');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (interview) => {
        setSelectedInterview(interview);
        setShowDetailModal(true);
    };

    // Helper formatting functions
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    const formatTime = (time) => {
        if (!time) return '';
        // If it's a full date string
        if (time.includes('T')) {
            return new Date(time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
        }
        return time;
    };

    const getStatusBadge = (status) => {
        const badges = {
            scheduled: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };

        const labels = {
            scheduled: 'Sắp tới',
            completed: 'Đã hoàn thành',
            cancelled: 'Đã hủy',
            pending: 'Chờ xác nhận'
        };

        const currentStatus = status?.toLowerCase() || 'pending';

        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badges[currentStatus] || badges.pending}`}>
                {labels[currentStatus] || status}
            </span>
        );
    };

    const filteredInterviews = filter === 'all'
        ? interviews
        : interviews.filter(item => item.status?.toLowerCase() === filter);

    // Derived stats
    const stats = {
        total: interviews.length,
        scheduled: interviews.filter(i => i.status?.toLowerCase() === 'scheduled').length,
        completed: interviews.filter(i => i.status?.toLowerCase() === 'completed').length,
        cancelled: interviews.filter(i => i.status?.toLowerCase() === 'cancelled').length
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Lịch phỏng vấn của tôi</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500">Tổng lịch hẹn</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500">Sắp tới</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500">Đã hoàn thành</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-sm font-medium text-gray-500">Đã hủy</p>
                    <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Filters */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Danh sách phỏng vấn</h3>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Tất cả</option>
                        <option value="scheduled">Sắp tới</option>
                        <option value="completed">Đã hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-200">
                    {filteredInterviews.length > 0 ? (
                        filteredInterviews.map((interview) => (
                            <div key={interview._id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    {/* Info Section */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {interview.job_id?.title || 'Phỏng vấn tuyển dụng'}
                                            </h3>
                                            <div className="md:hidden">
                                                {getStatusBadge(interview.status)}
                                            </div>
                                        </div>

                                        <p className="text-gray-600 mb-3 font-medium">
                                            {interview.job_id?.recruiter_id?.company_name || interview.company_name || 'Công ty'}
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <FiCalendar className="w-4 h-4 mr-2 text-blue-500" />
                                                <span>{formatDate(interview.interview_date)}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <FiClock className="w-4 h-4 mr-2 text-orange-500" />
                                                <span>{formatTime(interview.start_time)} - {formatTime(interview.end_time)}</span>
                                            </div>
                                            <div className="flex items-center">
                                                {interview.meeting_type === 'online' ? (
                                                    <FiVideo className="w-4 h-4 mr-2 text-purple-500" />
                                                ) : (
                                                    <FiMapPin className="w-4 h-4 mr-2 text-red-500" />
                                                )}
                                                <span className="capitalize">{interview.meeting_type === 'online' ? 'Online Meeting' : 'Gặp trực tiếp'}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <FiUser className="w-4 h-4 mr-2 text-gray-400" />
                                                <span>Người PV: {interview.interviewer_name || 'Nhà tuyển dụng'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="flex flex-col items-end gap-3 min-w-[140px]">
                                        <div className="hidden md:block">
                                            {getStatusBadge(interview.status)}
                                        </div>

                                        <div className="flex gap-2 w-full justify-end">
                                            <button
                                                onClick={() => handleViewDetails(interview)}
                                                className="flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors w-full md:w-auto"
                                            >
                                                <FiInfo className="w-4 h-4 mr-2" />
                                                Chi tiết
                                            </button>

                                            {interview.status === 'scheduled' && interview.meeting_type === 'online' && interview.meeting_link && (
                                                <a
                                                    href={interview.meeting_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors w-full md:w-auto"
                                                >
                                                    <FiMonitor className="w-4 h-4 mr-2" />
                                                    Vào họp
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <FiCalendar className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có lịch phỏng vấn</h3>
                            <p className="text-gray-500">Bạn chưa có lịch phỏng vấn nào phù hợp với bộ lọc này.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedInterview && (
                <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-all duration-300">
                    <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in-up">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">Chi tiết phỏng vấn</h3>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-full"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">

                            {/* Job & Conpany Header */}
                            <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
                                    {selectedInterview.job_id?.recruiter_id?.company_name?.charAt(0) || 'C'}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-gray-900">{selectedInterview.job_id?.title}</h4>
                                    <p className="text-gray-600">{selectedInterview.job_id?.recruiter_id?.company_name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Ngày & Giờ</label>
                                    <div className="flex items-center text-gray-900 font-medium">
                                        <FiCalendar className="w-5 h-5 mr-2 text-blue-500" />
                                        {formatDate(selectedInterview.interview_date)}
                                    </div>
                                    <div className="flex items-center text-gray-900 font-medium mt-1 ml-7">
                                        {formatTime(selectedInterview.start_time)} - {formatTime(selectedInterview.end_time)}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Hình thức</label>
                                    <div className="flex items-center text-gray-900 font-medium">
                                        {selectedInterview.meeting_type === 'online' ? (
                                            <FiVideo className="w-5 h-5 mr-2 text-purple-500" />
                                        ) : (
                                            <FiMapPin className="w-5 h-5 mr-2 text-red-500" />
                                        )}
                                        <span className="capitalize">
                                            {selectedInterview.meeting_type === 'online' ? 'Online / Trực tuyến' : 'Offline / Trực tiếp'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Location or Link */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    {selectedInterview.meeting_type === 'online' ? 'Đường dẫn tham gia' : 'Địa điểm phỏng vấn'}
                                </label>
                                {selectedInterview.meeting_type === 'online' ? (
                                    selectedInterview.meeting_link ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-blue-600 truncate mr-2">{selectedInterview.meeting_link}</span>
                                            <a
                                                href={selectedInterview.meeting_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition"
                                            >
                                                Mở Link
                                            </a>
                                        </div>
                                    ) : <span className="text-gray-500 italic">Chưa cập nhật link</span>
                                ) : (
                                    <p className="text-gray-900">{formatLocation(selectedInterview.location)}</p>
                                )}
                            </div>

                            {/* Notes */}
                            {selectedInterview.notes && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Ghi chú</label>
                                    <p className="text-gray-700 text-sm bg-yellow-50 p-3 rounded border border-yellow-100">
                                        {selectedInterview.notes}
                                    </p>
                                </div>
                            )}

                            {/* Status */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <span className="text-sm text-gray-500">Trạng thái hiện tại:</span>
                                {getStatusBadge(selectedInterview.status)}
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium shadow-sm transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateInterviews;
