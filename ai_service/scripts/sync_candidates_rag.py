# scripts/sync_candidates_rag.py (V3 - facts_layer v3 compat, realtime-ready)
from __future__ import annotations

import argparse
import os
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
CANDIDATES_COLLECTION = os.getenv("CANDIDATE_COLLECTION", "candidates")

DOC_TYPE = "candidate_profile"
INDEX_MODE = os.getenv("RAG_SYNC_MODE", "incremental")  # full | incremental

CHUNK_WORDS = int(os.getenv("CAND_CHUNK_WORDS", "220"))
OVERLAP_WORDS = int(os.getenv("CAND_OVERLAP_WORDS", "40"))

# Skills config path fallback: config/skills.json -> skills.json
SKILLS_PATH = os.getenv("SKILLS_JSON_PATH", os.path.join(PROJECT_ROOT, "config", "skills.json"))
if not os.path.exists(SKILLS_PATH):
    SKILLS_PATH = os.path.join(PROJECT_ROOT, "skills.json")

print("Loading embedding model BAAI/bge-m3...")
embed_model = SentenceTransformer("BAAI/bge-m3", device="cpu")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
candidates_col = db[CANDIDATES_COLLECTION]
rag_col = db[RAG_COLLECTION]

skill_norm = SkillNormalizer(config_path=SKILLS_PATH)


def pick_updated_at(c: dict) -> Any:
    return c.get("updated_at") or c.get("updatedAt") or c.get("created_at") or c.get("createdAt") or now_utc()


def _doc_id(candidate_id: ObjectId, idx: int) -> str:
    return f"{DOC_TYPE}::{str(candidate_id)}::{idx}"


def _need_index(candidate_id: ObjectId, src_upd: Any) -> bool:
    one = rag_col.find_one(
        {"metadata.doc_type": DOC_TYPE, "metadata.candidate_id": candidate_id},
        {"metadata.source_updated_at": 1},
    )
    if one is None:
        return True
    old_upd = (one.get("metadata") or {}).get("source_updated_at")
    return old_upd is None or str(old_upd) != str(src_upd)


def extract_candidate_raw_skills(c: dict) -> Dict[str, List[str]]:
    profile_skills: List[str] = []
    exp_skills: List[str] = []

    # 1) structured profile skills (tolerate multiple schemas)
    for s in (c.get("skills_detailed") or []):
        nm = None
        if isinstance(s, dict):
            nm = (s or {}).get("skill_name") or (s or {}).get("skillName") or (s or {}).get("name")
        else:
            nm = s
        if nm:
            profile_skills.append(str(nm))

    # 2) experience technologies
    for e in (c.get("experience") or []):
        if not isinstance(e, dict):
            continue
        techs = (e or {}).get("technologies") or (e or {}).get("tech_stack") or (e or {}).get("techStack") or []
        if isinstance(techs, str):
            techs = [x.strip() for x in techs.split(",") if x.strip()]
        if isinstance(techs, list):
            for t in techs:
                if t:
                    exp_skills.append(str(t))

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

    # Fallback: detect skills embedded in long free text (VN sentences often hide skills)
    blob_parts: List[str] = [clean_text(c.get("bio")), clean_text(c.get("summary"))]
    for e in (c.get("experience") or []):
        if not isinstance(e, dict):
            continue
        blob_parts.append(clean_text((e or {}).get("position")))
        blob_parts.append(clean_text((e or {}).get("company_name") or (e or {}).get("companyName")))
        blob_parts.append(clean_text((e or {}).get("description")))
    detected_ids = skill_norm.detect_in_text("\n".join([x for x in blob_parts if x]))

    all_skill_tokens = raw["profile"] + raw["experience"] + detected_ids

    skills_known_display, skills_known_norm, skills_unknown_norm = skill_norm.classify_many_norm(all_skill_tokens, dedup=True)

    exp_known_display, exp_known_norm, exp_unknown_norm = skill_norm.classify_many_norm(
        raw["experience"], dedup=True
    )

    primary_raw: List[str] = []
    for s in (c.get("skills_detailed") or []):
        if isinstance(s, dict) and (s or {}).get("is_primary") is True:
            nm = (s or {}).get("skill_name") or (s or {}).get("skillName") or (s or {}).get("name")
            if nm:
                primary_raw.append(str(nm))
    primary_known_display, primary_known_norm, primary_unknown_norm = skill_norm.classify_many_norm(
        [x for x in primary_raw if x], dedup=True
    )

    years_exp = c.get("experience_years")
    try:
        years_exp = int(years_exp) if years_exp is not None else None
    except Exception:
        years_exp = None

    city = clean_text(c.get("city"))
    edu = clean_text(c.get("education_level"))
    status = clean_text(c.get("job_status"))

    return {
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
        "city": city,
        "education_level": edu,
        "job_status": status,

        "source_updated_at": pick_updated_at(c),
        # simple filter helpers for retrieval
        "visibility": "private",  # candidate profile usually private
    }


def build_candidate_context_text(c: dict, facts: Dict[str, Any]) -> str:
    parts: List[str] = []

    # facts summary: short + stable for LLM
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
        parts.append("BIO:\n" + bio[:1200])

    for e in (c.get("experience") or []):
        pos = clean_text((e or {}).get("position"))
        comp = clean_text((e or {}).get("company_name"))
        if not pos and not comp:
            continue
        line = f"{pos} at {comp}".strip()
        techs = (e or {}).get("technologies") or []
        if techs:
            line += " | Tech: " + ", ".join([clean_text(t) for t in techs if clean_text(t)])
        desc = clean_text((e or {}).get("description"))
        if desc:
            line += " | " + desc[:800]
        parts.append(line)

    return "\n".join([p for p in parts if clean_text(p)])


def index_one_candidate(c: dict) -> int:
    cid = c.get("_id")
    if not isinstance(cid, ObjectId):
        return 0

    facts = extract_candidate_facts(c)
    src_upd = facts.get("source_updated_at")

    if INDEX_MODE != "full" and not _need_index(cid, src_upd):
        return 0

    # chunks
    text = build_candidate_context_text(c, facts)
    chunks = chunk_words(text, chunk_words=CHUNK_WORDS, overlap_words=OVERLAP_WORDS) or ["Candidate profile (empty)"]
    chunks = [clean_text(x) for x in chunks if clean_text(x)]

    embeddings = embed_model.encode(chunks, normalize_embeddings=True)

    ops = []
    for idx, (t, emb) in enumerate(zip(chunks, embeddings)):
        doc = {
            "_id": _doc_id(cid, idx),
            "text": t,
            "embedding": emb.tolist(),
            "metadata": {
                "doc_type": DOC_TYPE,
                "candidate_id": cid,
                "source_id": cid,
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
        {
            "metadata.doc_type": DOC_TYPE,
            "metadata.candidate_id": cid,
            "metadata.chunk_index": {"$gte": len(ops)},
        }
    )
    return len(ops)


def sync_candidates(*, limit: Optional[int] = None, candidate_id: Optional[str] = None) -> None:
    print("\n=== SYNC CANDIDATES -> rag_chunks START (V3) ===")

    q: Dict[str, Any] = {}
    if candidate_id:
        try:
            q["_id"] = ObjectId(candidate_id)
        except Exception:
            raise RuntimeError("candidate_id is not a valid ObjectId")

    count = 0
    upserted_chunks = 0

    for c in candidates_col.find(q):
        if limit and count >= limit:
            break
        n = index_one_candidate(c)
        upserted_chunks += n
        count += 1

        if (count % 20) == 0 and not candidate_id:
            print(f"... processed {count} candidates")

    print(f"DONE: candidates={count}, upserted_chunks={upserted_chunks}")
    print("=== SYNC CANDIDATES -> rag_chunks END ===\n")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--candidate_id", type=str, default=None, help="Only sync 1 candidate ObjectId")
    args = ap.parse_args()
    sync_candidates(limit=args.limit, candidate_id=args.candidate_id)
