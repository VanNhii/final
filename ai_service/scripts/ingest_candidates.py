# scripts/ingest_candidates.py (V5 - SOTA)
from __future__ import annotations

import os
import re
import sys
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
    normalize_city,
)

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "datn_1")

CANDIDATE_COLLECTION = "candidates"
RAG_COLLECTION = os.getenv("RAG_COLLECTION", "rag_chunks")

DOC_TYPE = "candidate_profile"
CHUNK_WORDS = int(os.getenv("CAND_CHUNK_WORDS", "220"))
OVERLAP_WORDS = int(os.getenv("CAND_OVERLAP_WORDS", "40"))

INDEX_MODE = os.getenv("RAG_SYNC_MODE", "incremental")  # full | incremental
LOG_EVERY = int(os.getenv("RAG_LOG_EVERY", "50"))

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
print(f"Loading embedding model {EMBEDDING_MODEL}...")
embedder = SentenceTransformer(EMBEDDING_MODEL, device="cpu")

if not MONGODB_URI:
    raise RuntimeError("Missing MONGODB_URI")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
cand_col = db[CANDIDATE_COLLECTION]
rag_col = db[RAG_COLLECTION]

# Skills config path fallback: config/skills.json -> skills.json
SKILLS_PATH = os.getenv("SKILLS_JSON_PATH", os.path.join(PROJECT_ROOT, "config", "skills.json"))
if not os.path.exists(SKILLS_PATH):
    SKILLS_PATH = os.path.join(PROJECT_ROOT, "skills.json")

skill_norm = SkillNormalizer(config_path=SKILLS_PATH)

NO_SPLIT_MARKERS = ("ci/cd", "qa/qc", "ui/ux", "r&d")
SPLIT_RE = re.compile(r"\s*(?:/|,|\||&)\s*")


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


def append_skill_terms(target: List[str], value: Any) -> None:
    if value is None:
        return
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                name = (
                    item.get("skill_name")
                    or item.get("skillName")
                    or item.get("name")
                    or item.get("skill")
                    or ""
                )
                for part in split_skill_terms(name):
                    target.append(part)
            else:
                for part in split_skill_terms(item):
                    target.append(part)
        return
    for part in split_skill_terms(value):
        target.append(part)


def _get_updated_at(c: dict) -> Any:
    return c.get("updated_at") or c.get("updatedAt") or c.get("created_at") or c.get("createdAt")


def needs_reindex(candidate_id: ObjectId, source_updated_at: Any) -> bool:
    one = rag_col.find_one(
        {"metadata.doc_type": DOC_TYPE, "metadata.candidate_id": candidate_id},
        {"metadata.source_updated_at": 1},
    )
    if one is None:
        return True
    old = ((one.get("metadata") or {}).get("source_updated_at"))
    return str(old) != str(source_updated_at)


def extract_candidate_raw_skills(c: dict) -> Dict[str, List[str]]:
    profile_skills: List[str] = []
    exp_skills: List[str] = []

    # Handle both snake_case and camelCase field names
    skills_detailed = c.get("skills_detailed") or c.get("skillsDetailed") or []
    for s in skills_detailed:
        if not isinstance(s, dict):
            continue
        nm = (s.get("skill_name") or s.get("skillName") or s.get("name") or "").strip()
        if nm:
            append_skill_terms(profile_skills, nm)

    # Legacy/simple skill arrays
    append_skill_terms(profile_skills, c.get("skills") or [])
    append_skill_terms(profile_skills, c.get("skills_display") or c.get("skillsDisplay") or [])
    append_skill_terms(profile_skills, c.get("skills_summary") or c.get("skillsSummary") or "")

    # Handle experience technologies
    experience = c.get("experience") or []
    for e in experience:
        if not isinstance(e, dict):
            continue
        techs = (e.get("technologies") or [])
        append_skill_terms(exp_skills, techs)

    projects = c.get("projects") or []
    if isinstance(projects, list):
        for p in projects:
            if not isinstance(p, dict):
                continue
            append_skill_terms(profile_skills, p.get("technologies") or p.get("tech_stack") or [])
            append_skill_terms(profile_skills, p.get("skills") or p.get("tags") or [])

    return {"profile": profile_skills, "experience": exp_skills}


def infer_seniority(years_exp: Optional[int]) -> Optional[str]:
    if years_exp is None:
        return None
    if years_exp < 2:
        return "junior"
    if years_exp < 5:
        return "mid"
    return "senior"


def extract_candidate_facts(c: dict) -> Dict[str, Any]:
    raw = extract_candidate_raw_skills(c)
    
    # Debug: log raw skills found
    if not raw["profile"] and not raw["experience"]:
        # Only log if we're in debug mode or if this is a problem case
        pass

    # Robust detection from free text (bio + experience) to avoid empty skills when structured fields are missing.
    blob_parts: List[str] = []
    bio = clean_text(c.get("bio") or "")
    if bio:
        blob_parts.append(bio)
    experience = c.get("experience") or []
    for e in experience:
        if not isinstance(e, dict):
            continue
        # Handle both snake_case and camelCase
        blob_parts.append(clean_text(e.get("position") or ""))
        blob_parts.append(clean_text(e.get("company_name") or e.get("companyName") or ""))
        blob_parts.append(clean_text(e.get("description") or ""))
        techs = e.get("technologies") or []
        if isinstance(techs, list):
            blob_parts.extend([clean_text(t) for t in techs if clean_text(t)])

    projects = c.get("projects") or []
    if isinstance(projects, list):
        for p in projects:
            if not isinstance(p, dict):
                continue
            blob_parts.append(clean_text(p.get("name") or p.get("title") or ""))
            blob_parts.append(clean_text(p.get("role") or ""))
            blob_parts.append(clean_text(p.get("description") or ""))
            blob_parts.append(clean_text(p.get("summary") or ""))
            techs = p.get("technologies") or p.get("tech_stack") or []
            if isinstance(techs, list):
                blob_parts.extend([clean_text(t) for t in techs if clean_text(t)])

    detected_ids = skill_norm.detect_in_text("\n".join([x for x in blob_parts if x]))
    # Merge detected canonical ids into raw skill list (keep dedup in classify)
    raw_detected_display = [skill_norm.display_from_norm(sid) for sid in detected_ids]

    all_raw = (raw["profile"] + raw["experience"] + raw_detected_display)

    skills_known_display, skills_known_norm, skills_unknown_norm = skill_norm.classify_many_norm(all_raw, dedup=True)

    exp_known_display, exp_known_norm, exp_unknown_norm = skill_norm.classify_many_norm(
        raw["experience"] + raw_detected_display, dedup=True
    )

    # Extract primary skills - handle both snake_case and camelCase
    skills_detailed = c.get("skills_detailed") or c.get("skillsDetailed") or []
    primary_raw = []
    for s in skills_detailed:
        if not isinstance(s, dict):
            continue
        is_primary = s.get("is_primary") or s.get("isPrimary") or False
        if is_primary is True:
            nm = (s.get("skill_name") or s.get("skillName") or s.get("name") or "").strip()
            if nm:
                primary_raw.append(nm)
    primary_known_display, primary_known_norm, primary_unknown_norm = skill_norm.classify_many_norm(
        [x for x in primary_raw if x], dedup=True
    )

    # Handle both snake_case and camelCase for years_exp
    years_exp = c.get("experience_years") or c.get("experienceYears")
    try:
        years_exp = int(years_exp) if years_exp is not None else None
    except Exception:
        years_exp = None

    city = clean_text(c.get("city") or "")
    return {
        "visibility": "private",
        "city": city,
        "city_norm": normalize_city(city),
        "education_level": clean_text(c.get("education_level") or c.get("educationLevel") or ""),
        "job_status": clean_text(c.get("job_status") or c.get("jobStatus") or ""),

        "skills_known_display": skills_known_display,
        "skills_known_norm": skills_known_norm,
        "skills_unknown_norm": skills_unknown_norm,

        "skills_from_experience_known_display": exp_known_display,
        "skills_from_experience_known_norm": exp_known_norm,
        "skills_from_experience_unknown_norm": exp_unknown_norm,

        "primary_skills_known_display": primary_known_display,
        "primary_skills_known_norm": primary_known_norm,
        "primary_skills_unknown_norm": primary_unknown_norm,

        "total_skill_count": len(skills_known_norm),
        "primary_skill_count": len(primary_known_norm),

        "years_exp": years_exp,
        "seniority_hint": infer_seniority(years_exp),

        "source_updated_at": _get_updated_at(c) or now_utc(),
    }


def build_profile_context_text(c: dict, facts: Dict[str, Any]) -> str:
    parts: List[str] = []

    parts.append(
        f"""
FACTS SUMMARY:
- City: {facts.get('city')}
- Years Experience: {facts.get('years_exp')}
- Seniority: {facts.get('seniority_hint')}
- Job Status: {facts.get('job_status')}
- Primary Skills: {", ".join(facts.get("primary_skills_known_display") or [])}
- Skills (Experience): {", ".join(facts.get("skills_from_experience_known_display") or [])}
""".strip()
    )

    bio = clean_text(c.get("bio"))
    if bio:
        parts.append("BIO:\n" + bio[:1500])

    experience = c.get("experience") or []
    for e in experience:
        if not isinstance(e, dict):
            continue
        # Handle both snake_case and camelCase
        pos = clean_text(e.get("position") or "")
        comp = clean_text(e.get("company_name") or e.get("companyName") or "")
        if not pos and not comp:
            continue
        line = f"{pos} at {comp}".strip()
        techs = e.get("technologies") or []
        if techs:
            line += " | Tech: " + ", ".join([clean_text(t) for t in techs if clean_text(t)])
        desc = clean_text(e.get("description") or "")
        if desc:
            line += " | " + desc[:900]
        parts.append(line)

    return "\n".join([p for p in parts if clean_text(p)])


def index_one_candidate(c: dict) -> int:
    cid = c.get("_id")
    if not isinstance(cid, ObjectId):
        return 0

    facts = extract_candidate_facts(c)

    if INDEX_MODE != "full" and not needs_reindex(cid, facts.get("source_updated_at")):
        return 0

    rag_col.delete_many({"metadata.doc_type": DOC_TYPE, "metadata.candidate_id": cid})

    text = build_profile_context_text(c, facts)
    chunks = chunk_words(text, CHUNK_WORDS, OVERLAP_WORDS) or ["Candidate profile (empty)"]
    embeddings = embedder.encode(chunks, normalize_embeddings=True)

    docs = []
    for idx, (t, emb) in enumerate(zip(chunks, embeddings)):
        docs.append(
            {
                "_id": f"{DOC_TYPE}::{cid}::{idx}",
                "text": t,
                "embedding": emb.tolist(),
                "metadata": {
                    "doc_type": DOC_TYPE,
                    "candidate_id": cid,
                    "chunk_index": idx,
                    **facts,
                },
                "created_at": now_utc(),
            }
        )

    if docs:
        rag_col.insert_many(docs)

    # Enhanced logging with more details
    total_skills = facts.get('total_skill_count', 0)
    primary_skills = facts.get('primary_skill_count', 0)
    known_display = facts.get('skills_known_display', [])
    primary_display = facts.get('primary_skills_known_display', [])
    unknown_norm = facts.get('skills_unknown_norm', [])
    
    if total_skills == 0:
        # Debug: show what we tried to extract
        raw = extract_candidate_raw_skills(c)
        unknown_preview = ", ".join(unknown_norm[:5]) if unknown_norm else "none"
        raw_preview = ", ".join((raw['profile'] + raw['experience'])[:5]) if (raw['profile'] + raw['experience']) else "none"
        print(f"⚠️  Indexed Candidate: {cid} | skills=0 | primary=0 | raw_profile={len(raw['profile'])} | raw_exp={len(raw['experience'])} | raw_skills=[{raw_preview}] | unknown=[{unknown_preview}]")
    else:
        skill_preview = ", ".join(known_display[:5]) if known_display else "none"
        primary_preview = ", ".join(primary_display[:3]) if primary_display else "none"
        unknown_count = len(unknown_norm)
        unknown_info = f" | unknown={unknown_count}" if unknown_count > 0 else ""
        print(f"✅ Indexed Candidate: {cid} | skills={total_skills} | primary={primary_skills} | preview=[{skill_preview}]{unknown_info} | primary_preview=[{primary_preview}]")
    
    return len(docs)


def sync_candidates(limit: Optional[int] = None) -> None:
    print("\n=== INGEST CANDIDATES (V5) ===")
    n, chunks, scanned = 0, 0, 0

    for c in cand_col.find({}):
        scanned += 1
        if limit and n >= limit:
            break
        inserted = index_one_candidate(c)
        if inserted:
            n += 1
            chunks += inserted
        if scanned % LOG_EVERY == 0:
            print(f"... scanned={scanned}, reindexed={n}, chunks={chunks}")

    print(f"DONE: scanned={scanned}, candidates={n}, chunks={chunks}")


if __name__ == "__main__":
    sync_candidates()
