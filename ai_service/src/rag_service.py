# src/rag_service.py (V5 - Hybrid RAG + Sessions + Fit)
from __future__ import annotations

import os
import re
import uuid
import json
from datetime import timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from bson import ObjectId
from pymongo import MongoClient
from pymongo.collection import Collection

from sentence_transformers import SentenceTransformer

# Optional cross-encoder reranker (adds "wow" factor for judge). If unavailable, we fall back to embedding rerank.
try:
    from sentence_transformers import CrossEncoder  # type: ignore
except Exception:  # pragma: no cover
    CrossEncoder = None  # type: ignore

from .facts_layer import (
    SkillNormalizer,
    clean_text,
    now_utc,
    norm_basic,
)
from .chat_prefs import ChatPrefs


def _to_oid(x: Any) -> Optional[ObjectId]:
    if x is None:
        return None
    if isinstance(x, ObjectId):
        return x
    s = clean_text(x)
    try:
        return ObjectId(s)
    except Exception:
        return None


def _dedupe_keep_order(items: Iterable[str]) -> List[str]:
    seen = set()
    out = []
    for x in items or []:
        x = clean_text(x)
        if not x:
            continue
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


class RAGService:
    def __init__(self):
        mongo_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("MONGODB_DB_NAME", "datn_1")

        rag_col_name = os.getenv("RAG_COLLECTION", "rag_chunks")
        sess_col_name = os.getenv("RAG_SESSIONS_COLLECTION", "rag_sessions")

        if not mongo_uri:
            raise RuntimeError("Missing MONGODB_URI")

        self.client = MongoClient(mongo_uri, tz_aware=True, tzinfo=timezone.utc)
        self.db = self.client[db_name]

        self.rag_col: Collection = self.db[rag_col_name]
        self.sessions_col: Collection = self.db[sess_col_name]

        self.vector_index = os.getenv("VECTOR_INDEX_NAME", "vector_index")
        self.text_index = os.getenv("TEXT_INDEX_NAME", "rag_text_index")
        self.vector_path = os.getenv("VECTOR_PATH", "embedding")

        self.hybrid_alpha = float(os.getenv("HYBRID_ALPHA", "0.55"))
        self.first_stage_k = int(os.getenv("CANDIDATE_RETRIEVE_K", "50"))
        self.rerank_topk = int(os.getenv("RERANK_TOPK", "10"))

        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
        self._embedder: Optional[SentenceTransformer] = None

        # Accept both env names to avoid mismatched configs between scripts and runtime
        skills_path = os.getenv("SKILLS_JSON_PATH") or os.getenv("SKILLS_CONFIG_PATH") or "./config/skills.json"
        self.skill_norm = SkillNormalizer(config_path=skills_path)

        # Optional reranker (CrossEncoder). Enable by setting RERANK_MODEL (e.g. "cross-encoder/ms-marco-MiniLM-L-6-v2").
        self.rerank_model_name = os.getenv("RERANK_MODEL", "").strip()
        self._reranker = None

    # ----------------------------
    # Index / Session helpers
    # ----------------------------
    def ensure_indexes(self) -> None:
        # TTL index for sessions: expire at expires_at
        try:
            self.sessions_col.create_index("expires_at", expireAfterSeconds=0, name="ttl_expires_at")
        except Exception:
            pass
        # helpful lookup indexes for rag_chunks (non-Atlas)
        try:
            self.rag_col.create_index([("metadata.doc_type", 1), ("metadata.job_id", 1), ("metadata.chunk_index", 1)], name="job_chunks_lookup")
            self.rag_col.create_index([("metadata.doc_type", 1), ("metadata.candidate_id", 1), ("metadata.chunk_index", 1)], name="candidate_chunks_lookup")
            self.rag_col.create_index([("metadata.doc_type", 1), ("metadata.source_updated_at", 1)], name="rag_incremental_sync")
            # Indexes for filter fields used in vector search
            self.rag_col.create_index([("metadata.job_location_city_norm", 1)], name="job_city_norm_filter")
            self.rag_col.create_index([("metadata.job_work_location_norm", 1)], name="job_work_location_norm_filter")
            self.rag_col.create_index([("metadata.city_norm", 1)], name="candidate_city_norm_filter")
        except Exception:
            pass

    def start_session(self, kind: str, payload: Optional[dict] = None, ttl_minutes: int = 45) -> Dict[str, Any]:
        session_id = uuid.uuid4().hex
        now = now_utc()
        doc = {
            "session_id": session_id,
            "kind": kind,
            "payload": payload or {},
            "messages": [],
            "created_at": now,
            "expires_at": now + timedelta(minutes=ttl_minutes),
        }
        self.sessions_col.insert_one(doc)
        return {"session_id": session_id}

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if not session_id:
            return None
        return self.sessions_col.find_one({"session_id": session_id})

    def update_session_payload(self, session_id: str, patch: Dict[str, Any]) -> None:
        if not session_id:
            return
        sess = self.get_session(session_id) or {}
        payload = dict(sess.get("payload") or {})
        payload.update(patch or {})
        self.sessions_col.update_one({"session_id": session_id}, {"$set": {"payload": payload}})

    def append_message(self, session_id: str, role: str, content: str) -> None:
        if not session_id:
            return
        self.sessions_col.update_one(
            {"session_id": session_id},
            {"$push": {"messages": {"at": now_utc(), "role": role, "content": clean_text(content)}}},
        )

    # ----------------------------
    # Embedder / scoring
    # ----------------------------
    def _get_embedder(self) -> SentenceTransformer:
        if self._embedder is None:
            self._embedder = SentenceTransformer(self.embedding_model_name, device="cpu")
        return self._embedder

    def _get_reranker(self):
        """Lazy-load optional CrossEncoder reranker."""
        if not self.rerank_model_name:
            return None
        if self._reranker is not None:
            return self._reranker
        if CrossEncoder is None:
            # sentence_transformers CrossEncoder not available in env
            self._reranker = None
            return None
        try:
            self._reranker = CrossEncoder(self.rerank_model_name, device=os.getenv("RERANK_DEVICE", "cpu"))
        except Exception:
            self._reranker = None
        return self._reranker

    def _cross_rerank(self, query: str, hits: List[Dict[str, Any]], topk: Optional[int] = None) -> List[Dict[str, Any]]:
        """Rerank hit list using CrossEncoder if enabled; otherwise return original list."""
        reranker = self._get_reranker()
        if reranker is None:
            return hits

        topk = topk or self.rerank_topk
        sliced = hits[: max(1, min(topk, len(hits)))]
        pairs = [(query, clean_text(h.get("text") or "")) for h in sliced]
        try:
            scores = reranker.predict(pairs)
        except Exception:
            return hits
        for h, s in zip(sliced, scores):
            h["rerank_score"] = float(s)
        sliced.sort(key=lambda x: x.get("rerank_score", 0.0), reverse=True)
        # keep tail after topk in original order
        return sliced + hits[len(sliced):]

    def embed(self, text: str) -> List[float]:
        emb = self._get_embedder().encode([clean_text(text)], normalize_embeddings=True)[0]
        return emb.tolist()

    def _cos(self, a: List[float], b: List[float]) -> float:
        # a,b normalized => dot
        return sum(x * y for x, y in zip(a, b))

    # ----------------------------
    # Meta fetch (facts)
    # ----------------------------
    def get_job_meta(self, job_id: str) -> Optional[Dict[str, Any]]:
        oid = _to_oid(job_id)
        if not oid:
            return None
        doc = self.rag_col.find_one({"metadata.doc_type": "job", "metadata.job_id": oid, "metadata.chunk_index": 0})
        return (doc or {}).get("metadata") if doc else None

    def get_candidate_meta(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        oid = _to_oid(candidate_id)
        if not oid:
            return None
        doc = self.rag_col.find_one({"metadata.doc_type": "candidate_profile", "metadata.candidate_id": oid, "metadata.chunk_index": 0})
        return (doc or {}).get("metadata") if doc else None

    def get_candidates_meta_batch(self, candidate_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        oids = [x for x in (_to_oid(i) for i in (candidate_ids or [])) if x]
        if not oids:
            return {}
        cur = self.rag_col.find(
            {"metadata.doc_type": "candidate_profile", "metadata.candidate_id": {"$in": oids}, "metadata.chunk_index": 0},
            {"metadata": 1},
        )
        out: Dict[str, Dict[str, Any]] = {}
        for d in cur:
            md = d.get("metadata") or {}
            cid = md.get("candidate_id")
            if cid:
                out[str(cid)] = md
        return out

    # ----------------------------
    # Retrieval: Atlas Vector + Atlas Search
    # ----------------------------
    def _filters(self, doc_type: str, visibility: str = "", extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        f: Dict[str, Any] = {"metadata.doc_type": doc_type}
        if visibility:
            f["metadata.visibility"] = visibility
        if extra:
            for k, v in extra.items():
                if v is None:
                    continue
                f[k] = v
        return f

    def vector_search(self, query: str, doc_type: str, visibility: str = "", filters: Optional[Dict[str, Any]] = None, limit: int = 20) -> List[Dict[str, Any]]:
        qemb = self.embed(query)
        flt = self._filters(doc_type, visibility, filters)
        
        # Try with filters first, fallback to no filters if index error
        pipeline = [
            {
                "$vectorSearch": {
                    "index": self.vector_index,
                    "path": self.vector_path,
                    "queryVector": qemb,
                    "numCandidates": max(limit * 6, 50),
                    "limit": limit,
                    "filter": flt,
                }
            },
            {"$project": {"_id": 1, "text": 1, "metadata": 1, "score": {"$meta": "vectorSearchScore"}}},
        ]
        
        try:
            return list(self.rag_col.aggregate(pipeline))
        except Exception as e:
            error_msg = str(e)
            # If filter index error, retry without problematic filters
            if "needs to be indexed as filter" in error_msg or "index" in error_msg.lower():
                # Extract which field needs index
                import re
                field_match = re.search(r"Path '([^']+)' needs to be indexed", error_msg)
                if field_match:
                    problematic_field = field_match.group(1)
                    # Remove problematic field from filter
                    if problematic_field in flt:
                        print(f"⚠️  Warning: Field '{problematic_field}' not indexed, removing from filter. Please run create_atlas_indexes.py")
                        del flt[problematic_field]
                        # Retry without problematic filter
                        pipeline[0]["$vectorSearch"]["filter"] = flt
                        try:
                            return list(self.rag_col.aggregate(pipeline))
                        except Exception:
                            # Last resort: no filters except doc_type and visibility
                            basic_flt = {"metadata.doc_type": doc_type}
                            if visibility:
                                basic_flt["metadata.visibility"] = visibility
                            pipeline[0]["$vectorSearch"]["filter"] = basic_flt
                            return list(self.rag_col.aggregate(pipeline))
                # Fallback: try without any extra filters
                basic_flt = {"metadata.doc_type": doc_type}
                if visibility:
                    basic_flt["metadata.visibility"] = visibility
                pipeline[0]["$vectorSearch"]["filter"] = basic_flt
                return list(self.rag_col.aggregate(pipeline))
            # Re-raise if it's a different error
            raise

    def text_search(self, query: str, doc_type: str, visibility: str = "", filters: Optional[Dict[str, Any]] = None, limit: int = 20) -> List[Dict[str, Any]]:
        flt = []
        flt.append({"equals": {"path": "metadata.doc_type", "value": doc_type}})
        if visibility:
            flt.append({"equals": {"path": "metadata.visibility", "value": visibility}})

        # extra filters: only support equality
        for k, v in (filters or {}).items():
            # expecting metadata.xxx
            if k.startswith("metadata.") and v is not None:
                flt.append({"equals": {"path": k, "value": v}})

        pipeline = [
            {
                "$search": {
                    "index": self.text_index,
                    "compound": {
                        "filter": flt,
                        "should": [
                            {"text": {"query": query, "path": ["text"], "fuzzy": {"maxEdits": 1}}},
                            {"text": {"query": query, "path": ["metadata.job_title", "metadata.job_company_name", "metadata.primary_skills_known_display"], "fuzzy": {"maxEdits": 1}}},
                        ],
                    },
                }
            },
            {"$limit": limit},
            {"$project": {"_id": 1, "text": 1, "metadata": 1, "score": {"$meta": "searchScore"}}},
        ]
        return list(self.rag_col.aggregate(pipeline))

    def hybrid_search(self, query: str, doc_type: str, visibility: str = "", filters: Optional[Dict[str, Any]] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Combine vector + text results with Reciprocal Rank Fusion (RRF).
        """
        v = self.vector_search(query, doc_type, visibility, filters, limit=max(limit * 2, 20))
        k = self.text_search(query, doc_type, visibility, filters, limit=max(limit * 2, 20))

        # RRF
        scores: Dict[str, float] = {}
        items: Dict[str, Dict[str, Any]] = {}

        def add_ranked(lst: List[Dict[str, Any]], weight: float) -> None:
            for rank, it in enumerate(lst, start=1):
                _id = str(it.get("_id"))
                items[_id] = it
                scores[_id] = scores.get(_id, 0.0) + weight * (1.0 / (60.0 + rank))

        add_ranked(v, self.hybrid_alpha)
        add_ranked(k, 1.0 - self.hybrid_alpha)

        ranked_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:limit]
        out: List[Dict[str, Any]] = []
        for _id in ranked_ids:
            it = items[_id]
            it["rrf_score"] = scores[_id]
            out.append(it)
        # optional high-precision rerank for top-N
        return self._cross_rerank(query, out, topk=self.rerank_topk)

    # ----------------------------
    # Chunk fetch + rerank
    # ----------------------------
    def fetch_doc_chunks(self, doc_type: str, id_field: str, oid: ObjectId, limit: int = 40) -> List[str]:
        cur = self.rag_col.find(
            {f"metadata.doc_type": doc_type, f"metadata.{id_field}": oid},
            {"text": 1, "metadata.chunk_index": 1},
        ).sort("metadata.chunk_index", 1).limit(limit)
        return [clean_text(d.get("text")) for d in cur if clean_text(d.get("text"))]

    def topk_rerank_texts(self, query: str, texts: List[str], k: int = 4) -> List[str]:
        """
        Lightweight second-stage rerank by embedding dot product.
        """
        if not texts:
            return []
        qemb = self.embed(query)
        # embed candidates in batch for speed
        embs = self._get_embedder().encode(texts, normalize_embeddings=True)
        scored = []
        for t, e in zip(texts, embs):
            scored.append((float(sum(a*b for a, b in zip(qemb, e.tolist()))), t))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [t for _, t in scored[: max(1, k)]]

    # ----------------------------
    # Fit computation
    # ----------------------------
    def compute_fit(self, job_meta: Dict[str, Any], cand_meta: Dict[str, Any], audience: str = "candidate") -> Dict[str, Any]:
        """
        Deterministic fit score (for judge/demo). LLM later explains it.
        """
        req = set([norm_basic(x) for x in (job_meta.get("job_required_skills_known_norm") or []) if norm_basic(x)])
        crit = set([norm_basic(x) for x in (job_meta.get("job_critical_skills_norm") or []) if norm_basic(x)])

        cand = set([norm_basic(x) for x in (cand_meta.get("skills_known_norm") or []) if norm_basic(x)])
        cand_primary = set([norm_basic(x) for x in (cand_meta.get("primary_skills_known_norm") or []) if norm_basic(x)])

        matched = sorted(list(req & cand))
        missing = sorted(list(req - cand))
        missing_critical = sorted(list(crit - cand))

        # weights
        req_count = max(1, len(req))
        score_req = len(matched) / req_count

        # critical penalty
        crit_pen = 0.0
        if crit:
            crit_pen = len(missing_critical) / max(1, len(crit))

        score = score_req * 100.0 - crit_pen * 25.0
        score = max(0.0, min(100.0, score))

        # experience heuristic
        exp_ok = True
        exp_min = job_meta.get("job_experience_min")
        years = cand_meta.get("years_exp")
        try:
            exp_min_i = int(exp_min) if exp_min is not None else None
        except Exception:
            exp_min_i = None
        try:
            years_i = int(years) if years is not None else None
        except Exception:
            years_i = None
        if exp_min_i is not None and years_i is not None and years_i + 0.5 < exp_min_i:
            exp_ok = False
            score = max(0.0, score - 15.0)

        passed = score >= 65.0 and len(missing_critical) == 0 and exp_ok

        hard_reasons = []
        if not exp_ok:
            hard_reasons.append("Thiếu kinh nghiệm so với yêu cầu tối thiểu")
        if missing_critical:
            hard_reasons.append("Thiếu kỹ năng critical")

        return {
            "score": round(score, 1),
            "passed": bool(passed),
            "matched": [self.skill_norm.display_from_norm(x) for x in matched],
            "missing": [self.skill_norm.display_from_norm(x) for x in missing],
            "missing_critical": [self.skill_norm.display_from_norm(x) for x in missing_critical],
            "hard_reasons": hard_reasons,
        }

    # ----------------------------
    # Value-add layer
    # ----------------------------
    def generate_roadmap_14_days(self, *, missing: List[str], missing_critical: List[str], job_title: str = "") -> List[Dict[str, Any]]:
        """Deterministic 14-day plan driven by missing skills (demo-safe, no hallucination).

        Returns list: [{"day": 1, "task": "...", "focus": "skill"}, ...]
        """
        # Prioritize critical first
        skills = [clean_text(s) for s in (missing_critical + missing) if clean_text(s)]
        # de-dup, preserve order
        seen = set(); ordered: List[str] = []
        for s in skills:
            k = s.lower()
            if k not in seen:
                ordered.append(s)
                seen.add(k)

        if not ordered:
            # When there's nothing missing, propose interview + portfolio polishing
            ordered = ["CV tối ưu", "Portfolio", "System design", "Interview practice"]

        # Simple template bank
        def day_task(skill: str, day: int) -> str:
            if "react" in skill.lower():
                return "Làm 1 mini feature: form + validation + state management (hooks). Viết README nêu decisions."
            if "node" in skill.lower() or "express" in skill.lower() or "nest" in skill.lower():
                return "Tạo 1 REST API nhỏ: auth JWT + CRUD + validation. Có tests tối thiểu."
            if "sql" in skill.lower() or "mysql" in skill.lower() or "postgres" in skill.lower():
                return "Ôn ERD + viết 10 query từ cơ bản đến join/group by/index. Ghi chú best practices."
            if "docker" in skill.lower():
                return "Dockerize project: multi-stage build, docker-compose, env vars. Push repo."
            if "kubernetes" in skill.lower() or "k8s" in skill.lower():
                return "Ôn deployment/service/ingress. Viết manifest mẫu cho một app nhỏ."
            if "aws" in skill.lower() or "gcp" in skill.lower() or "azure" in skill.lower():
                return "Chọn 1 dịch vụ cloud liên quan job; làm 1 lab nhỏ (deploy app / storage / queue)."
            if "system design" in skill.lower() or "microservices" in skill.lower():
                return "Làm 1 bài system design: requirements -> API -> DB -> scaling -> tradeoffs (1 trang)."
            if "testing" in skill.lower() or "qa" in skill.lower() or "pytest" in skill.lower():
                return "Viết test suite tối thiểu: unit + integration. Thiết lập coverage."
            # default
            return f"Ôn kỹ năng **{skill}**: 30 phút học + 60 phút thực hành + 15 phút ghi chú/flashcards."

        plan: List[Dict[str, Any]] = []
        for day in range(1, 15):
            skill = ordered[(day - 1) % len(ordered)]
            task = day_task(skill, day)
            title = clean_text(job_title)
            prefix = f"(Target: {title}) " if title else ""
            plan.append({"day": day, "focus": skill, "task": prefix + task})
        return plan

    def build_interview_pack(self, *, job_title: str, matched: List[str], missing: List[str], missing_critical: List[str]) -> Dict[str, Any]:
        """Generate a deterministic interview simulation pack (questions + scoring rubric)."""
        title = clean_text(job_title) or "vị trí đã chọn"

        focus = [clean_text(x) for x in (missing_critical + missing) if clean_text(x)]
        if not focus:
            focus = ["System design", "Behavioral", "Project deep dive"]

        questions: List[Dict[str, Any]] = []
        for i, sk in enumerate(focus[:6], start=1):
            low = sk.lower()
            if "react" in low:
                q = "Giải thích useEffect dependency array và cách tránh infinite re-render. Cho ví dụ." 
                rub = ["Giải thích đúng lifecycle", "Nêu được stale closure", "Đưa ra ví dụ code"]
            elif "node" in low or "express" in low or "nest" in low:
                q = "Thiết kế API login + refresh token: flow, security, storage, rotation?"
                rub = ["JWT/refresh flow", "Security (XSS/CSRF)", "Error handling + rate limit"]
            elif "sql" in low:
                q = "Khi nào nên dùng index? Hãy phân tích một query chậm và cách tối ưu." 
                rub = ["Explain plan", "Index selectivity", "Tradeoffs write overhead"]
            elif "docker" in low:
                q = "Multi-stage build là gì? Khi nào dùng? Viết một Dockerfile mẫu." 
                rub = ["Build vs runtime image", "Layer caching", "ENV/args best practices"]
            elif "system" in low or "design" in low:
                q = f"System design: thiết kế một hệ thống tìm kiếm job (giống {title}) ở mức high-level." 
                rub = ["Requirements", "Data model", "Scaling + tradeoffs"]
            else:
                q = f"Bạn đã từng dùng {sk} chưa? Hãy mô tả 1 feature bạn làm có liên quan và các tradeoffs." 
                rub = ["Context rõ ràng", "Decision reasoning", "Results/metrics"]

            questions.append({"no": i, "focus": sk, "question": q, "rubric": rub})

        behavioral = [
            {"no": 100, "focus": "Behavioral", "question": "Kể về một lần bạn gặp bug khó và bạn xử lý thế nào?", "rubric": ["Situation-Task-Action-Result", "Học được gì", "Giao tiếp"]},
            {"no": 101, "focus": "Behavioral", "question": "Nếu bị deadline gấp nhưng scope lớn, bạn ưu tiên thế nào?", "rubric": ["Prioritization", "Communication", "Risk management"]},
        ]

        return {
            "title": title,
            "focus_skills": focus[:6],
            "matched_skills": matched[:10],
            "questions": questions + behavioral,
            "how_to_use": "Trả lời từng câu, tự chấm theo rubric (0-2 điểm mỗi tiêu chí).",
        }

    # ----------------------------
    # Suggestions
    # ----------------------------
    def suggest_jobs(self, query: str, limit: int = 5, prefs: Optional[ChatPrefs] = None) -> List[Dict[str, Any]]:
        prefs = prefs or ChatPrefs()
        filters: Dict[str, Any] = {}
        if prefs.city_norm:
            filters["metadata.job_location_city_norm"] = prefs.city_norm
        if prefs.work_location_norm:
            filters["metadata.job_work_location_norm"] = prefs.work_location_norm
        if prefs.avoid_work_location_norm:
            # can't do "not equals" in Atlas filter easily here; we'll post-filter
            pass

        rows = self.hybrid_search(query=query, doc_type="job", visibility="public", filters=filters, limit=max(10, limit * 3))
        # aggregate unique job_ids
        job_map: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            md = r.get("metadata") or {}
            jid = md.get("job_id")
            if not jid:
                continue
            sid = str(jid)
            if sid in prefs.rejected_job_ids:
                continue
            if prefs.avoid_work_location_norm and md.get("job_work_location_norm") == prefs.avoid_work_location_norm:
                continue
            if sid not in job_map:
                job_map[sid] = {
                    "job_id": sid,
                    "title": md.get("job_title"),
                    "company": md.get("job_company_name"),
                    "city": md.get("job_location_city"),
                    "work_location": md.get("job_work_location"),
                    "seniority": md.get("job_seniority_level"),
                    "required_skills": md.get("job_required_skills_known_display") or [],
                }
            if len(job_map) >= limit:
                break
        return list(job_map.values())

    def suggest_jobs_for_candidate(self, candidate_id: str, limit: int = 10, query_hint: str = "", prefs: Optional[ChatPrefs] = None) -> List[Dict[str, Any]]:
        cand = self.get_candidate_meta(candidate_id) or {}
        prefs = prefs or ChatPrefs()
        # build query from candidate primary skills + optional user hint
        skills = (cand.get("primary_skills_known_display") or [])[:8]
        city = cand.get("city") or prefs.city or ""
        query_parts = []
        if query_hint:
            query_parts.append(query_hint)
        if skills:
            query_parts.append(" ".join(skills))
        if city:
            query_parts.append(f"ở {city}")
        q = " ".join([clean_text(x) for x in query_parts if clean_text(x)])
        return self.suggest_jobs(q, limit=limit, prefs=prefs)

    # ----------------------------
    # Prompt builders (friendly UX + chart-ready)
    # ----------------------------
    def build_candidate_prompt(
        self,
        question: str,
        job_meta: Dict[str, Any],
        cand_meta: Dict[str, Any],
        fit: Dict[str, Any],
        job_ctx: List[str],
        cand_ctx: List[str],
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        history = history or []
        history_tail = history[-6:]
        hist_lines = []
        for m in history_tail:
            role = (m.get("role") or "").upper()
            content = m.get("content")
            if role and content:
                hist_lines.append(f"{role}: {content}")

        return f"""
Bạn là trợ lý nghề nghiệp thân thiện, nói tiếng Việt tự nhiên, ngắn gọn nhưng thực tế.
CHỈ dựa trên FACTS (job_meta, cand_meta, fit, context). Không được bịa.

Mục tiêu: trả lời theo nhu cầu user, giúp họ hiểu:
- Fit score (%), passed/failed
- Match/missing (nhấn mạnh missing_critical)
- Lộ trình cải thiện (ngắn, actionable)
- Nếu user hỏi lương/remote/level -> hỏi thêm 1 câu nếu thiếu dữ liệu

User question: {question}

=== FIT (deterministic) ===
{json.dumps(fit, ensure_ascii=False)}

=== JOB FACTS ===
Title: {job_meta.get("job_title")}
Company: {job_meta.get("job_company_name")}
City: {job_meta.get("job_location_city")}
Work location: {job_meta.get("job_work_location")}
Experience min: {job_meta.get("job_experience_min")}
Required skills: {job_meta.get("job_required_skills_known_display") or []}
Critical skills: {job_meta.get("job_critical_skills_display") or []}

=== CANDIDATE FACTS ===
City: {cand_meta.get("city")}
Years exp: {cand_meta.get("years_exp")}
Seniority: {cand_meta.get("seniority_hint")}
Primary skills: {cand_meta.get("primary_skills_known_display") or []}
Skills known: {cand_meta.get("skills_known_display") or []}

=== CONTEXT: Job (top) ===
{chr(10).join(["- "+x for x in job_ctx])}

=== CONTEXT: Candidate (top) ===
{chr(10).join(["- "+x for x in cand_ctx])}

=== CHAT HISTORY (latest 6) ===
{chr(10).join(hist_lines)}

Output: JSON theo schema được cung cấp.
""".strip()

    def build_recruiter_prompt(
        self,
        question: str,
        job_meta: Dict[str, Any],
        ranked: List[Dict[str, Any]],
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        history = history or []
        history_tail = history[-6:]
        hist_lines = []
        for m in history_tail:
            role = (m.get("role") or "").upper()
            content = m.get("content")
            if role and content:
                hist_lines.append(f"{role}: {content}")

        return f"""
Bạn là trợ lý tuyển dụng (Recruiter assistant). Giọng điệu chuyên nghiệp, rõ ràng.
CHỈ dựa trên FACTS (job_meta + ranked). Không được bịa. Nếu thiếu dữ liệu thì nói thiếu.

User question: {question}

=== JOB META ===
Title: {job_meta.get("job_title")}
Company: {job_meta.get("job_company_name")}
City: {job_meta.get("job_location_city")}
Work location: {job_meta.get("job_work_location")}
Required skills: {job_meta.get("job_required_skills_known_display") or []}
Critical skills: {job_meta.get("job_critical_skills_display") or []}

=== RANKED (computed fit) ===
{json.dumps(ranked[:50], ensure_ascii=False)}

=== CHAT HISTORY (latest 6) ===
{chr(10).join(hist_lines)}

Output: JSON theo schema được cung cấp.
""".strip()

    # ----------------------------
    # UI helpers (chart-ready)
    # ----------------------------
    def build_ui_fit_charts(self, fit: Dict[str, Any], job_meta: Dict[str, Any], cand_meta: Dict[str, Any]) -> Dict[str, Any]:
        score = fit.get("score", 0)
        matched = fit.get("matched") or []
        missing = fit.get("missing") or []
        missing_critical = fit.get("missing_critical") or []

        return {
            "charts": {
                "gauge": {"label": "Fit Score", "value": score, "max": 100},
                "radar": {
                    "labels": ["Matched", "Missing", "Critical Missing"],
                    "values": [len(matched), len(missing), len(missing_critical)],
                },
            }
        }

    def _jsonable(self, x: Any) -> Any:
        if isinstance(x, ObjectId):
            return str(x)
        if isinstance(x, list):
            return [self._jsonable(i) for i in x]
        if isinstance(x, dict):
            return {k: self._jsonable(v) for k, v in x.items()}
        return x
