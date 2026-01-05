# scripts/ingest_jobs.py (V5 - SOTA)
from __future__ import annotations

import os
import sys
import re
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.facts_layer import (  # noqa: E402
    SkillNormalizer,
    chunk_words,
    now_utc,
    clean_text,
    norm_basic,
    normalize_city,
    normalize_work_location,
)

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "datn_1")

JOB_COLLECTION = "jobs"
RAG_COLLECTION = os.getenv("RAG_COLLECTION", "rag_chunks")

DOC_TYPE = "job"
JOB_CHUNK_WORDS = int(os.getenv("JOB_CHUNK_WORDS", "240"))
JOB_OVERLAP_WORDS = int(os.getenv("JOB_OVERLAP_WORDS", "50"))

INDEX_MODE = os.getenv("RAG_SYNC_MODE", "incremental")  # full | incremental
LOG_EVERY = int(os.getenv("RAG_LOG_EVERY", "50"))

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
print(f"Loading embedding model {EMBEDDING_MODEL}...")
embedder = SentenceTransformer(EMBEDDING_MODEL, device="cpu")

if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
jobs_col = db[JOB_COLLECTION]
rag_col = db[RAG_COLLECTION]

# Skills config path fallback: config/skills.json -> skills.json
SKILLS_PATH = os.getenv("SKILLS_JSON_PATH", os.path.join(PROJECT_ROOT, "config", "skills.json"))
if not os.path.exists(SKILLS_PATH):
    SKILLS_PATH = os.path.join(PROJECT_ROOT, "skills.json")

skill_norm = SkillNormalizer(config_path=SKILLS_PATH)

NO_SPLIT_MARKERS = ("ci/cd", "qa/qc", "ui/ux", "r&d")
SPLIT_RE = re.compile(r"\s*(?:/|,|\||&)\s*")

SENIORITY_TERMS = {
    "intern",
    "fresher",
    "junior",
    "mid",
    "middle",
    "senior",
    "lead",
    "principal",
    "entry",
    "entry level",
    "executive",
}
WORK_LOCATION_TERMS = {
    "on site",
    "onsite",
    "remote",
    "hybrid",
    "full time",
    "part time",
    "contract",
    "freelance",
    "internship",
}
NOISE_EXACT = {
    "hieu lifecycle",
    "co kinh nghiem deploy",
    "chu dong hoc hoi",
}
NOISE_PREFIXES = (
    "co kinh nghiem",
    "kinh nghiem",
    "hieu ",
    "chu dong",
    "uu tien",
    "tinh than",
    "san sang",
    "giao tiep",
    "can than",
)


def split_skill_terms(value: Any) -> List[str]:
    text = clean_text(value)
    if not text:
        return []
    lower = text.lower()
    if any(marker in lower for marker in NO_SPLIT_MARKERS):
        return [text]
    if "backup" in lower and "restore" in lower:
        return [text]
    parts = [p.strip() for p in SPLIT_RE.split(text) if p.strip()]
    return parts or [text]


def is_noise_unknown(
    term: str,
    *,
    job_title_norm: str,
    city_norm: str,
    work_location_norm: str,
    seniority_norm: str,
) -> bool:
    t = norm_basic(term)
    if not t:
        return True
    if t in NOISE_EXACT:
        return True
    if t in SENIORITY_TERMS or t in WORK_LOCATION_TERMS:
        return True
    if seniority_norm and t == seniority_norm:
        return True
    if work_location_norm and t == work_location_norm:
        return True
    if city_norm and t == city_norm:
        return True
    if job_title_norm and t == job_title_norm:
        return True
    if job_title_norm and t in job_title_norm and len(t.split()) <= 3:
        return True
    for prefix in NOISE_PREFIXES:
        if t.startswith(prefix):
            return True
    return False


def _get_updated_at(j: dict) -> Any:
    return j.get("updated_at") or j.get("updatedAt") or j.get("created_at") or j.get("createdAt")


def job_is_valid(j: dict) -> bool:
    if not j:
        return False
    if "is_active" in j and j.get("is_active") is not True:
        return False
    if "status" in j and j.get("status") not in ("approved", "active", "open", "published"):
        return False
    return True


def needs_reindex(job_id: ObjectId, source_updated_at: Any) -> bool:
    one = rag_col.find_one(
        {"metadata.doc_type": DOC_TYPE, "metadata.job_id": job_id},
        {"metadata.source_updated_at": 1},
    )
    if one is None:
        return True
    old = ((one.get("metadata") or {}).get("source_updated_at"))
    return str(old) != str(source_updated_at)


def _requirements_to_lines(reqs: Any) -> List[str]:
    if reqs is None:
        return []
    if isinstance(reqs, list):
        return [clean_text(x) for x in reqs if clean_text(x)]
    s = clean_text(reqs)
    if not s:
        return []
    return [clean_text(x.lstrip("-• ").strip()) for x in re.split(r"[\n\r]+", s) if clean_text(x)]


def _extract_skillish_from_line(line: str) -> List[str]:
    line = clean_text(line)
    if not line:
        return []
    line = re.sub(r"^(thành thạo|ưu tiên|yêu cầu|có kinh nghiệm)\s*[:\-]\s*", "", line, flags=re.I)
    line = re.sub(r"(là lợi thế|nice to have|preferred)\b.*$", "", line, flags=re.I)

    parts = split_skill_terms(line)
    out: List[str] = []
    for p in parts:
        p = clean_text(p)
        if not p:
            continue
        if len(p) > 30 and " " in p and not re.search(r"(\.net|node\.js|next\.js)", p.lower()):
            continue
        out.append(p)
    return out


def extract_job_experience_min(j: dict) -> Optional[int]:
    exp = j.get("experience_required")
    if isinstance(exp, dict):
        mn = exp.get("min")
        try:
            return int(mn) if mn is not None else None
        except Exception:
            return None
    return None


def extract_job_raw_skills(j: dict) -> List[str]:
    raw: List[str] = []
    # Handle both snake_case and camelCase
    skills_required = j.get("skills_required") or j.get("skillsRequired") or []
    for s in skills_required:
        if isinstance(s, dict):
            nm = clean_text(s.get("skill_name") or s.get("skillName") or s.get("name") or "")
            for part in split_skill_terms(nm):
                raw.append(part)
            continue
        for part in split_skill_terms(s):
            raw.append(part)

    nice_to_have = j.get("nice_to_have_skills") or j.get("niceToHaveSkills") or []
    for s in nice_to_have:
        if isinstance(s, dict):
            nm = clean_text(s.get("skill_name") or s.get("skillName") or s.get("name") or "")
            for part in split_skill_terms(nm):
                raw.append(part)
            continue
        for part in split_skill_terms(s):
            raw.append(part)

    tags = j.get("tags") or []
    for t in tags:
        for part in split_skill_terms(t):
            raw.append(part)
    for line in _requirements_to_lines(j.get("requirements")):
        raw.extend(_extract_skillish_from_line(line))
    return raw


def extract_job_facts(j: dict) -> Dict[str, Any]:
    raw_skills = extract_job_raw_skills(j)

    # Robust skill detection from free text (description + requirements)
    blob_parts: List[str] = []
    blob_parts.append(clean_text(j.get("title")))
    blob_parts.append(clean_text(j.get("description")))
    tags = j.get("tags") or []
    if isinstance(tags, list):
        blob_parts.extend([clean_text(t) for t in tags if clean_text(t)])
    highlights = j.get("job_highlights") or j.get("jobHighlights") or []
    if isinstance(highlights, list):
        blob_parts.extend([clean_text(h) for h in highlights if clean_text(h)])
    for line in _requirements_to_lines(j.get("requirements")):
        blob_parts.append(line)
    detected_ids = skill_norm.detect_in_text("\n".join([x for x in blob_parts if x]))
    detected_display = [skill_norm.display_from_norm(sid) for sid in detected_ids]

    req_known_display, req_known_norm, req_unknown_norm = skill_norm.classify_many_norm(
        raw_skills + detected_display, dedup=True
    )

    critical_display = skill_norm.detect_critical(req_known_norm)
    critical_norm: List[str] = []
    for x in critical_display:
        n = skill_norm.normalize_one_norm(x, allow_unknown=False)
        if n:
            critical_norm.append(n.lower())

    loc = j.get("location") or {}
    city = clean_text((loc or {}).get("city"))
    country = clean_text((loc or {}).get("country"))

    work_loc = clean_text(j.get("work_location"))

    job_title_norm = norm_basic(clean_text(j.get("title")))
    seniority_norm = norm_basic(clean_text(j.get("seniority_level")))
    work_location_norm = norm_basic(work_loc)
    city_norm = norm_basic(city)

    filtered_unknown = [
        u
        for u in req_unknown_norm
        if not is_noise_unknown(
            u,
            job_title_norm=job_title_norm,
            city_norm=city_norm,
            work_location_norm=work_location_norm,
            seniority_norm=seniority_norm,
        )
    ]

    return {
        "source_updated_at": _get_updated_at(j) or now_utc(),
        "visibility": "public",

        "job_title": clean_text(j.get("title")),
        "job_company_name": clean_text(j.get("company_name")),
        "job_experience_min": extract_job_experience_min(j),

        "job_type": clean_text(j.get("job_type")),
        "job_work_location": work_loc,
        "job_work_location_norm": normalize_work_location(work_loc),
        "job_seniority_level": clean_text(j.get("seniority_level")),

        "job_location_city": city,
        "job_location_city_norm": normalize_city(city),
        "job_location_country": country,

        "job_required_skills_known_display": req_known_display,
        "job_required_skills_known_norm": req_known_norm,
        "job_required_skills_unknown_norm": filtered_unknown,

        "job_critical_skills_display": critical_display,
        "job_critical_skills_norm": sorted(list(set([x for x in critical_norm if x]))),

        "job_required_skill_count": len(req_known_norm),
        "job_unknown_skill_count": len(filtered_unknown),
        "job_critical_skill_count": len(set(critical_norm)),
    }


def build_job_context_text(j: dict, facts: Dict[str, Any]) -> str:
    parts: List[str] = []
    parts.append(
        f"""
FACTS SUMMARY:
- Title: {facts.get("job_title")}
- Company: {facts.get("job_company_name")}
- City: {facts.get("job_location_city")}
- Work location: {facts.get("job_work_location")}
- Experience min: {facts.get("job_experience_min")}
- Required skills: {", ".join(facts.get("job_required_skills_known_display") or [])}
- Critical: {", ".join(facts.get("job_critical_skills_display") or [])}
""".strip()
    )

    desc = clean_text(j.get("description"))
    if desc:
        parts.append("DESCRIPTION:\n" + desc[:3000])

    req_lines = _requirements_to_lines(j.get("requirements"))
    if req_lines:
        parts.append("REQUIREMENTS:\n" + "\n".join([f"- {x}" for x in req_lines])[:2500])

    return "\n".join([p for p in parts if clean_text(p)])


def index_one_job(j: dict) -> int:
    jid = j.get("_id")
    if not isinstance(jid, ObjectId):
        return 0
    if not job_is_valid(j):
        return 0

    facts = extract_job_facts(j)

    if INDEX_MODE != "full" and not needs_reindex(jid, facts.get("source_updated_at")):
        return 0

    rag_col.delete_many({"metadata.doc_type": DOC_TYPE, "metadata.job_id": jid})

    text = build_job_context_text(j, facts)
    chunks = chunk_words(text, chunk_words=JOB_CHUNK_WORDS, overlap_words=JOB_OVERLAP_WORDS) or ["Job posting (empty)"]
    embs = embedder.encode(chunks, normalize_embeddings=True)

    docs = []
    for idx, (t, e) in enumerate(zip(chunks, embs)):
        docs.append(
            {
                "_id": f"{DOC_TYPE}::{jid}::{idx}",
                "text": t,
                "embedding": e.tolist(),
                "metadata": {
                    "doc_type": DOC_TYPE,
                    "job_id": jid,
                    "source_id": jid,
                    "chunk_index": idx,
                    **facts,
                },
                "created_at": now_utc(),
            }
        )

    if docs:
        rag_col.insert_many(docs)

    print(
        f"✅ Indexed Job: {jid} | req={facts.get('job_required_skill_count')} | critical={facts.get('job_critical_skill_count')} | city={facts.get('job_location_city')}"
    )
    return len(docs)


def sync_jobs(limit: Optional[int] = None) -> None:
    print("\n=== INGEST JOBS (V5) ===")
    n_jobs, n_chunks, scanned = 0, 0, 0

    cur = jobs_col.find(
        {"is_active": True, "status": {"$in": ["approved", "active", "open", "published"]}},
        {
            "_id": 1,
            "title": 1,
            "company_name": 1,
            "description": 1,
            "requirements": 1,
            "skills_required": 1,
            "nice_to_have_skills": 1,
            "experience_required": 1,
            "job_type": 1,
            "work_location": 1,
            "seniority_level": 1,
            "location": 1,
            "tags": 1,
            "job_highlights": 1,
            "updated_at": 1,
            "updatedAt": 1,
            "created_at": 1,
            "createdAt": 1,
            "is_active": 1,
            "status": 1,
        },
    )

    for j in cur:
        scanned += 1
        if limit and n_jobs >= limit:
            break
        ins = index_one_job(j)
        if ins:
            n_jobs += 1
            n_chunks += ins
        if scanned % LOG_EVERY == 0:
            print(f"... scanned={scanned}, reindexed_jobs={n_jobs}, chunks={n_chunks}")

    print(f"DONE: scanned={scanned}, reindexed_jobs={n_jobs}, inserted_chunks={n_chunks}")


if __name__ == "__main__":
    sync_jobs()
