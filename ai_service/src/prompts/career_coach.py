from typing import Any, Dict, List, Optional
import json

def assemble_cover_letter_prompt(
    job_meta: Dict[str, Any],
    cand_meta: Dict[str, Any],
    fit: Dict[str, Any]
) -> str:
    """
    Tạo prompt viết Cover Letter cá nhân hóa.
    """
    matched = fit.get("matched") or []
    missing = fit.get("missing") or []
    
    return f"""
Bạn là chuyên gia viết hồ sơ xin việc (Career Coach).
Nhiệm vụ: Viết một Cover Letter (Thư xin việc) chuyên nghiệp, ngắn gọn (dưới 300 từ) cho ứng viên nộp vào vị trí này.

=== JOB CONTEXT ===
Title: {job_meta.get("job_title")}
Company: {job_meta.get("job_company_name")}
Key Requirements: {job_meta.get("job_required_skills_known_display") or []}

=== CANDIDATE CONTEXT ===
Name: {cand_meta.get("full_name") or "Ứng viên"}
Skills: {cand_meta.get("skills_known_display") or []}
Years Exp: {cand_meta.get("years_exp")}

=== FIT ANALYSIS ===
Strong Match: {matched} (Hãy nhấn mạnh các kỹ năng này trong thư)
Weakness: {missing} (Hãy khéo léo thể hiện tinh thần sẵn sàng học hỏi về các mảng này)

YÊU CẦU:
- Giọng văn: Chuyên nghiệp, chân thành, nhiệt huyết.
- Cấu trúc: 
  1. Mở bài: Nêu rõ lý do ứng tuyển và sự ngưỡng mộ với công ty (nếu có).
  2. Thân bài: Chứng minh sự phù hợp qua các kỹ năng "Strong Match".
  3. Kết bài: Kêu gọi hành động (mong muốn phỏng vấn).
- Output: Trả về nội dung thư dưới dạng Markdown.

OUTPUT FORMAT:
Chỉ trả về nội dung thư, không lời dẫn.
""".strip()

def assemble_roadmap_prompt(
    job_meta: Dict[str, Any],
    cand_meta: Dict[str, Any],
    fit: Dict[str, Any],
    duration_days: int = 14
) -> str:
    """
    Tạo prompt lộ trình học tập (Roadmap) lấp lỗ hổng kỹ năng.
    """
    missing = fit.get("missing") or []
    missing_critical = fit.get("missing_critical") or []
    all_missing = list(set(missing + missing_critical))

    if not all_missing:
        return f"""
Bạn là Mentor kỹ thuật. Ứng viên này đã phù hợp gần như hoàn toàn với Job "{job_meta.get("job_title")}".
Hãy tạo một kế hoạch "Onboarding 7 ngày" để họ chuẩn bị tâm thế tốt nhất khi bắt đầu công việc mới (ví dụ: tìm hiểu văn hóa công ty, ôn lại kiến thức nâng cao, soft skills).
""".strip()

    return f"""
Bạn là Mentor kỹ thuật giàu kinh nghiệm.
Nhiệm vụ: Lập kế hoạch học tập cấp tốc trong {duration_days} ngày để ứng viên lấp đầy các kỹ năng còn thiếu cho vị trí "{job_meta.get("job_title")}".

=== MISSING SKILLS ===
Critical (Ưu tiên số 1): {missing_critical}
Normal (Ưu tiên số 2): {missing}

YÊU CẦU:
1. Chia lộ trình thành các giai đoạn (Phases) hoặc từng ngày cụ thể.
2. Với mỗi kỹ năng, gợi ý keyword cần học hoặc tên đầu sách/tài liệu nổi tiếng.
3. Tập trung vào thực hành (Project-based learning).
4. Giọng văn khích lệ, cụ thể.

OUTPUT JSON FORMAT:
{{
  "title": "Lộ trình chinh phục Job {job_meta.get("job_title")}",
  "overview": "Nhận xét tổng quan...",
  "phases": [
    {{
      "name": "Giai đoạn 1: Nền tảng (Ngày 1-5)",
      "focus": "Học SQL nâng cao",
      "tasks": ["Tìm hiểu Indexing", "Thực hành Query Optimization"],
      "resources": ["Keyword: SQL Performance Tuning"]
    }}
  ],
  "advice": "Lời khuyên cuối cùng..."
}}
""".strip()

def assemble_cv_critique_prompt(
    job_meta: Dict[str, Any],
    cand_meta: Dict[str, Any],
    fit: Dict[str, Any]
) -> str:
    """
    Tạo prompt review CV chi tiết (ATS friendly).
    """
    return f"""
Bạn là chuyên gia Review CV và hệ thống ATS (Applicant Tracking System).
Nhiệm vụ: Phân tích CV của ứng viên so với JD mục tiêu và đề xuất chỉnh sửa cụ thể để tăng tỷ lệ đậu vòng hồ sơ.

=== JOB TARGET ===
Title: {job_meta.get("job_title")}
Keywords (ATS): {job_meta.get("job_required_skills_known_display") or []}

=== CANDIDATE PROFILE ===
Current Skills: {cand_meta.get("skills_known_display") or []}
Summary/Exp: (Dựa trên context đã biết)

=== GAP ANALYSIS ===
Missing Keywords: {fit.get("missing") or []}

YÊU CẦU:
1. Đánh giá độ chuẩn ATS (Score / 10).
2. Chỉ ra 3 điểm yếu lớn nhất của CV so với Job này (ví dụ: thiếu keyword quan trọng, chưa định lượng kết quả).
3. Đề xuất câu văn cụ thể để sửa lại (Rewrite suggestions).

OUTPUT JSON FORMAT:
{{
  "ats_score": 7.5,
  "summary": "CV của bạn khá tốt nhưng thiếu...",
  "issues": [
    {{
      "type": "Missing Keyword",
      "detail": "Thiếu kỹ năng 'Docker' dù Job yêu cầu.",
      "suggestion": "Thêm dòng: 'Triển khai ứng dụng containerization với Docker...'"
    }}
  ],
  "improvements": [
    "Viết lại phần Summary tập trung hơn vào...",
    "Định lượng thành tích (ví dụ: tăng 20% hiệu suất)"
  ]
}}
""".strip()
