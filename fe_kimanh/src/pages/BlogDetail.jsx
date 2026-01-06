import LoadingSpinner from '@/components/common/LoadingSpinner';
import contentService from '@/services/contentService';
import {useEffect, useState} from 'react';
import {
    FiArrowLeft,
    FiCalendar,
    FiClock,
    FiFacebook,
    FiLinkedin,
    FiShare2,
    FiTag,
    FiTwitter,
    FiUser
} from 'react-icons/fi';
import {Link, useParams} from 'react-router';

// MOCK DATA (Matching Home.jsx)
const MOCK_POSTS = {
    'huong-dan-viet-cv-chuan-it': {
        _id: 'mock1',
        title: 'Hướng dẫn viết CV IT "bách phát bách trúng"',
        content: `
      <h2>1. Tại sao CV của bạn lại quan trọng?</h2>
      <p>Trong thị trường tuyển dụng IT đầy cạnh tranh hiện nay, CV chính là "vũ khí" đầu tiên giúp bạn gây ấn tượng với nhà tuyển dụng. Một CV được trình bày khoa học, chuyên nghiệp không chỉ thể hiện kỹ năng cứng mà còn cho thấy tư duy logic và sự chỉn chu của ứng viên.</p>
      
      <h2>2. Cấu trúc chuẩn của một CV IT</h2>
      <p>Một CV IT chuẩn thường bao gồm các phần sau:</p>
      <ul>
        <li><strong>Thông tin cá nhân:</strong> Họ tên, số điện thoại, email, LinkedIn, Github.</li>
        <li><strong>Tóm tắt (Summary):</strong> 2-3 câu giới thiệu ngắn gọn về bản thân và mục tiêu nghề nghiệp.</li>
        <li><strong>Kỹ năng (Skills):</strong> Liệt kê các ngôn ngữ, framework, tool mà bạn thành thạo. Hãy phân loại chúng (ví dụ: Languages, Frameworks, Databases).</li>
        <li><strong>Kinh nghiệm làm việc (Experience):</strong> Mô tả chi tiết các dự án bạn đã tham gia. Sử dụng mô hình STAR (Situation, Task, Action, Result) để làm nổi bật đóng góp của bạn.</li>
        <li><strong>Dự án cá nhân (Projects):</strong> Nếu bạn chưa có nhiều kinh nghiệm, hãy làm nổi bật các dự án cá nhân hoặc đồ án tốt nghiệp.</li>
        <li><strong>Học vấn (Education):</strong> Trường, chuyên ngành, GPA (nếu cao).</li>
      </ul>

      <h2>3. Những lỗi thường gặp cần tránh</h2>
      <p>- CV quá dài (nên gói gọn trong 1-2 trang).</p>
      <p>- Sai chính tả hoặc ngữ pháp (điều tối kỵ).</p>
      <p>- Liệt kê kỹ năng dạng biểu đồ phần trăm (vô nghĩa).</p>
      <p>- Sử dụng email thiếu chuyên nghiệp.</p>

      <h2>4. Lời kết</h2>
      <p>Hãy dành thời gian trau chuốt CV của mình. Đừng quên tùy chỉnh CV cho phù hợp với từng JD (Job Description) mà bạn ứng tuyển. Chúc bạn thành công!</p>
    `,
        published_at: new Date().toISOString(),
        author: {
            name: 'Nguyễn Văn A',
            avatar: 'https://ui-avatars.com/api/?name=Nguyen+Van+A&background=random'
        },
        category: 'Career Guide',
        tags: ['CV', 'Interview', 'Tips'],
        featured_image_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80'
    },
    'top-ngon-ngu-lap-trinh-2024': {
        _id: 'mock2',
        title: 'Top 5 ngôn ngữ lập trình đáng học nhất 2024',
        content: `
      <h2>1. JavaScript / TypeScript</h2>
      <p>Không ngạc nhiên khi JS vẫn đứng đầu bảng. Với sự thống trị của React, Vue, Angular ở Frontend và Node.js ở Backend, JS là ngôn ngữ "phải biết". TypeScript đang dần trở thành tiêu chuẩn mới nhờ khả năng type-checking mạnh mẽ.</p>

      <h2>2. Python</h2>
      <p>Vua của lĩnh vực AI, Machine Learning và Data Science. Python có cú pháp đơn giản, dễ học nhưng cực kỳ mạnh mẽ. Các framework như Django, Flask cũng giúp Python làm web backend rất tốt.</p>

      <h2>3. Go (Golang)</h2>
      <p>Được Google phát triển, Go nổi tiếng với hiệu năng cao và khả năng xử lý concurrency tuyệt vời. Đây là lựa chọn hàng đầu cho các hệ thống Microservices và Cloud-native.</p>

      <h2>4. Rust</h2>
      <p>Ngôn ngữ được yêu thích nhất trên Stack Overflow nhiều năm liền. Rust đảm bảo an toàn bộ nhớ (memory safety) mà không cần Garbage Collector. Nó đang dần thay thế C++ trong nhiều tác vụ hệ thống.</p>

      <h2>5. Java</h2>
      <p>Già nhưng chưa bao giờ hết hot. Java vẫn là trụ cột của các hệ thống Enterprise lớn. Spring Boot giúp việc phát triển Java trở nên hiện đại và nhanh chóng hơn nhiều.</p>
    `,
        published_at: new Date().toISOString(),
        author: {
            name: 'Trần Thị B',
            avatar: 'https://ui-avatars.com/api/?name=Tran+Thi+B&background=random'
        },
        category: 'Technology',
        tags: ['Programming', '2024', 'Trends'],
        featured_image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80'
    },
    'ky-nang-mem-cho-developer': {
        _id: 'mock3',
        title: 'Kỹ năng mềm - Chìa khóa thăng tiến cho Developer',
        content: `
      <h2>Tại sao chỉ Tech Skills là chưa đủ?</h2>
      <p>Nhiều Developer nghĩ rằng chỉ cần code giỏi là sẽ thăng tiến. Nhưng thực tế, khi lên các vị trí Senior, Lead hay Manager, kỹ năng mềm (Soft Skills) mới là yếu tố quyết định.</p>

      <h2>1. Kỹ năng giao tiếp (Communication)</h2>
      <p>Bạn cần giải thích vấn đề kỹ thuật phức tạp cho PM, Designer hay Khách hàng hiểu. Giao tiếp kém dễ dẫn đến hiểu sai yêu cầu (bugs) và xung đột trong team.</p>

      <h2>2. Làm việc nhóm (Teamwork)</h2>
      <p>Phần mềm lớn không ai làm một mình. Biết cách review code, chia sẻ kiến thức, và hỗ trợ đồng đội là phẩm chất của một Senior Dev thực thụ.</p>

      <h2>3. Quản lý thời gian (Time Management)</h2>
      <p>Ước lượng task chính xác, ưu tiên công việc hợp lý để tránh OT triền miên.</p>

      <h2>4. Tư duy giải quyết vấn đề (Problem Solving)</h2>
      <p>Đừng chỉ copy-paste từ Stack Overflow. Hãy hiểu bản chất vấn đề và tìm giải pháp tối ưu nhất.</p>

      <h2>Kết luận</h2>
      <p>Hãy cân bằng giữa việc học công nghệ mới và rèn luyện kỹ năng mềm. Đó là con đường ngắn nhất để trở thành một Software Engineer toàn diện.</p>
    `,
        published_at: new Date().toISOString(),
        author: {
            name: 'Lê Văn C',
            avatar: 'https://ui-avatars.com/api/?name=Le+Van+C&background=random'
        },
        category: 'Skills',
        tags: ['Soft Skills', 'Career', 'Advice'],
        featured_image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80'
    },
    'lo-trinh-phat-trien-backend': {
        _id: 'mock4',
        title: 'Lộ trình trở thành Backend Developer từ Zero đến Hero',
        content: `
      <h2>1. Kiến thức nền tảng</h2>
      <p>Trước khi đi sâu vào Backend, bạn cần nắm vững kiến thức về Internet, giao thức HTTP/HTTPS, DNS, và cách trình duyệt hoạt động.</p>
      
      <h2>2. Ngôn ngữ lập trình</h2>
      <p>Chọn một ngôn ngữ để bắt đầu. Các lựa chọn phổ biến:</p>
      <ul>
        <li><strong>JavaScript (Node.js):</strong> Dễ học, cộng đồng lớn, fullstack JS.</li>
        <li><strong>Java:</strong> Mạnh mẽ, ổn định, dùng nhiều trong doanh nghiệp lớn (Spring Boot).</li>
        <li><strong>Python:</strong> Cú pháp đơn giản, mạnh về AI/Data (Django, Flask, FastAPI).</li>
        <li><strong>Go (Golang):</strong> Hiệu năng cao, tốt cho Microservices.</li>
        <li><strong>C# (.NET):</strong> Hệ sinh thái Microsoft mạnh mẽ.</li>
      </ul>

      <h2>3. Cơ sở dữ liệu (Database)</h2>
      <p>Bạn cần biết ít nhất một SQL và một NoSQL database:</p>
      <ul>
        <li><strong>Relational (SQL):</strong> PostgreSQL, MySQL, SQL Server. Học về thiết kế schema, normalization, index, transactions.</li>
        <li><strong>NoSQL:</strong> MongoDB, Redis (caching), Cassandra.</li>
      </ul>

      <h2>4. API & Architecture</h2>
      <p>Học cách xây dựng RESTful APIs, GraphQL. Hiểu về MVC, Monolithic vs Microservices.</p>

      <h2>5. Deployment & DevOps cơ bản</h2>
      <p>Biết cách sử dụng Git, Docker, CI/CD basic, và deploy lên cloud (AWS/Azure/GCP hoặc Vercel/Render).</p>

      <h2>6. Lời khuyên</h2>
      <p>Đừng cố học tất cả cùng lúc. Hãy đi từng bước, làm dự án thực tế để củng cố kiến thức.</p>
    `,
        published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        author: {
            name: 'Phạm Minh D',
            avatar: 'https://ui-avatars.com/api/?name=Pham+Minh+D&background=random'
        },
        category: 'Career Path',
        tags: ['Backend', 'Roadmap', 'DevOps'],
        featured_image_url: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=1200&q=80'
    },
    'bi-quyet-phong-van-thanh-cong': {
        _id: 'mock5',
        title: 'Bí quyết trả lời phỏng vấn IT ấn tượng',
        content: `
      <h2>1. Chuẩn bị trước buổi phỏng vấn</h2>
      <p>Tìm hiểu kỹ về công ty, sản phẩm, và văn hóa của họ. Review lại kiến thức cơ bản và các dự án trong CV của bạn.</p>

      <h2>2. Technical Interview</h2>
      <p>Ôn tập về Thuật toán & Cấu trúc dữ liệu (LeetCode/HackerRank). Hiểu rõ System Design nếu ứng tuyển vị trí Senior.</p>
      <p>Khi code trên bảng hoặc online editor, hãy vừa làm vừa "nói ra suy nghĩ" (think aloud) để người phỏng vấn hiểu tư duy của bạn.</p>

      <h2>3. Behavioral Interview (Phỏng vấn hành vi)</h2>
      <p>Áp dụng mô hình <strong>STAR</strong>:</p>
      <ul>
        <li><strong>S - Situation:</strong> Nêu bối cảnh tình huống.</li>
        <li><strong>T - Task:</strong> Nhiệm vụ/vấn đề cần giải quyết.</li>
        <li><strong>A - Action:</strong> Hành động CỤ THỂ của bạn.</li>
        <li><strong>R - Result:</strong> Kết quả đạt được (có số liệu càng tốt).</li>
      </ul>

      <h2>4. Đặt câu hỏi ngược lại</h2>
      <p>Cuối buổi, hãy hỏi recruiter về team, tech stack, roadmap sản phẩm... Điều này thể hiện sự quan tâm nghiêm túc của bạn.</p>
     `,
        published_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        author: {
            name: 'Hoàng Thùy E',
            avatar: 'https://ui-avatars.com/api/?name=Hoang+Thuy+E&background=random'
        },
        category: 'Interview',
        tags: ['Interview', 'Soft Skills', 'Tips'],
        featured_image_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80'
    },
    'xu-huong-ai-2025': {
        _id: 'mock6',
        title: 'AI sẽ thay đổi ngành lập trình như thế nào trong 2025?',
        content: `
      <h2>1. AI Coding Assistants bùng nổ</h2>
      <p>GitHub Copilot, Cursor, Codeium... không còn là đồ chơi mà là công cụ bắt buộc. Developer sẽ chuyển từ "người viết code" sang "người review và kiến trúc code".</p>

      <h2>2. Low-code/No-code lên ngôi</h2>
      <p>Với sự hỗ trợ của AI, các ứng dụng CRUD đơn giản sẽ được tạo ra trong vài phút bởi non-tech users. Developer sẽ tập trung vào các bài toán phức tạp hơn.</p>

      <h2>3. Kỹ năng Prompt Engineering</h2>
      <p>Biết cách ra lệnh cho AI để gen code chất lượng, test case, và documentation sẽ là một kỹ năng cứng (hard skill).</p>

      <h2>4. Bảo mật và AI</h2>
      <p>Biết cách phát hiện lỗ hổng bảo mật nhanh hơn, nhưng cũng tạo ra các nguy cơ tấn công mới. Dev cần hiểu về AI Security.</p>

      <h2>Kết luận</h2>
      <p>AI không thay thế Developer, nhưng Developer biết dùng AI sẽ thay thế Developer không biết dùng. Hãy thích nghi ngay hôm nay!</p>
     `,
        published_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        author: {
            name: 'Dr. Tech',
            avatar: 'https://ui-avatars.com/api/?name=Dr+Tech&background=random'
        },
        category: 'Technology',
        tags: ['AI', 'Future', 'Trends'],
        featured_image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=80'
    }
};

const BlogDetail = () => {
    const {id} = useParams(); // This captures the ':id' part of /blog/:id
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            setLoading(true);
            try {
                // Check if it's a mock post first
                // We link to /blog/:slug, so 'id' here is actually the slug or ID
                if (MOCK_POSTS[id] || (Object.values(MOCK_POSTS).find(p => p._id === id))) {
                    const found = MOCK_POSTS[id] || Object.values(MOCK_POSTS).find(p => p._id === id);
                    // Simulate network delay for realism
                    setTimeout(() => {
                        setPost(found);
                        setLoading(false);
                    }, 500);
                    return;
                }

                // Real API call
                const response = await contentService.getContentById(id);
                if (response.success) {
                    setPost(response.data);
                } else {
                    setError('Không tìm thấy bài viết');
                }
            } catch (err) {
                console.error('Error fetching blog detail:', err);
                setError('Đã có lỗi xảy ra khi tải bài viết');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPost();
        }
    }, [id]);

    if (loading) return (
        <div className="flex justify-center items-center min-h-[60vh] bg-slate-950">
            <LoadingSpinner />
        </div>
    );

    if (error || !post) return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold mb-4">Opps!</h2>
            <p className="text-slate-400 mb-6">{error || 'Bài viết không tồn tại'}</p>
            <Link to="/blog" className="px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center">
                <FiArrowLeft className="mr-2" /> Quay lại Blog
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* ProgressBar (Optional scroll indicator could go here) */}

            {/* Hero Header with Image Background */}
            <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                    <img
                        src={post.featured_image_url || 'https://images.unsplash.com/photo-1499750310159-53f0f748fe6b?w=1600&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/40"></div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10 max-w-5xl mx-auto">
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        {post.category && (
                            <span className="bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-blue-900/20 backdrop-blur-sm">
                                {post.category}
                            </span>
                        )}
                        <div className="flex items-center text-slate-300 text-sm font-medium bg-slate-800/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            <FiClock className="mr-2" />
                            {new Date(post.published_at || post.created_at).toLocaleDateString('vi-VN')}
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-8 drop-shadow-lg">
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <img
                                src={post.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'Admin')}&background=random`}
                                alt={post.author?.name}
                                className="w-12 h-12 rounded-full border-2 border-slate-600 shadow-md"
                            />
                            <div>
                                <p className="text-white font-bold">{post.author?.name || 'Admin'}</p>
                                <p className="text-slate-400 text-xs">Tác giả</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-10 relative z-20">
                <div className="bg-slate-900 text-slate-300 rounded-2xl md:rounded-3xl p-6 md:p-12 shadow-2xl border border-slate-800 backdrop-blur-3xl">
                    {/* Share Buttons (Sticky or Inline) */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-8 mb-8">
                        <Link to="/" className="text-slate-400 hover:text-blue-400 flex items-center transition-colors font-medium">
                            <FiArrowLeft className="mr-2" /> Trang chủ
                        </Link>
                        <div className="flex gap-4">
                            <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                                <FiFacebook size={18} />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all text-slate-400">
                                <FiTwitter size={18} />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-700 hover:text-white transition-all text-slate-400">
                                <FiLinkedin size={18} />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all text-slate-400">
                                <FiShare2 size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Post Content */}
                    <article className="prose prose-lg prose-invert max-w-none 
                prose-headings:text-white prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
                prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
                prose-strong:text-white prose-strong:font-bold
                prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                prose-ul:list-disc prose-ul:ml-5 prose-ul:text-slate-300
                prose-li:mb-2
                prose-img:rounded-2xl prose-img:shadow-lg prose-img:border prose-img:border-slate-800
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-800/50 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-lg prose-blockquote:italic
            ">
                        <div dangerouslySetInnerHTML={{__html: post.content}} />
                    </article>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-slate-800">
                            <h3 className="text-white font-bold mb-4 flex items-center">
                                <FiTag className="mr-2 text-blue-400" /> Chủ đề liên quan
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {post.tags.map((tag, idx) => (
                                    <span key={idx} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer border border-slate-700 hover:border-slate-600">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Related Posts (Optional) */}
            {/* Could add a simple section here looping through other mock posts */}
        </div>
    );
};

export default BlogDetail;
