from typing import Any, Dict, List, Optional
import json

def assemble_recruiter_compare_prompt(
    question: str,
    job_meta: Dict[str, Any],
    candidates: Dict[str, Dict[str, Any]],
    fits: Dict[str, Dict[str, Any]]
) -> str:
    """
    Prompt so sánh 2+ ứng viên chi tiết (Deep Compare).
    """
    # Build candidate summaries
    cands_text = []
    for cid, cdata in candidates.items():
        fit = fits.get(cid) or {}
        score = fit.get("score", 0)
        matched = fit.get("matched") or []
        missing = fit.get("missing") or []
        
        cands_text.append(f"""
--- Candidate ID: {cid} ---
Name: {cdata.get("full_name") or "Ứng viên " + str(cid)}
Exp: {cdata.get("years_exp")} years
Skills: {cdata.get("skills_known_display")}
Fit Score: {score:.1f}%
Matched: {matched}
Missing: {missing}
""")

    return f"""
Bạn là chuyên gia tuyển dụng cao cấp (Recruiter Expert).
Nhiệm vụ: So sánh các ứng viên dưới đây cho vị trí "{job_meta.get("job_title")}".

=== JOB REQUIREMENTS ===
Title: {job_meta.get("job_title")}
Skills: {job_meta.get("job_required_skills_known_display")}

=== CANDIDATES ===
{chr(10).join(cands_text)}

User Question: "{question}"

YÊU CẦU:
1. So sánh trực diện điểm mạnh/yếu của từng người so với Job.
2. Đưa ra đề xuất xếp hạng (Rank) và lý do tại sao chọn người đứng đầu.
3. Nếu User hỏi cụ thể "ai hơn ai", hãy trả lời thẳng thắn dựa trên data.

OUTPUT JSON FORMAT:
{{
  "comparison": "Đoạn văn so sánh chi tiết...",
  "ranking": [
    {{"rank": 1, "candidate_id": "...", "reason": "..."}},
    {{"rank": 2, "candidate_id": "...", "reason": "..."}}
  ],
  "recommendation": "Lời khuyên cuối cùng..."
}}
""".strip()

def assemble_recruiter_interview_prompt(
    question: str,
    job_meta: Dict[str, Any],
    cand_meta: Dict[str, Any],
    fit: Dict[str, Any]
) -> str:
    """
    Prompt gợi ý câu hỏi phỏng vấn (Interview Prep).
    """
    missing = fit.get("missing") or []
    
    return f"""
Bạn là Hiring Manager đang chuẩn bị phỏng vấn ứng viên.
Nhiệm vụ: Gợi ý bộ câu hỏi phỏng vấn phù hợp với hồ sơ ứng viên này.

=== JOB ===
Title: {job_meta.get("job_title")}

=== CANDIDATE ===
Name: {cand_meta.get("full_name") or "Ứng viên"}
Skills: {cand_meta.get("skills_known_display")}
Missing Skills (Gap): {missing}

User Question: "{question}"

YÊU CẦU:
1. Gợi ý 3 câu hỏi chuyên môn (Hard Skills) để kiểm tra năng lực.
2. Gợi ý 2 câu hỏi hành vi (Behavioral) hoặc Soft Skills.
3. Nếu ứng viên thiếu kỹ năng nào (Missing), hãy gợi ý câu hỏi để kiểm tra khả năng học hỏi (Learning Agility) của họ về kỹ năng đó.

OUTPUT JSON FORMAT:
{{
  "introduction": "Gợi ý mở đầu...",
  "questions": [
    {{"type": "Hard Skill", "question": "...", "purpose": "..."}},
    {{"type": "Behavioral", "question": "...", "purpose": "..."}},
    {{"type": "Gap Probe", "question": "...", "purpose": "Check khả năng học {missing[0] if missing else 'skill'}"}}
  ],
  "tips": "Lưu ý khi phỏng vấn..."
}}
""".strip()

def assemble_jd_generation_prompt(keywords: str) -> str:
    """
    Prompt tạo JD từ keyword (Job Description Generator).
    """
    return f"""
Bạn là chuyên gia nhân sự (HR Specialist).
Nhiệm vụ: Viết bản Mô tả công việc (Job Description - JD) chuyên nghiệp dựa trên các từ khóa người dùng cung cấp.

INPUT KEYWORDS: "{keywords}"

YÊU CẦU:
1. Xác định chức danh (Job Title) phù hợp nhất.
2. Viết phần "Mô tả công việc" (Responsibilities): 4-6 gạch đầu dòng.
3. Viết phần "Yêu cầu" (Requirements): 4-6 gạch đầu dòng (Hard skills & Soft skills).
4. Viết phần "Quyền lợi" (Benefits): Gợi ý chung hấp dẫn.
5. Giọng văn chuyên nghiệp, thu hút ứng viên.

OUTPUT JSON FORMAT:
{{
  "job_title": "Tên vị trí đề xuất",
  "summary": "Tóm tắt ngắn gọn về vai trò...",
  "responsibilities": ["...", "..."],
  "requirements": ["...", "..."],
  "benefits": ["...", "..."],
  "call_to_action": "Câu kêu gọi ứng tuyển..."
}}
""".strip()

def assemble_outreach_email_prompt(
    job_meta: Dict[str, Any],
    cand_meta: Dict[str, Any],
    intent_type: str,
    extra_context: str = ""
) -> str:
    """
    Prompt soạn email Outreach (Invite, Reject, Offer...).
    """
    job_meta = job_meta or {}
    cand_meta = cand_meta or {}
    
    intent_map = {
        "INVITE": "Thư mời phỏng vấn",
        "REJECT": "Thư từ chối ứng viên",
        "OFFER": "Thư mời nhận việc (Offer Letter)",
        "CONTACT": "Email làm quen / Giới thiệu cơ hội"
    }
    email_type = intent_map.get(intent_type, "Email liên hệ")
    
    return f"""
Bạn là chuyên viên tuyển dụng (Recruiter).
Nhiệm vụ: Soạn {email_type} gửi cho ứng viên.

=== CONTEXT ===
Job Title: {job_meta.get("job_title")}
Company: {job_meta.get("job_company_name")}
Candidate Name: {cand_meta.get("full_name") or "Ứng viên"}
Extra Request (User Note): "{extra_context}"

YÊU CẦU:
1. Tiêu đề email (Subject) ngắn gọn, chuyên nghiệp.
2. Nội dung thân thiện nhưng trang trọng (Professional & Welcoming).
3. Nếu là Invite: Cần để chỗ trống [Time] và [Location] hoặc link meeting.
4. Nếu là Reject: Cần khéo léo, giữ quan hệ (Empathy).

OUTPUT JSON FORMAT:
{{
  "subject": "Tiêu đề email...",
  "body": "Nội dung email (dùng Markdown)...",
  "note": "Ghi chú thêm cho Recruiter (nếu cần)"
}}
""".strip()
