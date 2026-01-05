const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Điều khoản sử dụng</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Chấp nhận điều khoản</h2>
              <p>
                Bằng việc truy cập và sử dụng trang web JobPortal, bạn đồng ý tuân thủ các điều khoản 
                và điều kiện sử dụng được quy định dưới đây. Nếu bạn không đồng ý với bất kỳ điều khoản 
                nào, vui lòng không sử dụng dịch vụ của chúng tôi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Mô tả dịch vụ</h2>
              <p>
                JobPortal là nền tảng tuyển dụng trực tuyến, kết nối giữa nhà tuyển dụng và ứng viên. 
                Chúng tôi cung cấp các dịch vụ như:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Đăng tin tuyển dụng cho nhà tuyển dụng</li>
                <li>Tìm kiếm và ứng tuyển việc làm cho ứng viên</li>
                <li>Quản lý hồ sơ cá nhân và công ty</li>
                <li>Hệ thống chat và phỏng vấn trực tuyến</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Tài khoản người dùng</h2>
              <p>
                Bạn có trách nhiệm duy trì tính bảo mật của tài khoản và mật khẩu. Bạn đồng ý thông báo 
                ngay lập tức cho chúng tôi về bất kỳ trường hợp sử dụng trái phép tài khoản nào.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Quy tắc sử dụng</h2>
              <p>Khi sử dụng dịch vụ, bạn đồng ý không:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Đăng tải nội dung vi phạm pháp luật, spam hoặc không phù hợp</li>
                <li>Sử dụng dịch vụ cho mục đích thương mại trái phép</li>
                <li>Can thiệp vào hoạt động bình thường của hệ thống</li>
                <li>Thu thập thông tin cá nhân của người dùng khác</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Quyền sở hữu trí tuệ</h2>
              <p>
                Tất cả nội dung trên JobPortal, bao gồm thiết kế, logo, văn bản, và mã nguồn, 
                đều thuộc quyền sở hữu của chúng tôi và được bảo vệ bởi luật sở hữu trí tuệ.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Giới hạn trách nhiệm</h2>
              <p>
                JobPortal không chịu trách nhiệm về bất kỳ thiệt hại nào phát sinh từ việc sử dụng 
                dịch vụ, bao gồm nhưng không giới hạn ở mất mát dữ liệu hoặc gián đoạn kinh doanh.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Thay đổi điều khoản</h2>
              <p>
                Chúng tôi có quyền thay đổi các điều khoản này bất cứ lúc nào. Các thay đổi sẽ có hiệu lực 
                ngay khi được đăng tải trên trang web.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Liên hệ</h2>
              <p>
                Nếu bạn có bất kỳ câu hỏi nào về các điều khoản này, vui lòng liên hệ với chúng tôi qua:
              </p>
              <ul className="list-none mt-2 space-y-1">
                <li>Email: support@jobportal.com</li>
                <li>Điện thoại: (84) 123-456-789</li>
                <li>Địa chỉ: 123 Nguyễn Du, Hai Bà Trưng, Hà Nội</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Điều khoản này có hiệu lực từ ngày 01/01/2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;