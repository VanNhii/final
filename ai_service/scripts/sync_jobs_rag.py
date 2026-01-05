# scripts/sync_jobs_rag.py (V3 - facts_layer v3 compat, realtime-ready)
from __future__ import annotations

import argparse
import os
import re
import sys
from typing import Any, Dict, List, Optional

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from sentence_transformers import SentenceTransformer

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.facts_layer import SkillNormalizer, chunk_words, now_utc, clean_text  # noqa: E402

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI in .env")

DB_NAME = os.getenv("MONGODB_DB_NAME", "datn_1")

RAG_COLLECTION = os.getenv("RAG_COLLECTION", "rag_chunks")
JOBS_COLLECTION = os.getenv("JOB_COLLECTION", "jobs")

DOC_TYPE = "job"
VISIBILITY = os.getenv("JOB_VISIBILITY", "public")

INDEX_MODE = os.getenv("RAG_SYNC_MODE", "incremental")  # full | incremental

JOB_CHUNK_WORDS = int(os.getenv("JOB_CHUNK_WORDS", "240"))
JOB_OVERLAP_WORDS = int(os.getenv("JOB_OVERLAP_WORDS", "50"))

# Skills config path fallback: config/skills.json -> skills.json
SKILLS_PATH = os.getenv("SKILLS_JSON_PATH", os.path.join(PROJECT_ROOT, "config", "skills.json"))
if not os.path.exists(SKILLS_PATH):
    SKILLS_PATH = os.path.join(PROJECT_ROOT, "skills.json")

print("Loading embedding model BAAI/bge-m3...")
embed_model = SentenceTransformer("BAAI/bge-m3", device="cpu")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
jobs_col = db[JOBS_COLLECTION]
rag_col = db[RAG_COLLECTION]

skill_norm = SkillNormalizer(config_path=SKILLS_PATH)


def now_utc_tz():
    return now_utc()


def job_is_valid(job: dict) -> bool:
    if not job:
        return False
    if job.get("is_active") is not True:
        return False
    if job.get("status") != "approved":
        return False

    deadline = job.get("application_deadline")
    if deadline:
        try:
            dl = deadline if getattr(deadline, "tzinfo", None) else deadline.replace(tzinfo=now_utc_tz().tzinfo)
            if dl <= now_utc_tz():
                return False
        except Exception:
            pass
    return True


def get_job_updated_at(job: dict):
    return job.get("updated_at") or job.get("updatedAt") or job.get("created_at") or job.get("createdAt") or now_utc_tz()


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

    parts = re.split(r"[,/|]+", line)
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

    # 1) structured skills fields (tolerate multiple schemas)
    for s in (j.get("skills_required") or []):
        if isinstance(s, dict):
            nm = clean_text(
                (s or {}).get("skill_name")
                or (s or {}).get("skillName")
                or (s or {}).get("name")
                or (s or {}).get("title")
                or (s or {}).get("label")
            )
        else:
            nm = clean_text(s)
        if nm:
            raw.append(nm)

    # 2) requirements lines (best-effort extraction)
    for line in _requirements_to_lines(j.get("requirements")):
        raw.extend(_extract_skillish_from_line(line))

    # 3) fallback: detect skills inside long text (VN sentences often hide skills)
    blob = "\n".join([
        clean_text(j.get("description")),
        clean_text(j.get("requirements")),
        clean_text(((j.get("job_detail") or {}).get("requirements")) if isinstance(j.get("job_detail"), dict) else ""),
    ])
    raw.extend(skill_norm.detect_in_text(blob))

    return raw


def extract_job_facts(j: dict) -> Dict[str, Any]:
    raw_skills = extract_job_raw_skills(j)
    req_known_display, req_known_norm, req_unknown_norm = skill_norm.classify_many_norm(raw_skills, dedup=True)

    critical_display = skill_norm.detect_critical(req_known_norm)
    critical_norm = [skill_norm.normalize_one_norm(x, allow_unknown=False) for x in critical_display]
    critical_norm = sorted(list({x for x in critical_norm if x}))

    loc = j.get("location") or {}
    city = clean_text((loc or {}).get("city"))
    country = clean_text((loc or {}).get("country"))

    return {
        "source_updated_at": get_job_updated_at(j),
        "visibility": VISIBILITY,

        "job_title": clean_text(j.get("title")),
        "job_company_name": clean_text(j.get("company_name")),
        "job_experience_min": extract_job_experience_min(j),

        "job_type": clean_text(j.get("job_type")),
        "job_work_location": clean_text(j.get("work_location")),
        "job_seniority_level": clean_text(j.get("seniority_level")),

        "job_location_city": city,
        "job_location_country": country,

        "job_required_skills_known_display": req_known_display,
        "job_required_skills_known_norm": req_known_norm,
        "job_required_skills_unknown_norm": req_unknown_norm,

        "job_critical_skills_display": critical_display,
        "job_critical_skills_norm": critical_norm,

        "job_required_skill_count": len(req_known_norm),
        "job_unknown_skill_count": len(req_unknown_norm),
        "job_critical_skill_count": len(critical_norm),

        "is_active": True,
        "status": clean_text(j.get("status")) or "approved",
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
        parts.append("DESCRIPTION:\n" + desc[:2500])

    req_lines = _requirements_to_lines(j.get("requirements"))
    if req_lines:
        parts.append("REQUIREMENTS:\n" + "\n".join([f"- {x}" for x in req_lines])[:2500])

    return "\n".join([p for p in parts if clean_text(p)])


def _doc_id(job_id: ObjectId, idx: int) -> str:
    return f"{DOC_TYPE}::{str(job_id)}::{idx}"


def _need_index(job_id: ObjectId, src_upd: Any) -> bool:
    one = rag_col.find_one(
        {"metadata.doc_type": DOC_TYPE, "metadata.job_id": job_id},
        {"metadata.source_updated_at": 1},
    )
    if one is None:
        return True
    old_upd = (one.get("metadata") or {}).get("source_updated_at")
    return old_upd is None or str(old_upd) != str(src_upd)


def index_one_job(job: dict) -> int:
    job_id = job.get("_id")
    if not isinstance(job_id, ObjectId):
        return 0
    if not job_is_valid(job):
        return 0

    facts = extract_job_facts(job)
    src_upd = facts.get("source_updated_at")

    if INDEX_MODE != "full" and not _need_index(job_id, src_upd):
        return 0

    text = build_job_context_text(job, facts)
    chunks = chunk_words(text, chunk_words=JOB_CHUNK_WORDS, overlap_words=JOB_OVERLAP_WORDS) or ["Job posting (empty)"]
    chunks = [clean_text(x) for x in chunks if clean_text(x)]

    embeddings = embed_model.encode(chunks, normalize_embeddings=True)

    ops = []
    for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        doc = {
            "_id": _doc_id(job_id, idx),
            "text": chunk,
            "embedding": emb.tolist(),
            "metadata": {
                "doc_type": DOC_TYPE,
                "source_id": job_id,
                "job_id": job_id,
                "chunk_index": idx,
                **facts,
            },
            "created_at": now_utc(),
        }
        ops.append(UpdateOne({"_id": doc["_id"]}, {"$set": doc}, upsert=True))

    if ops:
        rag_col.bulk_write(ops, ordered=False)

    # cleanup extra old chunks
    rag_col.delete_many(
        {"metadata.doc_type": DOC_TYPE, "metadata.job_id": job_id, "metadata.chunk_index": {"$gte": len(ops)}}
    )
    return len(ops)


def sync_jobs(*, limit: Optional[int] = None, job_id: Optional[str] = None) -> None:
    print("\n=== SYNC JOBS -> rag_chunks START (V3) ===")

    q: Dict[str, Any] = {"is_active": True, "status": "approved"}
    if job_id:
        try:
            q["_id"] = ObjectId(job_id)
        except Exception:
            raise RuntimeError("job_id is not a valid ObjectId")

    count = 0
    upserted_chunks = 0

    cursor = jobs_col.find(q)
    for job in cursor:
        if limit and count >= limit:
            break
        n = index_one_job(job)
        upserted_chunks += n
        count += 1

        if (count % 20) == 0 and not job_id:
            print(f"... processed {count} jobs")

    # Optional cleanup (only for full sync; avoid deleting on single-job realtime)
    if not job_id and INDEX_MODE == "full":
        indexed_job_ids = rag_col.distinct("metadata.job_id", {"metadata.doc_type": DOC_TYPE})
        indexed_job_ids = [x for x in indexed_job_ids if isinstance(x, ObjectId)]
        valid_ids = set(jobs_col.distinct("_id", {"is_active": True, "status": "approved"}))
        invalid_ids = [jid for jid in indexed_job_ids if jid not in valid_ids]
        if invalid_ids:
            res = rag_col.delete_many({"metadata.doc_type": DOC_TYPE, "metadata.job_id": {"$in": invalid_ids}})
            print(f"🧹 Deleted invalid/missing jobs: {len(invalid_ids)} jobs, deleted_docs={res.deleted_count}")

    print(f"DONE: jobs={count}, upserted_chunks={upserted_chunks}")
    print("=== SYNC JOBS -> rag_chunks END ===\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--job_id", type=str, default=None, help="Only sync 1 job ObjectId")
    args = ap.parse_args()
    sync_jobs(limit=args.limit, job_id=args.job_id)
