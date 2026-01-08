# src/app.py (V6 - cleaned, no duplicate replies, clearer flows)
# Updated configuration reload trigger
from __future__ import annotations

import os
import re
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, jsonify, request, Response, g
from flask_cors import CORS

from .facts_layer import clean_text, norm_basic
from .llm_service import LLMService
from .rag_service import RAGService
from .database import get_database
from .conversation_state import (
    route_candidate_intent,
    route_recruiter_intent,
    parse_pick_index,
    match_suggestion_index,
    parse_city_from_text,
    extract_prefs_rule,
    extract_prefs_llm,
    merge_prefs,
    rewrite_followup_query,
)
from .chat_prefs import ChatPrefs
from .notifications import build_daily_digest
from .auth import protect, authorize

app = Flask(__name__)
logger = logging.getLogger(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

# ----------------------------
# CORS
# ----------------------------
allowed = os.getenv("ALLOWED_ORIGINS", "*")
if allowed == "*" or not allowed:
    CORS(app)
else:
    CORS(app, origins=[x.strip() for x in allowed.split(",") if x.strip()])

rag_service = RAGService()
llm_service = LLMService()

# Ensure basic indexes (TTL + lookups). Atlas Search/Vector indexes must be created in Atlas UI.
rag_service.ensure_indexes()

# ----------------------------
# API helpers
# ----------------------------
def is_llm_enabled() -> bool:
    return str(os.getenv("LLM_ENABLED", "true")).lower() in ("true", "1", "yes", "on")


def api_ok(data: dict, message: str = "OK", status_code: int = 200):
    return jsonify({"success": True, "message": message, "data": data}), status_code


def api_err(message: str, status_code: int = 400, data: Optional[dict] = None):
    return jsonify({"success": False, "message": message, "data": data or {}}), status_code


def session_to_state(sess: dict, max_messages: int = 20) -> dict:
    payload = sess.get("payload") or {}
    msgs = sess.get("messages") or []
    if max_messages and len(msgs) > max_messages:
        msgs = msgs[-max_messages:]
    return {
        "session_id": sess.get("session_id"),
        "kind": sess.get("kind"),
        "created_at": sess.get("created_at"),
        "expires_at": sess.get("expires_at"),
        "payload": payload,
        "selected_job_id": payload.get("selected_job_id"),
        "candidate_id": payload.get("candidate_id"),
        "job_id": payload.get("job_id"),
        "candidate_ids": payload.get("candidate_ids"),
        "last_job_suggestions": payload.get("last_job_suggestions") or [],
        "last_ranked": payload.get("last_ranked") or [],
        "messages": msgs,
    }


def dedupe_jobs(sugs: List[dict], max_n: int = 10) -> List[dict]:
    out: List[dict] = []
    seen = set()
    for s in sugs or []:
        jid = clean_text(s.get("job_id") or s.get("_id"))
        if not jid or jid in seen:
            continue
        seen.add(jid)
        out.append(s)
        if len(out) >= max_n:
            break
    return out


def pick_best_suggestion(candidate_id: str, sugs: List[dict]) -> Optional[int]:
    """
    Deterministic auto-pick: choose suggestion with highest computed fit score.
    Falls back to index 0 if missing meta.
    """
    if not sugs:
        return None
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not cand_meta:
        return 0
    best_idx = 0
    best_score = -1.0
    for i, s in enumerate(sugs):
        job_id = clean_text(s.get("job_id") or s.get("_id"))
        if not job_id:
            continue
        job_meta = rag_service.get_job_meta(job_id)
        if not job_meta:
            continue
        fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate")
        score = float(fit.get("score") or 0.0)
        if score > best_score:
            best_score = score
            best_idx = i
    return best_idx


def friendly_menu() -> str:
    return (
        "Chào bạn 👋\n"
        "Mình có thể giúp 3 việc:\n"
        "1) **Review CV nhanh** (tóm tắt điểm mạnh/yếu)\n"
        "2) **Tìm job phù hợp** theo CV hoặc theo mô tả\n"
        "3) **Chấm Fit theo 1 job** + gợi ý thiếu gì + lộ trình 14 ngày\n\n"
        "Ví dụ:\n"
        "- “xem CV tôi tìm job phù hợp ở Đà Nẵng remote”\n"
        "- “tìm job backend ở HCM hybrid”\n"
        "- “chọn 1” (sau khi mình gợi ý job)\n"
    )


def thanks_reply(selected_job_title: str = "") -> str:
    if selected_job_title:
        return f"Cảm ơn bạn! Nếu cần mình chấm fit hoặc giải thích thêm về job **{selected_job_title}**, cứ hỏi nhé."
    return "Cảm ơn bạn! Nếu cần mình review CV, tìm job hoặc chấm fit, cứ nói nhé."


def recruiter_thanks_reply(job_title: str = "") -> str:
    if job_title:
        return f"Cảm ơn bạn! Nếu cần mình xếp hạng/so sánh/gợi ý câu hỏi phỏng vấn cho job **{job_title}**, cứ nói nhé."
    return "Cảm ơn bạn! Nếu cần mình xếp hạng ứng viên, so sánh top hoặc gợi ý câu hỏi phỏng vấn, cứ nói nhé."


def goodbye_reply() -> str:
    return "Tạm biệt bạn! Khi cần hỗ trợ thêm, quay lại nhắn mình nhé."


def build_suggest_jobs_message(sugs: List[dict], source: str) -> str:
    if not sugs:
        if source == "profile":
            return (
                "Mình chưa thấy job nào khớp ngay từ CV trong hệ thống hiện tại. "
                "Bạn có thể bổ sung tiêu chí (khu vực, level, hình thức làm việc) để mình tìm lại nhé."
            )
        return (
            "Mình chưa tìm được job theo tiêu chí vừa rồi. "
            "Bạn có thể nới lỏng tiêu chí (khu vực, level, hình thức làm việc) hoặc thử câu khác."
        )

    if source == "profile_relaxed":
        return (
            "Mình chưa thấy job khi lọc theo tiêu chí hiện tại, nên đã nới lọc và gợi ý vài job gần nhất từ CV của bạn. "
            "Nếu bạn muốn lọc lại theo khu vực/remote/level thì nói mình nhé."
        )

    if source == "profile":
        return "Mình đã xem CV và gợi ý vài job phù hợp bên dưới. Bạn chọn 1 job để mình chấm fit nhé (gõ: **chọn 1**)."

    return f"Mình tìm được {len(sugs)} job theo tiêu chí của bạn. Chọn 1 job để mình chấm fit nhé (gõ: **chọn 1**)."


def build_empathy_prompt() -> str:
    return """
Bạn là trợ lý hướng nghiệp giàu kinh nghiệm, nói tiếng Việt tự nhiên, thấu cảm, thẳng thắn.

QUY TẮC CỨNG
- Chỉ dùng dữ liệu trong FACTS/CONTEXT/CHAT HISTORY. Không được bịa số liệu.
- Nếu thông tin không có trong context: trả lời: "Xin lỗi, thông tin này không có trong mô tả công việc, bạn nên hỏi trực tiếp HR khi phỏng vấn".
- Nếu thiếu dữ liệu, nói rõ "mình chưa có dữ liệu này" và hỏi thêm 1 câu.
- Câu hỏi nhạy cảm (lương, số ứng viên, môi trường): trả lời có điều kiện + hỏi làm rõ.
- Ưu tiên hành động cụ thể (actionable).

CẤU TRÚC TRẢ LỜI (3-6 dòng)
1) Thấu cảm ngắn
2) Trả lời thẳng theo FACTS
3) 2-3 gợi ý hành động
4) Nếu thiếu dữ liệu: hỏi thêm

OUTPUT: tiếng Việt có dấu, ngắn gọn.
""".strip()


def build_candidate_current_state(
    *,
    candidate_id: str,
    session_id: str,
    payload: dict,
    fit: Optional[dict] = None,
    job_meta: Optional[dict] = None,
) -> dict:
    fit = fit or {}
    job_meta = job_meta or {}
    return {
        "owner_id": candidate_id,
        "session_id": session_id,
        "selected_job_id": payload.get("selected_job_id") or payload.get("job_id"),
        "selected_job_title": job_meta.get("job_title") or "",
        "missing_critical": fit.get("missing_critical") or [],
        "missing": fit.get("missing") or [],
        "last_action": payload.get("last_action") or "",
    }


def build_empathy_message(
    *,
    question: str,
    job_meta: dict,
    cand_meta: dict,
    fit: dict,
    extra: Optional[dict],
    history: List[dict],
    fallback: str,
) -> str:
    if not is_llm_enabled():
        return fallback

    prompt = f"""
{build_empathy_prompt()}

User question: {question}

=== FIT (deterministic) ===
{json.dumps(fit, ensure_ascii=False)}

=== JOB FACTS ===
Title: {job_meta.get("job_title")}
Company: {job_meta.get("job_company_name")}
City: {job_meta.get("job_location_city")}
Work location: {job_meta.get("job_work_location")}
Required skills: {job_meta.get("job_required_skills_known_display") or []}
Critical skills: {job_meta.get("job_critical_skills_display") or []}

=== CANDIDATE FACTS ===
City: {cand_meta.get("city")}
Years exp: {cand_meta.get("years_exp")}
Seniority: {cand_meta.get("seniority_hint")}
Primary skills: {cand_meta.get("primary_skills_known_display") or []}
Skills known: {cand_meta.get("skills_known_display") or []}

=== EXTRA CONTEXT ===
{json.dumps(extra or {}, ensure_ascii=False)}

=== CHAT HISTORY (latest 6) ===
{chr(10).join([f"{(m.get('role') or '').upper()}: {m.get('content')}" for m in (history or [])[-6:] if m.get('content')])}

Output JSON: {{"message": "string"}}
""".strip()

    schema_hint = '{"message":"string"}'
    try:
        answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
    except Exception:
        return fallback
    if isinstance(answer, dict):
        msg = clean_text(answer.get("message") or "")
        if msg:
            return msg
    return fallback


def is_non_it_role_question(question: str) -> bool:
    q = norm_basic(question)
    if not q:
        return False
    non_it = (
        "giao vien",
        "teacher",
        "bac si",
        "nha si",
        "y ta",
        "dieu duong",
        "luat su",
        "ke toan",
        "tai xe",
        "tap vu",
    )
    return any(k in q for k in non_it)


def is_salary_question(question: str) -> bool:
    q = norm_basic(question)
    return bool(q and re.search(r"\b(luong|muc luong|thu nhap|salary|pay|compensation|offer)\b", q))


def _fmt_money(value: Any) -> str:
    try:
        return f"{int(value):,}"
    except Exception:
        return clean_text(value)


def get_job_salary_range(job_id: str) -> Tuple[Optional[int], Optional[int], str]:
    from .rag_service import _to_oid as _oid
    oid = _oid(job_id)
    if not oid:
        return None, None, "VND"
    db = get_database()
    job = db.get_collection("jobs").find_one(
        {"_id": oid},
        {"salary_min": 1, "salary_max": 1, "salary_currency": 1},
    )
    if not job:
        return None, None, "VND"
    salary_min = job.get("salary_min") or 0
    salary_max = job.get("salary_max") or 0
    currency = job.get("salary_currency") or "VND"
    if salary_min <= 0 and salary_max <= 0:
        return None, None, currency
    return int(salary_min) if salary_min else None, int(salary_max) if salary_max else None, currency


def is_generic_fit_reply(text: str) -> bool:
    t = norm_basic(text)
    if not t:
        return True
    if len(t) <= 10:
        return True
    return t in {"khong phu hop", "khong phu hop hoan toan", "not fit"}


def build_fit_message(question: str, fit: dict, job_title: str = "") -> str:
    """
    Deterministic fallback when LLM returns nothing/generic.
    """
    q = norm_basic(question or "")
    ask_strength = any(k in q for k in ["phu hop", "diem", "%", "bao nhieu", "phan tram", "diem manh", "tot"])
    ask_why = any(k in q for k in ["vi sao", "ly do", "tai sao", "khong phu hop"])
    ask_improve = any(k in q for k in ["cai thien", "can hoc", "nen hoc", "hoc them", "bo sung", "nang cao"])

    matched = fit.get("matched") or []
    missing = fit.get("missing") or []
    missing_critical = fit.get("missing_critical") or []
    hard_reasons = fit.get("hard_reasons") or []
    score = fit.get("score")
    try:
        score_text = f"{float(score):.1f}"
    except Exception:
        score_text = "0.0"

    title = f" cho job **{job_title}**" if job_title else ""
    matched_text = ", ".join(matched[:4]) if matched else "chưa thấy kỹ năng khớp rõ ràng"
    missing_text = ", ".join(missing[:4]) if missing else ""
    critical_text = ", ".join(missing_critical[:3]) if missing_critical else ""

    def low_score_advice() -> str:
        needs = missing_critical or missing or []
        skills = ", ".join(needs[:2]) if needs else "một vài kỹ năng cốt lõi"
        return (
            f" Gợi ý: Vị trí này đang cần {skills} mà CV của bạn chưa nêu rõ. "
            "Bạn nên xem lộ trình cải thiện hoặc thử job entry/manual gần hơn."
        )

    try:
        low_score = score is not None and float(score) < 10.0
    except Exception:
        low_score = False

    if fit.get("passed"):
        msg = f"Bạn khá phù hợp{title} (điểm phù hợp: {score_text}%). Bạn đang có: {matched_text}."
        if missing_text:
            msg += f" Còn thiếu: {missing_text}."
        if critical_text:
            msg += f" Thiếu kỹ năng bắt buộc: {critical_text}."
        return msg

    reason_parts = []
    if hard_reasons:
        reason_parts.append("; ".join([clean_text(x) for x in hard_reasons if clean_text(x)]))
    if critical_text:
        reason_parts.append(f"Thiếu kỹ năng bắt buộc: {critical_text}")
    if missing_text and not ask_strength:
        reason_parts.append(f"Còn thiếu: {missing_text}")
    reasons = "; ".join([x for x in reason_parts if x]) if reason_parts else "thiếu kỹ năng so với yêu cầu"

    if ask_strength:
        msg = f"Mức phù hợp hiện tại của bạn{title} khoảng {score_text}%. Bạn đang có: {matched_text}."
        if missing_text:
            msg += f" Còn thiếu: {missing_text}."
        if critical_text:
            msg += f" Thiếu kỹ năng bắt buộc: {critical_text}."
        if low_score:
            msg += low_score_advice()
        return msg

    if ask_why:
        msg = f"Lý do chính khiến mức phù hợp{title} chưa cao: {reasons}."
        if low_score:
            msg += low_score_advice()
        return msg

    if ask_improve:
        improve_bits = []
        if critical_text:
            improve_bits.append(f"Thiếu kỹ năng bắt buộc: {critical_text}")
        if missing_text:
            improve_bits.append(f"Còn thiếu: {missing_text}")
        improve_text = "; ".join(improve_bits) if improve_bits else "bổ sung thêm kỹ năng liên quan đến job này"
        msg = f"Để cải thiện cơ hội cho job **{job_title}**, {improve_text}."
        msg += " Nếu bạn muốn, mình có thể lập lộ trình 14 ngày để bạn bám theo."
        return msg

    msg = f"Mức phù hợp hiện tại của bạn{title} khoảng {score_text}%. Lý do chính: {reasons}."
    if matched:
        msg += f" Bạn đang có: {matched_text}."
    if low_score:
        msg += low_score_advice()
    return msg


def count_job_applications(job_id: str, statuses: Optional[List[str]] = None) -> Optional[int]:
    from .rag_service import _to_oid as _oid
    oid = _oid(job_id)
    job_id_clean = clean_text(job_id)
    if not oid and not job_id_clean:
        return None
    query: Dict[str, Any] = {"job_id": {"$in": [oid, job_id_clean]}} if oid else {"job_id": job_id_clean}
    if statuses:
        norm_statuses = [clean_text(s) for s in statuses if clean_text(s)]
        if norm_statuses:
            query["application_status"] = {"$in": norm_statuses}
    try:
        return rag_service.db["applications"].count_documents(query)
    except Exception:
        return None


# ----------------------------
# Candidate handlers
# ----------------------------
def handle_candidate_profile_review(candidate_id: str, question: str, session_id: str):
    sess = rag_service.get_session(session_id) or {}
    history = rag_service.get_history_messages(candidate_id, "candidate", limit=20) or (sess.get("messages") or [])

    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not cand_meta:
        msg = "Mình chưa có dữ liệu CV của bạn trong hệ thống. Hãy ingest_candidates.py hoặc upload CV trước nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_err(msg, 404)

    # Context chunks (optional)
    from .rag_service import _to_oid as _oid
    cand_oid = _oid(candidate_id)
    cand_ctx: List[str] = []
    if cand_oid:
        try:
            cand_chunks = rag_service.fetch_doc_chunks("candidate_profile", "candidate_id", cand_oid, limit=40)
            cand_ctx = rag_service.topk_rerank_texts(question, cand_chunks, k=4)
        except Exception as exc:
            logger.warning("Candidate profile context fetch failed: %s", exc)

    schema_hint = """
{
  "summary": "string",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing_info": ["..."],
  "improvements": ["..."]
}
""".strip()

    prompt = f"""
Bạn là chuyên gia CV & hướng nghiệp. Trả lời tiếng Việt tự nhiên, thân thiện, súc tích.
CHỈ dựa trên FACTS + CONTEXT, không bịa. Nếu thiếu thông tin, liệt kê vào missing_info.

User question: {question}

=== CANDIDATE FACTS ===
- City: {cand_meta.get("city")}
- Job status: {cand_meta.get("job_status")}
- Education level: {cand_meta.get("education_level")}
- Years exp: {cand_meta.get("years_exp")}
- Seniority hint: {cand_meta.get("seniority_hint")}
- Primary skills: {cand_meta.get("primary_skills_known_display") or []}
- Skills known: {cand_meta.get("skills_known_display") or []}

=== CONTEXT (top chunks) ===
{chr(10).join([f"- {x}" for x in cand_ctx])}

=== CHAT HISTORY (latest 6) ===
{chr(10).join([f"{(m.get('role') or '').upper()}: {m.get('content')}" for m in history[-6:] if m.get('content')])}

Output JSON.
""".strip()

    rag_service.append_message(session_id, "user", question)
    answer: Dict[str, Any] = {}
    try:
        answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
        if not isinstance(answer, dict):
            answer = {}
    except Exception as exc:
        logger.error("Candidate profile review LLM failed: %s", exc, exc_info=True)

    def _list(items: Any) -> List[str]:
        if not isinstance(items, list):
            return []
        return [clean_text(x) for x in items if clean_text(x)]

    summary = clean_text(answer.get("summary") or "")
    strengths = _list(answer.get("strengths"))
    weaknesses = _list(answer.get("weaknesses"))
    missing_info = _list(answer.get("missing_info"))
    improvements = _list(answer.get("improvements"))

    parts = []
    parts.append(summary or "Mình đã xem thông tin CV của bạn trong hệ thống.")
    if strengths:
        parts.append(f"Điểm mạnh: {', '.join(strengths[:5])}.")
    if weaknesses:
        parts.append(f"Điểm cần cải thiện: {', '.join(weaknesses[:5])}.")
    if improvements and improvements != weaknesses:
        parts.append(f"Gợi ý cải thiện: {', '.join(improvements[:5])}.")
    if missing_info:
        parts.append(f"Thiếu thông tin: {', '.join(missing_info[:5])}.")

    msg = " ".join([p for p in parts if p]).strip()
    if not msg:
        msg = "Mình đã xem CV của bạn, nhưng hiện chưa đủ dữ liệu để review chi tiết."

    rag_service.append_message(session_id, "assistant", msg)
    return api_ok(
        {
            "view": "candidate_profile_review",
            "result": {"answer": answer, "candidate_id": candidate_id},
            "state": session_to_state(rag_service.get_session(session_id) or {}, 20),
        },
        message=msg,
    )


def handle_candidate_profile_to_jobs(candidate_id: str, question: str, session_id: str, preface: Optional[str] = None):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    prefs = ChatPrefs.from_payload(payload)

    rag_service.append_message(session_id, "user", question)

    sugs = dedupe_jobs(
        rag_service.suggest_jobs_for_candidate(
            candidate_id,
            limit=int(os.getenv("MAX_SUGGESTIONS", "10")),
            query_hint=question,
            prefs=prefs,
        ),
        max_n=10,
    )

    relaxed = False
    if not sugs:
        relaxed = True
        relaxed_prefs = ChatPrefs.from_payload(payload)
        relaxed_prefs.city = ""
        relaxed_prefs.city_norm = ""
        relaxed_prefs.work_location_norm = ""
        relaxed_prefs.avoid_work_location_norm = ""
        relaxed_prefs.role_hint = ""
        relaxed_prefs.salary_min = None
        sugs = dedupe_jobs(
            rag_service.suggest_jobs_for_candidate(
                candidate_id,
                limit=int(os.getenv("MAX_SUGGESTIONS", "10")),
                query_hint=question,
                prefs=relaxed_prefs,
            ),
            max_n=10,
        )

    rag_service.update_session_payload(
        session_id,
        {
            "last_job_suggestions": sugs,
            "last_query": question,
            "last_action": "PROFILE_TO_JOBS",
            "last_suggestions_relaxed": relaxed,
            "selected_job_id": None,
            "selected_job_title": "",
        },
    )

    msg = build_suggest_jobs_message(sugs, "profile_relaxed" if relaxed and sugs else "profile")
    if relaxed and not sugs:
        msg = (
            "Hiện mình chưa thấy job phù hợp từ CV trong dữ liệu. "
            "Bạn cho mình vị trí/khu vực mong muốn để mình tìm tiếp nhé."
        )
    if preface:
        msg = f"{preface}\n{msg}"
    rag_service.append_message(session_id, "assistant", msg)
    return api_ok(
        {"view": "suggest_jobs", "result": {"suggestions": sugs, "from": "profile"}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg,
    )


def handle_candidate_job_search(
    candidate_id: str,
    question: str,
    session_id: str,
    preface: Optional[str] = None,
    context_breaker: bool = False,
):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    prefs = ChatPrefs.from_payload(payload)

    rag_service.append_message(session_id, "user", question)
    last_query = clean_text(payload.get("last_query"))

    query = question if context_breaker else rewrite_followup_query(question, state=payload, last_query=last_query, kind="candidate")

    sugs = dedupe_jobs(rag_service.suggest_jobs(query, limit=int(os.getenv("MAX_SUGGESTIONS", "10")), prefs=prefs), max_n=10)

    if context_breaker and not sugs:
        # relax once
        relaxed_prefs = ChatPrefs.from_payload(payload)
        relaxed_prefs.city = ""
        relaxed_prefs.city_norm = ""
        relaxed_prefs.work_location_norm = ""
        relaxed_prefs.avoid_work_location_norm = ""
        relaxed_prefs.role_hint = ""
        relaxed_prefs.salary_min = None
        sugs = dedupe_jobs(rag_service.suggest_jobs(query, limit=int(os.getenv("MAX_SUGGESTIONS", "10")), prefs=relaxed_prefs), max_n=10)

    rag_service.update_session_payload(
        session_id,
        {"last_job_suggestions": sugs, "last_query": query, "last_action": "JOB_SEARCH", "selected_job_id": None, "selected_job_title": ""},
    )

    msg = build_suggest_jobs_message(sugs, "search")
    if preface:
        msg = f"{preface}\n{msg}"
    rag_service.append_message(session_id, "assistant", msg)
    return api_ok(
        {"view": "suggest_jobs", "result": {"suggestions": sugs, "from": "search", "query": query}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg,
    )


def handle_candidate_select_job(candidate_id: str, pick_index: int, session_id: str):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    sugs = payload.get("last_job_suggestions") or []

    if pick_index < 0 or pick_index >= len(sugs):
        msg = "Số bạn chọn không hợp lệ. Bạn gõ lại kiểu: 'chọn 1' nhé."
        rag_service.append_message(session_id, "user", f"chọn {pick_index+1}")
        rag_service.append_message(session_id, "assistant", msg)
        return api_err(msg, 400)

    selected = sugs[pick_index]
    job_id = clean_text(selected.get("job_id"))
    if not job_id:
        return api_err("Job id không hợp lệ trong suggestions.", 500)

    rag_service.update_session_payload(
        session_id,
        {"selected_job_id": job_id, "selected_job_title": clean_text(selected.get("title") or ""), "last_action": "SELECT_JOB"},
    )
    msg = f"Ok! Bạn đã chọn job **{clean_text(selected.get('title'))}**. Giờ bạn hỏi: 'mình phù hợp bao nhiêu %?', 'thiếu gì?', 'lộ trình 14 ngày', hoặc 'mock interview'."
    rag_service.append_message(session_id, "assistant", msg)
    return api_ok(
        {"view": "job_selected", "result": {"selected_job": selected}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg,
    )


def handle_candidate_job_fit(
    candidate_id: str,
    question: str,
    session_id: str,
    job_id: Optional[str] = None,
    preface: str = "",
):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    history = rag_service.get_history_messages(candidate_id, "candidate", limit=20) or (sess.get("messages") or [])

    job_id = clean_text(job_id or payload.get("selected_job_id"))
    if not job_id:
        msg = "Bạn chưa chọn job. Hãy gõ: 'xem CV tôi tìm job phù hợp' hoặc 'tìm job ...' trước."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_err(msg, 400)

    job_meta = rag_service.get_job_meta(job_id)
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not job_meta or not cand_meta:
        return api_err("Job/Candidate facts not found. Run ingest scripts.", 404)

    if is_non_it_role_question(question):
        msg = "Mình hiện chỉ hỗ trợ tư vấn các job IT/tech trên hệ thống. Các ngành ngoài IT (giáo viên, y tế...) mình chưa hỗ trợ."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if is_salary_question(question):
        title = clean_text(job_meta.get("job_title") or "")
        salary_min, salary_max, currency = get_job_salary_range(job_id)
        if salary_min or salary_max:
            if salary_min and salary_max:
                msg = f"Mức lương dự kiến cho job **{title}**: {_fmt_money(salary_min)}-{_fmt_money(salary_max)} {currency}."
            elif salary_min:
                msg = f"Mức lương tối thiểu cho job **{title}**: {_fmt_money(salary_min)} {currency}."
            else:
                msg = f"Mức lương tối đa cho job **{title}**: {_fmt_money(salary_max)} {currency}."
        else:
            msg = "Mình chưa có thông tin lương của job này trong dữ liệu. Bạn nên hỏi HR khi phỏng vấn."
        rag_service.update_session_payload(session_id, {"last_action": "JOB_INFO"})
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok(
            {"view": "candidate_job_info", "result": {"job_id": job_id, "salary_min": salary_min, "salary_max": salary_max, "currency": currency}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
            message=msg,
        )

    fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate")
    current_state = build_candidate_current_state(candidate_id=candidate_id, session_id=session_id, payload=payload, fit=fit, job_meta=job_meta)
    rag_service.update_session_payload(session_id, {"last_action": "JOB_FIT", "selected_job_id": job_id})

    from .rag_service import _to_oid as _oid
    job_oid = _oid(job_id)
    cand_oid = _oid(candidate_id)

    job_ctx: List[str] = []
    cand_ctx: List[str] = []
    if job_oid:
        try:
            job_chunks = rag_service.fetch_doc_chunks("job", "job_id", job_oid, limit=40)
            job_ctx = rag_service.topk_rerank_texts(question, job_chunks, k=3)
        except Exception:
            job_ctx = []
    if cand_oid:
        try:
            cand_chunks = rag_service.fetch_doc_chunks("candidate_profile", "candidate_id", cand_oid, limit=40)
            cand_ctx = rag_service.topk_rerank_texts(question, cand_chunks, k=3)
        except Exception:
            cand_ctx = []

    prompt = rag_service.build_candidate_prompt(
        question=question,
        job_meta=job_meta,
        cand_meta=cand_meta,
        fit=fit,
        job_ctx=job_ctx,
        cand_ctx=cand_ctx,
        history=history,
        current_state=current_state,
    )
    prompt = f"{build_empathy_prompt()}\n\n{prompt}"

    rag_service.append_message(session_id, "user", question)

    schema_hint = """
{
  "conclusion": "string",
  "fit_score": 0,
  "passed": true,
  "matched": [],
  "missing": [],
  "missing_critical": [],
  "reasons": [],
  "improvements": [],
  "roadmap_14_days": [{"day": 1, "task": "..."}]
}
""".strip()

    answer: Dict[str, Any] = {}
    try:
        answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
        if not isinstance(answer, dict):
            answer = {}
    except Exception as exc:
        logger.error("Candidate job fit LLM failed: %s", exc, exc_info=True)

    msg = clean_text(answer.get("conclusion") or "")
    if not msg or is_generic_fit_reply(msg):
        msg = build_fit_message(question, fit, clean_text(job_meta.get("job_title") or ""))

    # final polish (empathy) but grounded
    msg = build_empathy_message(
        question=question,
        job_meta=job_meta,
        cand_meta=cand_meta,
        fit=fit,
        extra={"current_state": current_state, "preface": preface},
        history=history,
        fallback=msg,
    )
    if preface:
        msg = f"{clean_text(preface)}\n{msg}".strip()

    rag_service.append_message(session_id, "assistant", msg)

    ui = rag_service.build_ui_fit_charts(fit, job_meta, cand_meta)
    return api_ok(
        {"view": "candidate_fit", "result": {"answer": answer, "fit": rag_service._jsonable(fit), "job_id": job_id, "candidate_id": candidate_id}, "ui": ui, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg,
    )


def handle_candidate_roadmap(candidate_id: str, question: str, session_id: str, job_id: Optional[str] = None):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    
    job_id = clean_text(job_id or payload.get("selected_job_id"))
    if not job_id:
        msg = "Bạn chưa chọn job. Gõ: 'tìm job ...' rồi 'chọn 1' trước nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_err(msg, 400)

    job_meta = rag_service.get_job_meta(job_id)
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not job_meta or not cand_meta:
        return api_err("Job/Candidate facts not found.", 404)

    fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate")
    
    # NEW LOGIC: Use LLM for structured roadmap
    if is_llm_enabled():
        prompt = rag_service.build_roadmap_prompt(job_meta, cand_meta, fit)
        schema_hint = """{
          "title": "string",
          "overview": "string",
          "phases": [{"name": "string", "focus": "string", "tasks": ["string"], "resources": ["string"]}],
          "advice": "string"
        }"""
        
        try:
            answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
            if isinstance(answer, dict) and answer.get("phases"):
                msg = f"🗓️ **{clean_text(answer.get('title') or 'Lộ trình học tập')}**\n\n"
                msg += f"{clean_text(answer.get('overview'))}\n\n"
                for p in answer.get("phases", []):
                    tasks = ", ".join([f"- {t}" for t in p.get("tasks", [])])
                    msg += f"**{clean_text(p.get('name'))}**: {clean_text(p.get('focus'))}\n{tasks}\n\n"
                if answer.get("advice"):
                    msg += f"💡 {clean_text(answer.get('advice'))}"
            else:
                 msg = "Xin lỗi, mình chưa tạo được lộ trình chi tiết lúc này. Hãy thử lại sau nhé."
                 answer = {}
        except Exception as exc:
            logger.error("Roadmap LLM failed: %s", exc)
            msg = "Xin lỗi, hệ thống đang bận. Bạn thử lại sau nhé."
            answer = {}
    else:
        # Fallback to old logic if no LLM
        msg = "Chức năng lộ trình chi tiết yêu cầu bật LLM."
        answer = {}

    rag_service.update_session_payload(session_id, {"last_action": "ROADMAP"})
    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)

    return api_ok(
        {"view": "candidate_roadmap", "result": {"job_id": job_id, "roadmap": answer}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg,
    )


def handle_cover_letter_gen(candidate_id: str, question: str, session_id: str, job_id: Optional[str] = None):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    
    job_id = clean_text(job_id or payload.get("selected_job_id"))
    if not job_id:
        msg = "Bạn chưa chọn job. Gõ: 'tìm job ...' rồi 'chọn 1' trước nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_err(msg, 400)

    job_meta = rag_service.get_job_meta(job_id)
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not job_meta or not cand_meta:
        return api_err("Data not found.", 404)

    fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate")

    if is_llm_enabled():
        prompt = rag_service.build_cover_letter_prompt(job_meta, cand_meta, fit)
        # We expect raw markdown text here, not JSON
        try:
            letter_content = llm_service.ask(prompt, question)
            msg = f"✉️ **Thư xin việc gợi ý cho bạn:**\n\n{letter_content}"
        except Exception as exc:
            logger.error("Cover Letter LLM failed: %s", exc)
            msg = "Xin lỗi, mình không thể tạo Cover Letter lúc này."
    else:
        msg = "Chức năng Cover Letter yêu cầu bật LLM."

    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    
    return api_ok(
        {"view": "candidate_general", "result": {"cover_letter": msg}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg
    )


def handle_cv_critique(candidate_id: str, question: str, session_id: str, job_id: Optional[str] = None):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    
    job_id = clean_text(job_id or payload.get("selected_job_id"))
    if not job_id:
        msg = "Bạn chưa chọn job để đối chiếu CV. Hãy chọn job trước nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_err(msg, 400)

    job_meta = rag_service.get_job_meta(job_id)
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not job_meta or not cand_meta:
        return api_err("Data not found.", 404)

    fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate")
    answer = {}

    if is_llm_enabled():
        prompt = rag_service.build_cv_critique_prompt(job_meta, cand_meta, fit)
        schema_hint = """{
            "ats_score": 0.0,
            "summary": "string",
            "issues": [{"type": "string", "detail": "string", "suggestion": "string"}],
            "improvements": ["string"]
        }"""
        try:
            answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
            if isinstance(answer, dict):
                msg = f"📊 **Đánh giá CV (ATS Score: {answer.get('ats_score')}/10)**\n\n"
                msg += f"{clean_text(answer.get('summary'))}\n\n"
                msg += "**Vấn đề cần sửa ngay:**\n"
                for i in answer.get("issues", [])[:3]:
                    msg += f"- ⚠️ {i.get('type')}: {i.get('detail')} -> *Gợi ý: {i.get('suggestion')}*\n"
            else:
                msg = "Không thể phân tích CV lúc này."
        except Exception as exc:
            logger.error("CV Critique LLM failed: %s", exc)
            msg = "Lỗi hệ thống khi phân tích CV."
    else:
        msg = "Chức năng này cần LLM."

    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    
    return api_ok(
        {"view": "candidate_cv_critique", "result": {"critique": answer}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg
    )


def handle_candidate_interview(candidate_id: str, question: str, session_id: str, job_id: Optional[str] = None):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    history = rag_service.get_history_messages(candidate_id, "candidate", limit=20) or (sess.get("messages") or [])

    job_id = clean_text(job_id or payload.get("selected_job_id"))
    if not job_id:
        msg = "Bạn chưa chọn job. Gõ: 'tìm job ...' rồi 'chọn 1' trước nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_err(msg, 400)

    job_meta = rag_service.get_job_meta(job_id)
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not job_meta or not cand_meta:
        return api_err("Job/Candidate facts not found. Run ingest scripts.", 404)

    fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate")
    current_state = build_candidate_current_state(candidate_id=candidate_id, session_id=session_id, payload=payload, fit=fit, job_meta=job_meta)
    pack = rag_service.build_interview_pack(
        job_title=clean_text(job_meta.get("job_title") or ""),
        matched=fit.get("matched") or [],
        missing=fit.get("missing") or [],
        missing_critical=fit.get("missing_critical") or [],
    )

    rag_service.update_session_payload(session_id, {"last_action": "INTERVIEW"})
    rag_service.append_message(session_id, "user", question)

    base_msg = "Ok, mình sẽ đóng vai nhà tuyển dụng. Bạn trả lời lần lượt từng câu; bạn có thể gửi câu trả lời để mình góp ý."
    msg = build_empathy_message(
        question=question,
        job_meta=job_meta,
        cand_meta=cand_meta,
        fit=fit,
        extra={"interview": pack, "current_state": current_state},
        history=history,
        fallback=base_msg,
    )
    rag_service.append_message(session_id, "assistant", msg)

    return api_ok(
        {"view": "candidate_interview", "result": {"job_id": job_id, "candidate_id": candidate_id, "fit": rag_service._jsonable(fit), "interview": pack}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg,
    )


def handle_candidate_competition(candidate_id: str, question: str, session_id: str):
    sess = rag_service.get_session(session_id) or {}
    payload = sess.get("payload") or {}
    history = rag_service.get_history_messages(candidate_id, "candidate", limit=20) or (sess.get("messages") or [])

    job_id = clean_text(payload.get("selected_job_id"))
    if not job_id:
        msg = "Bạn chưa chọn job. Hãy gõ: 'chọn 1' sau khi mình gợi ý job."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    job_meta = rag_service.get_job_meta(job_id)
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not job_meta or not cand_meta:
        return api_err("Job/Candidate facts not found. Run ingest scripts.", 404)

    fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate")
    current_state = build_candidate_current_state(candidate_id=candidate_id, session_id=session_id, payload=payload, fit=fit, job_meta=job_meta)

    q = norm_basic(question or "")
    ask_count = bool(re.search(r"\b(bao nhieu|so luong|da co|co bao nhieu)\b", q))
    ask_rank = bool(re.search(r"\b(top|phan tram|xep hang|hang may)\b", q) or "%" in q)

    total = count_job_applications(job_id)
    sample_limit = int(os.getenv("COMPETITION_SAMPLE_LIMIT", "200"))
    applied_ids = rag_service.get_applied_candidate_ids(job_id, limit=sample_limit) if sample_limit > 0 else []

    lines = ["Mình hiểu bạn đang muốn biết mức cạnh tranh của job này."]
    if total is None:
        lines.append("Hiện mình chưa có dữ liệu số lượng ứng viên ứng tuyển cho job này.")
    elif total == 0:
        lines.append("Hiện job này chưa ghi nhận ứng viên ứng tuyển.")
    else:
        lines.append(f"Hiện job này có khoảng {total} hồ sơ ứng tuyển.")

    percentile = None
    in_pool = candidate_id in applied_ids
    if ask_rank:
        if not in_pool:
            lines.append("Bạn chưa ứng tuyển nên mình chưa thể ước tính top %.")
        else:
            cand_map = rag_service.get_candidates_meta_batch(applied_ids)
            cand_score = float(fit.get("score") or 0.0)
            scored = 0
            higher = 0
            for cid in applied_ids:
                md = cand_map.get(cid)
                if not md:
                    continue
                scored += 1
                other_fit = rag_service.compute_fit(job_meta, md, audience="candidate")
                other_score = float(other_fit.get("score") or 0.0)
                if other_score > cand_score:
                    higher += 1
            if scored > 0:
                percentile = round((1 - (higher / scored)) * 100, 1)
                note = f" (ước tính trên mẫu {scored} hồ sơ)" if total and scored < total else ""
                lines.append(f"Ước tính bạn đang ở top {percentile}%{note}.")
            else:
                lines.append("Hiện chưa đủ dữ liệu để ước tính top %.")

    msg = "\n".join(lines)
    msg = build_empathy_message(
        question=question,
        job_meta=job_meta,
        cand_meta=cand_meta,
        fit=fit,
        extra={"applications_count": total, "sampled_applicants": len(applied_ids), "candidate_percentile": percentile, "in_applicant_pool": in_pool, "current_state": current_state},
        history=history,
        fallback=msg,
    )

    rag_service.update_session_payload(session_id, {"last_action": "COMPETITION"})
    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    return api_ok(
        {"view": "candidate_competition", "result": {"job_id": job_id, "applications_count": total, "sampled_applicants": len(applied_ids), "candidate_percentile": percentile, "in_applicant_pool": in_pool}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg,
    )


def candidate_unknown_fallback(candidate_id: str, question: str, session_id: str, payload: dict) -> str:
    fallback = (
        "Mình chưa rõ ý bạn lắm. Bạn thử nói theo mẫu: "
        "“tìm job backend ở Đà Nẵng remote” hoặc “xem CV tôi tìm job phù hợp”."
    )
    if not is_llm_enabled():
        return fallback

    payload = payload or {}
    history = rag_service.get_history_messages(candidate_id, "candidate", limit=20) or []
    job_id = clean_text(payload.get("selected_job_id") or payload.get("job_id"))
    job_meta = rag_service.get_job_meta(job_id) if job_id else {}
    cand_meta = rag_service.get_candidate_meta(candidate_id) or {}
    fit = rag_service.compute_fit(job_meta, cand_meta, audience="candidate") if job_meta and cand_meta else {}

    current_state = build_candidate_current_state(candidate_id=candidate_id, session_id=session_id, payload=payload, fit=fit, job_meta=job_meta)

    prompt = f"""
{build_empathy_prompt()}

Bạn là Expert Agent cho ứng viên IT, xử lý câu hỏi không rõ (UNKNOWN).
- Nếu câu hỏi ngoài IT hoàn toàn: nói giới hạn hỗ trợ + gợi ý câu hỏi phù hợp.
- Nếu thiếu dữ liệu: dùng câu "Xin lỗi, thông tin này không có trong mô tả công việc, bạn nên hỏi trực tiếp HR khi phỏng vấn" và hỏi thêm 1 câu làm rõ.
- Chỉ dùng FACTS/CONTEXT/CHAT HISTORY. Không được bịa.

User question: {question}

=== CURRENT STATE ===
{json.dumps(current_state, ensure_ascii=False)}

=== JOB FACTS ===
{json.dumps(job_meta or {}, ensure_ascii=False)}

=== CANDIDATE FACTS ===
{json.dumps(cand_meta or {}, ensure_ascii=False)}

=== CHAT HISTORY (latest 6) ===
{chr(10).join([f"{(m.get('role') or '').upper()}: {m.get('content')}" for m in (history or [])[-6:] if m.get('content')])}

Output JSON: {{"message": "string"}}
""".strip()

    schema_hint = '{"message":"string"}'
    try:
        answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
    except Exception:
        return fallback
    if isinstance(answer, dict):
        msg = clean_text(answer.get("message") or "")
        if msg:
            return msg
    return fallback


# ----------------------------
# Recruiter helpers/handlers
# ----------------------------
def is_no_candidates_question(question: str) -> bool:
    q = norm_basic(question)
    triggers = (
        "chua co ung vien",
        "chua co ai ung tuyen",
        "khong co ung vien",
        "khong co ai ung tuyen",
        "co ai ung tuyen",
        "da co ung vien",
        "ung tuyen chua",
        "ung tuyen roi chua",
    )
    return bool(q) and any(t in q for t in triggers)


def candidate_display_name(md: dict) -> str:
    name = md.get("full_name") or md.get("candidate_name") or md.get("name") or md.get("email")
    if name:
        return clean_text(name)
    cid = clean_text(md.get("candidate_id") or "")
    return f"Ứng viên {cid[:6]}" if cid else "Ứng viên"


def parse_years_min(question: str) -> Optional[int]:
    q = norm_basic(question or "")
    if not q:
        return None
    m = re.search(r"\b(tren|hon|>=|tu|toi thieu|it nhat)\s*(\d{1,2})\s*(nam|year)\b", q)
    if m:
        try:
            return int(m.group(2))
        except Exception:
            return None
    if "kinh nghiem" in q:
        m = re.search(r"\b(\d{1,2})\s*(nam|year)\b", q)
        if m:
            try:
                return int(m.group(1))
            except Exception:
                return None
    return None


def extract_screen_filters(question: str) -> Dict[str, Any]:
    city_raw = parse_city_from_text(question) or ""
    city_norm = clean_text(city_raw)
    if city_norm:
        from .facts_layer import normalize_city
        city_norm = normalize_city(city_norm)
    skills_norm = rag_service.skill_norm.detect_in_text(question)
    years_min = parse_years_min(question)
    return {"city_norm": city_norm, "skills_norm": skills_norm, "years_min": years_min}


def build_screening_message(cands: List[dict], skills_norm: List[str], city_norm: str, years_min: Optional[int]) -> str:
    parts = []
    if city_norm:
        parts.append(f"khu vực {city_norm.title()}")
    if years_min is not None:
        parts.append(f"từ {years_min} năm kinh nghiệm")
    if skills_norm:
        skill_display = [rag_service.skill_norm.display_from_norm(s) for s in skills_norm]
        parts.append("kỹ năng " + ", ".join(skill_display))
    criteria = ", ".join(parts) if parts else "tiêu chí hiện tại"

    if not cands:
        return f"Mình chưa tìm thấy ứng viên phù hợp với {criteria}. Bạn có muốn nới điều kiện không?"

    lines = [f"Đây là các ứng viên phù hợp với {criteria}:"]
    for idx, md in enumerate(cands, start=1):
        name = candidate_display_name(md)
        city = clean_text(md.get("city") or "")
        years = md.get("years_exp")
        skills = md.get("skills_known_norm") or []
        primary = md.get("primary_skills_known_norm") or []
        have = {norm_basic(x) for x in (skills + primary) if norm_basic(x)}
        matched = [rag_service.skill_norm.display_from_norm(s) for s in skills_norm if norm_basic(s) in have]
        extra = []
        if years is not None:
            extra.append(f"{years} năm")
        if city:
            extra.append(city)
        suffix = f" ({', '.join(extra)})" if extra else ""
        matched_text = f" - Khớp: {', '.join(matched)}" if matched else ""
        lines.append(f"{idx}. {name}{suffix}{matched_text}")
    return "\n".join(lines)


def parse_candidate_ids_from_text(question: str) -> List[str]:
    return re.findall(r"\b[a-f0-9]{24}\b", (question or "").lower())


def resolve_candidate_ids_from_payload(payload: dict) -> List[str]:
    last_ranked = payload.get("last_ranked") or []
    if last_ranked:
        return [clean_text(x.get("candidate_id")) for x in last_ranked if clean_text(x.get("candidate_id"))]
    return [clean_text(x) for x in (payload.get("candidate_ids") or []) if clean_text(x)]


def parse_compare_indices(question: str) -> Optional[Tuple[int, int]]:
    q = norm_basic(question or "")
    nums = re.findall(r"\b(\d{1,2})\b", q)
    if len(nums) >= 2:
        try:
            return int(nums[0]) - 1, int(nums[1]) - 1
        except Exception:
            return None
    return None


def parse_single_index(question: str) -> Optional[int]:
    q = norm_basic(question or "")
    if "ung vien" not in q and "candidate" not in q:
        return None
    nums = re.findall(r"\b(\d{1,2})\b", q)
    if not nums:
        return None
    try:
        return int(nums[0]) - 1
    except Exception:
        return None


def pick_compare_ids(question: str, payload: dict) -> List[str]:
    ids = parse_candidate_ids_from_text(question)
    if len(ids) >= 2:
        return ids[:2]
    pool = resolve_candidate_ids_from_payload(payload)
    pair = parse_compare_indices(question)
    if pair and len(pool) > max(pair):
        return [pool[pair[0]], pool[pair[1]]]
    if len(pool) >= 2:
        return pool[:2]
    return []


def pick_single_candidate_id(question: str, payload: dict) -> Optional[str]:
    ids = parse_candidate_ids_from_text(question)
    if ids:
        return ids[0]
    pool = resolve_candidate_ids_from_payload(payload)
    idx = parse_single_index(question)
    if idx is not None and idx < len(pool):
        return pool[idx]
    if len(pool) == 1:
        return pool[0]
    return None


def build_compare_message(job_title: str, a_md: dict, b_md: dict, a_fit: dict, b_fit: dict) -> str:
    a_name = candidate_display_name(a_md)
    b_name = candidate_display_name(b_md)
    a_score = a_fit.get("score")
    b_score = b_fit.get("score")
    a_missing = ", ".join((a_fit.get("missing_critical") or [])[:3])
    b_missing = ", ".join((b_fit.get("missing_critical") or [])[:3])
    a_match = ", ".join((a_fit.get("matched") or [])[:4])
    b_match = ", ".join((b_fit.get("matched") or [])[:4])
    verdict = a_name if (a_score or 0) >= (b_score or 0) else b_name
    return "\n".join(
        [
            f"So sánh {a_name} và {b_name} cho job **{job_title}**:",
            f"- {a_name}: điểm phù hợp {a_score}%, mạnh: {a_match or 'chưa rõ'}; thiếu bắt buộc: {a_missing or 'không'}",
            f"- {b_name}: điểm phù hợp {b_score}%, mạnh: {b_match or 'chưa rõ'}; thiếu bắt buộc: {b_missing or 'không'}",
            f"Kết luận: {verdict} phù hợp hơn theo tiêu chí hiện tại.",
        ]
    )


def get_recruiter_record_by_user(user_id: str) -> Optional[dict]:
    if not user_id:
        return None
    from .rag_service import _to_oid as _oid
    oid = _oid(user_id)
    if not oid:
        return None
    db = get_database()
    return db.get_collection("recruiters").find_one({"user_id": oid})


def get_candidate_record_by_user(user_id: str) -> Optional[dict]:
    if not user_id:
        return None
    from .rag_service import _to_oid as _oid
    oid = _oid(user_id)
    if not oid:
        return None
    db = get_database()
    return db.get_collection("candidates").find_one({"user_id": oid})


def list_recruiter_jobs(recruiter_id: Any, limit: int = 20) -> List[dict]:
    db = get_database()
    cur = db.get_collection("jobs").find({"recruiter_id": recruiter_id}).sort("created_at", -1).limit(limit)
    out = []
    for j in cur:
        location = j.get("location") or {}
        out.append(
            {
                "job_id": str(j.get("_id")),
                "title": j.get("title"),
                "company": None,
                "city": location.get("city"),
                "work_location": j.get("work_location"),
                "job_type": j.get("job_type"),
                "status": j.get("status"),
                "is_active": j.get("is_active"),
                "created_at": j.get("created_at"),
            }
        )
    return out


def build_recruiter_jobs_message(jobs: List[dict]) -> str:
    if not jobs:
        return "Bạn chưa có job nào. Hãy đăng tin trước nhé."
    return f"Bạn có {len(jobs)} job. Hãy chọn 1 (gõ: 'chọn 1') để tiếp tục."


def build_recruiter_top5(ranked: List[dict]) -> List[dict]:
    out = []
    for r in ranked[:5]:
        reasons: List[str] = []
        hard_reasons = [clean_text(x) for x in (r.get("hard_reasons") or []) if clean_text(x)]
        missing_critical = [clean_text(x) for x in (r.get("missing_critical") or []) if clean_text(x)]
        if hard_reasons:
            reasons.extend(hard_reasons)
        if missing_critical:
            reasons.append("Thiếu kỹ năng bắt buộc: " + ", ".join(missing_critical))
        if not reasons:
            reasons.append("Phù hợp tổng thể.")
        out.append({"candidate_id": r.get("candidate_id"), "score": r.get("score", 0), "passed": r.get("passed", False), "why": "; ".join(reasons)})
    return out


def handle_recruiter_screen(question: str, session_id: str, payload: dict):
    filters = extract_screen_filters(question)
    skills_norm = filters.get("skills_norm") or []
    city_norm = filters.get("city_norm") or ""
    years_min = filters.get("years_min")

    if not skills_norm and not city_norm and years_min is None:
        msg = "Bạn muốn lọc ứng viên theo tiêu chí nào? Ví dụ: 'ứng viên trên 3 năm Java ở Hải Phòng'."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_screen", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    cands = rag_service.screen_candidates_by_metadata(skills_norm=skills_norm, city_norm=city_norm, years_min=years_min, limit=20)

    formatted = []
    for md in cands:
        skills = md.get("skills_known_norm") or []
        primary = md.get("primary_skills_known_norm") or []
        have = {norm_basic(x) for x in (skills + primary) if norm_basic(x)}
        matched = [rag_service.skill_norm.display_from_norm(s) for s in skills_norm if norm_basic(s) in have]
        missing = [rag_service.skill_norm.display_from_norm(s) for s in skills_norm if norm_basic(s) not in have]
        formatted.append({"candidate_id": str(md.get("candidate_id") or ""), "full_name": candidate_display_name(md), "years_exp": md.get("years_exp"), "city": md.get("city"), "matched": matched, "missing": missing})

    msg = build_screening_message(cands, skills_norm, city_norm, years_min)
    rag_service.update_session_payload(session_id, {"last_screen_filters": filters, "last_screen_results": [x.get("candidate_id") for x in cands]})
    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    return api_ok({"view": "recruiter_screen", "result": {"filters": filters, "candidates": formatted}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)


def handle_recruiter_compare(job_id: str, question: str, session_id: str, payload: dict):
    if not job_id:
        msg = "Bạn chưa chọn job để so sánh. Hãy chọn job trước nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    ids = pick_compare_ids(question, payload)
    if len(ids) < 2:
        msg = "Bạn muốn so sánh ứng viên nào? Ví dụ: 'so sánh ứng viên 1 và 2'."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    job_meta = rag_service.get_job_meta(job_id)
    if not job_meta:
        return api_err("Job facts not found. Run ingest_jobs.py", 404)

    # 1. Fetch metadata
    candidates_meta = rag_service.get_candidates_meta_batch(ids)
    if len(candidates_meta) < 2:
        msg = "Không đủ dữ liệu ứng viên để so sánh."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    # 2. Compute fits
    fits = {}
    for cid, md in candidates_meta.items():
        fits[cid] = rag_service.compute_fit(job_meta, md, audience="recruiter")

    # 3. LLM Deep Compare
    if str(os.getenv("LLM_ENABLED", "true")).lower() == "true":
        prompt = rag_service.build_recruiter_compare_prompt(question, job_meta, candidates_meta, fits)
        schema_hint = """{
          "comparison_table": [{"criteria": "string", "candidate_a": "string", "candidate_b": "string"}],
          "analysis": [{"candidate_id": "string", "pros": ["string"], "cons": ["string"]}],
          "conclusion": "string",
          "recommendation": "string"
        }"""
        
        try:
            answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
            
            # Format message from LLM result
            if isinstance(answer, dict) and answer.get("conclusion"):
                msg = clean_text(answer.get("conclusion"))
                if answer.get("recommendation"):
                    msg += f"\n\n💡 {clean_text(answer['recommendation'])}"
            else:
                # Fallback message
                msg = build_compare_message(clean_text(job_meta.get("job_title") or ""), 
                                         candidates_meta.get(ids[0], {}), 
                                         candidates_meta.get(ids[1], {}), 
                                         fits.get(ids[0], {}), 
                                         fits.get(ids[1], {}))
        except Exception as exc:
            logger.error("Deep compare LLM failed: %s", exc)
            msg = build_compare_message(clean_text(job_meta.get("job_title") or ""), 
                                     candidates_meta.get(ids[0], {}), 
                                     candidates_meta.get(ids[1], {}), 
                                     fits.get(ids[0], {}), 
                                     fits.get(ids[1], {}))
            answer = {}
    else:
         msg = build_compare_message(clean_text(job_meta.get("job_title") or ""), 
                                  candidates_meta.get(ids[0], {}), 
                                  candidates_meta.get(ids[1], {}), 
                                  fits.get(ids[0], {}), 
                                  fits.get(ids[1], {}))
         answer = {}

    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    
    return api_ok({
        "view": "recruiter_compare", 
        "result": {
            "job_id": job_id, 
            "candidate_ids": ids, 
            "answer": answer,  # Rich data for UI
            "compare": {
                "candidate_a": {"candidate_id": ids[0], "fit": fits.get(ids[0])},
                "candidate_b": {"candidate_id": ids[1], "fit": fits.get(ids[1])}
            }
        }, 
        "state": session_to_state(rag_service.get_session(session_id) or {}, 20)
    }, message=msg)


def handle_recruiter_interview_prep(job_id: str, question: str, session_id: str, payload: dict):
    if not job_id:
        msg = "Bạn chưa chọn job để chuẩn bị phỏng vấn. Hãy chọn job trước nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    candidate_id = pick_single_candidate_id(question, payload)
    job_meta = rag_service.get_job_meta(job_id) or {}
    if not job_meta:
        return api_err("Job facts not found. Run ingest_jobs.py", 404)

    # Generic pack if no candidate selected
    if not candidate_id:
        required = job_meta.get("job_required_skills_known_display") or []
        critical = job_meta.get("job_critical_skills_display") or []
        focus = [clean_text(x) for x in (critical or required) if clean_text(x)] or ["System design", "Behavioral", "Project deep dive"]
        pack = rag_service.build_interview_pack(job_title=clean_text(job_meta.get("job_title") or ""), matched=[], missing=focus, missing_critical=focus[:3])
        questions = pack.get("questions") or []
        msg_lines = ["Bạn chưa chọn ứng viên cụ thể, mình soạn trước bộ câu hỏi theo JD:"]
        for q in questions[:5]:
            msg_lines.append(f"- {q.get('question')}")
        msg = "\n".join(msg_lines)
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_interview_prep", "result": {"job_id": job_id, "candidate_id": None, "questions": questions[:5]}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    # Candidate specific
    cand_meta = rag_service.get_candidate_meta(candidate_id)
    if not cand_meta:
        return api_err("Candidate facts not found. Run ingest_candidates.py", 404)

    fit = rag_service.compute_fit(job_meta, cand_meta, audience="recruiter")
    
    # Try LLM Generation
    questions = []
    llm_success = False
    
    if str(os.getenv("LLM_ENABLED", "true")).lower() == "true":
        prompt = rag_service.build_recruiter_interview_prompt(question, job_meta, cand_meta, fit)
        schema_hint = """{
            "intro": "string",
            "questions": [{"focus": "string", "question": "string", "rubric": ["string"]}]
        }"""
        try:
            answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
            if isinstance(answer, dict) and answer.get("questions"):
                questions = answer["questions"]
                msg = clean_text(answer.get("intro") or "Dưới đây là bộ câu hỏi phỏng vấn đề xuất:")
                llm_success = True
        except Exception as exc:
            logger.error("Interview gen LLM failed: %s", exc)

    # Fallback to static if LLM failed or disabled
    if not questions:
        pack = rag_service.build_interview_pack(
            job_title=clean_text(job_meta.get("job_title") or ""), 
            matched=fit.get("matched") or [], 
            missing=fit.get("missing") or [], 
            missing_critical=fit.get("missing_critical") or []
        )
        questions = pack.get("questions") or []
        msg = "Hệ thống tự động gợi ý câu hỏi dựa trên kỹ năng còn thiếu:"

    # Format text response
    msg_lines = [msg]
    for i, q in enumerate(questions[:5], 1):
        q_text = q.get('question')
        msg_lines.append(f"{i}. {q_text}")
    
    final_msg = "\n".join(msg_lines)

    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", final_msg)
    
    return api_ok({
        "view": "recruiter_interview_prep", 
        "result": {
            "job_id": job_id, 
            "candidate_id": candidate_id, 
            "fit": fit, 
            "questions": questions,
            "llm_generated": llm_success
        }, 
        "state": session_to_state(rag_service.get_session(session_id) or {}, 20)
    }, message=final_msg)


def handle_recruiter_rank(
    job_id: str,
    candidate_ids: List[str],
    question: str,
    session_id: str,
    ttl_minutes: int,
    recruiter_user_id: Optional[str] = None,
    preface: str = "",
):
    sess = rag_service.get_session(session_id) if session_id else None
    if not sess:
        payload = {"job_id": job_id, "candidate_ids": candidate_ids, "recruiter_user_id": recruiter_user_id}
        s = rag_service.start_session("recruiter", payload, ttl_minutes=ttl_minutes)
        session_id = s["session_id"]
        sess = rag_service.get_session(session_id)

    payload = (sess or {}).get("payload") or {}
    recruiter_user_id = clean_text(payload.get("recruiter_user_id") or "")
    history = rag_service.get_history_messages(recruiter_user_id, "recruiter", limit=20) or (sess or {}).get("messages") or []

    job_meta = rag_service.get_job_meta(job_id)
    if not job_meta:
        return api_err("Job facts not found. Run ingest_jobs.py", 404)

    cand_map = rag_service.get_candidates_meta_batch(candidate_ids)

    ranked = []
    for cid in candidate_ids:
        cm = cand_map.get(clean_text(cid))
        if not cm:
            continue
        fit = rag_service.compute_fit(job_meta, cm, audience="recruiter")
        ranked.append(
            {"candidate_id": clean_text(cid), "score": fit.get("score", 0), "passed": fit.get("passed", False), "hard_reasons": fit.get("hard_reasons", []), "missing_critical": fit.get("missing_critical", []), "years_exp": cm.get("years_exp"), "city": cm.get("city"), "job_status": cm.get("job_status")}
        )

    ranked.sort(key=lambda x: float(x.get("score") or 0), reverse=True)

    prompt = rag_service.build_recruiter_prompt(question=question, job_meta=job_meta, ranked=ranked, history=history)
    rag_service.append_message(session_id, "user", question)

    schema_hint = """
{
  "top5": [{"candidate_id":"...", "score":0, "passed":true, "why":"..."}],
  "compare_top1_top2": "string",
  "notes": []
}
""".strip()

    answer: Dict[str, Any] = {}
    try:
        answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
        if not isinstance(answer, dict):
            answer = {}
    except Exception as exc:
        logger.error("Recruiter ranking LLM failed: %s", exc, exc_info=True)
        answer = {}

    answer["top5"] = build_recruiter_top5(ranked)
    if not isinstance(answer.get("notes"), list):
        answer["notes"] = []

    top5 = answer.get("top5") or []
    msg_lines = []
    if preface:
        msg_lines.append(clean_text(preface))
    if top5:
        msg_lines.append("Mình đã xếp hạng ứng viên theo dữ liệu hiện có. Top phù hợp nhất:")
        for idx, item in enumerate(top5, start=1):
            cid = clean_text(item.get("candidate_id") or "")
            cm = cand_map.get(cid) or {}
            name = candidate_display_name(cm) if cm else f"Ứng viên {cid[:6] or idx}"
            try:
                score_pct = float(item.get("score", 0)) * 100
            except Exception:
                score_pct = 0.0
            score_text = f"{score_pct:.1f}".rstrip("0").rstrip(".")
            status = "Đạt" if item.get("passed") else "Chưa đạt"
            why = clean_text(item.get("why") or "")
            msg_lines.append(f"{idx}. {name} - {score_text}% ({status}). {why}".strip())
    else:
        msg_lines.append("Mình đã xếp hạng ứng viên theo job này.")

    msg = "\n".join([x for x in msg_lines if x]).strip()
    rag_service.update_session_payload(session_id, {"last_ranked": ranked[:50]})
    rag_service.append_message(session_id, "assistant", msg)

    return api_ok({"view": "recruiter_ranking", "result": {"job_id": job_id, "candidate_ids": candidate_ids, "answer": answer, "ranked": ranked[:50]}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)


def handle_recruiter_generate_jd(question: str, session_id: str):
    sess = rag_service.get_session(session_id) or {}
    
    # Extract keywords (naive)
    keywords = question
    # remove trigger words
    keywords = re.sub(r"\b(soạn|viết|tạo|mô tả|jd|job description)\b", "", keywords, flags=re.I).strip()
    
    if not keywords or len(keywords) < 3:
        msg = "Bạn muốn viết JD cho vị trí nào? Hãy cung cấp thêm thông tin (VD: 'soạn JD cho Python Dev 3 năm kinh nghiệm')."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if str(os.getenv("LLM_ENABLED", "true")).lower() != "true":
        # Fallback dummy JD if LLM disabled
        answer = {
            "job_title": f"Dự thảo JD từ {keywords}",
            "summary": f"Mô tả công việc cho {keywords} (bản nháp hệ thống)",
            "responsibilities": ["Phát triển tính năng", "Review code", "Viết test", "Hỗ trợ team"],
            "requirements": ["Kinh nghiệm liên quan", "Kỹ năng giao tiếp", "Chủ động"],
            "benefits": ["Bảo hiểm đầy đủ", "Lương cạnh tranh"],
            "call_to_action": "Gửi CV ngay!"
        }
    else:
        prompt = rag_service.build_jd_generation_prompt(keywords)
        schema_hint = """{
          "job_title": "string",
          "summary": "string",
          "responsibilities": ["string"],
          "requirements": ["string"],
          "benefits": ["string"],
          "call_to_action": "string"
        }"""
        
        answer = {}
        try:
            answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
        except Exception as exc:
            logger.error("JD Gen failed: %s", exc)
            answer = {}

    msg = ""
    if isinstance(answer, dict) and answer.get("job_title"):
        msg = f"📋 **Dự thảo JD: {answer.get('job_title')}**\n\n"
        msg += f"**Tóm tắt:** {answer.get('summary')}\n\n"
        msg += "**Trách nhiệm:**\n" + "\n".join([f"- {x}" for x in answer.get("responsibilities", [])]) + "\n\n"
        msg += "**Yêu cầu:**\n" + "\n".join([f"- {x}" for x in answer.get("requirements", [])]) + "\n\n"
        msg += "**Quyền lợi:**\n" + "\n".join([f"- {x}" for x in answer.get("benefits", [])])
    else:
        msg = "Xin lỗi, mình chưa tạo được JD lúc này."

    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    
    return api_ok(
        {"view": "recruiter_jd_gen", "result": {"jd": answer}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg
    )


def handle_recruiter_outreach(question: str, session_id: str, payload: dict, intent_override: Optional[str] = None):
    # Determine intent type
    q = question.lower()
    intent_type = intent_override or "CONTACT"
    if not intent_override:
        if "từ chối" in q or "tu choi" in q or "reject" in q:
            intent_type = "REJECT"
        elif "mời" in q or "moi" in q or "phỏng vấn" in q or "interview" in q:
            intent_type = "INVITE"
        elif "offer" in q:
            intent_type = "OFFER"
    
    # Check context (candidate_ids or specific candidate)
    cand_ids = payload.get("candidate_ids") or []
    if not cand_ids:
         msg = "Bạn chưa chọn ứng viên nào để gửi mail. Hãy chọn ứng viên từ danh sách trước."
         rag_service.append_message(session_id, "user", question)
         rag_service.append_message(session_id, "assistant", msg)
         return api_err(msg, 400)
    
    target_cid = cand_ids[0] # Pick first for now
    
    job_id = payload.get("job_id")
    job_meta = (rag_service.get_job_meta(job_id) or {}) if job_id else {}
    cand_meta = rag_service.get_candidate_meta(target_cid) or {}

    # Extract time for schedule if any
    extra_context = question
    
    prompt = rag_service.build_outreach_email_prompt(job_meta, cand_meta, intent_type, extra_context)
    schema_hint = """{"subject": "string", "body": "string", "note": "string"}"""
    
    answer = {}
    if str(os.getenv("LLM_ENABLED", "true")).lower() != "true":
        # Fallback dummy email
        answer = {
            "subject": f"Thư {intent_type} - {job_meta.get('job_title', 'Vị trí')}",
            "body": f"Chào {cand_meta.get('full_name', 'bạn')},\n\nĐây là email mẫu ({intent_type}) do hệ thống tạo tự động vì LLM đang tắt.\n\nTrân trọng,\n{job_meta.get('job_company_name', 'Công ty')}",
            "note": "Bản nháp tự động (LLM Disabled)"
        }
    else:
        try:
            answer = llm_service.ask_json(prompt, question, schema_hint=schema_hint, max_repair=1)
        except Exception as exc:
            logger.error("Outreach Email failed: %s", exc)
            answer = {}

    msg = ""
    if isinstance(answer, dict) and answer.get("subject"):
        msg = f"📧 **Email Draft ({intent_type})**\n\n"
        msg += f"**Subject:** {answer.get('subject')}\n\n"
        msg += f"{answer.get('body')}\n\n"
        if answer.get("note"):
            msg += f"_(Note: {answer.get('note')})_"
    else:
        msg = "Không thể soạn email lúc này."

    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    
    return api_ok(
        {"view": "recruiter_outreach", "result": {"email": answer, "candidate_id": target_cid, "type": intent_type}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)},
        message=msg
    )


# ----------------------------
# Routes
# ----------------------------
@app.get("/health")
def health():
    return api_ok({"status": "ok"})


@app.post("/api/ai/candidate/chat/general")
@protect
@authorize("candidate", "admin")
def candidate_chat_general():
    body = request.get_json(force=True, silent=True) or {}
    candidate_id = clean_text(body.get("candidate_id"))
    question = clean_text(body.get("question"))
    session_id = clean_text(body.get("session_id"))

    if not candidate_id:
        return api_err("candidate_id required", 400)
    if not question:
        return api_err("question required", 400)

    ttl_minutes = int(body.get("ttl_minutes") or 45)

    # session reuse (guard wrong owner/kind)
    sess = rag_service.get_session(session_id) if session_id else None
    if sess:
        payload0 = sess.get("payload") or {}
        if sess.get("kind") != "candidate" or (clean_text(payload0.get("candidate_id")) and clean_text(payload0.get("candidate_id")) != candidate_id):
            sess = None
            session_id = ""

    if not sess:
        s = rag_service.start_session("candidate", {"candidate_id": candidate_id, "mode": "candidate_general"}, ttl_minutes=ttl_minutes)
        session_id = s["session_id"]
        sess = rag_service.get_session(session_id)

    payload = (sess or {}).get("payload") or {}
    if payload.get("candidate_id") != candidate_id:
        payload["candidate_id"] = candidate_id

    # update prefs (rules + optional llm)
    rule_patch = extract_prefs_rule(question)
    llm_patch = extract_prefs_llm(llm_service, question, old_prefs=(payload.get("prefs") or {}))
    payload = merge_prefs(payload, {**rule_patch, **llm_patch})
    prefs_obj = ChatPrefs.from_payload(payload)
    payload["prefs"] = prefs_obj.to_dict()
    rag_service.update_session_payload(session_id, payload)

    intent = route_candidate_intent(question, payload, llm=llm_service)
    it = (intent.get("intent") or "UNKNOWN").upper()

    # light intents
    if it == "GREETING":
        msg = friendly_menu()
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "THANKS":
        msg = thanks_reply(clean_text(payload.get("selected_job_title") or ""))
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "GOODBYE":
        msg = goodbye_reply()
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "ACK":
        msg = "Ok 👍 Bạn muốn mình làm tiếp gì? (review CV / tìm job / chấm fit / lộ trình 14 ngày / mock interview)"
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "RESET":
        s = rag_service.start_session("candidate", {"candidate_id": candidate_id, "mode": "candidate_general"}, ttl_minutes=ttl_minutes)
        session_id = s["session_id"]
        msg = "Ok mình đã reset phiên chat.\n" + friendly_menu()
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "PROFILE_REVIEW":
        return handle_candidate_profile_review(candidate_id, question, session_id)

    if it == "PROFILE_TO_JOBS":
        preface = None
        if intent.get("context_breaker"):
            title = clean_text(payload.get("selected_job_title"))
            preface = f"Được, mình tạm gác job **{title}** qua một bên. Dưới đây là các job khác phù hợp với bạn:" if title else "Được, mình sẽ tìm danh sách job khác phù hợp với bạn:"
        return handle_candidate_profile_to_jobs(candidate_id, question, session_id, preface=preface)

    if it == "JOB_SEARCH":
        preface = None
        if intent.get("context_breaker"):
            title = clean_text(payload.get("selected_job_title"))
            preface = f"Được, mình tạm gác job **{title}** qua một bên. Dưới đây là các job khác phù hợp với bạn:" if title else "Được, mình sẽ tìm danh sách job khác phù hợp với bạn:"
        return handle_candidate_job_search(candidate_id, question, session_id, preface=preface, context_breaker=bool(intent.get("context_breaker")))

    if it == "SELECT_JOB":
        sugs = (rag_service.get_session(session_id) or {}).get("payload", {}).get("last_job_suggestions") or []
        pick_index = intent.get("pick_index")

        # auto pick if user says "chọn" but no index (or ACK after suggestions)
        if pick_index is None and intent.get("auto_pick"):
            if not sugs:
                prefs = ChatPrefs.from_payload(payload)
                sugs = dedupe_jobs(rag_service.suggest_jobs_for_candidate(candidate_id, limit=int(os.getenv("MAX_SUGGESTIONS", "10")), query_hint="", prefs=prefs), max_n=10)
                rag_service.update_session_payload(session_id, {"last_job_suggestions": sugs})
            best_idx = pick_best_suggestion(candidate_id, sugs)
            if best_idx is None:
                msg = build_suggest_jobs_message(sugs, "profile")
                rag_service.append_message(session_id, "user", question)
                rag_service.append_message(session_id, "assistant", msg)
                return api_ok({"view": "suggest_jobs", "result": {"suggestions": sugs, "from": "profile"}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)
            return handle_candidate_select_job(candidate_id, best_idx, session_id)

        if pick_index is None:
            msg = "Bạn muốn chọn job số mấy? Gõ: 'chọn 1' đến 'chọn N' (N là số job mình đã gợi ý)."
            rag_service.append_message(session_id, "user", question)
            rag_service.append_message(session_id, "assistant", msg)
            return api_ok({"view": "candidate_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

        return handle_candidate_select_job(candidate_id, int(pick_index), session_id)

    if it == "CHANGE_JOB":
        rag_service.update_session_payload(session_id, {"selected_job_id": None, "selected_job_title": ""})
        msg = "Được, mình tạm gác job hiện tại. Bạn nói tiêu chí mới nhé (vị trí/khu vực/remote)."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "candidate_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "JOB_FIT":
        # allow preface from intent (when selecting by number + asking fit)
        preface = clean_text(intent.get("preface") or "")
        return handle_candidate_job_fit(candidate_id, question, session_id, preface=preface)

    if it == "ROADMAP":
        return handle_candidate_roadmap(candidate_id, question, session_id)

    if it == "COVER_LETTER":
        return handle_cover_letter_gen(candidate_id, question, session_id)

    if it == "CV_CRITIQUE":
        return handle_cv_critique(candidate_id, question, session_id)

    if it == "ROADMAP":
        return handle_candidate_roadmap(candidate_id, question, session_id)

    if it == "INTERVIEW":
        return handle_candidate_interview(candidate_id, question, session_id)

    if it == "COMPETITION":
        return handle_candidate_competition(candidate_id, question, session_id)

    # UNKNOWN
    msg = candidate_unknown_fallback(candidate_id, question, session_id, payload)
    rag_service.append_message(session_id, "user", question)
    rag_service.append_message(session_id, "assistant", msg)
    return api_ok({"view": "candidate_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)


@app.post("/api/ai/candidate/chat/fit")
@protect
@authorize("candidate", "admin")
def candidate_chat_fit():
    body = request.get_json(force=True, silent=True) or {}
    candidate_id = clean_text(body.get("candidate_id"))
    job_id = clean_text(body.get("job_id"))
    question = clean_text(body.get("question"))
    session_id = clean_text(body.get("session_id"))

    if not candidate_id or not job_id or not question:
        return api_err("candidate_id, job_id, question required", 400)

    ttl_minutes = int(body.get("ttl_minutes") or 45)

    sess = rag_service.get_session(session_id) if session_id else None
    if sess:
        payload = sess.get("payload") or {}
        if sess.get("kind") != "candidate" or (clean_text(payload.get("candidate_id")) and clean_text(payload.get("candidate_id")) != candidate_id):
            sess = None
            session_id = ""

    if not sess:
        s = rag_service.start_session("candidate", {"candidate_id": candidate_id, "selected_job_id": job_id, "mode": "candidate_fit"}, ttl_minutes=ttl_minutes)
        session_id = s["session_id"]
    else:
        rag_service.update_session_payload(session_id, {"selected_job_id": job_id, "candidate_id": candidate_id})

    return handle_candidate_job_fit(candidate_id, question, session_id, job_id=job_id)


@app.get("/api/ai/candidate/chat/history")
@protect
@authorize("candidate", "admin")
def candidate_chat_history():
    args = request.args or {}
    candidate_id = clean_text(args.get("candidate_id"))
    if not candidate_id and os.getenv("AUTH_ENABLED", "false").lower() == "true":
        user = getattr(g, "user", None)
        if user:
            cand = get_candidate_record_by_user(user.get("id"))
            if cand:
                candidate_id = clean_text(cand.get("_id"))
    if not candidate_id:
        return api_err("candidate_id required", 400)

    limit_raw = args.get("limit") or os.getenv("CHAT_HISTORY_API_LIMIT", "200")
    try:
        limit = int(limit_raw)
    except Exception:
        limit = 200
    limit = max(1, min(limit, 1000))

    messages = rag_service.get_history_messages(candidate_id, "candidate", limit=limit)
    return api_ok({"owner_id": candidate_id, "kind": "candidate", "messages": messages})


@app.get("/api/ai/recruiter/chat/history")
@protect
@authorize("recruiter", "admin")
def recruiter_chat_history():
    args = request.args or {}
    recruiter_user_id = clean_text(args.get("recruiter_user_id"))
    if os.getenv("AUTH_ENABLED", "false").lower() == "true":
        user = getattr(g, "user", None)
        if user:
            recruiter_user_id = clean_text(user.get("id"))
    if not recruiter_user_id:
        return api_err("recruiter_user_id required", 400)

    limit_raw = args.get("limit") or os.getenv("CHAT_HISTORY_API_LIMIT", "200")
    try:
        limit = int(limit_raw)
    except Exception:
        limit = 200
    limit = max(1, min(limit, 1000))

    messages = rag_service.get_history_messages(recruiter_user_id, "recruiter", limit=limit)
    return api_ok({"owner_id": recruiter_user_id, "kind": "recruiter", "messages": messages})


@app.post("/api/ai/recruiter/chat/general")
@protect
@authorize("recruiter", "admin")
def recruiter_chat_general():
    body = request.get_json(force=True, silent=True) or {}
    job_id = clean_text(body.get("job_id"))
    candidate_ids = body.get("candidate_ids") or []
    use_applications = str(body.get("use_applications") or os.getenv("RECRUITER_USE_APPLICATIONS", "true")).lower() == "true"
    application_statuses = body.get("application_statuses") or []
    question = clean_text(body.get("question"))
    session_id = clean_text(body.get("session_id"))
    ttl_minutes = int(body.get("ttl_minutes") or 45)

    if not question:
        return api_err("question required", 400)

    if not isinstance(candidate_ids, list):
        candidate_ids = []
    if not isinstance(application_statuses, list):
        application_statuses = []

    recruiter_user_id = None
    if os.getenv("AUTH_ENABLED", "false").lower() == "true":
        user = getattr(g, "user", None)
        if user:
            recruiter_user_id = clean_text(user.get("id"))
    if not recruiter_user_id:
        recruiter_user_id = clean_text(body.get("recruiter_user_id") or body.get("user_id") or body.get("recruiter_id"))

    # session reuse guard
    sess = rag_service.get_session(session_id) if session_id else None
    if sess:
        payload0 = sess.get("payload") or {}
        if sess.get("kind") != "recruiter" or (recruiter_user_id and clean_text(payload0.get("recruiter_user_id")) and clean_text(payload0.get("recruiter_user_id")) != recruiter_user_id):
            sess = None
            session_id = ""

    if not sess:
        s = rag_service.start_session("recruiter", {"mode": "recruiter_general", "recruiter_user_id": recruiter_user_id}, ttl_minutes=ttl_minutes)
        session_id = s["session_id"]
        sess = rag_service.get_session(session_id)

    payload = (sess or {}).get("payload") or {}
    if recruiter_user_id and not payload.get("recruiter_user_id"):
        payload["recruiter_user_id"] = recruiter_user_id
    if job_id:
        payload["job_id"] = job_id
    if candidate_ids:
        payload["candidate_ids"] = candidate_ids
    rag_service.update_session_payload(session_id, payload)

    intent = route_recruiter_intent(question, payload, llm=llm_service)
    it = (intent.get("intent") or "UNKNOWN").upper()

    if it == "THANKS":
        job_title = clean_text(payload.get("selected_job_title") or "")
        if not job_title and job_id:
            job_meta = rag_service.get_job_meta(job_id) or {}
            job_title = clean_text(job_meta.get("job_title"))
        msg = recruiter_thanks_reply(job_title)
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "GOODBYE":
        msg = goodbye_reply()
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "ACK":
        msg = "Ok 👍 Bạn muốn mình làm tiếp gì? (xếp hạng top / so sánh ứng viên / gợi ý câu hỏi phỏng vấn)"
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "result": {"intent": intent}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "SCREEN_CANDIDATES":
        return handle_recruiter_screen(question, session_id, payload)

    # Job selection flow: if no job_id, list recruiter's jobs
    job_id = clean_text(payload.get("job_id") or job_id)

    if not job_id:
        recruiter = get_recruiter_record_by_user(recruiter_user_id) if recruiter_user_id else None
        if not recruiter:
            return api_err("Không tìm thấy hồ sơ nhà tuyển dụng.", 404)

        job_limit = int(os.getenv("RECRUITER_JOB_LIMIT", "20"))
        jobs = list_recruiter_jobs(recruiter.get("_id"), limit=job_limit)
        company_name = recruiter.get("company_name")
        if company_name:
            for j in jobs:
                j["company"] = company_name

        rag_service.update_session_payload(session_id, {"last_recruiter_jobs": jobs, "job_id": None, "candidate_ids": []})
        msg = build_recruiter_jobs_message(jobs)
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_jobs", "result": {"jobs": jobs}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    # if user picked a job by number from last_recruiter_jobs
    last_jobs = payload.get("last_recruiter_jobs") or []
    pick = parse_pick_index(question)
    if pick is None:
        pick = match_suggestion_index(question, last_jobs)

    selection_preface = ""
    if pick is not None and last_jobs:
        if pick < 0 or pick >= len(last_jobs):
            msg = "Số bạn chọn không hợp lệ. Hãy chọn lại (vd: 'chọn 1')."
            rag_service.append_message(session_id, "user", question)
            rag_service.append_message(session_id, "assistant", msg)
            return api_err(msg, 400)
        
        selected = last_jobs[pick]
        job_id = clean_text(selected.get("job_id"))
        selected_title = clean_text(selected.get("title") or selected.get("job_title") or "")
        city = clean_text(selected.get("city") or "")
        selection_preface = f"Ok, bạn đang quan tâm đến job **{selected_title}**" + (f" tại {city}." if city else ".")
        
        rag_service.update_session_payload(session_id, {"job_id": job_id, "candidate_ids": [], "selected_job_title": selected_title})
        
        # Return confirmation message instead of continuing to ranking
        msg = f"{selection_preface}\n\nBạn muốn mình làm gì tiếp theo?\n- Xếp hạng ứng viên\n- So sánh top 1 vs top 2\n- Gợi ý câu hỏi phỏng vấn"
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({
            "view": "recruiter_job_selected",
            "result": {"job_id": job_id, "job_title": selected_title},
            "state": session_to_state(rag_service.get_session(session_id) or {}, 20)
        }, message=msg)

    candidate_ids = payload.get("candidate_ids") or candidate_ids
    if use_applications:
        applied_ids = rag_service.get_applied_candidate_ids(job_id, statuses=application_statuses)
        if applied_ids:
            candidate_ids = applied_ids

    candidate_ids = [clean_text(x) for x in (candidate_ids or []) if clean_text(x)]
    if not candidate_ids:
        if is_no_candidates_question(question):
            msg = "Đúng rồi, hiện job này chưa có ứng viên ứng tuyển. Bạn có thể chọn job khác hoặc xem các job đang có ứng viên."
        else:
            msg = "Job này chưa có ứng viên ứng tuyển. Bạn có thể chọn job khác hoặc xem các job đang có ứng viên."
        if selection_preface:
            msg = f"{selection_preface}\n{msg}".strip()
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_no_candidates", "result": {"job_id": job_id, "candidate_ids": []}, "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    rag_service.update_session_payload(session_id, {"job_id": job_id, "candidate_ids": candidate_ids})
    payload = (rag_service.get_session(session_id) or {}).get("payload") or {}

    # re-route recruiter intent with updated payload
    intent = route_recruiter_intent(question, payload, llm=llm_service)
    it = (intent.get("intent") or "UNKNOWN").upper()

    if it == "GENERATE_JD":
        return handle_recruiter_generate_jd(question, session_id)
    if it == "OUTREACH":
        return handle_recruiter_outreach(question, session_id, payload)
    if it == "SCHEDULE_INTERVIEW":
        return handle_recruiter_outreach(question, session_id, payload, intent_override="INVITE")

    if it == "GREETING":
        msg = "Chào bạn. Bạn muốn mình xếp hạng top ứng viên, so sánh top1-top2, hay gợi ý câu hỏi phỏng vấn?"
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "RESET":
        s = rag_service.start_session("recruiter", {"job_id": job_id, "candidate_ids": candidate_ids, "mode": "recruiter_general", "recruiter_user_id": recruiter_user_id}, ttl_minutes=ttl_minutes)
        session_id = s["session_id"]
        msg = "Ok, đã reset phiên recruiter. Bạn hỏi tiếp nhé."
        rag_service.append_message(session_id, "user", question)
        rag_service.append_message(session_id, "assistant", msg)
        return api_ok({"view": "recruiter_general", "state": session_to_state(rag_service.get_session(session_id) or {}, 20)}, message=msg)

    if it == "COMPARE_CANDIDATES":
        return handle_recruiter_compare(job_id, question, session_id, payload)

    if it == "INTERVIEW_PREP":
        return handle_recruiter_interview_prep(job_id, question, session_id, payload)

    # default: ranking
    return handle_recruiter_rank(job_id, candidate_ids, question, session_id, ttl_minutes, recruiter_user_id=recruiter_user_id, preface=selection_preface)


@app.get("/api/ai/notify/daily")
@protect
@authorize("candidate", "admin")
def candidate_daily_digest():
    candidate_id = clean_text(request.args.get("candidate_id"))
    if not candidate_id:
        return api_err("candidate_id required", 400)
    dig = build_daily_digest(rag_service, candidate_id)
    return api_ok({"result": dig}, message=dig.get("message", "OK"))


# SSE streaming (optional)
@app.get("/api/ai/stream")
def stream_chat():
    prompt = clean_text(request.args.get("prompt") or "You are a helpful assistant.")
    q = clean_text(request.args.get("q") or "")

    def gen():
        for tok in llm_service.ask_stream(prompt, question=q):
            yield f"data: {tok}\n\n"
        yield "data: [DONE]\n\n"

    return Response(gen(), mimetype="text/event-stream")
