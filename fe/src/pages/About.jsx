import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import contentService from '@/services/contentService';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const About = () => {
  const [dynamicContent, setDynamicContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        setLoading(true);
        const response = await contentService.getContentById('about-us');
        if (response.success && response.data.content_type === 'page') {
          setDynamicContent(response.data);
        }
      } catch (error) {
        // Fallback to static content if fetch fails
        console.log('Using static about content');
      } finally {
        setLoading(false);
      }
    };

    fetchAboutContent();
  }, []);

  const stats = [
    {
      label: 'Công ty đối tác',
      value: '500+',
      icon: '🏢'
    },
    {
      label: 'Ứng viên tìm được việc',
      value: '10,000+',
      icon: '👨‍💼'
    },
    {
      label: 'Vị trí tuyển dụng',
      value: '2,500+',
      icon: '💼'
    },
    {
      label: 'Tỷ lệ thành công',
      value: '95%',
      icon: '🎯'
    }
  ];

  const team = [
    {
      name: 'Nguyễn Văn An',
      position: 'CEO & Founder',
      avatar: '/images/team/ceo.jpg',
      bio: '10+ năm kinh nghiệm trong lĩnh vực HR và Recruitment Technology.',
      social: {
        linkedin: '#',
        twitter: '#'
      }
    },
    {
      name: 'Trần Thị Lan',
      position: 'CTO',
      avatar: '/images/team/cto.jpg',
      bio: 'Chuyên gia công nghệ với background về AI và Machine Learning.',
      social: {
        linkedin: '#',
        github: '#'
      }
    },
    {
      name: 'Lê Văn Minh',
      position: 'Head of Marketing',
      avatar: '/images/team/marketing.jpg',
      bio: 'Chiến lược gia marketing với nhiều chiến dịch thành công trong ngành IT.',
      social: {
        linkedin: '#',
        facebook: '#'
      }
    },
    {
      name: 'Phạm Thị Hương',
      position: 'Head of HR',
      avatar: '/images/team/hr.jpg',
      bio: 'Chuyên gia tư vấn nghề nghiệp và phát triển tài năng IT.',
      social: {
        linkedin: '#',
        instagram: '#'
      }
    }
  ];

  const values = [
    {
      title: 'Minh bạch',
      description: 'Chúng tôi cam kết minh bạch trong mọi thông tin về công việc, lương thưởng và điều kiện làm việc.',
      icon: '🔍'
    },
    {
      title: 'Chất lượng',
      description: 'Đảm bảo chất lượng cao trong việc kết nối đúng người đúng việc, tạo giá trị bền vững.',
      icon: '⭐'
    },
    {
      title: 'Đổi mới',
      description: 'Không ngừng cải tiến và áp dụng công nghệ mới để mang lại trải nghiệm tốt nhất.',
      icon: '🚀'
    },
    {
      title: 'Tận tâm',
      description: 'Đặt lợi ích của ứng viên và nhà tuyển dụng lên hàng đầu trong mọi quyết định.',
      icon: '❤️'
    }
  ];

  const milestones = [
    {
      year: '2020',
      title: 'Thành lập',
      description: 'JobPortal được thành lập với tầm nhìn trở thành nền tảng tuyển dụng hàng đầu Việt Nam.'
    },
    {
      year: '2021',
      title: 'Ra mắt platform',
      description: 'Chính thức ra mắt nền tảng với 50 công ty đối tác và 1,000 ứng viên đầu tiên.'
    },
    {
      year: '2022',
      title: 'Mở rộng toàn quốc',
      description: 'Mở rộng hoạt động ra các thành phố lớn, đạt 5,000 ứng viên tìm được việc làm.'
    },
    {
      year: '2023',
      title: 'Tích hợp AI',
      description: 'Triển khai hệ thống AI matching, nâng cao độ chính xác kết nối lên 95%.'
    },
    {
      year: '2024',
      title: 'Dẫn đầu thị trường',
      description: 'Trở thành nền tảng tuyển dụng IT số 1 Việt Nam với 500+ đối tác doanh nghiệp.'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (dynamicContent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <section className="bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                {dynamicContent.title}
              </h1>
              {dynamicContent.excerpt && (
                <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-3xl mx-auto">
                  {dynamicContent.excerpt}
                </p>
              )}
            </div>
          </div>
        </section>
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: dynamicContent.content }}
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              🎆 Về JobPortal
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-3xl mx-auto">
              Kết nối tài năng IT với cơ hội nghề nghiệp tuyệt vời.
              Chúng tôi tin rằng mỗi người đều xứng đáng có công việc mơ ước.
            </p>
            <div className="flex justify-center space-x-6">
              <Link
                to="/register"
                className="bg-white text-green-600 font-semibold py-3 px-8 rounded-lg hover:bg-green-50 transition-colors"
              >
                Tham gia ngay
              </Link>
              <Link
                to="/jobs"
                className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-green-600 transition-colors"
              >
                Khám phá việc làm
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-primary-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Sứ mệnh của chúng tôi</h2>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">🎯 Tầm nhìn</h3>
                  <p className="text-gray-600">
                    Trở thành nền tảng tuyển dụng IT hàng đầu khu vực Đông Nam Á,
                    nơi mọi tài năng công nghệ đều tìm thấy cơ hội phát triển phù hợp.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">🚀 Sứ mệnh</h3>
                  <p className="text-gray-600">
                    Kết nối những tài năng IT xuất sắc với các doanh nghiệp có tầm nhìn,
                    tạo ra giá trị bền vững cho cả ứng viên và nhà tuyển dụng.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">💡 Cam kết</h3>
                  <p className="text-gray-600">
                    Không ngừng đổi mới công nghệ và cải tiến dịch vụ để mang lại
                    trải nghiệm tuyển dụng hiệu quả và minh bạch nhất.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/about/mission.jpg"
                alt="Our mission"
                className="rounded-lg shadow-lg w-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Giá trị cốt lõi</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Những giá trị định hướng mọi hoạt động và quyết định của chúng tôi
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center p-6 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Hành trình phát triển</h2>
            <p className="text-xl text-gray-600">Những cột mốc quan trọng trong chặng đường xây dựng JobPortal</p>
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-px h-full w-0.5 bg-primary-200"></div>

            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`relative flex items-center ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  {/* Timeline dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow"></div>

                  <div className={`w-5/12 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <div className="text-2xl font-bold text-primary-600 mb-2">{milestone.year}</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{milestone.title}</h3>
                      <p className="text-gray-600">{milestone.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Đội ngũ lãnh đạo</h2>
            <p className="text-xl text-gray-600">Những con người tài năng đang xây dựng tương lai tuyển dụng</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-4 mx-auto w-48 h-48">
                  <img
                    src={member.avatar || '/images/team/default.jpg'}
                    alt={member.name}
                    className="w-full h-full object-cover rounded-full shadow-lg group-hover:shadow-xl transition-shadow"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{member.name}</h3>
                <p className="text-primary-600 font-medium mb-3">{member.position}</p>
                <p className="text-gray-600 text-sm mb-4">{member.bio}</p>
                <div className="flex justify-center space-x-3">
                  {Object.entries(member.social).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <span className="sr-only">{platform}</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        {platform === 'linkedin' && (
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        )}
                        {platform === 'twitter' && (
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        )}
                        {platform === 'github' && (
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        )}
                        {platform === 'facebook' && (
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        )}
                        {platform === 'instagram' && (
                          <path d="M12.017 0C8.396 0 7.989.016 6.756.072 5.526.127 4.68.307 3.938.598a5.88 5.88 0 00-2.126 1.384A5.888 5.888 0 00.598 3.938C.307 4.68.127 5.527.072 6.756.016 7.99 0 8.396 0 12.017c0 3.622.016 4.028.072 5.261.055 1.23.234 2.076.526 2.818.292.742.681 1.369 1.384 2.126a5.92 5.92 0 002.126 1.384c.742.291 1.588.471 2.818.526 1.233.056 1.639.072 5.261.072 3.622 0 4.028-.016 5.261-.072 1.23-.055 2.076-.234 2.818-.526a5.92 5.92 0 002.126-1.384 5.92 5.92 0 001.384-2.126c.291-.742.471-1.588.526-2.818.056-1.233.072-1.639.072-5.261 0-3.622-.016-4.028-.072-5.261-.055-1.23-.234-2.076-.526-2.818a5.92 5.92 0 00-1.384-2.126A5.92 5.92 0 0020.878.598c-.742-.291-1.588-.471-2.818-.526C16.028.016 15.622.001 12.017.001h0zm-.764 1.969c.372-.001.768-.001 1.163-.001 3.557 0 3.976.016 5.382.072 1.299.06 2.006.281 2.477.466.622.242 1.066.531 1.533.998.467.467.756.91.998 1.533.185.471.406 1.178.466 2.477.056 1.405.068 1.824.068 5.381s-.012 3.977-.068 5.382c-.06 1.299-.281 2.006-.466 2.477a3.915 3.915 0 01-.998 1.533 3.915 3.915 0 01-1.533.998c-.471.185-1.178.406-2.477.466-1.405.056-1.824.068-5.382.068-3.558 0-3.977-.012-5.382-.068-1.299-.06-2.006-.281-2.477-.466a3.915 3.915 0 01-1.533-.998 3.915 3.915 0 01-.998-1.533c-.185-.471-.406-1.178-.466-2.477-.056-1.405-.068-1.824-.068-5.381s.012-3.977.068-5.382c.06-1.299.281-2.006.466-2.477a3.915 3.915 0 01.998-1.533 3.915 3.915 0 011.533-.998c.471-.185 1.178-.406 2.477-.466 1.229-.056 1.706-.067 4.61-.067l.773-.001zm5.984 1.814a1.14 1.14 0 100 2.28 1.14 1.14 0 000-2.28zm-4.27 1.122a4.109 4.109 0 100 8.217 4.109 4.109 0 000-8.217zm0 1.441a2.667 2.667 0 110 5.334 2.667 2.667 0 010-5.334z" />
                        )}
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu hành trình mới?</h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Tham gia cộng đồng JobPortal để khám phá những cơ hội nghề nghiệp tuyệt vời đang chờ đón bạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register?role=candidate"
              className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Dành cho ứng viên
            </Link>
            <Link
              to="/register?role=recruiter"
              className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-primary-600 transition-colors"
            >
              Dành cho nhà tuyển dụng
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;