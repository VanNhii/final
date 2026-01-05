import { useEffect, useState } from 'react';
import { FaDownload, FaEye, FaSearch, FaTimes, FaUserPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import recruiterService from '../../services/recruiterService';

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  
  // Filters and search
  const [filters, setFilters] = useState({
    keyword: '',
    experience: '',
    location: '',
    skills: '',
    education: '',
    salaryRange: '',
    jobType: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const candidatesPerPage = 10;
  
  // Modal state
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalCandidates: 0,
    newThisWeek: 0,
    averageExperience: 0,
    topSkills: []
  });

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = {
        page: currentPage,
        limit: candidatesPerPage,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value && value.trim())
        )
      };
      
      const response = await recruiterService.searchCandidates(queryParams);
      
      if (response.success) {
        setCandidates(response.data.candidates || []);
        setTotalPages(Math.ceil((response.data.total || 0) / candidatesPerPage));
        setTotalCandidates(response.data.total || 0);
        
        // Update stats
        setStats({
          totalCandidates: response.data.total || 0,
          newThisWeek: response.data.stats?.newThisWeek || 0,
          averageExperience: response.data.stats?.averageExperience || 0,
          topSkills: response.data.stats?.topSkills || []
        });
      } else {
        throw new Error(response.message || 'Không thể tải danh sách ứng viên');
      }
    } catch (error) {
      console.error('Load candidates error:', error);
      setError(error.message);
      toast.error(`Lỗi tải ứng viên: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // useEffect
  useEffect(() => {
    loadCandidates();
  }, [currentPage, filters]);

  // Handle functions
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      keyword: '',
      experience: '',
      location: '',
      skills: '',
      education: '',
      salaryRange: '',
      jobType: ''
    });
    setCurrentPage(1);
  };

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else {
        return [...prev, candidateId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map(candidate => candidate._id));
    }
  };

  const handleViewCandidate = async (candidateId) => {
    try {
      const response = await recruiterService.getCandidateProfile(candidateId);
      if (response.success) {
        setSelectedCandidate(response.data);
        setShowCandidateModal(true);
      } else {
        toast.error('Không thể tải thông tin ứng viên');
      }
    } catch (error) {
      console.error('View candidate error:', error);
      toast.error('Lỗi khi xem thông tin ứng viên');
    }
  };

  const handleDownloadCV = async (candidateId, candidateName) => {
    try {
      await recruiterService.downloadCandidateCV(candidateId);
      toast.success(`Đã tải CV của ${candidateName}`);
    } catch (error) {
      console.error('Download CV error:', error);
      toast.error('Lỗi khi tải CV');
    }
  };

  const formatExperience = (years) => {
    if (!years) return 'Chưa có kinh nghiệm';
    if (years < 1) return 'Dưới 1 năm';
    return `${years} năm`;
  };

  const formatSalary = (salary) => {
    if (!salary) return 'Thương lượng';
    return `${salary.toLocaleString()} VND`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý ứng viên</h1>
              <p className="text-gray-600 mt-1">Tìm kiếm và quản lý ứng viên phù hợp</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleResetFilters}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FaTimes className="w-4 h-4 mr-2" />
                Reset bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <FaUserPlus className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng ứng viên</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCandidates}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <FaUserPlus className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mới tuần này</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.newThisWeek}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <FaUserPlus className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Kinh nghiệm TB</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageExperience} năm</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <FaUserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Đã chọn</p>
                <p className="text-2xl font-semibold text-gray-900">{selectedCandidates.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Từ khóa
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(e) => handleFilterChange('keyword', e.target.value)}
                  placeholder="Tên, kỹ năng..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kinh nghiệm
              </label>
              <select
                value={filters.experience}
                onChange={(e) => handleFilterChange('experience', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="0-1">0-1 năm</option>
                <option value="1-3">1-3 năm</option>
                <option value="3-5">3-5 năm</option>
                <option value="5+">5+ năm</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa điểm
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="Hà Nội, TP.HCM..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kỹ năng
              </label>
              <input
                type="text"
                value={filters.skills}
                onChange={(e) => handleFilterChange('skills', e.target.value)}
                placeholder="React, Node.js..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Danh sách ứng viên ({totalCandidates})
              </h2>
              {selectedCandidates.length > 0 && (
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Mời phỏng vấn ({selectedCandidates.length})
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    Tải CV ({selectedCandidates.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Đang tải...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadCandidates}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Thử lại
              </button>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Không tìm thấy ứng viên nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.length === candidates.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ứng viên
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kinh nghiệm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kỹ năng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mức lương mong muốn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Địa điểm
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.map((candidate) => (
                    <tr key={candidate._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate._id)}
                          onChange={() => handleCandidateSelect(candidate._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={candidate.avatar || '/default-avatar.png'}
                            alt={candidate.fullName}
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {candidate.fullName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {candidate.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatExperience(candidate.experience)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills?.slice(0, 3).map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills?.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{candidate.skills.length - 3} khác
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatSalary(candidate.expectedSalary)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.location || 'Chưa cập nhật'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewCandidate(candidate._id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => handleDownloadCV(candidate._id, candidate.fullName)}
                            className="text-green-600 hover:text-green-900"
                            title="Tải CV"
                          >
                            <FaDownload />
                          </button>
                          <button
                            className="text-purple-600 hover:text-purple-900"
                            title="Mời phỏng vấn"
                          >
                            <FaUserPlus />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              Hiển thị {((currentPage - 1) * candidatesPerPage) + 1} đến {Math.min(currentPage * candidatesPerPage, totalCandidates)} trong số {totalCandidates} ứng viên
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded-md text-sm font-medium ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 3 || page === currentPage + 3) {
                  return <span key={page} className="px-2 text-gray-500">...</span>;
                }
                return null;
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}

        {/* Candidate Detail Modal */}
        {showCandidateModal && selectedCandidate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Chi tiết ứng viên
                </h3>
                <button
                  onClick={() => setShowCandidateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <img
                      className="h-16 w-16 rounded-full object-cover"
                      src={selectedCandidate.avatar || '/default-avatar.png'}
                      alt={selectedCandidate.fullName}
                    />
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {selectedCandidate.fullName}
                      </h4>
                      <p className="text-gray-600">{selectedCandidate.email}</p>
                      <p className="text-gray-600">{selectedCandidate.phone}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kinh nghiệm</label>
                      <p className="text-sm text-gray-900">{formatExperience(selectedCandidate.experience)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Địa điểm</label>
                      <p className="text-sm text-gray-900">{selectedCandidate.location || 'Chưa cập nhật'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mức lương mong muốn</label>
                      <p className="text-sm text-gray-900">{formatSalary(selectedCandidate.expectedSalary)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Trình độ học vấn</label>
                      <p className="text-sm text-gray-900">{selectedCandidate.education || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kỹ năng</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills?.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {selectedCandidate.summary && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Giới thiệu bản thân</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedCandidate.summary}</p>
                    </div>
                  )}
                  
                  {selectedCandidate.workExperience && selectedCandidate.workExperience.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kinh nghiệm làm việc</label>
                      <div className="space-y-3">
                        {selectedCandidate.workExperience.map((exp, index) => (
                          <div key={index} className="border-l-4 border-blue-200 pl-4">
                            <h5 className="font-medium text-gray-900">{exp.position}</h5>
                            <p className="text-sm text-gray-600">{exp.company}</p>
                            <p className="text-xs text-gray-500">{exp.duration}</p>
                            {exp.description && (
                              <p className="text-sm text-gray-700 mt-1">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => handleDownloadCV(selectedCandidate._id, selectedCandidate.fullName)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <FaDownload className="w-4 h-4 mr-2 inline" />
                  Tải CV
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <FaUserPlus className="w-4 h-4 mr-2 inline" />
                  Mời phỏng vấn
                </button>
                <button
                  onClick={() => setShowCandidateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Candidates;