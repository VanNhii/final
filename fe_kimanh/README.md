# HỆ THỐNG TUYỂN DỤNG TRỰC TUYẾN (DATN) - FRONTEND

Tài liệu này mô tả chi tiết về cấu trúc, công nghệ và các quy trình hoạt động (flows) của phần Frontend trong dự án Đồ án tốt nghiệp.

## 🚀 Công nghệ sử dụng

Dự án được xây dựng dựa trên các công nghệ hiện đại nhằm đảm bảo hiệu năng và trải nghiệm người dùng:

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) (Kèm theo thiết kế hiện đại, responsive)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) (Quản lý trạng thái toàn cục: Auth, UI,...)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)
- **Charts**: [Chart.js](https://www.chartjs.org/) & [React-chartjs-2](https://react-charts.js.org/) (Dành cho Dashboard/Analytics)
- **Real-time**: [Socket.io-client](https://socket.io/) (Hệ thống chat và thông báo tức thời)
- **Notifications**: [React Toastify](https://fkhadra.github.io/react-toastify/introduction/)

---

## 📂 Cấu trúc thư mục

```text
fe/
├── src/
│   ├── components/     # Các UI Component dùng chung (Navbar, Footer, Modal, Button...)
│   ├── hooks/          # Custom hooks xử lý logic tái sử dụng
│   ├── pages/          # Các trang chính, chia theo phân quyền (Admin, Recruiter, Candidate)
│   ├── services/       # Nơi quản lý các API calls đến Backend
│   ├── store/          # Cấu hình Redux (Slices & Store)
│   ├── router/         # Cấu hình các tuyến đường (routes) và bảo vệ route
│   ├── utils/          # Các hàm tiện ích (format date, validate...)
│   ├── assets/         # Hình ảnh, font, styles chung
│   ├── App.jsx         # Entry point component
│   └── main.jsx        # File render ứng dụng
├── public/             # Tài nguyên tĩnh
└── vite.config.js      # Cấu hình Vite
```

---

## 🔄 Luồng hoạt động chính (User Flows)

Hệ thống được thiết kế với 3 luồng chính tương ứng với 3 vai trò người dùng:

### 1. Luồng Người tìm việc (Candidate)
- **Đăng ký/Đăng nhập**: Tạo tài khoản và xác thực.
- **Quản lý Hồ sơ**: Cập nhật thông tin cá nhân, kỹ năng, kinh nghiệm và tải lên CV.
- **Tìm kiếm Công việc**: Tìm kiếm theo từ khóa, ngành nghề, địa điểm và mức lương.
- **Ứng tuyển**: Nộp CV trực tuyến cho các vị trí mong muốn.
- **Theo dõi Ứng tuyển**: Xem trạng thái của các đơn ứng tuyển (Đã nộp, Đang xem xét, Phỏng vấn, Từ chối).
- **Phỏng vấn**: Nhận lịch phỏng vấn và quản lý danh sách các buổi phỏng vấn.
- **Kết nối**: Nhắn tin trực tiếp với nhà tuyển dụng thông qua hệ thống Chat.
- **Gợi ý việc làm**: Nhận các đề xuất công việc phù hợp dựa trên hồ sơ cá nhân.

### 2. Luồng Nhà tuyển dụng (Recruiter)
- **Quản lý Tin tuyển dụng**: Đăng tin tuyển dụng mới, chỉnh sửa hoặc đóng tin.
- **Quản lý Ứng viên**: Xem danh sách ứng viên đã nộp đơn, xem profile/CV và thay đổi trạng thái ứng tuyển.
- **Tìm kiếm Ứng viên**: Tìm kiếm ứng viên tiềm năng từ cơ sở dữ liệu của hệ thống.
- **Lên lịch Phỏng vấn**: Gửi lời mời và đặt lịch phỏng vấn với ứng viên.
- **Chat**: Trao đổi trực tiếp với ứng viên về công việc.
- **Mua gói dịch vụ**: Đăng ký các gói dịch vụ (Service Plans) để có thêm lượt đăng tin hoặc tính năng cao cấp.
- **Dashboard & Analytics**: Thống kê số lượng tin đăng, lượt ứng tuyển và hiệu quả tuyển dụng qua biểu đồ.

### 3. Luồng Quản trị viên (Admin)
- **Quản lý Người dùng**: Kiểm soát tài khoản Ứng viên và Nhà tuyển dụng (Kích hoạt/Khóa).
- **Quản lý Nội dung**: Duyệt/Xóa tin tuyển dụng, quản lý danh mục ngành nghề.
- **Quản lý Tài chính**: Theo dõi các giao dịch thanh toán và quản lý các gói dịch vụ.
- **Hệ thống**: Cấu hình các tham số hệ thống, mẫu email, thông báo.
- **Báo cáo & Thống kê**: Xem báo cáo tổng quan về hoạt động của toàn hệ thống thông qua Analytics Dashboard.

---

## 🛠 Cách chạy dự án dưới máy cục bộ

1. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

2. **Cấu hình môi trường**:
   - Tạo file `.env` từ `.env.example`.
   - Cấu hình `VITE_API_URL` trỏ về Backend API của bạn.

3. **Chạy ở chế độ phát triển (Development)**:
   ```bash
   npm run dev
   ```

4. **Xây dựng bản chính thức (Production)**:
   ```bash
   npm run build
   ```

---

## 📝 Lưu ý khi bảo vệ đồ án
- Tập trung trình bày tính **Responsive** (giao diện hoạt động tốt trên cả mobile và desktop).
- Trình bày về luồng **Xác thực (Authentication)** và **Phân quyền (Authorization)** giữa các Role.
- Nhấn mạnh vào tính năng **Real-time (Socket.io)** khi chat và thông báo.
- Demo các biểu đồ thống kê trong trang **Dashboard** để thấy được khả năng tổng hợp dữ liệu của Frontend.
