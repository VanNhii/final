# AI Chat Features - Candidate & Recruiter

## 🎯 AI Chat Candidate - Tất cả Chức Năng

### 1. 🔍 **Tìm Kiếm & Gợi Ý Việc Làm**

#### a) Profile Review
- **Input:** "Review CV tôi", "Đánh giá hồ sơ của tôi"
- **Output:** Phân tích điểm mạnh/yếu của profile, gợi ý cải thiện
- **Intent:** `PROFILE_REVIEW`

#### b) Profile To Jobs
- **Input:** "Tìm job phù hợp với CV tôi", "Job nào match với tôi"
- **Output:** Danh sách jobs phù hợp dựa trên profile
- **Intent:** `PROFILE_TO_JOBS`

#### c) Job Search
- **Input:** "Tìm job backend ở Đà Nẵng", "Job remote Python"
- **Output:** Danh sách jobs theo tiêu chí tìm kiếm
- **Intent:** `JOB_SEARCH`

#### d) Select Job
- **Input:** "Chọn 1", "1", "job Backend Developer"
- **Output:** Chọn một job từ danh sách gợi ý
- **Intent:** `SELECT_JOB`

---

### 2. 📊 **Phân Tích Độ Phù Hợp**

#### Job Fit Analysis
- **Input:** "Tôi phù hợp bao nhiêu %?", "Tôi thiếu gì để đạt job này?"
- **Output:** 
  - Match score (%)
  - Kỹ năng match
  - Kỹ năng còn thiếu (missing skills)
  - Hard reasons (lý do không đạt yêu cầu cứng)
- **Intent:** `JOB_FIT`

---

### 3. 📚 **Career Coaching**

#### a) Roadmap (Lộ trình học tập 14 ngày)
- **Input:** "Lộ trình 14 ngày", "Tôi cần học gì để đạt job này?"
- **Output:** 
  - Kế hoạch học tập chi tiết 14 ngày
  - Chia thành các giai đoạn (phases)
  - Tasks cụ thể cho mỗi ngày
  - Resources/tài liệu gợi ý
- **Intent:** `ROADMAP`

#### b) Mock Interview (Phỏng vấn mô phỏng)
- **Input:** "Phỏng vấn thử", "Câu hỏi interview", "Mock interview"
- **Output:**
  - Bộ câu hỏi phỏng vấn theo job
  - Focus skills (kỹ năng cần hỏi)
  - Rubric (tiêu chí chấm điểm)
- **Intent:** `INTERVIEW`

#### c) Competition Analysis (Phân tích cạnh tranh)
- **Input:** "Bao nhiêu người ứng tuyển?", "Tôi top mấy?", "Cạnh tranh thế nào?"
- **Output:**
  - Số lượng ứng viên
  - Vị trí của bạn trong top candidates
  - % pass rate
- **Intent:** `COMPETITION`

---

### 4. ✍️ **Hỗ Trợ Ứng Tuyển**

#### a) Cover Letter Generation
- **Input:** "Viết cover letter", "Thư xin việc"
- **Output:** 
  - Cover letter cá nhân hóa theo job
  - Nhấn mạnh điểm mạnh match với job
- **Intent:** `COVER_LETTER`

#### b) CV Critique (Review CV theo ATS)
- **Input:** "Review CV cho job này", "CV tôi có đạt ATS không?"
- **Output:**
  - ATS Score (/10)
  - Missing keywords
  - Suggestions để cải thiện
- **Intent:** `CV_CRITIQUE`

---

### 5. 💬 **Utility Intents**

- **GREETING:** "Xin chào", "Hi" → Hiển thị menu
- **THANKS:** "Cảm ơn", "Thanks" → Reply lịch sự
- **GOODBYE:** "Tạm biệt", "Bye" → Kết thúc chat
- **RESET:** "Reset", "Làm lại" → Reset session
- **CHANGE_JOB:** "Đổi job", "Job khác" → Bỏ job đã chọn, chọn job mới
- **ACK:** "Ok", "Được" → Acknowledgement

---

## 👔 AI Chat Recruiter - Tất cả Chức Năng

### 1. 📋 **Quản Lý Job**

#### a) Select Job
- **Input:** "Chọn 1", "1", "job UI/UX Designer"
- **Output:** Chọn job từ danh sách jobs của recruiter
- **Intent:** `SELECT_JOB`

---

### 2. 👥 **Quản Lý Ứng Viên**

#### a) Rank Candidates (Xếp hạng ứng viên)
- **Input:** "Top 5 ứng viên", "Xếp hạng", "Rank candidates"
- **Output:**
  - Top N candidates theo fit score
  - Pass/Fail status
  - Why (lý do xếp hạng)
  - Compare top 1 vs top 2
- **Intent:** `RANK_CANDIDATES`

#### b) Screen Candidates (Lọc ứng viên)
- **Input:** "Lọc ứng viên có trên 5 năm kinh nghiệm", "Tìm ứng viên biết AWS"
- **Output:** 
  - Danh sách candidates filter theo điều kiện
  - Điểm mạnh của từng người
- **Intent:** `SCREEN_CANDIDATES`

#### c) Compare Candidates (So sánh 2 ứng viên)
- **Input:** "So sánh ứng viên A và B", "Compare top 1 vs top 2"
- **Output:**
  - Bảng so sánh chi tiết
  - Điểm mạnh/yếu của mỗi người
  - Recommendation
- **Intent:** `COMPARE_CANDIDATES`

#### d) Ask About Candidate
- **Input:** "Ứng viên X có kinh nghiệm gì?", "Tell me about candidate Y"
- **Output:** Thông tin chi tiết về candidate cụ thể
- **Intent:** `ASK_ABOUT_CANDIDATE`

---

### 3. 🎤 **Chuẩn Bị Phỏng Vấn**

#### Interview Prep
- **Input:** "Gợi ý câu hỏi phỏng vấn", "Interview questions"
- **Output:**
  - Bộ câu hỏi phỏng vấn cho job
  - Nếu có candidate: câu hỏi targeted theo skills còn thiếu
  - Focus areas
  - Rubric chấm điểm
- **Intent:** `INTERVIEW_PREP`

---

### 4. 📝 **Công Cụ HR**

#### a) Generate JD (Job Description)
- **Input:** "Soạn JD cho Python Dev 3 năm kinh nghiệm"
- **Output:**
  - Job Description đầy đủ
  - Title, Summary
  - Responsibilities
  - Requirements
  - Benefits
- **Intent:** `GENERATE_JD`

#### b) Outreach Email (Email liên hệ ứng viên)
- **Input:** "Gửi email mời phỏng vấn", "Email từ chối ứng viên"
- **Types:**
  - `INVITE`: Email mời phỏng vấn
  - `REJECT`: Email từ chối lịch sự
  - `OFFER`: Email đề nghị làm việc
  - `CONTACT`: Email liên hệ chung
- **Output:** Email draft chuyên nghiệp
- **Intent:** `OUTREACH`

#### c) Schedule Interview
- **Input:** "Đặt lịch phỏng vấn", "Schedule meeting"
- **Output:** Email mời phỏng vấn (same as OUTREACH with type INVITE)
- **Intent:** `SCHEDULE_INTERVIEW`

---

### 5. 💬 **Utility Intents**

- **GREETING:** "Xin chào" → Hiển thị menu recruiter
- **THANKS:** "Cảm ơn" → Reply chuyên nghiệp
- **GOODBYE:** "Tạm biệt" → Kết thúc
- **RESET:** "Reset" → Reset session
- **CHANGE_POOL:** Đổi pool ứng viên

---

## 📊 So Sánh Tính Năng

| Feature | Candidate | Recruiter |
|---------|-----------|-----------|
| **Search/Find** | ✅ Tìm job | ✅ Lọc candidates |
| **Match Analysis** | ✅ Job fit score | ✅ Candidate fit score |
| **Career Coaching** | ✅ Roadmap, Interview prep | ❌ |
| **Document Gen** | ✅ Cover letter, CV review | ✅ JD, Outreach emails |
| **Compare** | ✅ Self vs job | ✅ Candidate A vs B |
| **Ranking** | ✅ Competition analysis | ✅ Top N candidates |
| **Interview** | ✅ Mock interview | ✅ Interview questions |

---

## 🎯 User Flow Examples

### Candidate Flow
```
1. "Xin chào" → Menu
2. "Tìm job backend Đà Nẵng" → Job list (5 jobs)
3. "1" → Selected job
4. "Tôi phù hợp bao nhiêu %?" → Fit analysis (75%)
5. "Lộ trình 14 ngày" → Learning roadmap
6. "Mock interview" → Interview questions
7. "Viết cover letter" → Generated cover letter
```

### Recruiter Flow
```
1. "Xin chào" → Job list (3 jobs)
2. "chọn 1" → Selected job
3. "Top 5 ứng viên" → Ranked candidates
4. "So sánh top 1 vs top 2" → Detailed comparison
5. "Gợi ý câu hỏi phỏng vấn cho ứng viên X" → Targeted questions
6. "Gửi email mời phỏng vấn" → Interview invitation email
```

---

## 🔧 Technical Details

### Candidate Intents (15 total)
```python
[
  "GREETING", "THANKS", "GOODBYE",
  "PROFILE_REVIEW", "PROFILE_TO_JOBS", 
  "JOB_SEARCH", "JOB_FIT",
  "ROADMAP", "INTERVIEW", "COMPETITION",
  "SELECT_JOB", "CHANGE_JOB",
  "COVER_LETTER", "CV_CRITIQUE",
  "RESET", "UNKNOWN"
]
```

### Recruiter Intents (14 total)
```python
[
  "GREETING", "THANKS", "GOODBYE",
  "SELECT_JOB",
  "RANK_CANDIDATES", "ASK_ABOUT_CANDIDATE",
  "SCREEN_CANDIDATES", "COMPARE_CANDIDATES",
  "INTERVIEW_PREP",
  "GENERATE_JD", "OUTREACH", "SCHEDULE_INTERVIEW",
  "CHANGE_POOL", "RESET", "UNKNOWN"
]
```
