# Job Portal Backend API

Backend API cho hệ thống Việc Làm IT được xây dựng với Node.js, Express.js và MongoDB.

## Cấu trúc thư mục

```
be/
├── src/
│   ├── config/          # Cấu hình database, email, etc.
│   ├── controllers/     # Logic xử lý business
│   ├── middleware/      # Authentication, validation, etc.
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── public/
│   └── uploads/         # File uploads
├── .env                 # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Cài đặt

### 1. Clone repository và di chuyển vào thư mục backend
```bash
cd be
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình môi trường
Sao chép file `.env` và cấu hình các biến môi trường:

```bash
cp .env.example .env
```

Cập nhật các thông tin sau trong file `.env`:
- `MONGODB_URI`: Connection string MongoDB
- `JWT_SECRET`: Secret key cho JWT
- `SMTP_*`: Cấu hình email
- Các cấu hình khác

### 4. Khởi động MongoDB
Đảm bảo MongoDB đang chạy trên hệ thống của bạn.

### 5. Chạy ứng dụng

#### Development mode
```bash
npm run dev
```

#### Production mode
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Đăng ký user mới
- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/logout` - Đăng xuất
- `POST /api/v1/auth/forgot-password` - Quên mật khẩu
- `POST /api/v1/auth/reset-password` - Reset mật khẩu

### Users
- `GET /api/v1/users/profile` - Lấy thông tin profile
- `PUT /api/v1/users/profile` - Cập nhật profile
- `PUT /api/v1/users/password` - Đổi mật khẩu

### Candidates
- `GET /api/v1/candidates` - Danh sách candidates
- `GET /api/v1/candidates/:id` - Chi tiết candidate
- `PUT /api/v1/candidates/:id` - Cập nhật thông tin candidate

### Recruiters
- `GET /api/v1/recruiters` - Danh sách recruiters
- `GET /api/v1/recruiters/:id` - Chi tiết recruiter
- `PUT /api/v1/recruiters/:id` - Cập nhật thông tin recruiter

### Jobs
- `GET /api/v1/jobs` - Danh sách công việc
- `GET /api/v1/jobs/:id` - Chi tiết công việc
- `POST /api/v1/jobs` - Tạo công việc mới (recruiter)
- `PUT /api/v1/jobs/:id` - Cập nhật công việc
- `DELETE /api/v1/jobs/:id` - Xóa công việc

### Applications
- `GET /api/v1/applications` - Danh sách đơn ứng tuyển
- `POST /api/v1/applications` - Nộp đơn ứng tuyển
- `PUT /api/v1/applications/:id/status` - Cập nhật trạng thái đơn

### AI Recommendations
- `GET /api/v1/ai/job-recommendations` - Gợi ý công việc
- `GET /api/v1/ai/candidate-recommendations` - Gợi ý ứng viên

## Models Database

Hệ thống bao gồm các models chính:

### Core Models
- **User**: Thông tin user cơ bản
- **Candidate**: Thông tin ứng viên
- **Recruiter**: Thông tin nhà tuyển dụng
- **Job**: Thông tin công việc
- **Application**: Đơn ứng tuyển

### Supporting Models
- **Interview**: Lịch phỏng vấn
- **Notification**: Thông báo
- **JobCategory**: Danh mục công việc
- **AI Models**: Gợi ý thông minh

## Middleware

- **Authentication**: Xác thực JWT token
- **Authorization**: Phân quyền theo role
- **Validation**: Validate dữ liệu đầu vào
- **Error Handling**: Xử lý lỗi tập trung
- **Rate Limiting**: Giới hạn request
- **File Upload**: Upload file/ảnh

## Security Features

- JWT Authentication
- Password hashing với bcrypt
- Rate limiting
- CORS protection
- Input validation
- XSS protection với Helmet
- MongoDB injection prevention

## Testing

```bash
npm test
```

## Environment Variables

Tham khảo file `.env` để biết các biến môi trường cần thiết.

## Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

Distributed under the MIT License.
