import { useEffect, useState } from 'react';
import { BsFacebook, BsLinkedin, BsTwitter } from 'react-icons/bs';
import {
    FiArrowLeft,
    FiChevronRight,
    FiClock,
    FiEye,
    FiMessageCircle,
    FiShare2
} from 'react-icons/fi';
import { MdCategory } from 'react-icons/md';
import { Link, useParams } from 'react-router';

const BlogDetail = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for development
  const mockPost = {
    id: 1,
    title: '10 Kỹ năng Frontend Developer cần có trong năm 2024',
    slug: '10-ky-nang-frontend-developer-2024',
    content: `
      <h2>Giới thiệu</h2>
      <p>Ngành công nghệ phát triển với tốc độ chóng mặt, và việc cập nhật kỹ năng là điều không thể thiếu đối với các Frontend Developer. Năm 2024 đánh dấu sự chuyển mình mạnh mẽ với nhiều công nghệ mới và xu hướng phát triển thú vị.</p>
      
      <h2>1. React 18+ và Server Components</h2>
      <p>React 18 đã mang đến nhiều tính năng mới như Concurrent Features, Suspense for Data Fetching, và đặc biệt là Server Components. Đây là xu hướng quan trọng giúp cải thiện hiệu suất và SEO.</p>
      
      <h3>Tại sao quan trọng?</h3>
      <ul>
        <li>Cải thiện hiệu suất ứng dụng đáng kể</li>
        <li>Giảm bundle size ở client</li>
        <li>Tối ưu SEO tự nhiên</li>
        <li>Trải nghiệm người dùng mượt mà hơn</li>
      </ul>
      
      <h2>2. TypeScript Advanced</h2>
      <p>TypeScript không chỉ là "JavaScript có types" nữa. Hiểu sâu về Generic Types, Conditional Types, và Template Literal Types sẽ giúp bạn viết code maintainable và type-safe hơn.</p>
      
      <h2>3. CSS Modern: Container Queries & CSS Grid</h2>
      <p>Container Queries đã được hỗ trợ rộng rãi, mở ra cách tiếp cận mới cho responsive design. Kết hợp với CSS Grid advanced features, bạn có thể tạo ra những layout phức tạp và linh hoạt.</p>
      
      <h2>4. Build Tools: Vite & esbuild</h2>
      <p>Webpack vẫn mạnh nhưng Vite với tốc độ build lightning-fast đang trở thành lựa chọn ưu tiên. Hiểu về esbuild và các modern bundlers sẽ giúp tối ưu development experience.</p>
      
      <h2>5. Web Performance & Core Web Vitals</h2>
      <p>Google ngày càng chú trọng Core Web Vitals. Kỹ năng tối ưu LCP, FID, và CLS không chỉ cải thiện UX mà còn ảnh hưởng trực tiếp đến SEO ranking.</p>
      
      <h2>6. State Management Modern</h2>
      <p>Zustand, Jotai, và Valtio đang thay thế dần Redux trong nhiều dự án. Chúng đơn giản hơn, ít boilerplate hơn nhưng vẫn đảm bảo hiệu suất cao.</p>
      
      <h2>7. Testing với Vitest & Testing Library</h2>
      <p>Vitest với tốc độ nhanh và API tương thích Jest đang trở thành standard cho testing. Kết hợp với React Testing Library cho component testing hiệu quả.</p>
      
      <h2>8. Web Components & Micro Frontends</h2>
      <p>Xu hướng phát triển ứng dụng modular đang lên ngôi. Web Components và kiến trúc Micro Frontends giúp teams làm việc độc lập và tái sử dụng code hiệu quả.</p>
      
      <h2>9. Progressive Web Apps (PWA)</h2>
      <p>PWA không mới nhưng đang có sự comeback mạnh mẽ. Service Workers, App Shell Architecture, và Workbox là những kiến thức cần thiết.</p>
      
      <h2>10. AI/ML Integration</h2>
      <p>Tích hợp AI vào frontend apps đang trở thành mainstream. TensorFlow.js, ML5.js, và các API AI services như OpenAI GPT sẽ là skills có giá trị cao.</p>
      
      <h2>Kết luận</h2>
      <p>Ngành Frontend phát triển không ngừng. Việc học liên tục và thực hành thường xuyên là chìa khóa để không bị tụt lại phía sau. Hãy chọn 2-3 skills ưu tiên để focus học sâu thay vì học qua loa tất cả.</p>
      
      <p><strong>Lời khuyên:</strong> Xây dựng portfolio với những dự án thực tế áp dụng các kỹ năng này. Employers quan tâm đến những gì bạn có thể làm hơn là những gì bạn biết trên lý thuyết.</p>
    `,
    excerpt: 'Khám phá những kỹ năng Frontend Developer hot nhất hiện tại, từ React, Vue.js đến các công cụ build modern.',
    content_type: 'blog_post',
    category: 'tech_trends',
    featured_image_url: '/images/blog/frontend-skills-2024.jpg',
    author_id: {
      full_name: 'Nguyễn Văn An',
      avatar_url: '/images/avatars/author1.jpg'
    },
    published_at: '2024-01-15T10:00:00.000Z',
    reading_time: 5,
    views_count: 1250,
    tags: ['frontend', 'react', 'javascript', 'career'],
    is_featured: true,
    meta_title: '10 Kỹ năng Frontend Developer cần có năm 2024 | JobPortal',
    meta_description: 'Cập nhật ngay 10 kỹ năng Frontend Developer quan trọng nhất 2024: React 18, TypeScript, CSS Modern, Performance Optimization và nhiều hơn nữa.'
  };

  const mockRelatedPosts = [
    {
      id: 2,
      title: 'Cách thương lượng mức lương hiệu quả khi phỏng vấn',
      slug: 'cach-thuong-luong-muc-luong-hieu-qua',
      featured_image_url: '/images/blog/salary-negotiation.jpg',
      published_at: '2024-01-10T14:30:00.000Z',
      reading_time: 7
    },
    {
      id: 3,
      title: 'Chuẩn bị gì cho cuộc phỏng vấn technical interview?',
      slug: 'chuan-bi-cho-technical-interview',
      featured_image_url: '/images/blog/technical-interview.jpg',
      published_at: '2024-01-05T16:00:00.000Z',
      reading_time: 8
    }
  ];

  useEffect(() => {
    // TODO: Replace with actual API call
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setPost(mockPost);
      setRelatedPosts(mockRelatedPosts);
      setLoading(false);
    }, 500);
  }, [slug]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const categories = {
    career_tips: 'Lời khuyên nghề nghiệp',
    tech_trends: 'Xu hướng công nghệ',
    interview_tips: 'Mẹo phỏng vấn',
    industry_insights: 'Phân tích ngành',
    job_market: 'Thị trường việc làm',
    salary_guide: 'Hướng dẫn lương'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy bài viết</h1>
          <Link to="/blog" className="text-primary-600 hover:text-primary-700">
            ← Quay lại trang blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center text-sm space-x-2">
            <Link to="/" className="text-gray-500 hover:text-blue-600 transition-colors">
              Trang chủ
            </Link>
            <FiChevronRight className="w-4 h-4 text-gray-400" />
            <Link to="/blog" className="text-gray-500 hover:text-blue-600 transition-colors">
              Blog
            </Link>
            <FiChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium line-clamp-1">{post.title}</span>
          </nav>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link 
          to="/blog" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6 group"
        >
          <FiArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Quay lại trang blog
        </Link>

        {/* Article Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-6">
            <span className="flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-semibold">
              <MdCategory className="w-4 h-4 mr-1.5" />
              {categories[post.category]}
            </span>
            <span className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full">
              <FiClock className="w-4 h-4 mr-1.5" />
              <time>{formatDate(post.published_at)}</time>
            </span>
            <span className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full">
              <FiClock className="w-4 h-4 mr-1.5" />
              {post.reading_time} phút đọc
            </span>
            <span className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full">
              <FiEye className="w-4 h-4 mr-1.5" />
              {post.views_count.toLocaleString()} lượt xem
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>
          
          <div className="flex items-center mb-6">
            <img
              src={post.author_id.avatar_url || '/images/avatars/default.jpg'}
              alt={post.author_id.full_name}
              className="w-12 h-12 rounded-full mr-4"
            />
            <div>
              <p className="font-medium text-gray-900">{post.author_id.full_name}</p>
              <p className="text-sm text-gray-500">Tác giả</p>
            </div>
          </div>

          {/* Featured Image */}
          <div className="mb-8 overflow-hidden rounded-xl shadow-lg">
            <img
              src={post.featured_image_url || '/images/blog/default.jpg'}
              alt={post.title}
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {post.tags.map(tag => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        {/* Article Content */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-12 border border-gray-100">
          <div 
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-headings:font-bold"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Social Share */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-12 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiShare2 className="w-5 h-5 mr-2 text-blue-600" />
            Chia sẻ bài viết
          </h3>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md hover:shadow-lg">
              <BsTwitter className="w-5 h-5 mr-2" />
              Twitter
            </button>
            <button className="flex items-center px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-all shadow-md hover:shadow-lg">
              <BsFacebook className="w-5 h-5 mr-2" />
              Facebook
            </button>
            <button className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
              <BsLinkedin className="w-5 h-5 mr-2" />
              LinkedIn
            </button>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FiClock className="w-6 h-6 mr-2 text-blue-600" />
              Bài viết liên quan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map(relatedPost => (
                <article key={relatedPost.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group">
                  <div className="overflow-hidden">
                    <img
                      src={relatedPost.featured_image_url || '/images/blog/default.jpg'}
                      alt={relatedPost.title}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                      <Link 
                        to={`/blog/${relatedPost.slug}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {relatedPost.title}
                      </Link>
                    </h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <FiClock className="w-4 h-4 mr-1.5" />
                      <span>{formatDate(relatedPost.published_at)}</span>
                      <span className="mx-2">•</span>
                      <span>{relatedPost.reading_time} phút đọc</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FiMessageCircle className="w-6 h-6 mr-2 text-blue-600" />
            Bình luận
          </h2>
          <div className="text-center py-12">
            <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
              <FiMessageCircle className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500">Hệ thống bình luận sẽ được triển khai sớm</p>
          </div>
        </section>
      </article>
    </div>
  );
};

export default BlogDetail;