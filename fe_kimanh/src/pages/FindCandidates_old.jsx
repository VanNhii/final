import { useEffect, useState } from 'react';

const FindCandidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [filters, setFilters] = useState({
    skills: '',
    experience: '',
    location: '',
    availability: '',
    salaryRange: ''
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [loading, setLoading] = useState(false);

  // Mock data for development
  const mockCandidates = [
    {
      id: 1,
      name: 'Nguyễn Văn An',
      title: 'Senior Frontend Developer',
      avatar: '/images/candidates/candidate1.jpg',
      location: 'Hà Nội',
      experience: '5 năm',
      skills: ['React', 'Vue.js', 'TypeScript', 'JavaScript', 'CSS', 'HTML'],
      expectedSalary: '25-35 triệu VNĐ',
      availability: 'Sẵn sàng',
      lastActive: '2 ngày trước',
      profileComplete: 95,
      bio: 'Passionate Frontend Developer với 5 năm kinh nghiệm phát triển ứng dụng web hiện đại. Chuyên sâu về React ecosystem và có kinh nghiệm làm việc với các dự án scale lớn.',
      education: 'Cử nhân CNTT - ĐH Bách Khoa',
      workPreference: 'Hybrid',
      languages: ['Vietnamese', 'English'],
      certifications: ['AWS Certified Developer'],
      projectsCount: 12,
      githubUrl: 'https://github.com/nguyenvanan',
      linkedinUrl: 'https://linkedin.com/in/nguyenvanan',
      isVerified: true,
      rating: 4.8
    },
    {
      id: 2,
      name: 'Trần Thị Lan',
      title: 'Full Stack Developer',
      avatar: '/images/candidates/candidate2.jpg',
      location: 'TP.HCM',
      experience: '3 năm',
      skills: ['React', 'Node.js', 'MongoDB', 'Express', 'PostgreSQL', 'AWS'],
      expectedSalary: '20-28 triệu VNĐ',
      availability: '2 tuần nữa',
      lastActive: '1 ngày trước',
      profileComplete: 88,
      bio: 'Full Stack Developer với passion về việc xây dựng products từ idea đến production. Có kinh nghiệm về cả frontend và backend technologies.',
      education: 'Cử nhân CNTT - ĐH FPT',
      workPreference: 'Remote',
      languages: ['Vietnamese', 'English', 'Japanese'],
      certifications: ['MongoDB Certified'],
      projectsCount: 8,
      githubUrl: 'https://github.com/tranthilan',
      linkedinUrl: 'https://linkedin.com/in/tranthilan',
      isVerified: true,
      rating: 4.6
    },
    {
      id: 3,
      name: 'Lê Văn Minh',
      title: 'DevOps Engineer',
      avatar: '/images/candidates/candidate3.jpg',
      location: 'Đà Nẵng',
      experience: '4 năm',
      skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Jenkins', 'Terraform'],
      expectedSalary: '30-40 triệu VNĐ',
      availability: 'Sẵn sàng',
      lastActive: '3 giờ trước',
      profileComplete: 92,
      bio: 'DevOps Engineer với expertise về cloud infrastructure và automation. Đã triển khai và maintain các hệ thống scale lớn phục vụ millions users.',
      education: 'Thạc sĩ CNTT - ĐH Bách Khoa',
      workPreference: 'Onsite',
      languages: ['Vietnamese', 'English'],
      certifications: ['AWS Solutions Architect', 'CKA'],
      projectsCount: 15,
      githubUrl: 'https://github.com/levanminh',
      linkedinUrl: 'https://linkedin.com/in/levanminh',
      isVerified: true,
      rating: 4.9
    },
    {
      id: 4,
      name: 'Phạm Thị Hương',
      title: 'UI/UX Designer',
      avatar: '/images/candidates/candidate4.jpg',
      location: 'Hà Nội',
      experience: '2 năm',
      skills: ['Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'User Research', 'Prototyping'],
      expectedSalary: '15-22 triệu VNĐ',
      availability: '1 tháng nữa',
      lastActive: '5 ngày trước',
      profileComplete: 85,
      bio: 'Creative UI/UX Designer với eye for details và passion về user-centered design. Có kinh nghiệm design cho cả web và mobile applications.',
      education: 'Cử nhân Mỹ thuật Đồ họa',
      workPreference: 'Hybrid',
      languages: ['Vietnamese', 'English'],
      certifications: ['Google UX Design Certificate'],
      projectsCount: 6,
      githubUrl: null,
      linkedinUrl: 'https://linkedin.com/in/phamthihuong',
      isVerified: false,
      rating: 4.5
    },
    {
      id: 5,
      name: 'Hoàng Đức Tài',
      title: 'Data Scientist',
      avatar: '/images/candidates/candidate5.jpg',
      location: 'TP.HCM',
      experience: '3 năm',
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'PyTorch', 'SQL', 'R'],
      expectedSalary: '25-35 triệu VNĐ',
      availability: 'Sẵn sàng',
      lastActive: '1 ngày trước',
      profileComplete: 90,
      bio: 'Data Scientist với background mạnh về Mathematics và Statistics. Có kinh nghiệm triển khai ML models vào production và data analysis.',
      education: 'Thạc sĩ Toán học - ĐH Khoa học Tự nhiên',
      workPreference: 'Remote',
      languages: ['Vietnamese', 'English'],
      certifications: ['TensorFlow Certified', 'AWS ML Specialty'],
      projectsCount: 10,
      githubUrl: 'https://github.com/hoangductai',
      linkedinUrl: 'https://linkedin.com/in/hoangductai',
      isVerified: true,
      rating: 4.7
    }
  ];

  const skillOptions = ['React', 'Vue.js', 'Angular', 'Node.js', 'Python', 'Java', 'PHP', 'C#', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Kubernetes'];
  const experienceOptions = ['0-1 năm', '1-2 năm', '2-3 năm', '3-5 năm', '5+ năm'];
  const locationOptions = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Remote'];
  const availabilityOptions = ['Sẵn sàng', '1-2 tuần', '1 tháng', '2-3 tháng'];
  const salaryOptions = ['10-15 triệu', '15-20 triệu', '20-25 triệu', '25-30 triệu', '30+ triệu'];

  useEffect(() => {
    // TODO: Replace with actual API call
    setCandidates(mockCandidates);
    setFilteredCandidates(mockCandidates);
  }, []);

  useEffect(() => {
    let filtered = candidates;

    // Apply filters
    if (filters.skills) {
      filtered = filtered.filter(candidate =>
        candidate.skills.some(skill =>
          skill.toLowerCase().includes(filters.skills.toLowerCase())
        )
      );
    }

    if (filters.experience) {
      filtered = filtered.filter(candidate =>
        candidate.experience.includes(filters.experience.split(' ')[0])
      );
    }

    if (filters.location) {
      filtered = filtered.filter(candidate =>
        candidate.location === filters.location
      );
    }

    if (filters.availability) {
      filtered = filtered.filter(candidate =>
        candidate.availability.includes(filters.availability.split('-')[0])
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'experience':
        filtered.sort((a, b) => parseInt(b.experience) - parseInt(a.experience));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'lastActive':
        filtered.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
        break;
      default:
        // Keep original order for relevance
        break;
    }

    setFilteredCandidates(filtered);
  }, [candidates, filters, sortBy]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      skills: '',
      experience: '',
      location: '',
      availability: '',
      salaryRange: ''
    });
  };

  const getAvailabilityBadge = (availability) => {
    if (availability === 'Sẵn sàng') {
      return 'bg-green-100 text-green-800';
    } else if (availability.includes('tuần')) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              🔍 Tìm ứng viên IT tài năng
            </h1>
            <p className="text-xl text-purple-100 max-w-3xl mx-auto">
              Khám phá hồ sơ của hàng nghìn ứng viên IT chất lượng cao. 
              Tìm đúng người cho vị trí của bạn.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Bộ lọc</h2>
                <button
                  onClick={clearFilters}
                  className="text-purple-600 hover:text-purple-700 text-sm"
                >
                  Xóa tất cả
                </button>
              </div>

              {/* Skills Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kỹ năng
                </label>
                <input
                  type="text"
                  placeholder="VD: React, Node.js..."
                  value={filters.skills}
                  onChange={(e) => handleFilterChange('skills', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Experience Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kinh nghiệm
                </label>
                <select
                  value={filters.experience}
                  onChange={(e) => handleFilterChange('experience', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tất cả</option>
                  {experienceOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa điểm
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tất cả</option>
                  {locationOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khả năng sẵn sàng
                </label>
                <select
                  value={filters.availability}
                  onChange={(e) => handleFilterChange('availability', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tất cả</option>
                  {availabilityOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              {/* Salary Range Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mức lương mong muốn
                </label>
                <select
                  value={filters.salaryRange}
                  onChange={(e) => handleFilterChange('salaryRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Tất cả</option>
                  {salaryOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Search Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {filteredCandidates.length} ứng viên tìm thấy
                </h2>
                <p className="text-gray-600 mt-1">
                  Các ứng viên phù hợp với tiêu chí tìm kiếm của bạn
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="relevance">Độ phù hợp</option>
                  <option value="experience">Kinh nghiệm</option>
                  <option value="rating">Đánh giá</option>
                  <option value="lastActive">Hoạt động gần đây</option>
                </select>
              </div>
            </div>

            {/* Candidates List */}
            <div className="space-y-6">
              {filteredCandidates.map(candidate => (
                <div key={candidate.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Avatar and Basic Info */}
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <img
                          src={candidate.avatar || '/images/candidates/default.jpg'}
                          alt={candidate.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        {candidate.isVerified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-1">
                              {candidate.name}
                            </h3>
                            <p className="text-primary-600 font-medium mb-2">{candidate.title}</p>
                            <div className="flex items-center text-sm text-gray-500 space-x-4 mb-3">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {candidate.location}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 00-2 2H10a2 2 0 00-2-2V4" />
                                </svg>
                                {candidate.experience}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {candidate.expectedSalary}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAvailabilityBadge(candidate.availability)}`}>
                              {candidate.availability}
                            </span>
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {candidate.rating}
                            </div>
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {candidate.bio}
                        </p>

                        {/* Skills */}
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills.slice(0, 6).map(skill => (
                              <span
                                key={skill}
                                className="bg-primary-50 text-primary-700 px-2 py-1 rounded text-sm font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                            {candidate.skills.length > 6 && (
                              <span className="text-gray-500 text-sm">
                                +{candidate.skills.length - 6} kỹ năng khác
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Profile: {candidate.profileComplete}%</span>
                            <span>Dự án: {candidate.projectsCount}</span>
                            <span>Online: {candidate.lastActive}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            {candidate.githubUrl && (
                              <a
                                href={candidate.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                              </a>
                            )}
                            <a
                              href={candidate.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-600"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                            </a>
                            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                              Xem hồ sơ
                            </button>
                            <button className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium">
                              Liên hệ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* No Results */}
            {filteredCandidates.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy ứng viên</h3>
                <p className="text-gray-500">Thử điều chỉnh bộ lọc để tìm thêm ứng viên phù hợp.</p>
              </div>
            )}

            {/* Load More */}
            {filteredCandidates.length >= 10 && (
              <div className="text-center mt-8">
                <button className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors">
                  Xem thêm ứng viên
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindCandidates;