const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Chính sách bảo mật</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Giới thiệu</h2>
              <p>
                JobPortal cam kết bảo vệ quyền riêng tư và thông tin cá nhân của người dùng. 
                Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Thông tin chúng tôi thu thập</h2>
              <p>Chúng tôi có thể thu thập các loại thông tin sau:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li><strong>Thông tin cá nhân:</strong> Họ tên, email, số điện thoại, địa chỉ</li>
                <li><strong>Thông tin nghề nghiệp:</strong> CV, kinh nghiệm làm việc, kỹ năng</li>
                <li><strong>Thông tin công ty:</strong> Tên công ty, địa chỉ, mô tả doanh nghiệp</li>
                <li><strong>Thông tin kỹ thuật:</strong> IP address, browser, cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Cách chúng tôi sử dụng thông tin</h2>
              <p>Thông tin được thu thập để:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Cung cấp và cải thiện dịch vụ</li>
                <li>Kết nối nhà tuyển dụng với ứng viên phù hợp</li>
                <li>Gửi thông báo về cơ hội việc làm</li>
                <li>Phân tích và thống kê sử dụng dịch vụ</li>
                <li>Bảo mật và chống gian lận</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Chia sẻ thông tin</h2>
              <p>
                Chúng tôi không bán, thuê hoặc chia sẻ thông tin cá nhân với bên thứ ba, 
                trừ trong các trường hợp sau:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Khi bạn đồng ý rõ ràng</li>
                <li>Để tuân thủ yêu cầu pháp lý</li>
                <li>Bảo vệ quyền lợi và an toàn của chúng tôi và người dùng</li>
                <li>Với các đối tác dịch vụ được ủy quyền</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Bảo mật thông tin</h2>
              <p>
                Chúng tôi áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp để bảo vệ 
                thông tin cá nhân khỏi truy cập, sử dụng hoặc tiết lộ trái phép.
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Mã hóa dữ liệu SSL/TLS</li>
                <li>Firewall và hệ thống bảo mật</li>
                <li>Kiểm soát truy cập nghiêm ngặt</li>
                <li>Sao lưu và phục hồi dữ liệu</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Cookies và công nghệ theo dõi</h2>
              <p>
                Chúng tôi sử dụng cookies để cải thiện trải nghiệm người dùng, phân tích lưu lượng 
                và cá nhân hóa nội dung. Bạn có thể điều chỉnh cài đặt cookies trong trình duyệt.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Quyền của người dùng</h2>
              <p>Bạn có quyền:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Truy cập và xem thông tin cá nhân</li>
                <li>Cập nhật hoặc sửa đổi thông tin</li>
                <li>Xóa tài khoản và dữ liệu</li>
                <li>Từ chối nhận email marketing</li>
                <li>Khiếu nại về việc xử lý dữ liệu</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Lưu trữ dữ liệu</h2>
              <p>
                Chúng tôi lưu trữ thông tin cá nhân trong thời gian cần thiết để cung cấp dịch vụ 
                hoặc theo yêu cầu pháp lý. Dữ liệu sẽ được xóa an toàn khi không còn cần thiết.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Thay đổi chính sách</h2>
              <p>
                Chúng tôi có thể cập nhật chính sách bảo mật này. Mọi thay đổi quan trọng sẽ được 
                thông báo qua email hoặc thông báo trên trang web.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Liên hệ</h2>
              <p>
                Nếu có câu hỏi về chính sách bảo mật, vui lòng liên hệ:
              </p>
              <ul className="list-none mt-2 space-y-1">
                <li>Email: privacy@jobportal.com</li>
                <li>Điện thoại: (84) 123-456-789</li>
                <li>Địa chỉ: 123 Nguyễn Du, Hai Bà Trưng, Hà Nội</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Chính sách này có hiệu lực từ ngày 01/01/2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;