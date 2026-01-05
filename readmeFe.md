# 📚 Tài Liệu Hướng Dẫn Frontend - Dự Án Tuyển Dụng

> **Dành cho người mới bắt đầu với React**
> 
> Tài liệu này giải thích chi tiết cách hoạt động của frontend trong dự án, cách React kết nối với Backend, và vai trò của từng thành phần.

---

## 📑 Mục Lục

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Công Nghệ Sử Dụng](#2-công-nghệ-sử-dụng)
3. [Cấu Trúc Thư Mục](#3-cấu-trúc-thư-mục)
4. [Luồng Hoạt Động của React](#4-luồng-hoạt-động-của-react)
5. [Kết Nối với Backend](#5-kết-nối-với-backend)
6. [State Management với Redux](#6-state-management-với-redux)
7. [React Hooks Quan Trọng](#7-react-hooks-quan-trọng)
8. [Routing và Navigation](#8-routing-và-navigation)
9. [Tích Hợp AI Service](#9-tích-hợp-ai-service)
10. [Ví Dụ Thực Tế](#10-ví-dụ-thực-tế)
11. [Environment và Configuration](#11-environment-và-configuration)
12. [Build Process và Deployment](#12-build-process-và-deployment)
13. [Utility Functions](#13-utility-functions)
14. [Debugging và DevTools](#14-debugging-và-devtools)
15. [Performance Optimization](#15-performance-optimization)
16. [Error Handling Patterns](#16-error-handling-patterns)

---

## 1. Tổng Quan Dự Án

### 🎯 Mục Đích
Đây là một **ứng dụng tuyển dụng việc làm** với 3 vai trò chính:
- **Candidate (Ứng viên)**: Tìm việc, ứng tuyển, xem gợi ý việc làm từ AI
- **Recruiter (Nhà tuyển dụng)**: Đăng tin, quản lý ứng viên, xem gợi ý ứng viên từ AI
- **Admin (Quản trị viên)**: Quản lý toàn bộ hệ thống

### 🏗️ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   UI     │  │  Redux   │  │ Services │  │  Router  │   │
│  │Components│  │  Store   │  │  Layer   │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   API    │  │ Database │  │   Auth   │                  │
│  │ Routes   │  │ MongoDB  │  │   JWT    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                   AI SERVICE (Python/Flask)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   ML     │  │ TF-IDF   │  │  Vector  │                  │
│  │  Models  │  │Embedding │  │ Database │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Công Nghệ Sử Dụng

### 📦 Dependencies Chính (từ `package.json`)

```json
{
  "react": "^19.1.1",              // Thư viện UI chính
  "react-dom": "^19.1.1",          // Render React vào DOM
  "react-router": "^7.8.1",        // Điều hướng giữa các trang
  "@reduxjs/toolkit": "^2.8.2",    // Quản lý state toàn cục
  "react-redux": "^9.2.0",         // Kết nối React với Redux
  "tailwindcss": "^4.1.12",        // CSS framework
  "vite": "^7.1.2"                 // Build tool (thay thế Create React App)
}
```

### 🛠️ Công Cụ Phát Triển

- **Vite**: Build tool nhanh, thay thế cho Create React App
- **ESLint**: Kiểm tra lỗi code
- **TailwindCSS**: Framework CSS utility-first

---

## 3. Cấu Trúc Thư Mục

```
fe/
├── public/                    # File tĩnh (images, icons)
├── src/                       # Source code chính
│   ├── assets/               # Tài nguyên (images, fonts)
│   ├── components/           # Các component tái sử dụng
│   │   ├── common/          # Component dùng chung
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── PublicRoute.jsx
│   │   │   ├── JobRecommendations.jsx
│   │   │   └── ...
│   │   └── layout/          # Layout components
│   │       ├── Header.jsx
│   │       ├── Footer.jsx
│   │       ├── CandidateLayout.jsx
│   │       ├── RecruiterLayout.jsx
│   │       └── AdminLayout.jsx
│   │
│   ├── pages/               # Các trang chính của app
│   │   ├── auth/           # Trang đăng nhập, đăng ký
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── VerifyEmail.jsx
│   │   ├── candidate/      # Trang dành cho ứng viên
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Jobs.jsx
│   │   │   ├── Applications.jsx
│   │   │   └── RecommendedJobs.jsx
│   │   ├── recruiter/      # Trang dành cho nhà tuyển dụng
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Jobs.jsx
│   │   │   ├── CreateJob.jsx
│   │   │   ├── Candidates.jsx
│   │   │   └── ...
│   │   ├── admin/          # Trang dành cho admin
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UsersManagement.jsx
│   │   │   ├── AIManagement.jsx
│   │   │   └── ...
│   │   ├── jobs/           # Trang công khai về việc làm
│   │   │   ├── Jobs.jsx
│   │   │   └── JobDetail.jsx
│   │   └── Home.jsx        # Trang chủ
│   │
│   ├── services/           # Kết nối với Backend API
│   │   ├── apiClient.js    # HTTP client chung
│   │   ├── authService.js  # API xác thực
│   │   ├── jobService.js   # API việc làm
│   │   ├── candidateService.js
│   │   ├── recruiterService.js
│   │   ├── aiService.js    # API AI recommendations
│   │   └── ...
│   │
│   ├── store/              # Redux state management
│   │   ├── index.js        # Cấu hình store
│   │   └── slices/         # Các slice quản lý state
│   │       ├── authSlice.js
│   │       ├── jobSlice.js
│   │       ├── candidateSlice.js
│   │       ├── recruiterSlice.js
│   │       └── ...
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.js      # Hook lấy thông tin auth
│   │   └── index.js
│   │
│   ├── utils/              # Hàm tiện ích
│   │   ├── helpers.js
│   │   ├── formatters.js
│   │   └── ...
│   │
│   ├── router/             # Cấu hình routing
│   │   └── index.jsx
│   │
│   ├── App.jsx             # Component gốc
│   ├── main.jsx            # Entry point
│   └── index.css           # CSS toàn cục
│
├── index.html              # HTML template
├── package.json            # Dependencies
├── vite.config.js          # Cấu hình Vite
└── .env                    # Biến môi trường
```

### 📂 Giải Thích Chi Tiết Từng Folder

#### `components/`
Chứa các **component tái sử dụng** - những phần giao diện có thể dùng ở nhiều nơi.

- **`common/`**: Component dùng chung cho toàn bộ app
  - `LoadingSpinner.jsx`: Hiển thị loading
  - `ProtectedRoute.jsx`: Bảo vệ route yêu cầu đăng nhập
  - `JobRecommendations.jsx`: Hiển thị gợi ý việc làm từ AI
  
- **`layout/`**: Các layout khung trang
  - `Header.jsx`: Thanh header
  - `Footer.jsx`: Thanh footer
  - `CandidateLayout.jsx`: Layout cho ứng viên (có sidebar riêng)
  - `RecruiterLayout.jsx`: Layout cho nhà tuyển dụng
  - `AdminLayout.jsx`: Layout cho admin

#### `pages/`
Chứa các **trang chính** của ứng dụng. Mỗi route sẽ render một page component.

- **`auth/`**: Các trang liên quan đến xác thực
- **`candidate/`**: Dashboard và các trang cho ứng viên
- **`recruiter/`**: Dashboard và các trang cho nhà tuyển dụng
- **`admin/`**: Dashboard và các trang quản trị

#### `services/`
**Lớp trung gian** giữa Frontend và Backend. Chứa các hàm gọi API.

- `apiClient.js`: HTTP client cơ bản (fetch wrapper)
- `authService.js`: Các API về đăng nhập, đăng ký
- `jobService.js`: Các API về việc làm
- `aiService.js`: Các API gọi đến AI service

#### `store/`
Quản lý **state toàn cục** bằng Redux Toolkit.

- `index.js`: Cấu hình Redux store
- `slices/`: Mỗi slice quản lý một phần state (auth, jobs, etc.)

#### `hooks/`
**Custom hooks** - các hàm logic tái sử dụng.

- `useAuth.js`: Hook để lấy thông tin user đang đăng nhập

#### `router/`
Cấu hình **routing** - ánh xạ URL đến component.

---

## 3.1. Cách Các Thư Mục Hoạt Động và Liên Kết Với Nhau

### 🔗 Sơ Đồ Tổng Quan Luồng Dữ Liệu

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
│                    (Click, Type, Submit)                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  PAGES (src/pages/)                                              │
│  - Nhận input từ user                                            │
│  - Render UI components                                          │
│  - Gọi hooks để lấy data                                         │
│  - Dispatch actions để thay đổi state                            │
└────────────┬─────────────────────┬──────────────────────────────┘
             ↓                     ↓
    ┌────────────────┐    ┌───────────────────┐
    │   COMPONENTS   │    │      HOOKS        │
    │  (UI pieces)   │    │  (Logic reuse)    │
    └────────┬───────┘    └────────┬──────────┘
             ↓                     ↓
┌─────────────────────────────────────────────────────────────────┐
│  STORE (Redux - src/store/)                                      │
│  - Quản lý state toàn cục                                        │
│  - Dispatch async thunks                                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  SERVICES (src/services/)                                        │
│  - Gọi API thông qua apiClient                                   │
│  - Xử lý request/response                                        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  API CLIENT (src/services/apiClient.js)                          │
│  - Thêm token vào header                                         │
│  - Gửi HTTP request                                              │
│  - Xử lý lỗi (401, 404, 500)                                     │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND API (Node.js/Express)                                   │
│  - Xử lý request                                                 │
│  - Truy vấn database                                             │
│  - Gọi AI Service nếu cần                                        │
│  - Trả về response                                               │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
              ┌──────────────────────┐
              │   AI SERVICE         │
              │   (Python/Flask)     │
              │   - ML recommendations│
              └──────────────────────┘
```

### 📁 Chi Tiết Từng Thư Mục và Cách Chúng Tương Tác

---

#### 1️⃣ **PAGES** - Điểm Bắt Đầu của Mọi Tương Tác

**Vai trò:**
- Là component chính được render khi user truy cập một URL
- Nhận input từ user (form, click, etc.)
- Kết hợp nhiều components nhỏ hơn
- Gọi hooks và dispatch actions
- Hiển thị data từ Redux store

**Ví dụ cụ thể: `pages/auth/Login.jsx`**

```jsx
import { useState } from 'react';                    // Hook từ React
import { useDispatch } from 'react-redux';           // Hook từ Redux
import { useNavigate } from 'react-router';          // Hook từ Router
import { loginUser } from '@/store/slices/authSlice'; // Action từ Store
import { useAuth } from '@/hooks/useAuth';           // Custom hook
import { toast } from 'react-toastify';              // External library

const Login = () => {
  // 1. Local state (chỉ dùng trong component này)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // 2. Hooks để tương tác với Redux và Router
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAuth();  // Custom hook lấy auth state

  // 3. Handler - xử lý khi user submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 4. Dispatch action đến Redux store
      const result = await dispatch(loginUser({
        email: formData.email,
        password: formData.password
      })).unwrap();
      
      // 5. Hiển thị thông báo thành công
      toast.success('Đăng nhập thành công!');
      
      // 6. Điều hướng dựa trên role
      navigate(`/${result.data.role}/dashboard`);
    } catch (error) {
      // 7. Hiển thị lỗi
      toast.error(error || 'Đăng nhập thất bại');
    }
  };

  // 8. Render UI
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

**Luồng hoạt động:**
```
User nhập email/password → setFormData (local state)
                         ↓
User click "Đăng nhập" → handleSubmit được gọi
                         ↓
dispatch(loginUser(...)) → Gửi action đến Redux Store
                         ↓
Redux Store → Gọi authService.login()
                         ↓
authService → Gọi apiClient.post('/auth/login')
                         ↓
apiClient → Gửi HTTP request đến Backend
                         ↓
Backend trả về token và user data
                         ↓
Redux Store cập nhật state (user, token, isAuthenticated)
                         ↓
Component re-render với data mới
                         ↓
navigate() chuyển hướng đến dashboard
```

---

#### 2️⃣ **COMPONENTS** - Các Khối Xây Dựng UI

**Vai trò:**
- Tái sử dụng ở nhiều nơi
- Nhận props từ parent component
- Có thể có state riêng hoặc lấy từ Redux
- Emit events lên parent qua callback props

**Phân loại:**

**A. `components/common/` - Components dùng chung**

Ví dụ: `LoadingSpinner.jsx`, `JobRecommendations.jsx`

```jsx
// components/common/JobRecommendations.jsx
import { useEffect, useState } from 'react';
import aiService from '@/services/aiService';  // Import service

const JobRecommendations = ({ limit = 5 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      // Gọi service để lấy data
      const response = await aiService.getJobRecommendations({ limit });
      setRecommendations(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {recommendations.map(rec => (
        <JobCard key={rec._id} job={rec} />
      ))}
    </div>
  );
};
```

**B. `components/layout/` - Layout components**

Ví dụ: `Header.jsx`, `CandidateLayout.jsx`

```jsx
// components/layout/Header.jsx
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { Link } from 'react-router';

const Header = () => {
  // Lấy state từ Redux
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());  // Dispatch action
  };

  return (
    <header>
      <Link to="/">Logo</Link>
      <nav>
        <Link to="/jobs">Việc làm</Link>
        {isAuthenticated ? (
          <>
            <Link to={`/${user.role}/dashboard`}>Dashboard</Link>
            <button onClick={handleLogout}>Đăng xuất</button>
          </>
        ) : (
          <Link to="/login">Đăng nhập</Link>
        )}
      </nav>
    </header>
  );
};
```

**Cách components lồng nhau:**

```jsx
// pages/candidate/Dashboard.jsx
<CandidateLayout>              {/* Layout wrapper */}
  <div>
    <h1>Dashboard</h1>
    <StatsCards />             {/* Component hiển thị thống kê */}
    <JobRecommendations />     {/* Component gợi ý việc làm */}
    <RecentApplications />     {/* Component đơn ứng tuyển */}
  </div>
</CandidateLayout>
```

---

#### 3️⃣ **SERVICES** - Lớp Giao Tiếp với Backend

**Vai trò:**
- Tập trung tất cả logic gọi API
- Sử dụng apiClient để gửi request
- Xử lý data trước khi trả về
- Tách biệt logic API khỏi UI

**Cấu trúc:**

```
services/
├── apiClient.js         # HTTP client cơ bản
├── authService.js       # API xác thực
├── jobService.js        # API việc làm
├── candidateService.js  # API ứng viên
├── recruiterService.js  # API nhà tuyển dụng
└── aiService.js         # API AI recommendations
```

**Ví dụ: `services/jobService.js`**

```javascript
import apiClient from './apiClient';

const jobService = {
  // Lấy danh sách jobs
  getJobs: async (params = {}) => {
    return await apiClient.get('/jobs', params);
  },

  // Lấy chi tiết 1 job
  getJobById: async (jobId) => {
    return await apiClient.get(`/jobs/${jobId}`);
  },

  // Tạo job mới (recruiter)
  createJob: async (jobData) => {
    return await apiClient.post('/jobs', jobData);
  },

  // Apply job (candidate)
  applyToJob: async (jobId, applicationData) => {
    return await apiClient.post(`/jobs/${jobId}/apply`, applicationData);
  },
};

export default jobService;
```

**Cách sử dụng trong component:**

```jsx
import jobService from '@/services/jobService';

const JobList = () => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await jobService.getJobs({ 
          category: 'IT', 
          location: 'Hà Nội' 
        });
        setJobs(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchJobs();
  }, []);

  return <div>{/* Render jobs */}</div>;
};
```

**Luồng gọi API:**

```
Component → jobService.getJobs()
          ↓
jobService → apiClient.get('/jobs', params)
          ↓
apiClient → Thêm token vào header
          ↓
apiClient → fetch('http://localhost:5000/api/v1/jobs?category=IT')
          ↓
Backend xử lý và trả về JSON
          ↓
apiClient → Parse JSON response
          ↓
jobService → Trả về data
          ↓
Component → Nhận data và setJobs()
```

---

#### 4️⃣ **STORE (Redux)** - Quản Lý State Toàn Cục

**Vai trò:**
- Lưu trữ state dùng chung cho nhiều components
- Cung cấp actions để thay đổi state
- Xử lý async operations (gọi API)

**Cấu trúc:**

```
store/
├── index.js                  # Cấu hình store
└── slices/
    ├── authSlice.js          # State: user, token, isAuthenticated
    ├── jobSlice.js           # State: jobs, currentJob, filters
    ├── candidateSlice.js     # State: profile, applications
    ├── recruiterSlice.js     # State: myJobs, candidates
    └── applicationSlice.js   # State: applications, interviews
```

**Ví dụ: `store/slices/jobSlice.js`**

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import jobService from '@/services/jobService';

// Async thunk - gọi API
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await jobService.getJobs(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  jobs: [],
  currentJob: null,
  isLoading: false,
  error: null,
  filters: {
    category: '',
    location: '',
    jobType: ''
  }
};

// Slice
const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    // Sync actions
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload.jobs;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const { setFilters, clearFilters } = jobSlice.actions;
export default jobSlice.reducer;
```

**Cách sử dụng trong component:**

```jsx
import { useSelector, useDispatch } from 'react-redux';
import { fetchJobs, setFilters } from '@/store/slices/jobSlice';

const JobsPage = () => {
  const dispatch = useDispatch();
  const { jobs, isLoading, filters } = useSelector(state => state.jobs);

  useEffect(() => {
    // Dispatch async thunk
    dispatch(fetchJobs(filters));
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    // Dispatch sync action
    dispatch(setFilters(newFilters));
  };

  return (
    <div>
      <FilterBar filters={filters} onChange={handleFilterChange} />
      {isLoading ? <LoadingSpinner /> : <JobList jobs={jobs} />}
    </div>
  );
};
```

**Luồng Redux:**

```
Component dispatch(fetchJobs(params))
          ↓
Redux Store → Gọi async thunk
          ↓
Async thunk → Gọi jobService.getJobs()
          ↓
jobService → Gọi API
          ↓
API trả về data
          ↓
Async thunk fulfilled → Cập nhật state.jobs
          ↓
useSelector nhận state mới
          ↓
Component re-render với jobs mới
```

---

#### 5️⃣ **HOOKS** - Logic Tái Sử Dụng

**Vai trò:**
- Tách logic ra khỏi component
- Tái sử dụng ở nhiều nơi
- Kết hợp nhiều hooks khác

**Ví dụ: `hooks/useAuth.js`**

```javascript
import { useSelector } from 'react-redux';

export const useAuth = () => {
  // Lấy auth state từ Redux
  const { user, token, isLoading, isAuthenticated } = useSelector(
    state => state.auth
  );

  // Computed values
  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isRecruiter: user?.role === 'recruiter',
    isCandidate: user?.role === 'candidate',
  };
};
```

**Cách sử dụng:**

```jsx
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const { user, isCandidate, isRecruiter, isAdmin } = useAuth();

  return (
    <div>
      <h1>Welcome {user?.full_name}</h1>
      {isCandidate && <CandidateDashboard />}
      {isRecruiter && <RecruiterDashboard />}
      {isAdmin && <AdminDashboard />}
    </div>
  );
};
```

---

#### 6️⃣ **UTILS** - Hàm Tiện Ích

**Vai trò:**
- Các hàm helper dùng chung
- Format data, validate, etc.
- Không phụ thuộc vào React

**Ví dụ sử dụng trong component:**

```jsx
import { formatDate, formatCurrency, truncateText } from '@/utils/helpers';

const JobCard = ({ job }) => {
  return (
    <div>
      <h3>{truncateText(job.title, 50)}</h3>
      <p>{formatCurrency(job.salary)}</p>
      <span>{formatDate(job.created_at)}</span>
    </div>
  );
};
```

---

#### 7️⃣ **ROUTER** - Điều Hướng

**Vai trò:**
- Ánh xạ URL → Component
- Bảo vệ routes (authentication, authorization)
- Nested routes cho layouts

**Cách hoạt động:**

```jsx
// router/index.jsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,           // Layout chung
    children: [
      { path: '', element: <Home /> },
      { path: 'jobs', element: <Jobs /> },
      
      // Protected routes
      {
        path: 'candidate',
        element: <ProtectedRoute allowedRoles={['candidate']} />,
        children: [
          {
            element: <CandidateLayout />,  // Layout riêng cho candidate
            children: [
              { path: 'dashboard', element: <CandidateDashboard /> },
              { path: 'profile', element: <CandidateProfile /> },
            ]
          }
        ]
      }
    ]
  }
]);
```

**Luồng routing:**

```
User truy cập /candidate/dashboard
          ↓
Router kiểm tra route config
          ↓
Tìm thấy: /candidate/dashboard
          ↓
Kiểm tra ProtectedRoute
          ↓
Kiểm tra isAuthenticated (từ Redux)
          ↓
Kiểm tra user.role === 'candidate'
          ↓
Render: Layout > CandidateLayout > CandidateDashboard
```

---

### 🔄 Ví Dụ Luồng Hoạt Động Hoàn Chỉnh

**Kịch bản: User đăng nhập và xem dashboard**

```
1. User mở /login
   ↓
2. Router render Login component (pages/auth/Login.jsx)
   ↓
3. Login component render form
   ↓
4. User nhập email/password và click "Đăng nhập"
   ↓
5. handleSubmit được gọi
   ↓
6. dispatch(loginUser({ email, password }))
   ↓
7. Redux Store nhận action → Gọi async thunk
   ↓
8. Async thunk gọi authService.login(email, password)
   ↓
9. authService gọi apiClient.post('/auth/login', { email, password })
   ↓
10. apiClient thêm headers và gửi fetch request
    ↓
11. Backend xử lý:
    - Kiểm tra email/password
    - Tạo JWT token
    - Trả về { token, data: { user } }
    ↓
12. apiClient nhận response và parse JSON
    ↓
13. authService trả về data cho async thunk
    ↓
14. Async thunk fulfilled:
    - Lưu token vào localStorage
    - Cập nhật Redux state: { user, token, isAuthenticated: true }
    ↓
15. Login component nhận kết quả thành công
    ↓
16. toast.success('Đăng nhập thành công!')
    ↓
17. navigate('/candidate/dashboard')
    ↓
18. Router kiểm tra ProtectedRoute
    ↓
19. ProtectedRoute check:
    - useSelector(state => state.auth) → isAuthenticated = true
    - user.role = 'candidate' → Allowed
    ↓
20. Render CandidateLayout
    ↓
21. CandidateLayout:
    - Lấy user từ Redux: useSelector(state => state.auth.user)
    - Render Sidebar với navigation
    - Render Header với user info
    - Render <Outlet /> (sẽ render CandidateDashboard)
    ↓
22. CandidateDashboard mount
    ↓
23. useEffect chạy → fetchDashboardData()
    ↓
24. Gọi candidateService.getMyApplications()
    ↓
25. candidateService → apiClient.get('/candidates/applications')
    ↓
26. apiClient:
    - Lấy token từ localStorage
    - Thêm header: Authorization: Bearer <token>
    - Gửi request
    ↓
27. Backend:
    - Verify token
    - Lấy user_id từ token
    - Query database: SELECT * FROM applications WHERE candidate_id = user_id
    - Trả về danh sách applications
    ↓
28. apiClient nhận response
    ↓
29. candidateService trả về data
    ↓
30. CandidateDashboard:
    - setApplications(response.data)
    - Component re-render với data mới
    ↓
31. Hiển thị dashboard với:
    - Stats cards (số đơn ứng tuyển, phỏng vấn, etc.)
    - Recent applications list
    - JobRecommendations component
    ↓
32. JobRecommendations component mount
    ↓
33. useEffect → fetchRecommendations()
    ↓
34. aiService.getJobRecommendations({ limit: 3 })
    ↓
35. apiClient.get('/ai/recommendations/jobs?limit=3')
    ↓
36. Backend gọi AI Service (Python)
    ↓
37. AI Service:
    - Lấy candidate profile
    - Phân tích skills, experience
    - So sánh với jobs database
    - Tính similarity score
    - Trả về top 3 jobs phù hợp nhất
    ↓
38. Backend trả về recommendations
    ↓
39. JobRecommendations component:
    - setRecommendations(response.data)
    - Render danh sách jobs với confidence score
    ↓
40. User thấy dashboard hoàn chỉnh!
```

---

### 📊 Bảng Tóm Tắt Vai Trò Từng Thư Mục

| Thư mục | Vai trò | Import từ | Export cho | Ví dụ |
|---------|---------|-----------|------------|-------|
| **pages/** | Trang chính, điểm vào | components, hooks, store, services | router | `Login.jsx`, `Dashboard.jsx` |
| **components/common/** | UI tái sử dụng | services, hooks, utils | pages, components/layout | `LoadingSpinner.jsx`, `JobCard.jsx` |
| **components/layout/** | Layout wrapper | components/common, store, hooks | pages, router | `Header.jsx`, `CandidateLayout.jsx` |
| **services/** | Gọi API | apiClient | pages, components, store | `jobService.js`, `authService.js` |
| **store/** | State toàn cục | services | pages, components, hooks | `authSlice.js`, `jobSlice.js` |
| **hooks/** | Logic tái sử dụng | store, services | pages, components | `useAuth.js` |
| **utils/** | Helper functions | - | pages, components, services | `helpers.js`, `formatters.js` |
| **router/** | Routing config | pages, components/layout | App.jsx | `index.jsx` |

---

### 💡 Nguyên Tắc Quan Trọng

1. **One-way data flow**: Data luôn chảy từ trên xuống (parent → child)
2. **Separation of concerns**: Mỗi folder có trách nhiệm riêng
3. **Reusability**: Components và hooks có thể tái sử dụng
4. **Single source of truth**: Redux store là nguồn dữ liệu duy nhất
5. **Async operations**: Luôn xử lý trong Redux thunks hoặc useEffect

---

## 4. Luồng Hoạt Động của React

### 🚀 Khởi Động Ứng Dụng

```
1. index.html (HTML template)
   ↓
2. main.jsx (Entry point - điểm khởi đầu)
   ↓
3. App.jsx (Root component)
   ↓
4. AppRouter (Routing system)
   ↓
5. Render trang tương ứng với URL
```

### 📄 File `main.jsx` - Entry Point

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Render App component vào element có id="root" trong index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Giải thích:**
- `createRoot()`: Tạo root React (React 18+)
- `document.getElementById('root')`: Lấy element HTML có id="root"
- `<StrictMode>`: Chế độ nghiêm ngặt, giúp phát hiện lỗi
- `<App />`: Component gốc của ứng dụng

### 📄 File `App.jsx` - Root Component

```jsx
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import AppRouter from '@/router';
import { getCurrentUser, setInitialized } from '@/store/slices/authSlice';

function App() {
  useEffect(() => {
    // Khi app khởi động, kiểm tra xem user đã đăng nhập chưa
    const token = localStorage.getItem('token');
    if (token) {
      // Có token -> gọi API lấy thông tin user
      store.dispatch(getCurrentUser());
    } else {
      // Không có token -> đánh dấu đã khởi tạo xong
      store.dispatch(setInitialized());
    }
  }, []);

  return (
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
}

export default App;
```

**Giải thích:**
- `<Provider store={store}>`: Cung cấp Redux store cho toàn bộ app
- `useEffect(() => {...}, [])`: Chạy một lần khi component mount
- `localStorage.getItem('token')`: Lấy token từ trình duyệt
- `store.dispatch(getCurrentUser())`: Gọi action Redux để lấy thông tin user

### 🔄 Component Lifecycle

```
1. Component được tạo (Mount)
   ↓
2. Render lần đầu
   ↓
3. useEffect chạy (side effects)
   ↓
4. State thay đổi → Re-render
   ↓
5. Component bị xóa (Unmount)
```

---

## 5. Kết Nối với Backend

### 🌐 API Client - File `services/apiClient.js`

Đây là **trái tim** của việc kết nối Frontend-Backend.

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Lấy token từ localStorage và thêm vào header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Hàm gọi API chung
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),  // Thêm token vào header
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Xử lý lỗi 401 (Unauthorized)
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // HTTP Methods
  get(endpoint, params = {}) {
    const searchParams = new URLSearchParams(params);
    const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default new ApiClient();
```

**Giải thích:**
- `API_BASE_URL`: URL gốc của backend (từ file `.env`)
- `getAuthHeaders()`: Lấy token từ localStorage và thêm vào header
- `request()`: Hàm gọi API chung, xử lý lỗi
- `get()`, `post()`, `put()`, `delete()`: Các method HTTP

### 📡 Auth Service - File `services/authService.js`

```javascript
import apiClient from './apiClient';

const authService = {
  // Đăng nhập
  login: async (email, password) => {
    return await apiClient.post('/auth/login', { email, password });
  },

  // Đăng ký
  register: async (userData) => {
    return await apiClient.post('/auth/register', userData);
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async () => {
    return await apiClient.get('/auth/me');
  },

  // Đổi mật khẩu
  changePassword: async (currentPassword, newPassword) => {
    return await apiClient.put('/auth/updatepassword', {
      currentPassword,
      newPassword,
    });
  },
};

export default authService;
```

**Cách sử dụng:**

```javascript
// Trong component
import authService from '@/services/authService';

const handleLogin = async () => {
  try {
    const response = await authService.login(email, password);
    console.log('Login success:', response);
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 🔗 Luồng Gọi API

```
Component (UI)
   ↓ gọi hàm service
Service Layer (authService.js)
   ↓ gọi apiClient
API Client (apiClient.js)
   ↓ HTTP Request với token
Backend API (Express)
   ↓ xử lý và trả về
API Client nhận response
   ↓ parse JSON
Service Layer trả về data
   ↓
Component nhận data và cập nhật UI
```

### 🔑 Xác Thực với JWT Token

```
1. User đăng nhập
   ↓
2. Backend trả về token
   ↓
3. Frontend lưu token vào localStorage
   ↓
4. Mỗi request sau đó đều gửi token trong header:
   Authorization: Bearer <token>
   ↓
5. Backend verify token và cho phép truy cập
```

---

## 6. State Management với Redux

### 🗄️ Redux Là Gì?

**Redux** là thư viện quản lý **state toàn cục** (global state) của ứng dụng.

**Tại sao cần Redux?**
- Chia sẻ state giữa nhiều component mà không cần prop drilling
- Quản lý state phức tạp (user info, jobs, applications, etc.)
- Dễ debug và theo dõi thay đổi state

### 🏪 Redux Store - File `store/index.js`

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import jobSlice from './slices/jobSlice';
import candidateSlice from './slices/candidateSlice';
import recruiterSlice from './slices/recruiterSlice';
import applicationSlice from './slices/applicationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,           // State về xác thực
    jobs: jobSlice,            // State về việc làm
    candidate: candidateSlice, // State về ứng viên
    recruiter: recruiterSlice, // State về nhà tuyển dụng
    applications: applicationSlice, // State về đơn ứng tuyển
  },
});
```

**Giải thích:**
- `configureStore()`: Tạo Redux store
- Mỗi `reducer` quản lý một phần state

### 🍕 Auth Slice - File `store/slices/authSlice.js`

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '@/services/authService';

// Async thunk - gọi API bất đồng bộ
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getCurrentUser();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,
  error: null,
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous actions
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.data;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Current User
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.data.user;
        state.isAuthenticated = true;
        state.isInitialized = true;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

### 🎯 Sử Dụng Redux trong Component

```jsx
import { useSelector, useDispatch } from 'react-redux';
import { loginUser, logout } from '@/store/slices/authSlice';

function LoginPage() {
  const dispatch = useDispatch();
  const { user, isLoading, error } = useSelector((state) => state.auth);

  const handleLogin = () => {
    // Dispatch async action
    dispatch(loginUser({ email, password }));
  };

  const handleLogout = () => {
    // Dispatch sync action
    dispatch(logout());
  };

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {user && <p>Welcome {user.full_name}</p>}
    </div>
  );
}
```

**Giải thích:**
- `useSelector()`: Lấy state từ Redux store
- `useDispatch()`: Gửi action để thay đổi state
- `dispatch(loginUser(...))`: Gọi async thunk

### 🔄 Redux Data Flow

```
Component
   ↓ dispatch(action)
Redux Store
   ↓ reducer xử lý
State thay đổi
   ↓ useSelector nhận state mới
Component re-render với data mới
```

---

## 7. React Hooks Quan Trọng

### 🎣 useState - Quản Lý State Cục Bộ

```jsx
import { useState } from 'react';

function Counter() {
  // Khai báo state với giá trị khởi tạo là 0
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Tăng</button>
      <button onClick={() => setCount(count - 1)}>Giảm</button>
    </div>
  );
}
```

**Giải thích:**
- `useState(0)`: Tạo state `count` với giá trị ban đầu là `0`
- `setCount()`: Hàm để cập nhật state
- Khi state thay đổi → component re-render

### ⚡ useEffect - Side Effects

```jsx
import { useEffect, useState } from 'react';

function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Code này chạy sau khi component render
    fetchUserData();
  }, []); // [] = chỉ chạy 1 lần khi mount

  useEffect(() => {
    // Code này chạy mỗi khi user thay đổi
    console.log('User changed:', user);
  }, [user]); // [user] = chạy khi user thay đổi

  const fetchUserData = async () => {
    const data = await authService.getCurrentUser();
    setUser(data);
  };

  return <div>{user?.name}</div>;
}
```

**Giải thích:**
- `useEffect(() => {...}, [])`: Chạy 1 lần khi component mount
- `useEffect(() => {...}, [user])`: Chạy khi `user` thay đổi
- Dùng để gọi API, subscribe events, etc.

### 🪝 Custom Hook - useAuth

```jsx
// File: hooks/useAuth.js
import { useSelector } from 'react-redux';

export const useAuth = () => {
  const { user, token, isLoading, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isRecruiter: user?.role === 'recruiter',
    isCandidate: user?.role === 'candidate',
  };
};
```

**Sử dụng:**

```jsx
import { useAuth } from '@/hooks/useAuth';

function Dashboard() {
  const { user, isCandidate, isRecruiter } = useAuth();

  return (
    <div>
      <h1>Welcome {user?.full_name}</h1>
      {isCandidate && <CandidateDashboard />}
      {isRecruiter && <RecruiterDashboard />}
    </div>
  );
}
```

---

## 8. Routing và Navigation

### 🛣️ React Router - File `router/index.jsx`

```jsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import PublicRoute from '@/components/common/PublicRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'jobs', element: <Jobs /> },
      { path: 'jobs/:id', element: <JobDetail /> },
      
      // Public routes (chỉ cho người chưa đăng nhập)
      {
        path: 'login',
        element: <PublicRoute><Login /></PublicRoute>
      },
      
      // Protected routes (yêu cầu đăng nhập)
      {
        path: 'candidate',
        element: <ProtectedRoute allowedRoles={['candidate']} />,
        children: [
          { path: 'dashboard', element: <CandidateDashboard /> },
          { path: 'profile', element: <CandidateProfile /> },
        ]
      },
      
      {
        path: 'recruiter',
        element: <ProtectedRoute allowedRoles={['recruiter']} />,
        children: [
          { path: 'dashboard', element: <RecruiterDashboard /> },
          { path: 'jobs', element: <RecruiterJobs /> },
        ]
      },
    ]
  }
]);

const AppRouter = () => <RouterProvider router={router} />;
export default AppRouter;
```

### 🔒 Protected Route

```jsx
// File: components/common/ProtectedRoute.jsx
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useSelector((state) => state.auth);

  // Đang loading → hiển thị spinner
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Chưa đăng nhập → redirect về login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Không có quyền → redirect về dashboard phù hợp
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  // Có quyền → render children
  return <Outlet />;
};
```

**Giải thích:**
- `<Outlet />`: Render component con
- `<Navigate to="/login" />`: Chuyển hướng đến trang login
- Kiểm tra `isAuthenticated` và `user.role` để bảo vệ route

### 🔗 Navigation

```jsx
import { Link, useNavigate } from 'react-router';

function Navigation() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Cách 1: Dùng Link */}
      <Link to="/jobs">Việc làm</Link>
      
      {/* Cách 2: Dùng navigate programmatically */}
      <button onClick={() => navigate('/candidate/dashboard')}>
        Dashboard
      </button>
    </div>
  );
}
```

---

## 9. Tích Hợp AI Service

### 🤖 AI Service - File `services/aiService.js`

```javascript
import apiClient from './apiClient';

class AIService {
  // Lấy gợi ý việc làm cho ứng viên
  async getJobRecommendations(options = {}) {
    const params = {
      limit: options.limit || 10,
      min_score: options.min_score,
      location: options.location,
    };
    
    return await apiClient.get('/ai/recommendations/jobs', params);
  }

  // Lấy gợi ý ứng viên cho công việc (dành cho recruiter)
  async getCandidateRecommendations(jobId, options = {}) {
    const params = {
      limit: options.limit || 20,
      min_score: options.min_score
    };
    
    return await apiClient.get(`/ai/recommendations/candidates/${jobId}`, params);
  }

  // Lấy các công việc tương tự
  async getSimilarJobs(jobId, limit = 5) {
    return await apiClient.get(`/ai/recommendations/similar/${jobId}`, { limit });
  }

  // Theo dõi tương tác người dùng (để cải thiện AI)
  async trackInteraction(recommendationId, interactionType) {
    return await apiClient.post(`/ai/recommendations/${recommendationId}/interaction`, {
      interaction_type: interactionType // 'view', 'click', 'apply', 'reject'
    });
  }
}

export default new AIService();
```

### 🎯 Sử Dụng AI Service trong Component

```jsx
// File: components/common/JobRecommendations.jsx
import { useEffect, useState } from 'react';
import aiService from '@/services/aiService';

const JobRecommendations = ({ limit = 5 }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await aiService.getJobRecommendations({ limit });
      
      if (response.success) {
        setRecommendations(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobClick = (recommendationId) => {
    // Theo dõi khi user click vào gợi ý
    aiService.trackInteraction(recommendationId, 'click');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {recommendations.map((rec) => (
        <div key={rec._id} onClick={() => handleJobClick(rec._id)}>
          <h3>{rec.title}</h3>
          <p>{rec.company_name}</p>
          <span>Độ phù hợp: {Math.round(rec.confidence * 100)}%</span>
          
          {/* Lý do gợi ý */}
          <ul>
            {rec.reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
```

### 🔄 Luồng Hoạt Động AI

```
1. User vào trang Dashboard
   ↓
2. Component gọi aiService.getJobRecommendations()
   ↓
3. aiService gọi API: GET /ai/recommendations/jobs
   ↓
4. Backend gọi AI Service (Python)
   ↓
5. AI Service phân tích profile user và jobs
   ↓
6. Trả về danh sách jobs với score và reasons
   ↓
7. Frontend hiển thị gợi ý
   ↓
8. User click vào job → trackInteraction('click')
   ↓
9. AI Service học từ hành vi user để cải thiện
```

---

## 10. Ví Dụ Thực Tế

### 📊 Candidate Dashboard - File `pages/candidate/Dashboard.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import candidateService from '@/services/candidateService';
import JobRecommendations from '@/components/common/JobRecommendations';

const CandidateDashboard = () => {
  // Lấy user từ Redux store
  const { user } = useSelector((state) => state.auth);
  
  // Local state
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    interviewInvitations: 0,
  });
  const [loading, setLoading] = useState(true);

  // Gọi API khi component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Gọi API lấy danh sách đơn ứng tuyển
      const response = await candidateService.getMyApplications({ limit: 3 });
      
      if (response.success) {
        setApplications(response.data || []);
        setStats({
          totalApplications: response.data?.length || 0,
          interviewInvitations: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {/* Header */}
      <h1>Dashboard</h1>
      <p>Chào mừng {user?.full_name} quay trở lại!</p>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold">{stats.totalApplications}</div>
          <div>Đơn ứng tuyển</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold">{stats.interviewInvitations}</div>
          <div>Được phỏng vấn</div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg shadow">
        <h2>Đơn ứng tuyển gần đây</h2>
        {applications.map((app) => (
          <div key={app._id}>
            <h3>{app.job?.title}</h3>
            <p>{app.job?.company_name}</p>
            <span>{app.status}</span>
          </div>
        ))}
      </div>

      {/* AI Recommendations */}
      <div className="bg-white rounded-lg shadow">
        <h2>Việc làm được đề xuất cho bạn</h2>
        <JobRecommendations limit={3} showReasons={true} />
      </div>
    </div>
  );
};

export default CandidateDashboard;
```

### 🔍 Phân Tích Luồng Dữ Liệu

```
1. Component mount
   ↓
2. useEffect chạy → gọi fetchDashboardData()
   ↓
3. fetchDashboardData() gọi candidateService.getMyApplications()
   ↓
4. candidateService gọi apiClient.get('/candidates/applications')
   ↓
5. apiClient thêm token vào header và gửi request
   ↓
6. Backend xử lý và trả về data
   ↓
7. apiClient parse JSON response
   ↓
8. candidateService trả về data
   ↓
9. fetchDashboardData() nhận data và setApplications()
   ↓
10. State thay đổi → Component re-render với data mới
```

---

## 📝 Tổng Kết

### 🎯 Các Khái Niệm Quan Trọng

1. **Component**: Khối xây dựng cơ bản của React UI
2. **Props**: Dữ liệu truyền từ component cha sang con
3. **State**: Dữ liệu nội bộ của component (useState)
4. **Redux Store**: State toàn cục của app
5. **Hooks**: Hàm đặc biệt để sử dụng state và lifecycle (useState, useEffect, useSelector, etc.)
6. **Service Layer**: Lớp trung gian gọi API
7. **Routing**: Điều hướng giữa các trang

### 🔄 Luồng Dữ Liệu Tổng Quát

```
User tương tác với UI
   ↓
Component dispatch action hoặc gọi service
   ↓
Service gọi API thông qua apiClient
   ↓
apiClient gửi HTTP request với token
   ↓
Backend (Express) xử lý request
   ↓
Backend có thể gọi AI Service (Python) nếu cần
   ↓
Backend trả về response
   ↓
apiClient parse response
   ↓
Service trả về data cho component
   ↓
Component cập nhật state (useState hoặc Redux)
   ↓
React re-render UI với data mới
   ↓
User thấy kết quả
```

### 🚀 Bước Tiếp Theo

1. **Đọc code thực tế**: Mở các file trong `src/pages/candidate/` để xem ví dụ
2. **Thử nghiệm**: Chạy `npm run dev` và xem app hoạt động
3. **Debug**: Dùng React DevTools và Redux DevTools
4. **Tạo component mới**: Thử tạo một component đơn giản
5. **Gọi API**: Thử gọi một API và hiển thị dữ liệu

### 📚 Tài Liệu Tham Khảo

- [React Official Docs](https://react.dev/)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [React Router Docs](https://reactrouter.com/)
- [TailwindCSS Docs](https://tailwindcss.com/)

---

---

## 11. Environment và Configuration

### 🌍 Biến Môi Trường (.env)

File `.env` chứa các biến cấu hình cho môi trường development.

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000/api/v1

# AI Service URL (nếu gọi trực tiếp)
VITE_AI_SERVICE_URL=http://localhost:8000

# Environment
VITE_NODE_ENV=development

# Feature flags
VITE_ENABLE_AI_FEATURES=true
```

**Lưu ý quan trọng:**
- Biến môi trường trong Vite **phải** bắt đầu bằng `VITE_`
- Truy cập bằng `import.meta.env.VITE_TEN_BIEN`
- File `.env` không được commit lên Git (đã có trong `.gitignore`)
- Có thể có nhiều file env: `.env.development`, `.env.production`

**Cách sử dụng:**

```javascript
// Trong code
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = import.meta.env.VITE_NODE_ENV === 'development';

console.log('API URL:', apiUrl);
```

### ⚙️ Vite Configuration - File `vite.config.js`

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from 'path';

export default defineConfig({
  // Plugins
  plugins: [
    react(),        // Plugin React với SWC (compiler nhanh hơn)
    tailwindcss()   // Plugin TailwindCSS
  ],
  
  // Dev server configuration
  server: {
    port: 4000,     // Port chạy dev server
  },
  
  // Path aliases - giúp import ngắn gọn hơn
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@services': resolve(__dirname, 'src/services'),
      '@store': resolve(__dirname, 'src/store'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@hooks': resolve(__dirname, 'src/hooks'),
    }
  },
});
```

**Giải thích:**
- **Plugins**: Thêm chức năng cho Vite (React, TailwindCSS)
- **Server**: Cấu hình dev server (port, proxy, etc.)
- **Alias**: Tạo shortcut cho import paths

**Ví dụ sử dụng alias:**

```javascript
// Thay vì:
import Button from '../../../components/common/Button';

// Dùng alias:
import Button from '@components/common/Button';
// hoặc
import Button from '@/components/common/Button';
```

### 📝 Package Scripts

Trong `package.json`, có các scripts để chạy ứng dụng:

```json
{
  "scripts": {
    "dev": "vite",              // Chạy dev server
    "build": "vite build",      // Build production
    "lint": "eslint .",         // Kiểm tra lỗi code
    "preview": "vite preview"   // Preview bản build
  }
}
```

**Cách chạy:**

```bash
# Development
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 12. Build Process và Deployment

### 🏗️ Quá Trình Build

```
1. npm run build
   ↓
2. Vite đọc code từ src/
   ↓
3. Compile JSX → JavaScript
   ↓
4. Bundle tất cả files
   ↓
5. Minify code (nén code)
   ↓
6. Optimize assets (images, fonts)
   ↓
7. Tạo folder dist/ chứa bản build
```

### 📦 Cấu Trúc Folder `dist/` Sau Build

```
dist/
├── index.html           # HTML entry point
├── assets/
│   ├── index-abc123.js  # JavaScript bundle (có hash)
│   ├── index-def456.css # CSS bundle (có hash)
│   └── logo-xyz789.png  # Assets
└── ...
```

**Tại sao có hash (abc123, def456)?**
- Cache busting: Khi code thay đổi, hash thay đổi → browser tải file mới
- Tránh user dùng code cũ sau khi deploy

### 🚀 Deployment

**Các bước deploy lên production:**

1. **Build production:**
   ```bash
   npm run build
   ```

2. **Test bản build locally:**
   ```bash
   npm run preview
   ```

3. **Upload folder `dist/` lên server:**
   - Netlify: Kéo thả folder `dist/`
   - Vercel: Connect GitHub repo
   - AWS S3: Upload lên S3 bucket
   - Nginx: Copy vào `/var/www/html`

4. **Cấu hình server:**
   - Phải redirect tất cả routes về `index.html` (cho SPA routing)
   - Cấu hình CORS nếu cần
   - Cấu hình HTTPS

**Ví dụ cấu hình Nginx:**

```nginx
server {
  listen 80;
  server_name example.com;
  root /var/www/html;
  index index.html;

  # Redirect all routes to index.html
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### 🔄 CI/CD Pipeline

**Ví dụ GitHub Actions workflow:**

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Deploy to server
        run: scp -r dist/* user@server:/var/www/html
```

---

## 13. Utility Functions

### 🛠️ File `utils/helpers.js`

Chứa các hàm tiện ích dùng chung trong toàn bộ app.

#### 📅 Format Date và Time

```javascript
// Format ngày tháng
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

// Ví dụ: formatDate('2024-01-15') → "15 tháng 1, 2024"

// Format thời gian tương đối
export const formatRelativeTime = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now - targetDate) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
};

// Ví dụ: formatRelativeTime('2024-01-15 10:00') → "2 giờ trước"
```

#### 💰 Format Currency

```javascript
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Ví dụ: formatCurrency(1500000) → "$1,500,000.00"
```

#### ✂️ Truncate Text

```javascript
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Ví dụ: truncateText('Đây là một đoạn text rất dài...', 20) 
//        → "Đây là một đoạn te..."
```

#### ✅ Validation

```javascript
// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password (ít nhất 8 ký tự, có chữ hoa, chữ thường, số)
export const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
```

#### ⏱️ Debounce và Throttle

```javascript
// Debounce - chỉ chạy sau khi user ngừng typing
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Ví dụ sử dụng:
const handleSearch = debounce((query) => {
  console.log('Searching for:', query);
}, 500); // Chỉ search sau 500ms user ngừng typing

// Throttle - giới hạn số lần gọi hàm
export const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = new Date().getTime();
    if (now - lastCall < delay) return;
    lastCall = now;
    return func.apply(null, args);
  };
};
```

#### 💾 LocalStorage Helpers

```javascript
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};

// Sử dụng:
storage.set('user_preferences', { theme: 'dark', language: 'vi' });
const prefs = storage.get('user_preferences');
```

#### 📊 Array Helpers

```javascript
// Loại bỏ duplicate
export const removeDuplicates = (array, key) => {
  if (key) {
    return array.filter((item, index, self) =>
      index === self.findIndex(t => t[key] === item[key])
    );
  }
  return [...new Set(array)];
};

// Group by key
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

// Ví dụ:
const jobs = [
  { id: 1, category: 'IT', title: 'Developer' },
  { id: 2, category: 'IT', title: 'Designer' },
  { id: 3, category: 'Marketing', title: 'SEO' },
];

const grouped = groupBy(jobs, 'category');
// Result: { IT: [...], Marketing: [...] }
```

---

## 14. Debugging và DevTools

### 🔍 Console Logging

```javascript
// Basic logging
console.log('User data:', user);

// Styled logging
console.log('%c API Response', 'color: green; font-weight: bold', response);

// Table logging (cho arrays/objects)
console.table(users);

// Group logging
console.group('User Login Flow');
console.log('Step 1: Validate input');
console.log('Step 2: Call API');
console.log('Step 3: Save token');
console.groupEnd();

// Timing
console.time('API Call');
await fetchData();
console.timeEnd('API Call'); // → API Call: 234ms
```

### 🛠️ React DevTools

**Cài đặt:**
- Chrome: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools)
- Firefox: [React Developer Tools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

**Chức năng:**
1. **Components Tab:**
   - Xem component tree
   - Inspect props và state của từng component
   - Edit props/state trực tiếp để test

2. **Profiler Tab:**
   - Đo performance của components
   - Xem component nào render chậm
   - Tìm unnecessary re-renders

**Cách dùng:**
```
1. Mở DevTools (F12)
2. Chọn tab "Components" hoặc "Profiler"
3. Click vào component để xem details
4. Edit props/state để test
```

### 🗄️ Redux DevTools

**Cài đặt:**
- Chrome: [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools)

**Chức năng:**
1. **Action History:**
   - Xem tất cả actions đã dispatch
   - Time-travel debugging (quay lại state trước đó)

2. **State Inspector:**
   - Xem toàn bộ Redux state
   - Diff giữa state cũ và mới

3. **Action Dispatcher:**
   - Dispatch actions thủ công để test

**Ví dụ sử dụng:**
```
1. Mở DevTools → Tab "Redux"
2. Xem danh sách actions bên trái
3. Click vào action để xem:
   - Action type và payload
   - State trước và sau action
   - Diff của state
4. Dùng slider để time-travel qua các actions
```

### 🌐 Network Tab

**Xem API calls:**
```
1. Mở DevTools → Tab "Network"
2. Filter: XHR/Fetch
3. Click vào request để xem:
   - Headers (bao gồm Authorization token)
   - Request payload
   - Response data
   - Timing
```

**Debug API issues:**
- **401 Unauthorized**: Token hết hạn hoặc không hợp lệ
- **404 Not Found**: URL sai hoặc endpoint không tồn tại
- **500 Server Error**: Lỗi backend
- **CORS Error**: Backend chưa cấu hình CORS

### 🐛 Breakpoints

**Trong Browser DevTools:**
```javascript
// Thêm debugger statement
function handleLogin() {
  debugger; // Code sẽ dừng ở đây
  const response = await authService.login(email, password);
  console.log(response);
}
```

**Hoặc:**
1. Mở DevTools → Tab "Sources"
2. Tìm file JavaScript
3. Click vào số dòng để set breakpoint
4. Reload page hoặc trigger action

### 📝 Error Boundaries

**Bắt lỗi React:**

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// Sử dụng:
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## 15. Performance Optimization

### ⚡ React.memo - Tránh Re-render Không Cần Thiết

```jsx
import { memo } from 'react';

// Component sẽ chỉ re-render khi props thay đổi
const JobCard = memo(({ job }) => {
  return (
    <div>
      <h3>{job.title}</h3>
      <p>{job.company}</p>
    </div>
  );
});

export default JobCard;
```

### 🎯 useMemo - Cache Kết Quả Tính Toán

```jsx
import { useMemo } from 'react';

function JobList({ jobs, filters }) {
  // Chỉ filter lại khi jobs hoặc filters thay đổi
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      return job.category === filters.category &&
             job.location === filters.location;
    });
  }, [jobs, filters]);

  return (
    <div>
      {filteredJobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
}
```

### 🔄 useCallback - Cache Functions

```jsx
import { useCallback } from 'react';

function JobSearch() {
  const [query, setQuery] = useState('');

  // Cache function để tránh tạo function mới mỗi lần render
  const handleSearch = useCallback((newQuery) => {
    setQuery(newQuery);
    // Call API...
  }, []); // Dependencies array

  return <SearchBar onSearch={handleSearch} />;
}
```

### 📦 Code Splitting - Lazy Loading

```jsx
import { lazy, Suspense } from 'react';

// Lazy load component
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboard />
    </Suspense>
  );
}
```

**Lợi ích:**
- Giảm kích thước bundle ban đầu
- Load component khi cần (on-demand)
- Tăng tốc độ load trang

### 🖼️ Image Optimization

```jsx
// Lazy load images
<img 
  src={job.image} 
  loading="lazy"  // Browser tự lazy load
  alt={job.title} 
/>

// Responsive images
<img 
  srcSet="
    image-small.jpg 300w,
    image-medium.jpg 600w,
    image-large.jpg 1200w
  "
  sizes="(max-width: 600px) 300px, (max-width: 1200px) 600px, 1200px"
  src="image-medium.jpg"
  alt="Job"
/>
```

### 🔄 Virtualization - Render Danh Sách Lớn

**Khi có 1000+ items, chỉ render items visible:**

```jsx
import { FixedSizeList } from 'react-window';

function JobList({ jobs }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <JobCard job={jobs[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={jobs.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 📊 Performance Monitoring

```jsx
import { useEffect } from 'react';

function Dashboard() {
  useEffect(() => {
    // Measure component mount time
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      console.log(`Dashboard mounted in ${endTime - startTime}ms`);
    };
  }, []);

  return <div>...</div>;
}
```

---

## 16. Error Handling Patterns

### 🚨 Try-Catch trong Async Functions

```javascript
async function fetchJobs() {
  try {
    setLoading(true);
    setError(null);
    
    const response = await jobService.getJobs();
    
    if (response.success) {
      setJobs(response.data);
    } else {
      throw new Error(response.message || 'Failed to fetch jobs');
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
    setError(error.message);
    
    // Optional: Show toast notification
    toast.error('Không thể tải danh sách việc làm');
  } finally {
    setLoading(false);
  }
}
```

### 📢 Toast Notifications

**Sử dụng react-toastify:**

```jsx
import { toast } from 'react-toastify';

// Success
toast.success('Đăng nhập thành công!');

// Error
toast.error('Email hoặc mật khẩu không đúng');

// Warning
toast.warning('Phiên đăng nhập sắp hết hạn');

// Info
toast.info('Có 3 tin nhắn mới');

// Custom
toast('Custom message', {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
});
```

### ✅ Form Validation

```jsx
function LoginForm() {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Email không hợp lệ';
    }
    
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      await authService.login(email, password);
    } catch (error) {
      setErrors({ general: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      {errors.email && <span className="error">{errors.email}</span>}
      
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {errors.password && <span className="error">{errors.password}</span>}
      
      {errors.general && <div className="error">{errors.general}</div>}
      
      <button type="submit">Đăng nhập</button>
    </form>
  );
}
```

### 🔄 Retry Logic

```javascript
async function fetchWithRetry(fetchFn, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  
  throw lastError;
}

// Sử dụng:
const data = await fetchWithRetry(() => jobService.getJobs());
```

### 🛡️ Defensive Programming

```javascript
// Luôn check null/undefined
function JobCard({ job }) {
  if (!job) {
    return <div>No job data</div>;
  }
  
  return (
    <div>
      <h3>{job.title || 'Untitled'}</h3>
      <p>{job.company?.name || 'Unknown company'}</p>
      <span>{job.salary?.min ? `$${job.salary.min}` : 'Negotiable'}</span>
    </div>
  );
}

// Optional chaining và nullish coalescing
const companyName = job?.company?.name ?? 'Unknown';
const salary = job?.salary?.min ?? 0;
```

### 📝 Error Logging Service

```javascript
class ErrorLogger {
  static log(error, context = {}) {
    // Log to console
    console.error('Error:', error, 'Context:', context);
    
    // Send to error tracking service (Sentry, LogRocket, etc.)
    if (import.meta.env.VITE_NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: context });
    }
  }
}

// Sử dụng:
try {
  await jobService.createJob(jobData);
} catch (error) {
  ErrorLogger.log(error, {
    action: 'CREATE_JOB',
    userId: user.id,
    jobData: jobData,
  });
  toast.error('Không thể tạo công việc');
}
```

---

## ❓ Câu Hỏi Thường Gặp

### Q1: Sự khác biệt giữa useState và Redux?
- **useState**: State cục bộ, chỉ dùng trong 1 component
- **Redux**: State toàn cục, chia sẻ giữa nhiều component

### Q2: Khi nào nên dùng useEffect?
- Gọi API khi component mount
- Subscribe/unsubscribe events
- Cập nhật document title
- Bất kỳ side effect nào

### Q3: Token được lưu ở đâu?
- Lưu trong `localStorage` của trình duyệt
- Tự động thêm vào header mỗi request

### Q4: AI Service hoạt động như thế nào?
- Frontend gọi Backend API
- Backend gọi AI Service (Python)
- AI Service phân tích và trả về gợi ý
- Frontend hiển thị kết quả

### Q5: Làm sao để debug?
- Dùng `console.log()`
- Dùng React DevTools (xem component tree)
- Dùng Redux DevTools (xem state changes)
- Dùng Network tab (xem API calls)

---

**Chúc bạn học tốt! 🎉**

Nếu có câu hỏi, hãy đọc lại tài liệu này hoặc xem code trong các file tương ứng.
