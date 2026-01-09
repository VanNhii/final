# ai_service — Code Guide (src/)

> Generated on 2026-01-09 17:49 (local sandbox time)

Tài liệu này giúp bạn **hiểu từng file trong `src/`** và **từng hàm/class** bên trong, theo đúng cấu trúc code bạn đang dùng.

## Tổng quan kiến trúc nhanh

- `app.py`: Flask API entrypoint (routes) → gọi các service.
- `rag_service.py`: Hybrid RAG + sessions + fit + prompt builders.
- `recommendation_engine.py`: Job/Candidate recommendation + scoring + feedback.
- `facts_layer.py`: Normalize text/skills + utilities.
- `conversation_state.py`: Intent/state routing cho chat.
- `llm_service.py`: Wrapper gọi LLM.


---

## `src/__init__.py`

**Vai trò:** Package init: export các service/engine để import gọn.
**Docstring:** AI Service Package Initialization


---

## `src/app.py`

**Header:** src/app.py (V6 - cleaned, no duplicate replies, clearer flows)
**Vai trò:** Entry-point Flask API: định nghĩa endpoints cho Candidate/Recruiter chat, điều phối RecommendationEngine + RAGService + LLMService và format response.

### Cấu hình & response helpers

- `is_llm_enabled()` → **bool**: Is llm enabled.
- `api_ok(data: dict, message: str='OK', status_code: int=200)`: Api ok.
  - Tags: HTTP response
- `api_err(message: str, status_code: int=400, data: Optional[dict]=None)`: Api err.
  - Tags: HTTP response
- `thanks_reply(selected_job_title: str='')` → **str**: Thanks reply.
- `recruiter_thanks_reply(job_title: str='')` → **str**: Recruiter thanks reply.
- `goodbye_reply()` → **str**: Goodbye reply.
- `is_generic_fit_reply(text: str)` → **bool**: Is generic fit reply.

### Session/state helpers

- `session_to_state(sess: dict, max_messages: int=20)` → **dict**: Session to state.
- `build_candidate_current_state(*, candidate_id: str, session_id: str, payload: dict, fit: Optional[dict]=None, job_meta: Optional[dict]=None)` → **dict**: Build candidate current state.

### Job utilities & message builders

- `dedupe_jobs(sugs: List[dict], max_n: int=10)` → **List[dict]**: Dedupe jobs.
- `pick_best_suggestion(candidate_id: str, sugs: List[dict])` → **Optional[int]**: Deterministic auto-pick: choose suggestion with highest computed fit score.
  - Tags: RAG
- `build_suggest_jobs_message(sugs: List[dict], source: str)` → **str**: Build suggest jobs message.
- `build_empathy_prompt()` → **str**: Build empathy prompt.
- `build_empathy_message(*, question: str, job_meta: dict, cand_meta: dict, fit: dict, extra: Optional[dict], history: List[dict], fallback: str)` → **str**: Build empathy message.
  - Flow: Gọi LLM để sinh câu trả lời theo prompt
  - Tags: LLM
- `_fmt_money(value: Any)` → **str**:  fmt money.
- `get_job_salary_range(job_id: str)` → **Tuple[Optional[int], Optional[int], str]**: Get job salary range.
  - Tags: RAG
- `build_fit_message(question: str, fit: dict, job_title: str='')` → **str**: Deterministic fallback when LLM returns nothing/generic.
- `count_job_applications(job_id: str, statuses: Optional[List[str]]=None)` → **Optional[int]**: Count job applications.
  - Tags: RAG
- `build_screening_message(cands: List[dict], skills_norm: List[str], city_norm: str, years_min: Optional[int])` → **str**: Build screening message.
  - Flow: Gọi RAG để lấy evidence (chunks) cho câu trả lời
  - Tags: RAG
- `pick_compare_ids(question: str, payload: dict)` → **List[str]**: Pick compare ids.
- `pick_single_candidate_id(question: str, payload: dict)` → **Optional[str]**: Pick single candidate id.
- `build_compare_message(job_title: str, a_md: dict, b_md: dict, a_fit: dict, b_fit: dict)` → **str**: Build compare message.
- `build_recruiter_jobs_message(jobs: List[dict])` → **str**: Build recruiter jobs message.
- `build_recruiter_top5(ranked: List[dict])` → **List[dict]**: Build recruiter top5.

### Candidate flow handlers (logic)

- `handle_candidate_profile_review(candidate_id: str, question: str, session_id: str)`: Handle candidate profile review.
  - Flow: Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_candidate_profile_to_jobs(candidate_id: str, question: str, session_id: str, preface: Optional[str]=None)`: Handle candidate profile to jobs.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: ChatPrefs/UX, HTTP response, RAG
- `handle_candidate_job_search(candidate_id: str, question: str, session_id: str, preface: Optional[str]=None, context_breaker: bool=False)`: Handle candidate job search.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: ChatPrefs/UX, HTTP response, RAG
- `handle_candidate_select_job(candidate_id: str, pick_index: int, session_id: str)`: Handle candidate select job.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, RAG
- `handle_candidate_job_fit(candidate_id: str, question: str, session_id: str, job_id: Optional[str]=None, preface: str='')`: Handle candidate job fit.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_candidate_roadmap(candidate_id: str, question: str, session_id: str, job_id: Optional[str]=None)`: Handle candidate roadmap.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_candidate_interview(candidate_id: str, question: str, session_id: str, job_id: Optional[str]=None)`: Handle candidate interview.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, RAG
- `handle_candidate_competition(candidate_id: str, question: str, session_id: str)`: Handle candidate competition.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, RAG
- `candidate_unknown_fallback(candidate_id: str, question: str, session_id: str, payload: dict)` → **str**: Candidate unknown fallback.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt
  - Tags: LLM, RAG
- `candidate_display_name(md: dict)` → **str**: Candidate display name.

### Recruiter flow handlers (logic)

- `get_recruiter_record_by_user(user_id: str)` → **Optional[dict]**: Get recruiter record by user.
  - Tags: RAG
- `get_candidate_record_by_user(user_id: str)` → **Optional[dict]**: Get candidate record by user.
  - Tags: RAG
- `handle_recruiter_screen(question: str, session_id: str, payload: dict)`: Handle recruiter screen.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, RAG
- `handle_recruiter_compare(job_id: str, question: str, session_id: str, payload: dict)`: Handle recruiter compare.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_recruiter_interview_prep(job_id: str, question: str, session_id: str, payload: dict)`: Handle recruiter interview prep.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_recruiter_rank(job_id: str, candidate_ids: List[str], question: str, session_id: str, ttl_minutes: int, recruiter_user_id: Optional[str]=None, preface: str='')`: Handle recruiter rank.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_recruiter_generate_jd(question: str, session_id: str)`: Handle recruiter generate jd.
  - Flow: Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_recruiter_outreach(question: str, session_id: str, payload: dict, intent_override: Optional[str]=None)`: Handle recruiter outreach.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG

### Parsing & selection helpers

- `is_non_it_role_question(question: str)` → **bool**: Is non it role question.
- `is_salary_question(question: str)` → **bool**: Is salary question.
- `is_no_candidates_question(question: str)` → **bool**: Is no candidates question.
- `parse_years_min(question: str)` → **Optional[int]**: Parse years min.
- `extract_screen_filters(question: str)` → **Dict[str, Any]**: Extract screen filters.
  - Tags: RAG
- `parse_candidate_ids_from_text(question: str)` → **List[str]**: Parse candidate ids from text.
- `resolve_candidate_ids_from_payload(payload: dict)` → **List[str]**: Resolve candidate ids from payload.
- `parse_compare_indices(question: str)` → **Optional[Tuple[int, int]]**: Parse compare indices.
- `parse_single_index(question: str)` → **Optional[int]**: Parse single index.

### Routes (Flask endpoints)

- `health()`: Health.
  - Tags: HTTP response
- `candidate_chat_general()`: Candidate chat general.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: ChatPrefs/UX, HTTP response, LLM, RAG
- `candidate_chat_fit()`: Candidate chat fit.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời
  - Tags: HTTP response, RAG
- `candidate_chat_history()`: Candidate chat history.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, RAG
- `recruiter_chat_history()`: Recruiter chat history.
  - Flow: Parse/validate payload từ request → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, RAG
- `recruiter_chat_general()`: Recruiter chat general.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `candidate_daily_digest()`: Candidate daily digest.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, RAG
- `stream_chat()`: Stream chat.
  - Flow: Parse/validate payload từ request → Gọi LLM để sinh câu trả lời theo prompt
  - Tags: LLM

### Khác

- `friendly_menu()` → **str**: Friendly menu.
- `handle_cover_letter_gen(candidate_id: str, question: str, session_id: str, job_id: Optional[str]=None)`: Handle cover letter gen.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `handle_cv_critique(candidate_id: str, question: str, session_id: str, job_id: Optional[str]=None)`: Handle cv critique.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời → Gọi LLM để sinh câu trả lời theo prompt → Trả JSON response chuẩn (api_ok/api_err)
  - Tags: HTTP response, LLM, RAG
- `list_recruiter_jobs(recruiter_id: Any, limit: int=20)` → **List[dict]**: List recruiter jobs.


---

## `src/auth.py`

**Vai trò:** Auth middleware cho Flask (protect/authorize) + các helper để verify token và trả lỗi JSON chuẩn.

### Functions

- `_b64url_decode(data: str)` → **bytes**:  b64url decode.
- `_decode_jwt(token: str, secret: str)` → **Dict[str, Any]**:  decode jwt.
  - Flow: Parse/validate payload từ request
- `_json_err(message: str, status: int)`:  json err.
- `protect(fn)`: Protect.
  - Flow: Parse/validate payload từ request
- `authorize(*roles)`: Authorize.

### Classes

#### `class AuthError`



---

## `src/chat_prefs.py`

**Vai trò:** Model lưu 'preference' của người dùng trong 1 session chat (city, work_location, salary, role_hint, rejected jobs...) và normalize dữ liệu đầu vào.

### Classes

#### `class ChatPrefs`
- Stores user preferences across a session.

- `ChatPrefs.patch(self, patch: Dict[str, Any])` → **None**: Patch.
- `ChatPrefs.to_dict(self)` → **Dict[str, Any]**: To dict.
- `ChatPrefs.from_payload(cls, payload: Dict[str, Any])` → **'ChatPrefs'**: From payload.
  - Tags: ChatPrefs/UX


---

## `src/conversation_state.py`

**Header:** src/conversation_state.py (V5 - robust intent + state orchestration)
**Vai trò:** Intent detection + state orchestration: nhận text user, phân loại intent (thanks/goodbye/choose job/fit/roadmap...), cập nhật state và gợi ý next action.

### Functions

- `is_reset(text: str)` → **bool**: Is reset.
- `is_greeting(text: str)` → **bool**: Is greeting.
- `is_thanks(text: str)` → **bool**: Is thanks.
- `is_goodbye(text: str)` → **bool**: Is goodbye.
- `is_confirm(text: str)` → **bool**: Is confirm.
- `is_ack(text: str)` → **bool**: Is ack.
- `fuzzy_role_match(text: str)` → **bool**: Fuzzy role match.
- `parse_pick_index(text: str)` → **Optional[int]**: "chon 1", "so 2", "job 3", "cong viec 4" => 0-based index
- `parse_city_from_text(text: str)` → **Optional[str]**: Parse city from text.
- `parse_work_location(text: str)` → **Optional[str]**: Parse work location.
- `wants_auto_pick(text: str)` → **bool**: Wants auto pick.
- `wants_best_from_list(text: str)` → **bool**: Wants best from list.
- `_match_tokens(text: str)` → **List[str]**:  match tokens.
- `match_suggestion_index(question: str, suggestions: List[dict])` → **Optional[int]**: Match suggestion index.
- `merge_prefs(payload: dict, patch: dict)` → **dict**: Merge prefs.
- `extract_prefs_rule(text: str)` → **Dict[str, Any]**: Extract prefs rule.
- `extract_prefs_llm(llm: LLMService, text: str, old_prefs: Dict[str, Any])` → **Dict[str, Any]**: LLM fallback for preferences, but safe + optional.
  - Flow: Gọi LLM để sinh câu trả lời theo prompt
  - Tags: LLM
- `rewrite_followup_query(question: str, state: dict, last_query: str='', kind: str='candidate')` → **str**: If user says "thêm 5 job ở Đà Nẵng" etc, enrich with last query + new prefs.
- `route_candidate_intent(question: str, payload: dict, llm: Optional[LLMService]=None)` → **dict**: Candidate intent router (best V5):
  - Flow: Parse/validate payload từ request → Gọi recommendation engine để lấy gợi ý/ranking → Gọi LLM để sinh câu trả lời theo prompt
  - Tags: LLM
- `route_recruiter_intent(question: str, payload: dict, llm: Optional[LLMService]=None)` → **dict**: Recruiter router: avoid falling into UNKNOWN too easily.
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking → Gọi LLM để sinh câu trả lời theo prompt
  - Tags: LLM


---

## `src/data_pipeline.py`

**Vai trò:** Pipeline trích xuất dữ liệu từ MongoDB → preprocess → tạo dataset (features/labels) cho training hoặc evaluation.
**Docstring:** Data Pipeline for extracting and preprocessing data from MongoDB

### Classes

#### `class DataPipeline`
- Data extraction and preprocessing pipeline

- `DataPipeline.__init__(self)`:   init  .
  - Tags: MongoDB
- `DataPipeline.extract_training_data(self, days_back=180)`: Extract training data from database
  - Flow: Load dữ liệu candidate/job liên quan
  - Tags: MongoDB
- `DataPipeline._extract_features(self, candidate, job)`: Extract features from candidate and job
- `DataPipeline.preprocess_features(self, df, verbose=True)`: Preprocess features for model training
- `DataPipeline._safe_transform(self, encoder, value)`: Safely transform value with label encoder
- `DataPipeline.extract_user_interaction_data(self)`: Extract user interaction data for collaborative filtering
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking
  - Tags: MongoDB
- `DataPipeline._get_application_rating(self, status)`: Convert application status to rating
- `DataPipeline.create_interaction_matrix(self, interactions_df)`: Create user-item interaction matrix


---

## `src/database.py`

**Vai trò:** Wrapper kết nối MongoDB (sync/async) + CRUD tiện ích cho lưu recommendations và các collection cho pipeline/ML.
**Docstring:** Database connection and utilities for MongoDB

### Functions

- `get_database(async_mode=False)`: Get database instance

### Classes

#### `class Database`
- MongoDB database handler

- `Database.__init__(self, config=None)`:   init  .
  - Tags: MongoDB
- `Database.connect(self)`: Connect to MongoDB
  - Tags: MongoDB
- `Database.close(self)`: Close MongoDB connection
- `Database.get_collection(self, collection_name)`: Get a collection from database
  - Tags: MongoDB
- `Database.get_jobs(self, query=None, limit=None)`: Get jobs from database
- `Database.get_candidates(self, query=None, limit=None)`: Get candidates from database
- `Database.get_applications(self, query=None, limit=None)`: Get applications from database
- `Database.get_users(self, query=None, limit=None)`: Get users from database
- `Database.get_ai_recommendations(self, query=None, limit=None)`: Get AI recommendations
- `Database.save_ai_recommendation(self, recommendation)`: Save AI recommendation to database
- `Database.bulk_save_recommendations(self, recommendations)`: Bulk save recommendations
- `Database.update_recommendation(self, recommendation_id, update_data)`: Update a recommendation
- `Database.get_user_preferences(self, user_id)`: Get user preferences
- `Database.save_user_preferences(self, preferences)`: Save user preferences
- `Database.get_ai_feedback(self, query=None)`: Get AI feedback

#### `class AsyncDatabase`
- Async MongoDB database handler

- `AsyncDatabase.__init__(self, config=None)`:   init  .
  - Tags: MongoDB
- `AsyncDatabase.connect(self)`: Connect to MongoDB asynchronously
  - Tags: MongoDB
- `AsyncDatabase.close(self)`: Close MongoDB connection


---

## `src/facts_layer.py`

**Header:** src/facts_layer.py (V5 - State-of-the-Art Core)
**Vai trò:** Tầng 'FACTS': làm sạch text, normalize cơ bản, chunking, normalize city/work location, và SkillNormalizer (alias + critical skills + category).

### Functions

- `now_utc()` → **datetime**: Now utc.
- `clean_text(x: Any)` → **str**: Clean text.
- `strip_accents(s: str)` → **str**: Strip accents.
- `norm_basic(s: str)` → **str**: Norm basic.
- `chunk_words(text: str, chunk_words: int=240, overlap_words: int=50)` → **List[str]**: Chunk words.
- `normalize_city(city: str)` → **str**: Normalize Vietnamese city names for filtering/search.
- `normalize_work_location(s: str)` → **str**: Normalize work location.
- `get_skill_normalizer(config_path: Optional[str]=None)` → **SkillNormalizer**: Get skill normalizer.
- `normalize_skill(s: str)` → **Optional[str]**: Normalize skill.
- `normalize_skill_list(xs: Iterable[str])` → **List[str]**: Normalize skill list.
- `fingerprint_text(text: str)` → **str**: Create a stable short fingerprint for deduping chat messages.

### Classes

#### `class SkillNormalizer`
- Loads config/skills.json (or custom) and provides:

- `SkillNormalizer.__init__(self, config_path: Optional[str]=None)`:   init  .
- `SkillNormalizer._load(self)` → **None**:  load.
- `SkillNormalizer.detect_in_text(self, text: str)` → **List[str]**: Detect skills from free text using (1) regex patterns, then (2) synonym phrase matching.
- `SkillNormalizer.normalize_one_norm(self, s: str, allow_unknown: bool=True)` → **Optional[str]**: Normalize one norm.
- `SkillNormalizer.display_from_norm(self, sid: str)` → **str**: Display from norm.
- `SkillNormalizer.category_for_skill(self, s: str)` → **str**: Category for skill.
- `SkillNormalizer.classify_many_norm(self, skills: Iterable[str], dedup: bool=True)` → **Tuple[List[str], List[str], List[str]]**: Returns: (known_display, known_norm, unknown_norm)
- `SkillNormalizer.detect_critical(self, required_norm: Iterable[str])` → **List[str]**: Detect critical.
- `SkillNormalizer.expand_inferred(self, known_norm: Iterable[str])` → **List[str]**: Lightweight knowledge graph inference.


---

## `src/feature_engineering.py`

**Vai trò:** Feature engineering cho bài toán recommend/matching (vector/tfidf/metadata features, scaling/encoding...).
**Docstring:** Feature Engineering module for extracting and transforming features

### Classes

#### `class FeatureEngineer`
- Feature engineering for job recommendations

- `FeatureEngineer.__init__(self)`:   init  .
- `FeatureEngineer.fit_skill_embeddings(self, jobs, candidates)`: Fit skill embeddings from jobs and candidates
- `FeatureEngineer.transform_skills(self, text)`: Transform skill text to vector
- `FeatureEngineer.extract_candidate_features(self, candidate)`: Extract comprehensive features from candidate
- `FeatureEngineer.extract_job_features(self, job)`: Extract comprehensive features from job
- `FeatureEngineer.calculate_match_features(self, candidate_features, job_features)`: Calculate matching features between candidate and job
- `FeatureEngineer._encode_education(self, education)`: Encode education level to numeric
- `FeatureEngineer._encode_job_type(self, job_type)`: Encode job type to numeric
- `FeatureEngineer._encode_work_location(self, work_location)`: Encode work location to numeric
- `FeatureEngineer._encode_seniority(self, seniority)`: Encode seniority level to numeric
- `FeatureEngineer._encode_job_status(self, status)`: Encode job status to numeric


---

## `src/llm_service.py`

**Header:** src/llm_service.py (V5)
**Vai trò:** Service gọi LLM (có thể bật/tắt), build prompt, call endpoint (vd: Ollama), và parse/stream output.

### Functions

- `_strip_code_fences(text: str)` → **str**:  strip code fences.
- `_extract_json_snippet_balanced(text: str)` → **Optional[str]**: Extract the first balanced JSON object/array from arbitrary text.
- `_repair_json_text(snippet: str)` → **str**:  repair json text.
- `_try_parse_json(text: str)` → **Optional[Any]**:  try parse json.

### Classes

#### `class LLMService`
- Ollama chat wrapper.

- `LLMService.__init__(self)`:   init  .
- `LLMService.ask(self, prompt: str, question: str='', user_text: str='')` → **str**: Ask.
- `LLMService.ask_stream(self, prompt: str, question: str='', user_text: str='')` → **Generator[str, None, None]**: Ask stream.
  - Flow: Parse/validate payload từ request
- `LLMService.ask_json(self, prompt: str, question: str='', user_text: str='', schema_hint: str='', max_repair: int=1)` → **Dict[str, Any]**: Best-effort JSON mode:


---

## `src/model_trainer.py`

**Vai trò:** Training script/module: fit model, evaluate, persist artifacts (model/vectorizer/encoders...).
**Docstring:** Model Trainer for job recommendation system

### Classes

#### `class ModelTrainer`
- Train and manage recommendation models

- `ModelTrainer.__init__(self, model_type='random_forest', config=None)`:   init  .
- `ModelTrainer.prepare_data(self, days_back=180)`: Prepare training data
- `ModelTrainer.train(self, days_back=180)`: Train the recommendation model
  - Flow: Gọi recommendation engine để lấy gợi ý/ranking
- `ModelTrainer.evaluate(self, X_test, y_test)`: Evaluate model performance
  - Flow: Gọi RAG để lấy evidence (chunks) cho câu trả lời
- `ModelTrainer.predict_proba(self, X)`: Predict probability scores
- `ModelTrainer.get_feature_importance(self)`: Get feature importance scores
- `ModelTrainer.save_model(self, filename=None)`: Save trained model to disk
  - Flow: Gọi recommendation engine để lấy gợi ý/ranking
- `ModelTrainer.load_model(self, filename=None)`: Load trained model from disk

#### `class CollaborativeFilteringModel`
- Collaborative Filtering using Matrix Factorization

- `CollaborativeFilteringModel.__init__(self, n_factors=50, config=None)`:   init  .
- `CollaborativeFilteringModel.train(self)`: Train collaborative filtering model
- `CollaborativeFilteringModel.predict(self, user_id, item_ids=None)`: Predict ratings for user-item pairs
  - Flow: Gọi RAG để lấy evidence (chunks) cho câu trả lời
- `CollaborativeFilteringModel.save_model(self, filename=None)`: Save collaborative filtering model
- `CollaborativeFilteringModel.load_model(self, filename=None)`: Load collaborative filtering model


---

## `src/notifications.py`

**Header:** src/notifications.py (Optional - digest generation stub)
**Vai trò:** Logic tạo thông báo/digest (vd: daily digest) dựa trên session hoặc các sự kiện hệ thống.

### Functions

- `build_daily_digest(rag: RAGService, candidate_id: str, prefs: Optional[ChatPrefs]=None, limit: int=3)` → **Dict[str, Any]**: Generate a proactive message, e.g. "Today you have 2 new jobs in Da Nang".
  - Flow: Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời
  - Tags: ChatPrefs/UX, RAG


---

## `src/rag_service.py`

**Header:** src/rag_service.py (V5 - Hybrid RAG + Sessions + Fit)
**Vai trò:** Hybrid RAG + session store + fit scoring: embed, search (vector/text/hybrid), rerank, compute fit, và build prompt cho candidate/recruiter.

### Functions

- `_to_oid(x: Any)` → **Optional[ObjectId]**:  to oid.
- `_dedupe_keep_order(items: Iterable[str])` → **List[str]**:  dedupe keep order.

### Classes

#### `class RAGService`
- ⚠️ Lưu ý: trong file này có **method bị định nghĩa trùng**: `_fallback_templates`, `generate_roadmap_14_days`, `build_interview_pack` (nếu bạn muốn, mình có thể giúp gộp/cleanup).

- `RAGService.__init__(self)`:   init  .
  - Flow: Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời
  - Tags: MongoDB
- `RAGService.ensure_indexes(self)` → **None**: Ensure indexes.
- `RAGService.start_session(self, kind: str, payload: Optional[dict]=None, ttl_minutes: int=45)` → **Dict[str, Any]**: Start session.
- `RAGService.get_session(self, session_id: str)` → **Optional[Dict[str, Any]]**: Get session.
- `RAGService.update_session_payload(self, session_id: str, patch: Dict[str, Any])` → **None**: Update session payload.
- `RAGService.append_message(self, session_id: str, role: str, content: str, meta: Optional[Dict[str, Any]]=None)` → **bool**: Append a chat message into:
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi RAG để lấy evidence (chunks) cho câu trả lời
- `RAGService.get_history_messages(self, owner_id: str, kind: str, limit: int=20)` → **List[Dict[str, Any]]**: Get history messages.
- `RAGService._get_embedder(self)` → **SentenceTransformer**:  get embedder.
- `RAGService._get_reranker(self)`: Lazy-load optional CrossEncoder reranker.
- `RAGService._cross_rerank(self, query: str, hits: List[Dict[str, Any]], topk: Optional[int]=None)` → **List[Dict[str, Any]]**: Rerank hit list using CrossEncoder if enabled; otherwise return original list.
- `RAGService.embed(self, text: str)` → **List[float]**: Embed.
- `RAGService._cos(self, a: List[float], b: List[float])` → **float**:  cos.
- `RAGService.get_job_meta(self, job_id: str)` → **Optional[Dict[str, Any]]**: Get job meta.
- `RAGService.get_candidate_meta(self, candidate_id: str)` → **Optional[Dict[str, Any]]**: Get candidate meta.
- `RAGService.get_candidates_meta_batch(self, candidate_ids: List[str])` → **Dict[str, Dict[str, Any]]**: Get candidates meta batch.
- `RAGService.get_applied_candidate_ids(self, job_id: str, statuses: Optional[List[str]]=None, limit: Optional[int]=None)` → **List[str]**: Get applied candidate ids.
  - Tags: MongoDB
- `RAGService._filters(self, doc_type: str, visibility: str='', extra: Optional[Dict[str, Any]]=None)` → **Dict[str, Any]**:  filters.
- `RAGService.vector_search(self, query: str, doc_type: str, visibility: str='', filters: Optional[Dict[str, Any]]=None, limit: int=20)` → **List[Dict[str, Any]]**: Vector search.
  - Flow: Gọi RAG để lấy evidence (chunks) cho câu trả lời
- `RAGService.text_search(self, query: str, doc_type: str, visibility: str='', filters: Optional[Dict[str, Any]]=None, limit: int=20)` → **List[Dict[str, Any]]**: Text search.
  - Flow: Gọi RAG để lấy evidence (chunks) cho câu trả lời
- `RAGService.hybrid_search(self, query: str, doc_type: str, visibility: str='', filters: Optional[Dict[str, Any]]=None, limit: int=10)` → **List[Dict[str, Any]]**: Combine vector + text results with Reciprocal Rank Fusion (RRF).
  - Flow: Gọi recommendation engine để lấy gợi ý/ranking → Gọi RAG để lấy evidence (chunks) cho câu trả lời
- `RAGService.fetch_doc_chunks(self, doc_type: str, id_field: str, oid: ObjectId, limit: int=40)` → **List[str]**: Fetch doc chunks.
- `RAGService.topk_rerank_texts(self, query: str, texts: List[str], k: int=4)` → **List[str]**: Lightweight second-stage rerank by embedding dot product.
- `RAGService.compute_fit(self, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], audience: str='candidate')` → **Dict[str, Any]**: Deterministic fit score (for judge/demo). LLM later explains it.
- `RAGService._load_skill_templates(self)` → **Dict[str, Any]**:  load skill templates.
- `RAGService._get_skill_templates(self, category: str, kind: str)` → **List[Dict[str, Any]]**:  get skill templates.
- `RAGService._fallback_templates(self, kind: str)` → **List[Dict[str, Any]]**:  fallback templates.
- `RAGService._render_template(self, text: Any, **kwargs: Any)` → **str**:  render template.
- `RAGService._render_list(self, items: Iterable[Any], **kwargs: Any)` → **List[str]**:  render list.
- `RAGService.generate_roadmap_14_days(self, *, missing: List[str], missing_critical: List[str], job_title: str='')` → **List[Dict[str, Any]]**: Deterministic 14-day plan driven by missing skills (demo-safe, no hallucination).
  - Flow: Gọi LLM để sinh câu trả lời theo prompt
- `RAGService.build_interview_pack(self, *, job_title: str, matched: List[str], missing: List[str], missing_critical: List[str])` → **Dict[str, Any]**: Generate a deterministic interview simulation pack (questions + scoring rubric).
- `RAGService._fallback_templates(self, kind: str)` → **List[Dict[str, Any]]**:  fallback templates.
- `RAGService.generate_roadmap_14_days(self, *, missing: List[str], missing_critical: List[str], job_title: str='')` → **List[Dict[str, Any]]**: Deterministic 14-day plan driven by missing skills (demo-safe, no hallucination).
  - Flow: Gọi LLM để sinh câu trả lời theo prompt
- `RAGService.build_interview_pack(self, *, job_title: str, matched: List[str], missing: List[str], missing_critical: List[str])` → **Dict[str, Any]**: Generate a deterministic interview simulation pack (questions + scoring rubric).
- `RAGService._role_hint_tokens(self, role_hint: str)` → **List[str]**:  role hint tokens.
- `RAGService._role_hint_matches(self, title: str, role_hint: str)` → **bool**:  role hint matches.
- `RAGService._seniority_rank(self, raw: str)` → **int**:  seniority rank.
- `RAGService._score_job_for_candidate(self, cand: Dict[str, Any], job: Dict[str, Any], prefs: ChatPrefs)` → **Tuple[float, float, float, float]**:  score job for candidate.
  - Flow: Gọi recommendation engine để lấy gợi ý/ranking
  - Tags: ChatPrefs/UX
- `RAGService._sort_jobs_for_candidate(self, cand: Dict[str, Any], jobs: List[Dict[str, Any]], prefs: ChatPrefs)` → **List[Dict[str, Any]]**:  sort jobs for candidate.
  - Tags: ChatPrefs/UX
- `RAGService.suggest_jobs(self, query: str, limit: int=5, prefs: Optional[ChatPrefs]=None)` → **List[Dict[str, Any]]**: Suggest jobs.
  - Tags: ChatPrefs/UX
- `RAGService.suggest_jobs_for_candidate(self, candidate_id: str, limit: int=10, query_hint: str='', prefs: Optional[ChatPrefs]=None)` → **List[Dict[str, Any]]**: Suggest jobs for candidate.
  - Flow: Load dữ liệu candidate/job liên quan
  - Tags: ChatPrefs/UX
- `RAGService.screen_candidates_by_metadata(self, *, skills_norm: Optional[List[str]]=None, city_norm: str='', years_min: Optional[int]=None, limit: int=20)` → **List[Dict[str, Any]]**: Screen candidates by metadata.
- `RAGService.build_candidate_prompt(self, question: str, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any], job_ctx: List[str], cand_ctx: List[str], history: Optional[List[Dict[str, Any]]]=None, current_state: Optional[Dict[str, Any]]=None)` → **str**: Build candidate prompt.
- `RAGService.build_recruiter_prompt(self, question: str, job_meta: Dict[str, Any], ranked: List[Dict[str, Any]], history: Optional[List[Dict[str, Any]]]=None)` → **str**: Build recruiter prompt.
  - Flow: Gọi recommendation engine để lấy gợi ý/ranking
- `RAGService.build_recruiter_compare_prompt(self, question: str, job_meta: Dict[str, Any], candidates: Dict[str, Dict[str, Any]], fits: Dict[str, Dict[str, Any]])` → **str**: Deep comparison (delegated).
- `RAGService.build_recruiter_interview_prompt(self, question: str, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any])` → **str**: Interview prep (delegated).
- `RAGService.build_cover_letter_prompt(self, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any])` → **str**: Cover letter gen (delegated).
- `RAGService.build_roadmap_prompt(self, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any])` → **str**: Career roadmap (delegated).
- `RAGService.build_cv_critique_prompt(self, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any])` → **str**: CV critique (delegated).
- `RAGService.build_jd_generation_prompt(self, keywords: str)` → **str**: Generate JD from keywords.
- `RAGService.build_outreach_email_prompt(self, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], intent_type: str, extra_context: str='')` → **str**: Compose outreach email.
- `RAGService.build_ui_fit_charts(self, fit: Dict[str, Any], job_meta: Dict[str, Any], cand_meta: Dict[str, Any])` → **Dict[str, Any]**: Build ui fit charts.
- `RAGService._jsonable(self, x: Any)` → **Any**:  jsonable.


---

## `src/recommendation_engine.py`

**Vai trò:** RecommendationEngine: tính điểm phù hợp job↔candidate, trả list gợi ý, lưu feedback/recommendations, fallback khi thiếu profile.
**Docstring:** Recommendation Engine - Core recommendation logic

### Classes

#### `class RecommendationEngine`
- Main recommendation engine

- `RecommendationEngine.__init__(self, config=None)`:   init  .
  - Tags: MongoDB
- `RecommendationEngine._load_models(self)`: Load pre-trained models
- `RecommendationEngine.recommend_jobs_for_candidate(self, candidate_id, limit=20, filters=None)`: Recommend jobs for a candidate
  - Flow: Parse/validate payload từ request → Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking
  - Tags: MongoDB
- `RecommendationEngine.recommend_candidates_for_job(self, job_id, limit=50)`: Recommend candidates for a job posting
  - Flow: Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking
  - Tags: MongoDB
- `RecommendationEngine._score_candidate_job_match(self, candidate, job)`: Calculate match score between candidate and job
  - Flow: Load dữ liệu candidate/job liên quan
- `RecommendationEngine._calculate_confidence(self, candidate, job, scores)`: Calculate confidence score based on data completeness
  - Flow: Gọi RAG để lấy evidence (chunks) cho câu trả lời
- `RecommendationEngine._save_recommendations(self, requester_id, requester_type, recommendation_type, recommendations)`: Save recommendations to database
  - Tags: MongoDB
- `RecommendationEngine.update_recommendation_feedback(self, recommendation_id, feedback_data)`: Update recommendation with user feedback
  - Tags: MongoDB
- `RecommendationEngine.get_similar_jobs(self, job_id, limit=5)`: Get similar jobs based on job features
  - Tags: MongoDB
- `RecommendationEngine._has_sufficient_profile(self, candidate)`: Check if candidate has sufficient profile data for personalized recommendations
- `RecommendationEngine._get_popular_jobs(self, limit=20, filters=None)`: Get popular/recent jobs for users with incomplete profiles
  - Flow: Gọi recommendation engine để lấy gợi ý/ranking
  - Tags: MongoDB


---

## `src/recruiter_router.py`

**Header:** src/recruiter_router.py (compat shim + recruiter helpers)
**Vai trò:** Compat shim: re-export / glue code cho routing recruiter intent để giữ backward compatibility.


---

## `src/tools.py`

**Header:** src/tools.py (Optional tool-calling stubs)
**Vai trò:** Các helper nhỏ dùng chung (format/parse/safe JSON) phục vụ luồng chat & RAG.

### Functions

- `get_salary_average(role_hint: str, city_norm: str)` → **Dict[str, Any]**: Get salary average.
- `check_traffic_from_home(location: str)` → **Dict[str, Any]**: Check traffic from home.


---

## `src/utils.py`

**Vai trò:** Utility layer cho extraction/normalization tính toán phụ trợ (skills extraction, text normalize, completeness, similarity...).
**Docstring:** Utility functions for AI service

### Functions

- `normalize_text(text)`: Normalize text for processing
- `extract_skills(text)`: Extract skills from text
- `calculate_experience_match(candidate_exp, job_exp_min, job_exp_max=None)`: Calculate experience match score
- `calculate_salary_match(candidate_salary, job_salary_min, job_salary_max=None)`: Calculate salary match score
- `calculate_location_match(candidate_locations, job_location)`: Calculate location match score
- `calculate_education_match(candidate_edu, job_edu)`: Calculate education match score
- `calculate_job_type_match(candidate_prefs, job_type)`: Calculate job type match score
- `cosine_similarity(vec1, vec2)`: Calculate cosine similarity between two vectors
- `jaccard_similarity(set1, set2)`: Calculate Jaccard similarity between two sets
- `get_timestamp()`: Get current timestamp
- `format_recommendation(rec_data)`: Format recommendation data for API response
- `extract_skills_from_candidate(candidate)`: Extract skills from candidate profile
- `extract_skills_from_job(job)`: Extract skills from job posting
- `calculate_profile_completeness(candidate)`: Calculate candidate profile completeness score
- `setup_logging(log_file=None, log_level='INFO')`: Setup logging configuration


---

## `src/prompts/career_coach.py`

**Vai trò:** Prompt templates: hàm build prompt string cho LLM theo ngữ cảnh (career coach / recruiter).

### Functions

- `assemble_cover_letter_prompt(job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any])` → **str**: Tạo prompt viết Cover Letter cá nhân hóa.
- `assemble_roadmap_prompt(job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any], duration_days: int=14)` → **str**: Tạo prompt lộ trình học tập (Roadmap) lấp lỗ hổng kỹ năng.
- `assemble_cv_critique_prompt(job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any])` → **str**: Tạo prompt review CV chi tiết (ATS friendly).


---

## `src/prompts/recruiter.py`

**Vai trò:** Prompt templates: hàm build prompt string cho LLM theo ngữ cảnh (career coach / recruiter).

### Functions

- `assemble_recruiter_compare_prompt(question: str, job_meta: Dict[str, Any], candidates: Dict[str, Dict[str, Any]], fits: Dict[str, Dict[str, Any]])` → **str**: Prompt so sánh 2+ ứng viên chi tiết (Deep Compare).
  - Flow: Load dữ liệu candidate/job liên quan → Gọi recommendation engine để lấy gợi ý/ranking
- `assemble_recruiter_interview_prompt(question: str, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], fit: Dict[str, Any])` → **str**: Prompt gợi ý câu hỏi phỏng vấn (Interview Prep).
- `assemble_jd_generation_prompt(keywords: str)` → **str**: Prompt tạo JD từ keyword (Job Description Generator).
- `assemble_outreach_email_prompt(job_meta: Dict[str, Any], cand_meta: Dict[str, Any], intent_type: str, extra_context: str='')` → **str**: Prompt soạn email Outreach (Invite, Reject, Offer...).


---
