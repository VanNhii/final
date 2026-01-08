import { useState } from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import reportService from '@/services/reportService';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

const ReportModal = ({ isOpen, onClose, entityType, entityId, entityTitle }) => {
  const [reportType, setReportType] = useState('fake_job');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (evidenceFiles.length + files.length > 5) {
        toast.error('Chỉ được tải lên tối đa 5 ảnh minh chứng');
        return;
      }
      setEvidenceFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim() || !description.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('reported_entity_type', entityType);
      formData.append('reported_entity_id', entityId);
      formData.append('report_type', reportType);
      formData.append('reason', reason);
      formData.append('description', description);
      formData.append('priority', 'medium');

      evidenceFiles.forEach(file => {
        formData.append('evidence', file);
      });

      await reportService.createReport(formData);

      toast.success('Báo cáo đã được gửi thành công. Admin sẽ xem xét sớm.');
      onClose();
      // Reset form
      setReason('');
      setDescription('');
      setReportType('fake_job');
      setEvidenceFiles([]);
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi gửi báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    { value: 'fake_job', label: 'Việc làm giả mạo' },
    { value: 'scam', label: 'Lừa đảo / Đa cấp' },
    { value: 'inappropriate_content', label: 'Nội dung không phù hợp' },
    { value: 'spam', label: 'Spam / Quảng cáo' },
    { value: 'discrimination', label: 'Phân biệt đối xử' },
    { value: 'harassment', label: 'Quấy rối' },
    { value: 'other', label: 'Khác' }
  ];

  return (
    <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-white/30 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <FiAlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Báo cáo vi phạm
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      Báo cáo việc làm: <strong>{entityTitle}</strong>
                    </p>

                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Loại vi phạm
                        </label>
                        <select
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={reportType}
                          onChange={(e) => setReportType(e.target.value)}
                        >
                          {reportTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Lý do ngắn gọn
                        </label>
                        <input
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          type="text"
                          placeholder="Ví dụ: Công ty yêu cầu đóng tiền"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          maxLength={100}
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Mô tả chi tiết
                        </label>
                        <textarea
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          rows="4"
                          placeholder="Vui lòng cung cấp thêm thông tin chi tiết..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          maxLength={1000}
                          required
                        ></textarea>
                        <p className="text-xs text-gray-500 mt-1 text-right">{description.length}/1000</p>
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Bằng chứng (Hình ảnh/Tài liệu)
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                          <div className="space-y-1 text-center">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="evidence-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                              >
                                <span>Tải lên file</span>
                                <input
                                  id="evidence-upload"
                                  name="evidence-upload"
                                  type="file"
                                  className="sr-only"
                                  multiple
                                  accept="image/*,.pdf,.doc,.docx"
                                  onChange={handleFileChange}
                                />
                              </label>
                              <p className="pl-1">hoặc kéo thả vào đây</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, PDF tối đa 10MB (Max 5 file)</p>
                          </div>
                        </div>

                        {evidenceFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Các file đã chọn:</h4>
                            <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                              {evidenceFiles.map((file, index) => (
                                <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                                  <div className="w-0 flex-1 flex items-center">
                                    <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                    </svg>
                                    <span className="ml-2 flex-1 w-0 truncate" title={file.name}>
                                      {file.name}
                                    </span>
                                    <span className="ml-2 text-gray-500 text-xs">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  </div>
                                  <div className="ml-4 flex-shrink-0">
                                    <button
                                      type="button"
                                      className="font-medium text-red-600 hover:text-red-500"
                                      onClick={() => removeFile(index)}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                          {loading ? <LoadingSpinner size="sm" /> : 'Gửi báo cáo'}
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                          onClick={onClose}
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
