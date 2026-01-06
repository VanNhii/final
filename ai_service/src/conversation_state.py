# src/conversation_state.py (V5 - robust intent + state orchestration)
from __future__ import annotations

import os
import re
import logging
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from .facts_layer import clean_text, norm_basic, normalize_city, normalize_work_location
from .llm_service import LLMService

logger = logging.getLogger(__name__)


# ----------------------------
# Basic patterns
# ----------------------------
RESET_PAT = re.compile(r"\b(reset|start over|làm lại|lam lai|xoá session|xoa session|đặt lại|dat lai)\b", re.I)
GREETING_PAT = re.compile(r"\b(xin chào|chào|hello|hi|hey|chao|hola)\b", re.I)
THANKS_PAT = re.compile(r"\b(cảm ơn|cam on|cám ơn|thanks|thank you|tks|thx)\b", re.I)
GOODBYE_PAT = re.compile(r"\b(tạm biệt|tam biet|bye|bai bai|see you|hen gap|hẹn gặp|goodbye)\b", re.I)

ROLE_PAT = re.compile(r"\b(backend|frontend|fullstack|devops|qa|tester|data|android|ios|node|react|java|python)\b", re.I)
JOB_WORD_PAT = re.compile(r"\b(job|việc|viec|công việc|cong viec|việc làm|viec lam|vị trí|vi tri|position)\b", re.I)
FIND_PAT = re.compile(r"\b(tìm|tim|gợi ý|goi y|phù hợp|phu hop|search|find|recommend)\b", re.I)
REVIEW_PAT = re.compile(r"\b(review|đánh giá|danh gia|xem|soát|soat)\b", re.I)
PROFILE_PAT = re.compile(r"\b(hồ\s*sơ|ho\s*so|cv|profile)\b", re.I)
SELF_MATCH_PAT = re.compile(r"\b(phu hop voi (toi|ho so|cv)|viec phu hop voi toi|job phu hop voi toi)\b", re.I)

CHANGE_PAT = re.compile(r"\b(đổi job|doi job|chọn lại|chon lai|show jobs|gợi ý lại|goi y lai)\b", re.I)
CONTEXT_BREAK_PAT = re.compile(
    r"\b(job khac|viec khac|cong viec khac|vi tri khac|"
    r"job moi|viec moi|cong viec moi|vi tri moi|"
    r"job nao khac|viec nao khac|cong viec nao khac|"
    r"vi tri nao khac|"
    r"job nao nua|viec nao nua|cong viec nao nua|vi tri nao|"
    r"cai nao nua|con nao nua|tiep theo)\b",
    re.I,
)
RESET_LIST_PAT = re.compile(r"\b(quay lai|tro ve|danh sach|list|menu)\b", re.I)

# Value-add intents
ROADMAP_PAT = re.compile(r"\b(lộ\s*trình|lo\s*trinh|roadmap|plan|kế\s*hoạch|ke\s*hoach|14\s*(ngày|day))\b", re.I)
INTERVIEW_PAT = re.compile(r"\b(phỏng\s*vấn|phong\s*van|interview|mock\s*interview|simulate)\b", re.I)
COMPETE_PAT = re.compile(r"\b(canh tranh|doi thu|top|phan tram|%|bao nhieu|xep hang|hang may)\b", re.I)

# City extraction: "ở Đà Nẵng", "tại Buôn Ma Thuột", "ở Hội An"
CITY_TRIGGER_PAT = re.compile(r"\b(ở|o|tại|tai|in)\s+([a-zA-ZÀ-ỹ0-9\-\s]{2,40})", re.I)

# "remote/hybrid/onsite"
WORKLOC_PAT = re.compile(r"\b(remote|hybrid|on[-\s]?site|onsite)\b", re.I)

GENERIC_COMPANY_TOKENS = {
    "ctcp",
    "tnhh",
    "cong",
    "ty",
    "co",
    "company",
    "group",
    "tech",
    "vn",
    "vietnam",
    "global",
    "solutions",
    "solution",
    "lab",
    "labs",
}

ROLE_KEYWORDS = {
    "backend",
    "frontend",
    "fullstack",
    "devops",
    "qa",
    "tester",
    "data",
    "android",
    "ios",
    "node",
    "react",
    "java",
    "python",
}


def is_reset(text: str) -> bool:
    return bool(RESET_PAT.search(clean_text(text)))


def is_greeting(text: str) -> bool:
    return bool(GREETING_PAT.search(clean_text(text)))


def is_thanks(text: str) -> bool:
    return bool(THANKS_PAT.search(clean_text(text)))


def is_goodbye(text: str) -> bool:
    return bool(GOODBYE_PAT.search(clean_text(text)))


def is_confirm(text: str) -> bool:
    t = norm_basic(text)
    if not t:
        return False
    if re.search(r"\b(ok|oke|okay|okey|duoc|dong y)\b", t):
        return True
    if re.search(r"\b(tao di|lam di|tao ngay|lam ngay)\b", t):
        return True
    return False


def is_ack(text: str) -> bool:
    q = norm_basic(text)
    if not q:
        return False
    # short acknowledgements
    if q in {"ok", "okay", "oke", "okie", "uk", "k", "kk", "roi", "duoc", "dc", "u", "da", "dạ", "da roi", "vang", "vâng", "uh", "um"}:
        return True
    if len(q.split()) <= 2 and q in {"ok", "oke", "okay", "roi", "duoc", "dc", "da", "vang", "vâng"}:
        return True
    # "ok vậy", "ok r"
    if q.startswith("ok ") or q.startswith("oke ") or q.startswith("okay "):
        return True
    return False


def fuzzy_role_match(text: str) -> bool:
    t = norm_basic(text)
    if not t:
        return False
    joined = t.replace(" ", "")
    if len(joined) < 5:
        return False
    for role in ROLE_KEYWORDS:
        if role in t or role in joined:
            return True
        if SequenceMatcher(None, joined, role).ratio() >= 0.85:
            return True
    return False


def parse_pick_index(text: str) -> Optional[int]:
    """
    "chon 1", "so 2", "job 3", "cong viec 4" => 0-based index
    """
    t = norm_basic(text)
    m = re.search(r"\b(chon|so|pick)\s*([0-9]{1,2})\b", t)
    if not m:
        m = re.search(r"\b(job|viec|cong viec|cv)\s*([0-9]{1,2})\b", t)
    if not m:
        ordinal_map = {
            "dau tien": 0,
            "thu nhat": 0,
            "thu hai": 1,
            "thu ba": 2,
            "thu tu": 3,
            "thu nam": 4,
            "thu sau": 5,
            "thu bay": 6,
            "thu tam": 7,
            "thu chin": 8,
            "thu muoi": 9,
            "first": 0,
            "second": 1,
            "third": 2,
        }
        for key, idx in ordinal_map.items():
            if re.search(rf"\b{re.escape(key)}\b", t):
                return idx
        return None
    try:
        idx = int(m.group(2))
        if idx <= 0:
            return None
        return idx - 1
    except Exception:
        return None

def parse_city_from_text(text: str) -> Optional[str]:
    t = clean_text(text)
    if not t:
        return None

    m = CITY_TRIGGER_PAT.search(t)
    if not m:
        return None
    raw_city = clean_text(m.group(2))
    # cut tail keywords
    raw_city = re.split(r"\b(remote|hybrid|on[-\s]?site|onsite|lương|luong|salary|level)\b", raw_city, maxsplit=1, flags=re.I)[0]
    raw_city = raw_city.strip(" ,.-")
    if len(raw_city) < 2:
        return None
    return raw_city


def parse_work_location(text: str) -> Optional[str]:
    t = clean_text(text).lower()
    m = WORKLOC_PAT.search(t)
    if not m:
        return None
    return normalize_work_location(m.group(1))


def wants_auto_pick(text: str) -> bool:
    t = norm_basic(text)
    if not t:
        return False
    if re.search(r"\b(chon|pick|choose)\b", t):
        if re.search(r"\b(job|viec|cong viec)\b", t):
            return True
        if re.search(r"\b(phu hop|tot nhat|best)\b", t):
            return True
        if re.search(r"\b(giup|ho|dum)\b", t):
            return True
    if re.search(r"\b(phu hop nhat|tot nhat|best)\b", t) and re.search(
        r"\b(job|viec|cong viec)\b", t
    ):
        return True
    return False


def wants_best_from_list(text: str) -> bool:
    t = norm_basic(text)
    if not t:
        return False
    if re.search(r"\b(phu hop nhat|tot nhat|best)\b", t):
        return True
    if re.search(r"\b(job nao|viec nao|cong viec nao)\b", t) and re.search(
        r"\b(phu hop|tot nhat|best)\b", t
    ):
        return True
    return False


def _match_tokens(text: str) -> List[str]:
    tokens = []
    for t in norm_basic(text).split():
        if len(t) < 3 or t in GENERIC_COMPANY_TOKENS:
            continue
        tokens.append(t)
    return tokens


def match_suggestion_index(question: str, suggestions: List[dict]) -> Optional[int]:
    q = norm_basic(question)
    if not q:
        return None
    q_tokens = set(q.split())
    best_idx = None
    best_score = 0.0

    for i, s in enumerate(suggestions or []):
        title = norm_basic(s.get("title") or "")
        company = norm_basic(s.get("company") or "")

        if company and company in q:
            return i
        if title and title in q:
            return i

        tokens = set(_match_tokens(company) + _match_tokens(title))
        if not tokens:
            continue
        overlap = sum(1 for t in tokens if t in q_tokens)
        score = overlap / max(1, len(tokens))
        if overlap >= 2 and score > best_score:
            best_score = score
            best_idx = i

    return best_idx


# ----------------------------
# Pref extraction (light)
# ----------------------------
def merge_prefs(payload: dict, patch: dict) -> dict:
    out = dict(payload or {})
    prefs = dict((out.get("prefs") or {}))
    for k, v in (patch or {}).items():
        if v is None:
            continue
        prefs[k] = v
    out["prefs"] = prefs
    return out


def extract_prefs_rule(text: str) -> Dict[str, Any]:
    patch: Dict[str, Any] = {}
    city = parse_city_from_text(text)
    if city:
        patch["city"] = city
        patch["city_norm"] = normalize_city(city)

    wl = parse_work_location(text)
    if wl:
        patch["work_location_norm"] = wl

    # detect negative preference
    t = clean_text(text).lower()
    if re.search(r"\b(không|khong|no|đừng|dung)\b.*\b(on[-\s]?site|onsite)\b", t):
        patch["avoid_work_location_norm"] = "on-site"
    if re.search(r"\b(không|khong|no|đừng|dung)\b.*\b(remote)\b", t):
        patch["avoid_work_location_norm"] = "remote"
    return patch


def extract_prefs_llm(llm: LLMService, text: str, old_prefs: Dict[str, Any]) -> Dict[str, Any]:
    """
    LLM fallback for preferences, but safe + optional.
    """
    if str(os.getenv("LLM_ENABLED", "true")).lower() != "true":
        return {}

    schema = """{
      "city": "string",
      "work_location_norm": "string",
      "avoid_work_location_norm": "string",
      "role_hint": "string",
      "salary_min": 0
    }"""
    prompt = f"""
Bạn là bộ trích xuất sở thích tìm việc.
Chỉ trả JSON. Nếu không có thì để trống "" hoặc null.

Old prefs: {old_prefs}

Text: {text}
""".strip()

    try:
        out = llm.ask_json(prompt=prompt, question=text, schema_hint=schema, max_repair=1)
    except Exception as exc:
        logger.warning("extract_prefs_llm failed: %s", exc, exc_info=True)
        return {}
    if not isinstance(out, dict):
        return {}
    patch: Dict[str, Any] = {}
    if out.get("city"):
        patch["city"] = clean_text(out["city"])
        patch["city_norm"] = normalize_city(patch["city"])
    if out.get("work_location_norm"):
        wl_norm = normalize_work_location(out["work_location_norm"])
        if wl_norm:
            patch["work_location_norm"] = wl_norm
    if out.get("avoid_work_location_norm"):
        avoid_norm = normalize_work_location(out["avoid_work_location_norm"])
        if avoid_norm:
            patch["avoid_work_location_norm"] = avoid_norm
    if out.get("role_hint"):
        patch["role_hint"] = clean_text(out["role_hint"])
    if out.get("salary_min") is not None:
        try:
            patch["salary_min"] = int(out["salary_min"])
        except Exception:
            pass
    return patch


# ----------------------------
# Query rewrite
# ----------------------------
def rewrite_followup_query(question: str, state: dict, last_query: str = "", kind: str = "candidate") -> str:
    """
    If user says "thêm 5 job ở Đà Nẵng" etc, enrich with last query + new prefs.
    """
    q = clean_text(question)
    if not q:
        return last_query or ""

    # if explicit role/job keyword, keep raw
    if ROLE_PAT.search(q) or JOB_WORD_PAT.search(q) or FIND_PAT.search(q):
        return q

    # follow-up add location
    city = parse_city_from_text(q)
    if city and last_query:
        return f"{last_query} ở {city}"

    # generic follow-up
    if last_query:
        return f"{last_query}. Follow-up: {q}"
    return q


# ----------------------------
# Intent routing
# ----------------------------
CAND_INTENTS = [
    "GREETING",
    "THANKS",
    "GOODBYE",
    "PROFILE_REVIEW",
    "PROFILE_TO_JOBS",
    "JOB_SEARCH",
    "JOB_FIT",
    "ROADMAP",
    "INTERVIEW",
    "COMPETITION",
    "SELECT_JOB",
    "CHANGE_JOB",
    "RESET",
    "UNKNOWN",
]
RECR_INTENTS = [
    "GREETING",
    "THANKS",
    "GOODBYE",
    "RANK_CANDIDATES",
    "ASK_ABOUT_CANDIDATE",
    "CHANGE_POOL",
    "SCREEN_CANDIDATES",
    "COMPARE_CANDIDATES",
    "INTERVIEW_PREP",
    "RESET",
    "UNKNOWN",
]


def route_candidate_intent(question: str, payload: dict, llm: Optional[LLMService] = None) -> dict:
    """
    Candidate intent router (best V5):
    Rules first (speed) + LLM fallback (smart).
    """
    q = clean_text(question or "")
    t = q.lower().strip()
    payload = payload or {}

    if is_reset(q):
        return {"intent": "RESET", "confidence": 1.0}

    if is_greeting(q):
        return {"intent": "GREETING", "confidence": 1.0}
    if is_thanks(q):
        return {"intent": "THANKS", "confidence": 1.0}
    if is_goodbye(q):
        return {"intent": "GOODBYE", "confidence": 1.0}

    if is_ack(q):
        # If we just suggested jobs and user replies 'ok', auto-pick the best one.
        if (payload.get("last_job_suggestions") or []) and not payload.get("selected_job_id"):
            return {"intent": "SELECT_JOB", "auto_pick": True, "confidence": 0.9}
        return {"intent": "ACK", "confidence": 0.8}

    is_screen = bool(re.search(r"\b(liet ke|danh sach|loc|sang loc|filter)\b", t) and re.search(r"\b(ung vien|candidate)\b", t))
    is_compare = bool(re.search(r"\b(so sanh|compare|vs|head to head)\b", t) and re.search(r"\b(ung vien|candidate)\b", t))
    is_interview = bool(re.search(r"\b(cau hoi phong van|phong van|interview)\b", t))

    if is_screen:
        return {"intent": "SCREEN_CANDIDATES", "confidence": 0.9}
    if is_compare:
        return {"intent": "COMPARE_CANDIDATES", "confidence": 0.9}
    if is_interview:
        return {"intent": "INTERVIEW_PREP", "confidence": 0.85}

    pick = parse_pick_index(q)
    if pick is not None:
        return {"intent": "SELECT_JOB", "confidence": 1.0, "pick_index": pick}

    # Allow bare numbers like "8" when we already have suggestions
    num_only = re.fullmatch(r"\s*(\d{1,2})\s*", t)
    if num_only:
        sugs = payload.get("last_job_suggestions") or []
        try:
            idx = int(num_only.group(1))
        except Exception:
            idx = 0
        if idx > 0 and sugs:
            return {"intent": "SELECT_JOB", "confidence": 0.95, "pick_index": idx - 1}

    sugs = payload.get("last_job_suggestions") or []
    pick_by_text = match_suggestion_index(q, sugs)
    if pick_by_text is not None:
        return {"intent": "SELECT_JOB", "confidence": 0.9, "pick_index": pick_by_text}
    if wants_auto_pick(q):
        return {"intent": "SELECT_JOB", "confidence": 0.85, "auto_pick": True}
    if sugs and wants_best_from_list(q):
        return {"intent": "SELECT_JOB", "confidence": 0.85, "auto_pick": True}

    selected_id = payload.get("selected_job_id")
    if selected_id:
        if COMPETE_PAT.search(t) and re.search(r"\b(ung vien|ung tuyen|ho so|nop)\b", t):
            return {"intent": "COMPETITION", "confidence": 0.9}
        if payload.get("last_action") == "ROADMAP" and is_confirm(q):
            return {"intent": "ROADMAP", "confidence": 0.9}
        if ROADMAP_PAT.search(t):
            return {"intent": "ROADMAP", "confidence": 0.98}
        if INTERVIEW_PAT.search(t):
            return {"intent": "INTERVIEW", "confidence": 0.98}
        if CHANGE_PAT.search(t):
            return {"intent": "CHANGE_JOB", "confidence": 1.0}
        t_norm = norm_basic(q)
        if not re.search(r"\b(job nay|viec nay|cong viec nay)\b", t_norm):
            has_city = parse_city_from_text(q) is not None
            has_role = bool(ROLE_PAT.search(t)) or fuzzy_role_match(q)
            has_workloc = parse_work_location(q) is not None
            wants_other = bool(CONTEXT_BREAK_PAT.search(t_norm))
            wants_list = bool(RESET_LIST_PAT.search(t_norm))
            wants_find_job = bool(re.search(r"\b(tim|goi y)\b", t_norm) and re.search(r"\b(job|viec|cong viec)\b", t_norm))
            wants_fit_list = bool(
                re.search(r"\b(phu hop|tot nhat|best|goi y)\b", t_norm)
                and re.search(r"\b(job|viec|cong viec|vi tri)\b", t_norm)
                and re.search(r"\b(nao|khac|nua)\b", t_norm)
            )
            has_self_match = bool(
                SELF_MATCH_PAT.search(t_norm)
                or re.search(r"\b(phu hop|hop)\b", t_norm)
                and re.search(r"\b(job|viec|cong viec|vi tri)\b", t_norm)
            )
            if has_city or has_role or has_workloc or wants_other or wants_list or wants_find_job or wants_fit_list:
                if has_self_match or re.search(r"\b(cv|ho so)\b", t_norm):
                    return {"intent": "PROFILE_TO_JOBS", "confidence": 0.9, "context_breaker": True}
                return {"intent": "JOB_SEARCH", "confidence": 0.9, "query": q, "context_breaker": True}
        return {"intent": "JOB_FIT", "confidence": 0.95}

    t_norm = norm_basic(q)
    has_profile = bool(re.search(r"\b(cv|ho so)\b", t_norm))
    has_job_word = bool(re.search(r"\b(job|viec|cong viec)\b", t_norm))
    has_find = bool(re.search(r"\b(tim|goi y|phu hop|recommend|search|find)\b", t_norm))
    is_review = bool(REVIEW_PAT.search(t) and PROFILE_PAT.search(t)) or (has_profile and re.search(r"\b(review|danh gia|xem|soat)\b", t_norm)) or bool(re.search(r"\breview\b", t_norm))
    is_find_job = bool(FIND_PAT.search(t) and JOB_WORD_PAT.search(t)) or (has_find and has_job_word)
    self_match_loose = bool(
        re.search(r"\b(toi|minh|em)\b", t_norm)
        and re.search(r"\b(phu hop|hop)\b", t_norm)
        and has_job_word
    )
    is_profile_match = bool(SELF_MATCH_PAT.search(t_norm)) or self_match_loose

    if is_review:
        if is_find_job or (has_profile and has_job_word):
            return {"intent": "PROFILE_TO_JOBS", "confidence": 0.98}
        return {"intent": "PROFILE_REVIEW", "confidence": 0.95}
    if is_profile_match or (has_profile and (has_find or has_job_word)):
        return {"intent": "PROFILE_TO_JOBS", "confidence": 0.95}

    # job search: any of these implies a search, including city only
    has_role = bool(ROLE_PAT.search(t)) or fuzzy_role_match(q)
    has_city = parse_city_from_text(q) is not None
    has_workloc = parse_work_location(q) is not None

    if is_find_job or has_role or has_city or has_workloc:
        return {"intent": "JOB_SEARCH", "confidence": 0.9, "query": q}

    if ROADMAP_PAT.search(t):
        return {"intent": "ROADMAP", "confidence": 0.85}
    if INTERVIEW_PAT.search(t):
        return {"intent": "INTERVIEW", "confidence": 0.85}

    # LLM fallback
    if llm and str(os.getenv("LLM_ENABLED", "true")).lower() == "true":
        schema = f"""{{
          "intent": "{CAND_INTENTS}",
          "confidence": 0.0,
          "query": "string",
          "reply": "string"
        }}"""
        prompt = f"""
Bạn là INTENT ROUTER cho FindJob AI (Ứng viên).
Ngữ cảnh: selected_job_id={selected_id}, suggestions_count={len(payload.get("last_job_suggestions") or [])}
Chỉ trả JSON. User: {q}
""".strip()
        try:
            out = llm.ask_json(prompt, q, schema_hint=schema, max_repair=1)
            if isinstance(out, dict) and out.get("intent"):
                out["intent"] = str(out["intent"]).upper().strip()
                if out["intent"] in CAND_INTENTS:
                    return out
        except Exception:
            pass

    return {"intent": "UNKNOWN", "confidence": 0.0, "query": q}


def route_recruiter_intent(question: str, payload: dict, llm: Optional[LLMService] = None) -> dict:
    """
    Recruiter router: avoid falling into UNKNOWN too easily.
    """
    q = clean_text(question or "")
    t = q.lower().strip()
    payload = payload or {}

    # Global intents (always highest priority)
    if is_reset(q):
        return {"intent": "RESET", "confidence": 1.0}
    if is_greeting(q):
        return {"intent": "GREETING", "confidence": 1.0}
    if is_thanks(q):
        return {"intent": "THANKS", "confidence": 1.0}
    if is_goodbye(q):
        return {"intent": "GOODBYE", "confidence": 1.0}

    if is_ack(q):
        return {"intent": "ACK", "confidence": 0.8}

    if is_ack(q):
        # If we just suggested jobs and user replies 'ok', auto-pick the best one.
        if (payload.get("last_job_suggestions") or []) and not payload.get("selected_job_id"):
            return {"intent": "SELECT_JOB", "auto_pick": True, "confidence": 0.9}
        return {"intent": "ACK", "confidence": 0.8}

    # if recruiter has job_id + candidate_ids in payload, default to ranking/compare
    job_id = payload.get("job_id")
    cand_ids = payload.get("candidate_ids") or []

    if job_id and cand_ids:
        # explicit "so sánh", "chọn top", "top 5"
        if re.search(r"\b(top|rank|xep|x?p)\b", t):
            return {"intent": "RANK_CANDIDATES", "confidence": 0.95}
        # question about a specific candidate
        if re.search(r"\b(candidate|ứng viên|ung vien|hồ sơ|cv)\b", t):
            return {"intent": "ASK_ABOUT_CANDIDATE", "confidence": 0.9}
        return {"intent": "RANK_CANDIDATES", "confidence": 0.85}

    # if missing payload, still infer
    if re.search(r"\b(rank|xếp|xep|top)\b", t):
        return {"intent": "RANK_CANDIDATES", "confidence": 0.7}
    if llm and str(os.getenv("LLM_ENABLED", "true")).lower() == "true":
        schema = f"""{{
          "intent": "{RECR_INTENTS}",
          "confidence": 0.0,
          "reply": "string"
        }}"""
        prompt = f"""
Bạn là INTENT ROUTER cho FindJob AI (Recruiter).
Chỉ trả JSON. User: {q}
""".strip()
        try:
            out = llm.ask_json(prompt, q, schema_hint=schema, max_repair=1)
            if isinstance(out, dict) and out.get("intent"):
                out["intent"] = str(out["intent"]).upper().strip()
                if out["intent"] in RECR_INTENTS:
                    return out
        except Exception:
            pass

    return {"intent": "UNKNOWN", "confidence": 0.0}


