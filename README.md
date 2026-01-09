# BÁO CÁO KỸ THUẬT CHI TIẾT: HỆ THỐNG TUYỂN DỤNG THÔNG MINH (SMART JOB PORTAL)

> **Loại tài liệu:** Tài liệu Kiến trúc & Kỹ thuật chuyên sâu (Technical Deep Dive)
> **Phiên bản:** 2.0 (Final Release)
> **Mục đích:** Giải trình kỹ thuật cho Hội đồng bảo vệ đồ án tốt nghiệp.

---

## MỤC LỤC
1. [Kiến Trúc Tổng Thể (System Architecture)](#1-kiến-trúc-tổng-thể)
2. [Phân Hệ Bảo Mật & Xác Thực (Authentication & Security)](#2-phân-hệ-bảo-mật--xác-thực)
3. [Cơ Chế Real-time: Chat & Thông Báo (Socket.io)](#3-cơ-chế-real-time-chat--thông-báo)
4. [Phân Hệ Thanh Toán & Webhook (Payment Gateway)](#4-phân-hệ-thanh-toán--webhook)
5. [Kỹ Thuật Thống Kê Dữ Liệu Lớn (Advanced Analytics)](#5-kỹ-thuật-thống-kê-dữ-liệu-lớn)
6. [AI Deep Dive: Hệ Thống Gợi Ý (Recommendation Engine)](#6-ai-deep-dive-hệ-thống-gợi-ý)
7. [AI Deep Dive: Chatbot RAG (Retrieval Augmented Generation)](#7-ai-deep-dive-chatbot-rag)

---

## 1. KIẾN TRÚC TỔNG THỂ

Hệ thống được thiết kế theo mô hình **Microservices-oriented**, tách biệt các trách nhiệm xử lý để đảm bảo hiệu năng và khả năng mở rộng.

*   **Frontend (Client-side):**
    *   Xây dựng bằng **ReactJS 19** trên nền tảng **Vite** để tối ưu hóa tốc độ build.
    *   Quản lý trạng thái ứng dụng (State Management) bằng **Redux Toolkit**: Giúp đồng bộ dữ liệu User, Notification, Chat across toàn bộ các trang mà không cần gọi API nhiều lần.
    *   Giao diện: **TailwindCSS** giúp thiết kế Responsive nhanh chóng.

*   **Backend (Server-side):**
    *   **Node.js & Express**: Sử dụng mô hình *Non-blocking I/O* để xử lý hàng nghìn request đồng thời (thích hợp cho hệ thống Real-time).
    *   **Database**: **MongoDB** (NoSQL). Lý do chọn: Dữ liệu tuyển dụng (CV, JD) có cấu trúc không đồng nhất (unstructured), MongoDB cho phép lưu trữ linh hoạt các object JSON phức tạp như schema của CV.

*   **AI Services (Computational Logic):**
    *   Được tách thành các service riêng biệt chạy bằng **Python**, giao tiếp với Backend Node.js qua REST API. Việc tách rời này giúp tác vụ nặng của AI (train model, predict) không làm treo luồng xử lý chính của Web Server.

---

## 2. PHÂN HỆ BẢO MẬT & XÁC THỰC

### Vấn đề
Làm sao để đảm bảo User đăng nhập an toàn, không bị đánh cắp phiên làm việc (Session Hijacking), và hệ thống không lưu mật khẩu dưới dạng văn bản thuần (Plain text).

### Giải pháp Kỹ thuật: JWT & Bcrypt

#### 1. Cơ chế lưu trữ mật khẩu (Password Hashing)
Khi User đăng ký, mật khẩu `123456` sẽ đi qua thuật toán **Bcrypt**:
*   **Salting:** Hệ thống sinh ra một chuỗi ngẫu nhiên (Salt) cộng vào mật khẩu gốc.
*   **Hashing:** Băm chuỗi (Pass + Salt) qua 10 vòng lặp (Cost factor = 10).
*   **Kết quả:** Lưu vào DB chuỗi vô nghĩa: `$2b$10$EixZaYVK1fsdf...`. Dù Hacker có lấy được Database cũng không thể dịch ngược lại thành mật khẩu gốc.

#### 2. Chiến lược "Token Kép" (Dual Token Strategy)
Thay vì lưu Session trên Server (tốn RAM), hệ thống dùng **JWT (JSON Web Token)**.

*   **Access Token (Chìa khóa ngắn hạn):**
    *   Chứa thông tin: `userID`, `role`.
    *   Thời hạn: **15 phút**.
    *   Lưu tại: Biến trong Memory của React (hoặc LocalStorage).
    *   Dùng để: Gửi kèm mỗi API request (`Authorization: Bearer <token>`).
*   **Refresh Token (Chìa khóa dài hạn):**
    *   Thời hạn: **7 ngày**.
    *   Lưu tại: **HttpOnly Cookie**. Đây là loại Cookie đặc biệt, JavaScript (hack code) không thể đọc được, chống chặn tấn công XSS.
    *   Dùng để: Khi Access Token hết hạn, Client tự động gửi Refresh Token lên API `/refresh-token` để xin cấp lại Access Token mới mà User không cần đăng nhập lại.

---

## 3. CƠ CHẾ REAL-TIME: CHAT & THÔNG BÁO

### Vấn đề
Trong tuyển dụng, tốc độ là vàng. Nhà tuyển dụng cần chat với ứng viên ngay lập tức. HTTP request truyền thống (Request-Response) có độ trễ cao và phải reload trang.

### Giải pháp Kỹ thuật: WebSocket (Socket.io)

Giao thức **WebSocket** tạo một đường ống kết nối 2 chiều (bi-directional) bền vững giữa Client và Server.

#### Luồng hoạt động của tính năng Chat:
1.  **Connection (Handshake):** Khi User A (Ứng viên) và User B (Recruiter) truy cập web, Client sẽ thiết lập kết nối Socket tới Server.
2.  **Mapping:** Server lưu trữ: `Map<UserID, SocketID>`. Ví dụ: `User A -> socket_abc123`.
3.  **Sending:**
    *   User A nhắn "Chào bạn".
    *   Client A emit sự kiện: `socket.emit("send_message", { to: UserB, content: "Chào bạn" })`.
4.  **Routing (Tại Server):**
    *   Server tra cứu trong Map xem User B đang dùng SocketID nào.
    *   Lưu tin nhắn vào MongoDB (để lưu lịch sử).
    *   Server emit sự kiện tới đúng User B: `io.to(socket_user_B).emit("new_message", content)`.
5.  **Receiving:** Client B lắng nghe sự kiện `new_message` và render tin nhắn lên màn hình ngay lập tức.

#### Luồng hoạt động của Thông báo (Notification):
*   Sử dụng **Observer Pattern**. Khi một sự kiện nghiệp vụ xảy ra (Ví dụ: Trạng thái ứng tuyển chuyển sang "Đậu phỏng vấn"):
    1.  Hàm xử lý nghiệp vụ gọi `createNotification()`.
    2.  Hàm này lưu thông báo vào DB.
    3.  Đồng thời gọi `socket.to(candidate_id).emit("notification")`.
    4.  Chuông thông báo phía Client rung lên.

---

## 4. PHÂN HỆ THANH TOÁN & WEBHOOK

### Vấn đề
Xử lý giao dịch tiền bạc cần độ chính xác tuyệt đối. Vấn đề lớn nhất là: Nếu User thanh toán xong nhưng lỡ tay tắt trình duyệt ngay lập tức, làm sao hệ thống biết để cập nhật VIP?

### Giải pháp Kỹ thuật: Webhook & Secure Signature

#### Quy trình xử lý (Transaction Flow):
1.  **Initiate:** Frontend gửi yêu cầu "Nâng cấp gói VIP" -> Backend tạo URL thanh toán từ cổng thanh toán (VNPay/Stripe/PayPal) -> Trả về cho Frontend.
2.  **Redirect:** User được chuyển sang trang của Ngân hàng để nhập thẻ.
3.  **Payment Processing:** User nhập OTP, tiền bị trừ.
4.  **IPN / Webhook (Instant Payment Notification):**
    *   Đây là bước quan trọng nhất. Server của Ngân hàng sẽ âm thầm gửi một HTTP Post Request tới API của Backend (VD: `/api/payment/vnpay-return`).
    *   Request này chứa thông tin: `Amount`, `OrderInfo`, `ResponseCode`, và đặc biệt là `SecureHash` (Chữ ký số).
5.  **Validation (Xác thực toàn vẹn dữ liệu):**
    *   Backend lấy toàn bộ dữ liệu nhận được, tự mã hóa lại bằng **Secret Key** (chỉ Server và Ngân hàng biết).
    *   So sánh chuỗi mã hóa tự tạo với `SecureHash` do Ngân hàng gửi.
    *   Nếu khớp 100% => Tin tưởng đây là dữ liệu thật từ Ngân hàng, không phải giả mạo.
6.  **Fulfillment:** Cập nhật trạng thái đơn hàng trong DB thành `PAID` và kích hoạt tính năng Premium cho User.

---

## 5. KỸ THUẬT THỐNG KÊ DỮ LIỆU LỚN

### Vấn đề
Trang Dashboard cần hiển thị: "Tổng số ứng viên theo từng tháng", "Tỷ lệ hồ sơ đậu/rớt". Nếu dùng cách thủ công: *Lấy tất cả 10.000 hồ sơ về Server (bằng code JavaScript), chạy vòng lặp for để đếm*, hệ thống sẽ bị treo (Out of Memory).

### Giải pháp Kỹ thuật: MongoDB Aggregation Framework

Chuyển việc tính toán từ tầng Application (Node.js) xuống tầng Database (MongoDB). Code Node.js chỉ nhận kết quả cuối cùng.

**Ví dụ Pipeline thống kê ứng viên theo tháng:**

```javascript
db.applications.aggregate([
  // Giai đoạn 1: $match (Lọc dữ liệu)
  // Chỉ lấy các hồ sơ của năm 2024
  { $match: { createdAt: { $gte: startOfYear, $lte: endOfYear } } },

  // Giai đoạn 2: $group (Nhóm dữ liệu)
  // Gom nhóm theo tháng và đếm tổng
  {
    $group: {
      _id: { $month: "$createdAt" }, // Lấy tháng từ ngày tạo
      total: { $sum: 1 },            // Cộng dồn 1 cho mỗi bản ghi
      passed: { 
        $sum: { $cond: [{ $eq: ["$status", "Accepted"] }, 1, 0] } 
      } // Chỉ cộng nếu trạng thái là Accepted
    }
  },

  // Giai đoạn 3: $sort (Sắp xếp)
  { $sort: { "_id": 1 } } // Sắp xếp từ tháng 1 đến 12
]);
```
**Kết quả:** Trả về một mảng nhỏ gọn `[{thang: 1, total: 50}, {thang: 2, total: 30}...]`. Frontend dùng dữ liệu này vẽ biểu đồ **Chart.js**. Tốc độ xử lý nhanh gấp hàng trăm lần so với xử lý bằng code thuần.

---

## 6. AI DEEP DIVE: HỆ THỐNG GỢI Ý (RECOMMENDATION ENGINE)

### Cơ sở lý thuyết: Content-Based Filtering & Vector Space Model
Hệ thống coi mỗi CV và mỗi Job Description (JD) là một văn bản cần so sánh sự tương đồng.

### Quy trình Thuật toán (Algorithmic Pipeline):

1.  **Data Preprocessing (Tiền xử lý):**
    *   **Cleaning:** Loại bỏ thẻ HTML, ký tự đặc biệt, chuyển về chữ thường.
    *   **Tokenization:** Tách câu thành các từ đơn.
    *   **Stopwords Removal:** Loại bỏ các từ không mang ý nghĩa (the, is, and, là, của, những...).

2.  **Feature Extraction (Trích xuất đặc trưng - TF-IDF):**
    *   Sử dụng **TF-IDF (Term Frequency - Inverse Document Frequency)**.
    *   *TF:* Tần suất xuất hiện của từ khóa (VD: "Java") trong văn bản.
    *   *IDF:* Đánh trọng số thấp cho các từ quá phổ biến, trọng số cao cho từ chuyên ngành hiếm gặp.
    *   **Kết quả:** Biến mỗi văn bản thành một **Vector** (một mảng số học nhiều chiều).

3.  **Similarity Calculation (Tính độ tương đồng):**
    *   Sử dụng công thức **Cosine Similarity** (Độ tương đồng Cosin).
    *   Công thức: Tính cosin của góc giữa Vector CV và Vector Job.
    *   **Ý nghĩa:**
        *   Góc = 0 độ (Cos = 1): Hai văn bản giống hệt nhau về ngữ nghĩa.
        *   Góc = 90 độ (Cos = 0): Hai văn bản không liên quan gì nhau.
    *   Hệ thống sắp xếp các Job có điểm Cosine cao nhất để gợi ý cho ứng viên.

---

## 7. AI DEEP DIVE: CHATBOT RAG

### Vấn đề của Chatbot thường
Các mô hình AI (như GPT gốc) chỉ biết kiến thức cũ, không biết thông tin về hệ thống hiện tại, các job mới đăng, hay chính sách riêng của công ty. Chúng thường "bịa đặt" (hallucination).

### Giải pháp: RAG (Retrieval Augmented Generation)

Quy trình hoạt động khi User hỏi: *"Công ty ABC đang tuyển vị trí nào?"*

1.  **Bước 1: Indexing (Đánh chỉ mục dữ liệu)**
    *   Hệ thống quét database Job và Policy.
    *   Sử dụng model Embedding (VD: `all-MiniLM-L6-v2`) để biến các thông tin này thành Vector.
    *   Lưu vào **Vector Database** (hoặc FAISS index).

2.  **Bước 2: Retrieval (Truy xuất thông tin)**
    *   Câu hỏi của User cũng được biến thành Vector.
    *   Hệ thống tìm trong Vector Database xem đoạn thông tin nào có vector "gần" với vector câu hỏi nhất.
    *   *Kết quả tìm được:* "Công ty ABC đang tuyển: Backend Dev, lương 1000$".

3.  **Bước 3: Augmentation (Tăng cường ngữ cảnh)**
    *   Hệ thống tạo một câu lệnh (Prompt) gửi cho LLM:
    *   *Prompt:* "Dựa vào thông tin sau đây: [Công ty ABC đang tuyển: Backend Dev, lương 1000$]. Hãy trả lời câu hỏi: 'Công ty ABC tuyển gì?' một cách lịch sự."

4.  **Bước 4: Generation (Sinh câu trả lời)**
    *   LLM trả lời: *"Hiện tại công ty ABC đang tuyển vị trí Backend Dev với mức lương hấp dẫn 1000$. Bạn có muốn ứng tuyển không?"*
    *   **Kết luận:** Câu trả lời chính xác, có căn cứ dữ liệu thực tế (Groundedness).

---
*Tài liệu được soạn thảo phục vụ mục đích bảo vệ đồ án tốt nghiệp.*
