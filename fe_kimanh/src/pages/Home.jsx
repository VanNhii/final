import LoadingSpinner from '@/components/common/LoadingSpinner';
import contentService from '@/services/contentService';
import jobService from '@/services/jobService';
import {useEffect, useState} from 'react';
import {BsBuilding, BsFire, BsRocket, BsStar} from 'react-icons/bs';
import {
  FiArrowRight,
  FiBriefcase,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiMapPin,
  FiSearch
} from 'react-icons/fi';
import {MdCategory} from 'react-icons/md';
import {Link, useNavigate} from 'react-router';
import {formatLocation} from '@/utils/formatters';

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
    {name: 'VNG Corporation', logo: '/images/companies/vng.png'},
    {name: 'FPT Software', logo: '/images/companies/fpt.png'},
    {name: 'TMA Solutions', logo: '/images/companies/tma.png'},
    {name: 'Viettel Digital', logo: '/images/companies/viettel.png'},
    {name: 'Samsung SDS', logo: '/images/companies/samsung.png'},
    {name: 'Grab Vietnam', logo: '/images/companies/grab.png'}
  ];

  // Load data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch featured/recent jobs
        const [jobsResponse, categoriesResponse, contentResponse] = await Promise.all([
          jobService.getJobs({limit: 8, sort: '-created_at'}),
          jobService.getJobCategories(),
          contentService.getContentByType('blog', {limit: 3, sort: '-published_at'})
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
      <section className="bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[100px] animate-pulse mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] animate-pulse delay-1000 mix-blend-screen"></div>
          <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-cyan-400/20 rounded-full blur-[80px] mix-blend-screen"></div>
          <div className="absolute bottom-[20%] left-[20%] w-[300px] h-[300px] bg-pink-500/20 rounded-full blur-[80px] animation-delay-4000 mix-blend-screen"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative z-10">
              <div className="inline-block px-4 py-2 rounded-full bg-blue-900/30 border border-blue-500/30 backdrop-blur-sm mb-6">
                <span className="text-blue-400 font-medium text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                  Nền tảng tuyển dụng #1 Việt Nam
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 text-white leading-tight tracking-tight">
                Kết nối tài năng <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-gradient-x">
                  Công Nghệ Đỉnh Cao
                </span>
              </h1>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed max-w-lg">
                Khám phá hơn <span className="text-white font-bold">50,000+</span> cơ hội việc làm hấp dẫn từ các tập đoàn công nghệ hàng đầu.
              </p>

              {/* Quick stats with glassmorphism */}
              <div className="flex flex-wrap gap-8 mb-10">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">50K+</div>
                  <div className="text-slate-400 text-sm">Việc làm</div>
                </div>
                <div className="w-px h-12 bg-slate-700"></div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">1K+</div>
                  <div className="text-slate-400 text-sm">Công ty</div>
                </div>
                <div className="w-px h-12 bg-slate-700"></div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">100K+</div>
                  <div className="text-slate-400 text-sm">Ứng viên</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/jobs"
                  className="flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-full transition-all shadow-lg shadow-cyan-500/30 hover:scale-105"
                >
                  <BsRocket className="w-5 h-5 mr-2" />
                  Khám phá ngay
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-full border border-slate-700 hover:border-slate-600 transition-all hover:scale-105"
                >
                  Đăng ký miễn phí
                </Link>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-square max-w-[600px] mx-auto perspective-1000">
                {/* Main Card */}
                <div className="absolute inset-4 bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl shadow-blue-900/20 rotate-y-12 rotate-x-6 backdrop-blur-xl opacity-90 transition-transform duration-500 hover:rotate-0">
                  {/* Mock UI Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="h-2 w-20 bg-slate-700 rounded-full"></div>
                  </div>

                  {/* Mock UI Content */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <BsRocket className="text-blue-400 w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-24 bg-slate-600 rounded-full mb-2"></div>
                        <div className="h-2 w-16 bg-slate-700 rounded-full"></div>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">Active</div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 opacity-75">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <BsStar className="text-purple-400 w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-24 bg-slate-600 rounded-full mb-2"></div>
                        <div className="h-2 w-16 bg-slate-700 rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 opacity-50">
                      <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <FiBriefcase className="text-cyan-400 w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-24 bg-slate-600 rounded-full mb-2"></div>
                        <div className="h-2 w-16 bg-slate-700 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-white p-4 rounded-2xl shadow-xl animate-bounce duration-[3000ms]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <FiDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Salary</div>
                      <div className="font-bold text-gray-800">$2,000+</div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-10 -left-8 bg-white p-4 rounded-2xl shadow-xl animate-bounce delay-700 duration-[4000ms]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <FiBriefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">New Jobs</div>
                      <div className="font-bold text-gray-800">120+ Daily</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Search Section */}
      <section className="relative z-20 -mt-24 px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-blue-500/10 p-4 border border-slate-700/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
              <div className="md:col-span-4 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Vị trí, công ty, kỹ năng..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-4 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-900/50 text-white placeholder-gray-400 focus:bg-slate-900"
                />
              </div>

              <div className="md:col-span-3 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MdCategory className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full pl-10 pr-3 py-4 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-900/50 text-white focus:bg-slate-900 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-800">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id} className="bg-slate-800">
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <div className="md:col-span-3 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMapPin className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="block w-full pl-10 pr-3 py-4 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-900/50 text-white focus:bg-slate-900 appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-800">Tất cả địa điểm</option>
                  <option className="bg-slate-800">Hà Nội</option>
                  <option className="bg-slate-800">TP.HCM</option>
                  <option className="bg-slate-800">Đà Nẵng</option>
                  <option className="bg-slate-800">Cần Thơ</option>
                  <option className="bg-slate-800">Remote</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={handleSearch}
                  className="w-full h-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center transform hover:scale-[1.02]"
                >
                  <FiSearch className="w-5 h-5 mr-2" />
                  Tìm kiếm
                </button>
              </div>
            </div>

            {/* Popular searches */}
            <div className="flex flex-wrap gap-3 mt-4 items-center pl-1">
              <span className="text-sm font-medium text-gray-400">Phổ biến:</span>
              {['ReactJS', 'NodeJS', 'Java Spring', 'Python', 'Tester'].map(term => (
                <button
                  key={term}
                  onClick={() => setSearchKeyword(term)}
                  className="text-xs font-medium bg-slate-700/50 hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 px-3 py-1.5 rounded-full transition-all border border-slate-600 hover:border-blue-500/50"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Job Categories */}
      <section className="bg-slate-900 py-20 relative">
        <div className="absolute top-1/2 left-0 w-full h-[500px] bg-blue-600/5 blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
              Khám phá theo danh mục
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Tìm kiếm cơ hội nghề nghiệp phù hợp nhất với chuyên môn và kỹ năng của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.length > 0 ? (
              categories.map((category, index) => (
                <Link
                  key={category._id || index}
                  to={`/jobs?category=${category._id}`}
                  className="bg-slate-800/50 backdrop-blur-sm hover:bg-gradient-to-br hover:from-blue-900/50 hover:to-purple-900/50 p-8 rounded-2xl shadow-lg border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 transform hover:-translate-y-2 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/10 group-hover:bg-blue-400/20 transition-colors blur-2xl"></div>

                  <div className="flex flex-col h-full relative z-10">
                    <div className="w-16 h-16 bg-slate-700/50 text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:text-cyan-300 transition-all duration-300 shadow-inner group-hover:scale-110">
                      <MdCategory className="w-8 h-8" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {category.name}
                    </h3>

                    <p className="text-slate-400 mb-6 line-clamp-2 flex-grow group-hover:text-slate-200 font-medium">
                      {category.description || `Hơn ${category.jobs_count || 100}+ cơ hội việc làm đang chờ đón bạn.`}
                    </p>

                    <div className="flex items-center text-blue-400 font-bold group-hover:text-cyan-300 mt-auto">
                      <span className="text-sm uppercase tracking-wider">Xem {category.jobs_count || 0} việc làm</span>
                      <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center ml-auto group-hover:bg-blue-500/30 transition-all">
                        <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // Fallback UI
              [
                {name: 'Frontend Developer', count: 120, icon: <BsRocket />},
                {name: 'Backend Developer', count: 85, icon: <FiBriefcase />},
                {name: 'Mobile Developer', count: 45, icon: <BsFire />},
                {name: 'DevOps Engineer', count: 32, icon: <FiClock />},
                {name: 'UI/UX Designer', count: 28, icon: <BsStar />},
                {name: 'Data Scientist', count: 15, icon: <FiSearch />}
              ].map((cat, idx) => (
                <Link
                  key={idx}
                  to={`/jobs?search=${encodeURIComponent(cat.name)}`}
                  className="bg-slate-800/50 backdrop-blur-sm hover:bg-gradient-to-br hover:from-blue-900/50 hover:to-purple-900/50 p-8 rounded-2xl shadow-lg border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 transform hover:-translate-y-2 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/10 group-hover:bg-blue-400/20 transition-colors blur-2xl"></div>

                  <div className="flex flex-col h-full relative z-10">
                    <div className="w-16 h-16 bg-slate-700/50 text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:text-cyan-300 transition-all duration-300 shadow-inner group-hover:scale-110">
                      {cat.icon || <MdCategory className="w-8 h-8" />}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {cat.name}
                    </h3>

                    <p className="text-slate-400 mb-6 line-clamp-2 flex-grow group-hover:text-slate-200 font-medium">
                      Khám phá các cơ hội nghề nghiệp tốt nhất trong lĩnh vực {cat.name}.
                    </p>

                    <div className="flex items-center text-blue-400 font-bold group-hover:text-cyan-300 mt-auto">
                      <span className="text-sm uppercase tracking-wider">Xem {cat.count} việc làm</span>
                      <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center ml-auto group-hover:bg-blue-500/30 transition-all">
                        <FiArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="bg-slate-950 py-20 relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-purple-900/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-900/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Việc làm mới & nổi bật
              </h2>
              <p className="text-lg text-slate-400">
                Lựa chọn từ các cơ hội việc làm tốt nhất được cập nhật liên tục.
              </p>
            </div>
            <Link
              to="/jobs"
              className="hidden md:inline-flex items-center px-6 py-3 bg-slate-800 border border-slate-700 text-white font-semibold rounded-xl hover:bg-slate-700 hover:text-cyan-400 transition-all shadow-sm group"
            >
              Xem tất cả
              <FiArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredJobs.map((job) => (
                <Link
                  key={job._id}
                  to={`/jobs/${job._id}`}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-1 group flex flex-col h-full hover:border-blue-500/50 relative overflow-hidden backdrop-blur-sm"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-xl border border-slate-700 p-2 flex items-center justify-center bg-white shadow-sm group-hover:shadow-md transition-shadow">
                      {job.recruiter_id?.company_logo_url ? (
                        <img
                          src={job.recruiter_id.company_logo_url}
                          alt={job.recruiter_id.company_name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <BsBuilding className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      )}
                    </div>
                    {job.is_featured && (
                      <span className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-sm">
                        <BsStar className="w-3 h-3 mr-1 text-yellow-400" />
                        Nổi bật
                      </span>
                    )}
                  </div>

                  <div className="mb-4 flex-grow">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug">
                      {job.title}
                    </h3>
                    <p className="text-slate-400 font-medium text-sm flex items-center">
                      <FiBriefcase className="w-4 h-4 mr-1.5 text-slate-500" />
                      {job.recruiter_id?.company_name}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-900/30 text-blue-300 text-xs font-medium border border-blue-800/50">
                        <FiMapPin className="w-3 h-3 mr-1" />
                        {formatLocation(job.location)}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-900/30 text-purple-300 text-xs font-medium border border-purple-800/50">
                        <FiClock className="w-3 h-3 mr-1" />
                        {job.job_type || 'Full-time'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-5 border-t border-slate-800 mt-auto">
                    <span className="text-emerald-400 font-bold text-lg flex items-center bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-900/30">
                      <FiDollarSign className="w-4 h-4 mr-1" />
                      {job.salary_min && job.salary_max
                        ? `${(job.salary_min / 1000000).toFixed(0)} - ${(job.salary_max / 1000000).toFixed(0)} triệu`
                        : 'Thỏa thuận'
                      }
                    </span>
                    <span className="text-slate-500 text-xs font-medium">
                      {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12 md:hidden">
            <Link
              to="/jobs"
              className="inline-flex items-center px-6 py-3 border border-slate-700 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all w-full justify-center"
            >
              Xem tất cả việc làm
              <FiArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Top Companies */}
      <section className="bg-slate-900 py-20 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
              Nhà tuyển dụng hàng đầu
            </h2>
            <p className="text-lg text-slate-400">
              Các thương hiệu công nghệ lớn tin dùng nền tảng của chúng tôi
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 items-center opacity-80 hover:opacity-100 transition-opacity">
            {topCompanies.map((company, index) => (
              <div key={index} className="bg-white px-8 py-6 rounded-2xl shadow-sm border border-slate-800 hover:shadow-lg hover:shadow-blue-500/20 transition-all transform hover:-translate-y-1">
                <span className="font-bold text-slate-800 text-lg">{company.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="bg-slate-950 py-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Bài viết mới nhất
            </h2>
            <p className="text-lg text-slate-400">
              Cập nhật xu hướng và kiến thức ngành IT
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(blogPosts.length > 0 ? blogPosts : [
                {
                  _id: 'mock1',
                  slug: 'huong-dan-viet-cv-chuan-it',
                  title: 'Hướng dẫn viết CV IT "bách phát bách trúng"',
                  published_at: new Date().toISOString(),
                  category: 'Career Guide',
                  excerpt: 'Bí quyết để CV của bạn nổi bật giữa hàng ngàn ứng viên khác. Những từ khóa quan trọng cần có...',
                  featured_image_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80'
                },
                {
                  _id: 'mock2',
                  slug: 'top-ngon-ngu-lap-trinh-2024',
                  title: 'Top 5 ngôn ngữ lập trình đáng học nhất 2024',
                  published_at: new Date().toISOString(),
                  category: 'Technology',
                  excerpt: 'Xu hướng công nghệ đang thay đổi nhanh chóng. Hãy cập nhật ngay những ngôn ngữ lập trình hot nhất...',
                  featured_image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80'
                },
                {
                  _id: 'mock3',
                  slug: 'ky-nang-mem-cho-developer',
                  title: 'Kỹ năng mềm - Chìa khóa thăng tiến cho Developer',
                  published_at: new Date().toISOString(),
                  category: 'Skills',
                  excerpt: 'Code giỏi là chưa đủ. Để tiến xa hơn trong sự nghiệp, bạn cần trang bị những kỹ năng mềm quan trọng này...',
                  featured_image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80'
                }
              ]).map((post) => (
                <Link
                  key={post._id}
                  to={`/blog/${post.slug || post._id}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-purple-900/20 transition-all transform hover:-translate-y-1 group flex flex-col h-full"
                >
                  <div className="overflow-hidden h-48 relative">
                    <div className="absolute inset-0 bg-slate-800 animate-pulse" /> {/* Placeholder while loading img */}
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 relative z-10"
                      onError={(e) => {
                        e.target.onerror = null; // prevents looping
                        e.target.src = "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800&q=80" // Generic fallback
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow relative">
                    <div className="flex items-center text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                      <span className="flex items-center text-blue-400">
                        <FiFileText className="w-3 h-3 mr-1.5" />
                        {post.category || 'General'}
                      </span>
                      <span className="mx-2 text-slate-700">•</span>
                      <div className="flex items-center">
                        <FiClock className="w-3 h-3 mr-1.5" />
                        <span>{new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight">
                      {post.title}
                    </h3>

                    <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed mb-4 flex-grow">
                      {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : '')}
                    </p>

                    <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between">
                      <span className="text-blue-400 text-sm font-semibold group-hover:translate-x-1 transition-transform flex items-center">
                        Đọc tiếp <FiArrowRight className="ml-1 w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/blog"
              className="inline-flex items-center px-6 py-3 border-2 border-blue-600 text-blue-400 font-semibold rounded-lg hover:bg-blue-900/20 transition-all hover:shadow-lg hover:shadow-blue-600/20"
            >
              Xem tất cả bài viết
              <FiArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900 py-20 overflow-hidden border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
                Được tin tưởng bởi hàng nghìn kỹ sư phần mềm
              </h2>
              <p className="text-lg text-slate-400 mb-8 max-w-lg">
                Lắng nghe câu chuyện từ những người đã tìm được bến đỗ sự nghiệp của mình thông qua nền tảng của chúng tôi.
              </p>

              <div className="flex space-x-2 mb-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${index === currentTestimonial ? 'w-8 bg-blue-500' : 'w-4 bg-slate-700'}`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Background Decor */}
              <div className="absolute top-0 right-0 -mr-10 -mt-20 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl opacity-50"></div>

              <div className="relative bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-700">
                <div className="flex items-center space-x-1 mb-6 text-yellow-400">
                  {[...Array(5)].map((_, i) => <BsStar key={i} className="fill-current" />)}
                </div>

                <blockquote className="text-xl text-slate-200 leading-relaxed mb-8">
                  "{testimonials[currentTestimonial].content}"
                </blockquote>

                <div className="flex items-center gap-4">
                  <img
                    src={testimonials[currentTestimonial].avatar}
                    alt={testimonials[currentTestimonial].name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-600 shadow-md"
                    // Fallback image if source is just path string without actual file
                    onError={(e) => {e.target.src = `https://ui-avatars.com/api/?name=${testimonials[currentTestimonial].name}&background=random`}}
                  />
                  <div>
                    <div className="font-bold text-white">{testimonials[currentTestimonial].name}</div>
                    <div className="text-sm text-slate-400">{testimonials[currentTestimonial].role} tại <span className="text-blue-400">{testimonials[currentTestimonial].company}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-slate-900 py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-blue-900/30"></div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
            Sẵn sàng bứt phá sự nghiệp?
          </h2>
          <p className="text-xl text-slate-300 mb-10 leading-relaxed">
            Đừng bỏ lỡ những cơ hội việc làm tốt nhất. Tham gia ngay hôm nay để kết nối với các doanh nghiệp hàng đầu.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 shadow-xl shadow-blue-900/50"
            >
              Tạo hồ sơ ngay
            </Link>
            <Link
              to="/jobs"
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-10 rounded-full border border-slate-600 transition-all hover:scale-105"
            >
              Tìm việc làm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

