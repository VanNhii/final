import LoadingSpinner from '@/components/common/LoadingSpinner';
import contentService from '@/services/contentService';
import jobService from '@/services/jobService';
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

const Home = () => {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  
  // API data states
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
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
        const [jobsResponse, categoriesResponse, contentResponse] = await Promise.all([
          jobService.getJobs({ limit: 8, sort: '-created_at' }),
          jobService.getJobCategories(),
          contentService.getContentByType('blog', { limit: 3, sort: '-published_at' })
        ]);

        console.log('Jobs Response:', jobsResponse);
        console.log('Categories Response:', categoriesResponse);
        console.log('Content Response:', contentResponse);

        if (jobsResponse.success) {
          // Handle nested data structure
          const jobsData = jobsResponse.data?.data || jobsResponse.data || [];
          const jobs = Array.isArray(jobsData) ? jobsData : [];
          setFeaturedJobs(jobs);
          setRecentJobs(jobs);
          setJobStats(prev => ({
            ...prev,
            totalJobs: jobsResponse.data?.pagination?.total || jobs.length || 0
          }));
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
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
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
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">50K+</div>
                  <div className="text-sm text-blue-200">Việc làm</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">1K+</div>
                  <div className="text-sm text-blue-200">Công ty</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-300">100K+</div>
                  <div className="text-sm text-blue-200">Ứng viên</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/jobs"
                  className="flex items-center justify-center bg-yellow-400 text-gray-900 font-semibold py-4 px-8 rounded-xl hover:bg-yellow-300 transition-all shadow-lg hover:shadow-xl"
                >
                  <BsRocket className="w-5 h-5 mr-2" />
                  Khám phá việc làm
                </Link>
                <Link
                  to="/register"
                  className="border-2 border-white text-white font-semibold py-4 px-8 rounded-xl hover:bg-white hover:text-blue-600 transition-all"
                >
                  Đăng ký miễn phí
                </Link>
              </div>
            </div>
            
            {/* Hero Image/Illustration */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
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
          <div className="bg-white shadow-2xl rounded-3xl p-8 -mt-32 relative z-20 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Tìm kiếm việc làm IT phù hợp với bạn
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Vị trí, công ty, kỹ năng..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent pl-12"
                />
                <FiSearch className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              </div>
              
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              
              <select 
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tất cả địa điểm</option>
                <option>Hà Nội</option>
                <option>TP.HCM</option>
                <option>Đà Nẵng</option>
                <option>Cần Thơ</option>
                <option>Remote</option>
              </select>
              
              <button 
                onClick={handleSearch}
                className="flex items-center justify-center bg-blue-600 text-white font-semibold py-4 px-8 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                <FiSearch className="w-5 h-5 mr-2" />
                Tìm kiếm
              </button>
            </div>

            {/* Popular searches */}
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-gray-500">Tìm kiếm phổ biến:</span>
              {['React Developer', 'Node.js', 'Java Spring', 'Python Django', 'DevOps'].map(term => (
                <button
                  key={term}
                  onClick={() => setSearchKeyword(term)}
                  className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Job Categories */}
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
            {categories.length > 0 ? (
              categories.map((category, index) => (
                <Link
                  key={category._id || index}
                  to={`/jobs?category=${category._id}`}
                  className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 group"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center mr-4 group-hover:from-blue-200 group-hover:to-blue-100 transition-all">
                      <MdCategory className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                      <p className="text-blue-600 font-medium flex items-center">
                        <FiBriefcase className="w-4 h-4 mr-1" />
                        {category.jobs_count || 0} việc làm
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
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
                  className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 group"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center mr-4 group-hover:from-blue-200 group-hover:to-blue-100 transition-all">
                      <MdCategory className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                      <p className="text-blue-600 font-medium flex items-center">
                        <FiBriefcase className="w-4 h-4 mr-1" />
                        {category.count} việc làm
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
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all transform hover:-translate-y-1 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shadow-sm">
                      {job.recruiter_id?.company_logo_url ? (
                        <img 
                          src={job.recruiter_id.company_logo_url} 
                          alt={job.recruiter_id.company_name}
                          className="w-10 h-10 object-contain rounded"
                        />
                      ) : (
                        <BsBuilding className="w-7 h-7 text-blue-600" />
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      {job.is_urgent && (
                        <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center">
                          <BsFire className="w-3 h-3 mr-1" />
                          Gấp
                        </span>
                      )}
                      {job.is_featured && (
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center">
                          <BsStar className="w-3 h-3 mr-1" />
                          Nổi bật
                        </span>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-gray-600 mb-3 flex items-center">
                    <BsBuilding className="w-4 h-4 mr-1.5" />
                    {job.recruiter_id?.company_name}
                  </p>
                  <div className="flex items-center text-gray-600 text-sm mb-4 space-x-3">
                    <span className="flex items-center">
                      <FiMapPin className="w-4 h-4 mr-1" />
                      {job.location?.city || job.location || 'Remote'}
                    </span>
                    <span className="flex items-center">
                      <FiBriefcase className="w-4 h-4 mr-1" />
                      {job.job_type || 'Full-time'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 font-semibold flex items-center">
                      <FiDollarSign className="w-4 h-4 mr-1" />
                      {job.salary_min && job.salary_max 
                        ? `${(job.salary_min / 1000000).toFixed(0)} - ${(job.salary_max / 1000000).toFixed(0)}tr`
                        : 'Thỏa thuận'
                      }
                    </span>
                    <span className="text-blue-600 group-hover:text-blue-700 font-medium flex items-center">
                      Xem chi tiết
                      <FiArrowRight className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/jobs"
              className="inline-flex items-center px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all hover:shadow-md"
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
            {topCompanies.map((company, index) => (
              <div key={index} className="flex justify-center">
                <div className="bg-white p-6 rounded-xl w-full h-24 flex items-center justify-center hover:shadow-md transition-all transform hover:-translate-y-1 border border-gray-100">
                  <span className="text-gray-700 font-medium text-sm text-center">{company.name}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Link
              to="/companies"
              className="text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center"
            >
              Xem tất cả công ty
              <FiArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.length > 0 ? (
                blogPosts.map((post) => (
                  <Link 
                    key={post._id} 
                    to={`/blog/${post.slug || post._id}`}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all transform hover:-translate-y-1 group"
                  >
                    {post.featured_image_url && (
                      <div className="overflow-hidden">
                        <img 
                          src={post.featured_image_url} 
                          alt={post.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <FiClock className="w-4 h-4 mr-1" />
                        <span>{new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN')}</span>
                        {post.category && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-blue-600 flex items-center">
                              <FiFileText className="w-3 h-3 mr-1" />
                              {post.category}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                        {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : '')}
                      </p>
                      <div className="mt-4 flex items-center text-blue-600 font-semibold group-hover:text-blue-700">
                        <span>Đọc thêm</span>
                        <FiArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
              className="inline-flex items-center px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all hover:shadow-md"
            >
              Xem tất cả bài viết
              <FiArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Câu chuyện thành công
            </h2>
            <p className="text-lg text-gray-600">
              Hàng nghìn người đã tìm được việc làm mơ ước
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-8">
              <div className="text-center">
                <div className="mb-6">
                  <img
                    src={testimonials[currentTestimonial].avatar || '/images/testimonials/default.jpg'}
                    alt={testimonials[currentTestimonial].name}
                    className="w-20 h-20 rounded-full mx-auto object-cover"
                  />
                </div>
                
                <blockquote className="text-xl text-gray-700 mb-6 italic">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>
                
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="text-gray-600">
                    {testimonials[currentTestimonial].role} tại {testimonials[currentTestimonial].company}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial indicators */}
            <div className="flex justify-center mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Sẵn sàng bắt đầu hành trình mới?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Tham gia cộng đồng IT lớn nhất Việt Nam và khám phá hàng nghìn cơ hội việc làm hấp dẫn
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-yellow-400 text-gray-900 font-semibold py-4 px-8 rounded-xl hover:bg-yellow-300 transition-all transform hover:scale-105 shadow-lg"
            >
              Đăng ký ngay - Miễn phí
            </Link>
            <Link
              to="/about"
              className="border-2 border-white text-white font-semibold py-4 px-8 rounded-xl hover:bg-white hover:text-blue-600 transition-all"
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

