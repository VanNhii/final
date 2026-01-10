import LoadingSpinner from '@/components/common/LoadingSpinner';
import contentService from '@/services/contentService';
import jobService from '@/services/jobService';
import recruiterService from '@/services/recruiterService';
import { useEffect, useState } from 'react';
import { BsBuilding, BsFire, BsRocket, BsStar } from 'react-icons/bs';
import {
  FiArrowRight,
  FiBriefcase,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiMapPin,
  FiSearch
} from 'react-icons/fi';
import { MdCategory } from 'react-icons/md';
import { Link, useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import JobRecommendations from '@/components/common/JobRecommendations';

const Home = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // API data states
  const [featuredJobs, setFeaturedJobs] = useState([]);
  // const [recentJobs, setRecentJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [blogPosts, setBlogPosts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobStats, setJobStats] = useState({
    totalJobs: 0,
    totalCompanies: 0,
    totalApplications: 0,
    totalCandidates: 0
  });
  const [loading, setLoading] = useState(true);

  const testimonials = [
    {
      id: 1,
      name: 'Nguyễn Văn An',
      role: 'Senior Developer',
      company: 'TechCorp',
      content: 'Tôi đã tìm được công việc mơ ước chỉ sau 2 tuần đăng ký. Platform này thực sự hiệu quả!',
      avatar: '/images/testimonials/user1.jpg'
    },
    {
      id: 2,
      name: 'Trần Thị Lan',
      role: 'HR Manager',
      company: 'StartupX',
      content: 'Chất lượng ứng viên ở đây rất cao. Chúng tôi đã tuyển được nhiều người tài.',
      avatar: '/images/testimonials/user2.jpg'
    },
    {
      id: 3,
      name: 'Lê Văn Minh',
      role: 'DevOps Engineer',
      company: 'CloudTech',
      content: 'Giao diện thân thiện, dễ sử dụng. Hệ thống matching rất chính xác.',
      avatar: '/images/testimonials/user3.jpg'
    }
  ];

  const topCompanies = [
    { name: 'VNG Corporation', logo: '/images/companies/vng.png' },
    { name: 'FPT Software', logo: '/images/companies/fpt.png' },
    { name: 'TMA Solutions', logo: '/images/companies/tma.png' },
    { name: 'Viettel Digital', logo: '/images/companies/viettel.png' },
    { name: 'Samsung SDS', logo: '/images/companies/samsung.png' },
    { name: 'Grab Vietnam', logo: '/images/companies/grab.png' }
  ];

  // Load data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch featured/recent jobs
        const [jobsResponse, categoriesResponse, contentResponse, statsResponse, companiesResponse] = await Promise.all([
          jobService.getJobs({ limit: 8, sort: '-created_at' }),
          jobService.getJobCategories({ is_active: true }), // Fetch all active categories
          contentService.getContentByType('blog', { limit: 3, sort: '-published_at' }),
          jobService.getJobGlobalStats(),
          recruiterService.getPublicRecruiters({ limit: 12 })
        ]);

        if (jobsResponse.success) {
          // Handle nested data structure
          const jobsData = jobsResponse.data?.data || jobsResponse.data || [];
          const jobs = Array.isArray(jobsData) ? jobsData : [];
          setFeaturedJobs(jobs);
        }

        if (statsResponse?.success) {
          setJobStats(statsResponse.data);
        }

        if (categoriesResponse.success) {
          // Handle nested data structure
          const categoriesData = categoriesResponse.data?.data || categoriesResponse.data || [];
          const cats = Array.isArray(categoriesData) ? categoriesData : [];
          setCategories(cats);
        }

        if (contentResponse.success) {
          // Handle nested data structure
          const contentData = contentResponse.data?.data || contentResponse.data || [];
          const posts = Array.isArray(contentData) ? contentData : [];
          setBlogPosts(posts);
        }

        if (companiesResponse.success) {
          const companiesData = companiesResponse.data?.data || companiesResponse.data || [];
          setCompanies(companiesData);
        }

      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Testimonial slider
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchKeyword) params.append('search', searchKeyword);
    if (selectedCategory) params.append('category', selectedCategory);
    if (selectedLocation) params.append('location', selectedLocation);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-20 lg:py-32 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-300 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Kết nối tài năng IT
                <br />
                <span className="text-yellow-300">
                  hàng đầu Việt Nam
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed">
                Nền tảng tuyển dụng IT số 1 với hơn 50,000+ việc làm từ 1,000+ công ty uy tín
              </p>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300">
                  <div className="text-2xl font-bold text-yellow-300">{jobStats.totalJobs || '50K'}+</div>
                  <div className="text-sm text-blue-100">Việc làm</div>
                </div>
                <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300">
                  <div className="text-2xl font-bold text-yellow-300">{jobStats.totalCompanies || '1K'}+</div>
                  <div className="text-sm text-blue-100">Công ty</div>
                </div>
                <div className="text-center p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300">
                  <div className="text-2xl font-bold text-yellow-300">{jobStats.totalCandidates || '100K'}+</div>
                  <div className="text-sm text-blue-100">Ứng viên</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/jobs"
                  className="flex items-center justify-center bg-yellow-400 text-gray-900 font-bold py-4 px-8 rounded-full hover:bg-yellow-300 transition-all shadow-lg hover:shadow-yellow-400/50 hover:-translate-y-1 transform duration-300"
                >
                  <BsRocket className="w-5 h-5 mr-2" />
                  Khám phá việc làm
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center border-2 border-white text-white font-bold py-4 px-8 rounded-full hover:bg-white hover:text-blue-600 transition-all hover:shadow-lg hover:-translate-y-1 transform duration-300"
                >
                  Đăng ký miễn phí
                </Link>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="hidden lg:block animate-float">
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white bg-opacity-90 rounded-xl p-4 shadow-lg">
                      <div className="w-full h-3 bg-blue-200 rounded-full mb-3"></div>
                      <div className="w-2/3 h-3 bg-blue-300 rounded-full mb-2"></div>
                      <div className="w-1/2 h-3 bg-blue-100 rounded-full"></div>
                    </div>
                    <div className="bg-yellow-100 rounded-xl p-4 shadow-lg">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full mb-3"></div>
                      <div className="w-full h-2 bg-yellow-200 rounded-full mb-2"></div>
                      <div className="w-3/4 h-2 bg-yellow-300 rounded-full"></div>
                    </div>
                    <div className="bg-green-100 rounded-xl p-4 shadow-lg">
                      <div className="w-full h-2 bg-green-200 rounded-full mb-2"></div>
                      <div className="w-2/3 h-2 bg-green-300 rounded-full mb-2"></div>
                      <div className="w-1/3 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="bg-blue-100 rounded-xl p-4 shadow-lg">
                      <div className="w-6 h-6 bg-blue-400 rounded-full mb-3"></div>
                      <div className="w-full h-2 bg-blue-200 rounded-full mb-2"></div>
                      <div className="w-1/2 h-2 bg-blue-300 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Search Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-2xl rounded-3xl p-8 -mt-32 relative z-20 border border-gray-100 hover:shadow-3xl transition-shadow duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Tìm kiếm việc làm IT phù hợp với bạn
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Vị trí, công ty, kỹ năng..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 pl-12 transition-all duration-300 group-hover:border-blue-300"
                />
                <FiSearch className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 group-hover:text-blue-500 transition-colors" />
              </div>

              <div className="group">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 group-hover:border-blue-300"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="group">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 group-hover:border-blue-300"
                >
                  <option value="">Tất cả địa điểm</option>
                  <option>Hà Nội</option>
                  <option>TP.HCM</option>
                  <option>Đà Nẵng</option>
                  <option>Cần Thơ</option>
                  <option>Remote</option>
                </select>
              </div>

              <button
                onClick={handleSearch}
                className="flex items-center justify-center bg-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5"
              >
                <FiSearch className="w-5 h-5 mr-2" />
                Tìm kiếm
              </button>
            </div>

            {/* Popular searches */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-gray-500 flex items-center">
                <BsFire className="w-4 h-4 text-red-500 mr-2" />
                Tìm kiếm phổ biến:
              </span>
              {['React Developer', 'Node.js', 'Java Spring', 'Python Django', 'DevOps'].map(term => (
                <button
                  key={term}
                  onClick={() => setSearchKeyword(term)}
                  className="text-sm bg-gray-50 text-gray-600 px-4 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 hover:shadow-sm border border-transparent hover:border-blue-100"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Job Categories */}
      {/* ... (Categories section) */}

      {/* Recommended Jobs for Candidates */}
      {isAuthenticated && user?.role === 'candidate' && (
        <section className="bg-blue-50/50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <BsStar className="w-8 h-8 text-yellow-500 mr-3" />
                Việc làm được đề xuất cho riêng bạn
              </h2>
              <p className="text-gray-600">
                Dựa trên kỹ năng và mục tiêu nghề nghiệp của bạn
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <JobRecommendations limit={6} showTitle={false} showReasons={true} />
              <div className="mt-8 text-center">
                <Link
                  to="/candidate/recommendations"
                  className="text-primary-600 hover:text-primary-700 font-bold inline-flex items-center"
                >
                  Xem tất cả gợi ý phù hợp
                  <FiArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Jobs */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Khám phá việc làm theo danh mục
            </h2>
            <p className="text-lg text-gray-600">
              Tìm cơ hội phù hợp với chuyên môn của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(showAllCategories ? categories : categories.slice(0, 12)).length > 0 ? (
              (showAllCategories ? categories : categories.slice(0, 12)).map((category, index) => (
                <Link
                  key={category._id || index}
                  to={`/jobs?category=${category._id}`}
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group hover:border-blue-100"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-blue-600 transition-all duration-300 shadow-sm group-hover:shadow-blue-200">
                      <MdCategory className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{category.name}</h3>
                      <p className="text-gray-500 text-sm font-medium flex items-center mt-1">
                        <FiBriefcase className="w-3.5 h-3.5 mr-1" />
                        {category.jobs_count || 0} việc làm
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 pl-18">
                    {category.description || `Khám phá cơ hội trong lĩnh vực ${category.name.toLowerCase()}`}
                  </div>
                </Link>
              ))
            ) : (
              // Fallback categories if API fails
              [
                { name: 'Frontend Developer', count: 0 },
                { name: 'Backend Developer', count: 0 },
                { name: 'Fullstack Developer', count: 0 },
                { name: 'Mobile Developer', count: 0 },
                { name: 'DevOps Engineer', count: 0 },
                { name: 'Data Scientist', count: 0 }
              ].map((category, index) => (
                <Link
                  key={index}
                  to={`/jobs?search=${encodeURIComponent(category.name)}`}
                  className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group hover:border-blue-100"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-blue-600 transition-all duration-300 shadow-sm group-hover:shadow-blue-200">
                      <MdCategory className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                      <p className="text-gray-500 text-sm font-medium flex items-center mt-1">
                        <FiBriefcase className="w-3.5 h-3.5 mr-1" />
                        {category.count || 0} việc làm
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Khám phá cơ hội trong lĩnh vực {category.name.toLowerCase()}
                  </div>
                </Link>
              ))
            )}
          </div>

          {!loading && categories.length > 12 && (
            <div className="mt-12 text-center">
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
              >
                {showAllCategories ? 'Thu gọn bớt' : `Xem tất cả ${categories.length} danh mục`}
                <svg
                  className={`ml-2 -mr-1 h-5 w-5 transition-transform duration-300 ${showAllCategories ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Việc làm nổi bật
            </h2>
            <p className="text-lg text-gray-600">
              Những cơ hội việc làm IT tốt nhất đang chờ bạn
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => (
                <Link
                  key={job._id}
                  to={`/jobs/${job._id}`}
                  className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group hover:border-blue-100 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-500"></div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-50 p-2 group-hover:scale-105 transition-transform duration-300">
                        {job.recruiter_id?.company_logo_url ? (
                          <img
                            src={job.recruiter_id.company_logo_url}
                            alt={job.recruiter_id.company_name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        ) : (
                          <BsBuilding className="w-8 h-8 text-blue-500" />
                        )}
                      </div>
                      <div className="flex flex-col space-y-2 items-end">
                        {job.is_urgent && (
                          <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-100 flex items-center">
                            <BsFire className="w-3 h-3 mr-1" />
                            Gấp
                          </span>
                        )}
                        {job.is_featured && (
                          <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full border border-yellow-100 flex items-center">
                            <BsStar className="w-3 h-3 mr-1" />
                            Nổi bật
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3.5rem]">
                      {job.title}
                    </h3>
                    <p className="text-gray-500 mb-4 flex items-center text-sm">
                      <BsBuilding className="w-4 h-4 mr-1.5 text-gray-400" />
                      {job.recruiter_id?.company_name}
                    </p>
                    <div className="flex items-center text-gray-500 text-sm mb-6 space-x-4">
                      <span className="flex items-center bg-gray-50 px-2.5 py-1 rounded-lg">
                        <FiMapPin className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        {job.location?.city || job.location || 'Remote'}
                      </span>
                      <span className="flex items-center bg-gray-50 px-2.5 py-1 rounded-lg">
                        <FiBriefcase className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        {job.job_type || 'Full-time'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <span className="text-blue-600 font-bold flex items-center text-lg">
                        <FiDollarSign className="w-5 h-5 mr-1" />
                        {job.salary_min && job.salary_max
                          ? `${(job.salary_min / 1000000).toFixed(0)} - ${(job.salary_max / 1000000).toFixed(0)}tr`
                          : 'Thỏa thuận'
                        }
                      </span>
                      <span className="text-gray-400 group-hover:text-blue-600 font-medium flex items-center text-sm transition-colors duration-300">
                        Chi tiết
                        <FiArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/jobs"
              className="inline-flex items-center px-8 py-3.5 border-2 border-blue-600 text-blue-600 font-bold rounded-full hover:bg-blue-600 hover:text-white transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              Xem tất cả việc làm
              <FiArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Top Companies */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Công ty hàng đầu tin tưởng chúng tôi
            </h2>
            <p className="text-lg text-gray-600">
              Kết nối với các nhà tuyển dụng uy tín trong ngành IT
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {companies.length > 0 ? (
              companies.map((company, index) => (
                <div key={company._id || index} className="flex justify-center group">
                  <Link
                    to={`/companies/${company._id}`}
                    className="bg-white p-6 rounded-2xl w-full h-28 flex items-center justify-center shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1 border border-gray-100 group-hover:border-blue-100 overflow-hidden"
                  >
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.company_name}
                        className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                    ) : (
                      <span className="text-gray-700 font-bold text-sm text-center group-hover:text-blue-600 transition-colors uppercase">
                        {company.company_name}
                      </span>
                    )}
                  </Link>
                </div>
              ))
            ) : (
              topCompanies.map((company, index) => (
                <div key={index} className="flex justify-center group">
                  <div className="bg-white p-6 rounded-2xl w-full h-28 flex items-center justify-center shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1 border border-gray-100 group-hover:border-blue-100">
                    <span className="text-gray-700 font-bold text-sm text-center group-hover:text-blue-600 transition-colors">{company.name}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/companies"
              className="text-blue-600 hover:text-blue-800 font-bold inline-flex items-center group transition-colors"
            >
              Xem tất cả công ty
              <FiArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="bg-white py-16 relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-50 rounded-full blur-3xl opacity-50 translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bài viết mới nhất
            </h2>
            <p className="text-lg text-gray-600">
              Cập nhật xu hướng và kiến thức ngành IT
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.length > 0 ? (
                blogPosts.map((post) => (
                  <Link
                    key={post._id}
                    to={`/blog/${post.slug || post._id}`}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
                  >
                    {post.featured_image_url && (
                      <div className="overflow-hidden relative h-52">
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10"></div>
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-8">
                      <div className="flex items-center text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">
                        <span className="flex items-center">
                          <FiClock className="w-3.5 h-3.5 mr-1.5" />
                          {new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN')}
                        </span>
                        {post.category && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-blue-600 flex items-center bg-blue-50 px-2 py-0.5 rounded">
                              <FiFileText className="w-3 h-3 mr-1" />
                              {post.category}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed mb-6">
                        {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : '')}
                      </p>
                      <div className="flex items-center text-blue-600 font-bold group-hover:text-blue-700">
                        <span>Đọc thêm</span>
                        <FiArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">Chưa có bài viết nào</p>
                </div>
              )}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/blog"
              className="inline-flex items-center px-8 py-3.5 border-2 border-blue-600 text-blue-600 font-bold rounded-full hover:bg-blue-600 hover:text-white transition-all duration-300 hover:shadow-lg"
            >
              Xem tất cả bài viết
              <FiArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Câu chuyện thành công
            </h2>
            <p className="text-lg text-gray-600">
              Hàng nghìn người đã tìm được việc làm mơ ước
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl p-10 shadow-xl relative border border-gray-100">
              {/* Quote icon */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30">
                ❝
              </div>

              <div className="text-center mt-4">
                <blockquote className="text-xl md:text-2xl text-gray-700 mb-8 italic leading-relaxed font-light">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>

                <div className="flex flex-col items-center">
                  <div className="mb-4 relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-30 scale-110"></div>
                    <img
                      src={testimonials[currentTestimonial].avatar || '/images/testimonials/default.jpg'}
                      alt={testimonials[currentTestimonial].name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md relative z-10"
                    />
                  </div>

                  <div className="font-bold text-lg text-gray-900">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="text-blue-600 font-medium">
                    {testimonials[currentTestimonial].role} tại {testimonials[currentTestimonial].company}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial indicators */}
            <div className="flex justify-center mt-8 space-x-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`transition-all duration-300 rounded-full ${index === currentTestimonial
                    ? 'w-10 h-3 bg-blue-600 shadow-md shadow-blue-500/30'
                    : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
                    }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            Sẵn sàng bắt đầu hành trình mới?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Tham gia cộng đồng IT lớn nhất Việt Nam và khám phá hàng nghìn cơ hội việc làm hấp dẫn
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/register"
              className="bg-yellow-400 text-gray-900 font-bold py-4 px-10 rounded-full hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg hover:shadow-yellow-400/50"
            >
              Đăng ký ngay - Miễn phí
            </Link>
            <Link
              to="/about"
              className="border-2 border-white/80 text-white font-bold py-4 px-10 rounded-full hover:bg-white hover:text-blue-600 transition-all transform hover:scale-105 hover:border-white"
            >
              Tìm hiểu thêm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

