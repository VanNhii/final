import LoadingSpinner from '@/components/common/LoadingSpinner';
import jobService from '@/services/jobService';
import {useEffect, useState} from 'react';
import {BsBuilding, BsCpu, BsGlobe, BsGraphUp, BsLightning, BsPeople, BsShieldCheck, BsStar} from 'react-icons/bs';
import {FiArrowRight, FiCheck, FiHeart, FiTarget} from 'react-icons/fi';
import {Link} from 'react-router';

const About = () => {


  const features = [
    {
      label: 'Công nghệ AI Tiên phong',
      description: 'Hệ thống Matching thông minh kết nối ứng viên và doanh nghiệp chuẩn xác tới 99%.',
      icon: <BsCpu className="w-8 h-8 text-blue-400" />,
      color: "from-blue-500/20 to-indigo-500/20",
      border: "border-blue-500/30",
      text: "text-blue-400"
    },
    {
      label: 'Tốc độ tột đỉnh',
      description: 'Rút ngắn 70% thời gian tuyển dụng nhờ quy trình tự động hóa hoàn toàn.',
      icon: <BsLightning className="w-8 h-8 text-yellow-400" />,
      color: "from-yellow-500/20 to-orange-500/20",
      border: "border-yellow-500/30",
      text: "text-yellow-400"
    },
    {
      label: 'Bảo mật tuyệt đối',
      description: 'Cam kết bảo vệ dữ liệu người dùng với chuẩn an ninh thông tin quốc tế.',
      icon: <BsShieldCheck className="w-8 h-8 text-green-400" />,
      color: "from-green-500/20 to-emerald-500/20",
      border: "border-green-500/30",
      text: "text-green-400"
    },
    {
      label: 'Mạng lưới toàn cầu',
      description: 'Kết nối không giới hạn với hàng nghìn doanh nghiệp đa quốc gia.',
      icon: <BsGlobe className="w-8 h-8 text-purple-400" />,
      color: "from-purple-500/20 to-pink-500/20",
      border: "border-purple-500/30",
      text: "text-purple-400"
    }
  ];

  const values = [
    {
      title: 'Minh bạch',
      description: 'Chúng tôi cam kết minh bạch trong mọi thông tin về công việc, lương thưởng và điều kiện làm việc.',
      icon: <FiTarget className="w-6 h-6" />
    },
    {
      title: 'Chất lượng',
      description: 'Đảm bảo chất lượng cao trong việc kết nối đúng người đúng việc, tạo giá trị bền vững.',
      icon: <BsStar className="w-6 h-6" />
    },
    {
      title: 'Đổi mới',
      description: 'Không ngừng cải tiến và áp dụng công nghệ mới để mang lại trải nghiệm tốt nhất.',
      icon: <BsGraphUp className="w-6 h-6" />
    },
    {
      title: 'Tận tâm',
      description: 'Đặt lợi ích của ứng viên và nhà tuyển dụng lên hàng đầu trong mọi quyết định.',
      icon: <FiHeart className="w-6 h-6" />
    }
  ];



  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-md mb-6 animate-fade-in-up">
            <span className="text-blue-400 font-medium text-sm">✨ Câu chuyện của chúng tôi</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight tracking-tight">
            Kết nối tài năng <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Kiến tạo tương lai
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
            Chúng tôi không chỉ là một nền tảng tuyển dụng. Chúng tôi là cầu nối giữa
            những giấc mơ nghề nghiệp và hiện thực, nơi công nghệ gặp gỡ con người.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/jobs"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 flex items-center"
            >
              Khám phá cơ hội <FiArrowRight className="ml-2" />
            </Link>
            <Link
              to="/contact" // Assuming contact page exists or similar
              className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700 font-bold rounded-xl transition-all hover:scale-105 backdrop-blur-sm"
            >
              Liên hệ hợp tác
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900 border-y border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Nền tảng tuyển dụng <span className="text-blue-500">4.0</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Chúng tôi tiên phong ứng dụng công nghệ để định hình lại tương lai của ngành nhân sự.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative">
                {/* Card Glow Effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.color} opacity-30 group-hover:opacity-100 blur transition duration-500 rounded-2xl`}></div>

                <div className="relative bg-slate-950 p-8 rounded-2xl border border-slate-800 h-full flex flex-col items-center text-center hover:bg-slate-900 transition-colors">
                  <div className={`w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>

                  <h3 className={`text-xl font-bold text-white mb-3 group-hover:${feature.text} transition-colors`}>{feature.label}</h3>
                  <p className="text-slate-400 leading-relaxed font-light text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                Sứ mệnh của chúng tôi là <br />
                <span className="text-blue-500">nâng tầm sự nghiệp IT</span>
              </h2>

              <div className="space-y-6">
                <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <FiTarget />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Tầm nhìn</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Trở thành hệ sinh thái tuyển dụng công nghệ số 1, nơi AI giúp loại bỏ
                      mọi rào cản giữa ứng viên tài năng và doanh nghiệp xuất sắc.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-purple-500/30 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <BsStar />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Cam kết</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Chúng tôi cam kết về sự minh bạch, chất lượng và bảo mật tuyệt đối
                      cho cộng đồng người dùng.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group perspective-1000">
              <div className="absolute inset-0 bg-blue-600 rounded-3xl blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative rounded-3xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-900 transform group-hover:rotate-1 transition-transform duration-500">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10"></div>
                {/* Abstract representation or image */}
                <div className="h-[500px] w-full bg-slate-800 relative overflow-hidden flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80"
                    alt="Startups working"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute bottom-10 left-10 z-20">
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-xs">
                      <p className="text-white font-medium italic">"JobPortal đã thay đổi hoàn toàn cách chúng tôi tuyển dụng nhân sự cấp cao."</p>
                      <p className="text-blue-300 mt-4 text-sm font-bold">— TechCorp CTO</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Giá trị cốt lõi</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Những nguyên tắc định hình văn hóa và sản phẩm của chúng tôi
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="p-8 bg-slate-950 rounded-3xl border border-slate-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/20 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                <p className="text-slate-400 font-light leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default About;