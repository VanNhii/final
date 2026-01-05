# AI Job Recommendation Service

Hệ thống AI tự động gợi ý việc làm phù hợp cho ứng viên dựa trên machine learning và collaborative filtering.

## Tính năng chính

- **Training Model**: Tự động training model dựa trên dữ liệu lịch sử applications, interactions
- **Job Recommendations**: Gợi ý việc làm phù hợp cho candidate
- **Candidate Recommendations**: Gợi ý ứng viên phù hợp cho job posting (recruiter)
- **Hybrid Approach**: Kết hợp Content-Based Filtering và Collaborative Filtering
- **Real-time API**: REST API để tích hợp với backend Node.js
- **Auto-learning**: Tự động cập nhật model dựa trên feedback từ người dùng

## Công nghệ sử dụng

- **Python 3.8+**
- **scikit-learn**: Machine learning algorithms
- **TensorFlow/PyTorch**: Deep learning models (optional)
- **Flask**: REST API framework
- **MongoDB**: Database integration với backend
- **NLTK/Gensim**: Natural Language Processing

## Cài đặt

### 1. Tạo virtual environment

```bash
cd ai_service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### 3. Download NLTK data (cho NLP processing)

```python
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"
```

### 4. Cấu hình environment

```bash
cp .env.example .env
# Chỉnh sửa file .env với thông tin MongoDB và các config khác
```

### 5. Seed dữ liệu mẫu (nếu chưa có applications)

```bash
# Tạo 100 applications mẫu
python scripts/seed_data.py --applications 100 --recommendations 50
```

### 6. Khởi tạo và training model lần đầu

```bash
python scripts/initial_training.py
```

## Sử dụng

### Chạy API Server

```bash
python run.py
```

API sẽ chạy tại `http://localhost:5000`

### Training model mới

```bash
# Training với dữ liệu mới nhất
python scripts/train_model.py

# Training với custom parameters
python scripts/train_model.py --epochs 100 --batch-size 64
```

### Testing

```bash
# Run all tests
pytest

# Run với coverage
pytest --cov=src tests/
```

## API Endpoints

### 1. Get Job Recommendations for Candidate

```http
POST /api/recommendations/jobs
Content-Type: application/json

{
  "candidate_id": "507f1f77bcf86cd799439011",
  "limit": 20,
  "filters": {
    "location": "Hà Nội",
    "job_type": "full_time"
  }
}
```

### 2. Get Candidate Recommendations for Job

```http
POST /api/recommendations/candidates
Content-Type: application/json

{
  "job_id": "507f1f77bcf86cd799439012",
  "limit": 50
}
```

### 3. Train Model

```http
POST /api/model/train
Content-Type: application/json

{
  "data_source": "mongodb",
  "model_type": "hybrid"
}
```

### 4. Get Model Status

```http
GET /api/model/status
```

### 5. Update Model Feedback

```http
POST /api/feedback
Content-Type: application/json

{
  "recommendation_id": "507f1f77bcf86cd799439013",
  "feedback_type": "positive",
  "rating": 5
}
```

## Kiến trúc hệ thống

```
ai_service/
├── src/
│   ├── __init__.py
│   ├── app.py                 # Flask application
│   ├── data_pipeline.py       # Data extraction & preprocessing
│   ├── feature_engineering.py # Feature extraction
│   ├── model_trainer.py       # Model training logic
│   ├── recommendation_engine.py # Recommendation algorithms
│   ├── database.py            # MongoDB connection
│   └── utils.py               # Utility functions
├── models/                    # Saved models
├── data/                      # Training data
├── logs/                      # Application logs
├── scripts/                   # Training & utility scripts
├── tests/                     # Unit tests
├── config.py                  # Configuration
├── requirements.txt
└── README.md
```

## Thuật toán

### 1. Content-Based Filtering
- Phân tích skills, experience, education từ candidate profile
- So sánh với job requirements
- Tính similarity score dựa trên TF-IDF và cosine similarity

### 2. Collaborative Filtering
- Matrix factorization (SVD)
- Học từ patterns của applications thành công
- User-based và Item-based filtering

### 3. Hybrid Approach
- Kết hợp cả 2 phương pháp trên
- Weighted ensemble
- Context-aware ranking

### 4. Deep Learning (Advanced)
- Neural Collaborative Filtering
- Wide & Deep Learning
- Embedding layers cho categorical features

## Feature Engineering

### Candidate Features
- Skills vector (TF-IDF)
- Experience years
- Education level
- Salary expectation
- Location preferences
- Job type preferences
- Past application success rate
- Profile completeness score

### Job Features
- Required skills vector
- Experience required
- Education required
- Salary range
- Location
- Job type
- Company reputation
- Application count
- View count

### Interaction Features
- Application history
- View history
- Save history
- Interview outcomes
- Offer acceptance rate

## Performance Metrics

- **Precision@K**: Độ chính xác trong top K recommendations
- **Recall@K**: Coverage của relevant items
- **NDCG**: Normalized Discounted Cumulative Gain
- **MRR**: Mean Reciprocal Rank
- **Click-Through Rate**: Tỷ lệ click vào recommendations
- **Conversion Rate**: Tỷ lệ apply sau khi xem recommendation

## Monitoring và Logging

- Real-time metrics tracking
- Model performance monitoring
- API latency tracking
- Error logging và alerting

## Tối ưu hóa

- Model caching
- Feature pre-computation
- Batch predictions
- Async processing
- Redis caching cho hot data

## Roadmap

- [ ] A/B Testing framework
- [ ] Real-time model updates
- [ ] Multi-armed bandit for exploration
- [ ] Explainable AI (LIME/SHAP)
- [ ] Auto-ML for hyperparameter tuning
- [ ] GraphQL API support

## License

MIT

## Contact

Email: support@jobportal.com
