# src/rag_service.py (V5 - Hybrid RAG + Sessions + Fit)
from __future__ import annotations

import os
import re
import uuid
import json
import logging
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
    fingerprint_text,
)
from .chat_prefs import ChatPrefs

logger = logging.getLogger(__name__)


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
        history_col_name = os.getenv("CHAT_HISTORY_COLLECTION", "chat_history_sessions")

        if not mongo_uri:
            raise RuntimeError("Missing MONGODB_URI")

        self.client = MongoClient(mongo_uri, tz_aware=True, tzinfo=timezone.utc)
        self.db = self.client[db_name]

        self.rag_col: Collection = self.db[rag_col_name]
        self.sessions_col: Collection = self.db[sess_col_name]
        self.history_col: Collection = self.db[history_col_name]

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
        self.skill_templates_path = os.getenv("SKILL_TEMPLATES_PATH") or "./config/skill_templates.json"
        self.skill_templates = self._load_skill_templates()

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
        try:
            self.history_col.create_index(
                [("owner_id", 1), ("kind", 1), ("updated_at", -1)],
                name="history_owner_kind_updated",
            )
            self.history_col.create_index(
                [("session_id", 1)],
                name="history_session_id",
            )
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

    def append_message(self, session_id: str, role: str, content: str, meta: Optional[Dict[str, Any]] = None) -> bool:
        """
        Append a chat message into:
        - sessions_col.messages (for the active session)
        - rag_history (owner_id + kind) for cross-session memory

        Anti-repeat: if the last message in the session has the same role + same normalized content,
        it will NOT be appended again. Returns True if appended, False if skipped.
        """
        role = (role or "").strip().lower()
        if role not in ("user", "assistant", "system"):
            role = "user"

        content_clean = clean_text(content)
        if not content_clean:
            return False

        # normalize for dedupe (strip extra whitespace + lower)
        fp = fingerprint_text(content_clean)

        # Check last message (fast slice projection)
        try:
            last = self.sessions_col.find_one({"session_id": session_id}, {"messages": {"$slice": -1}})
            if last and (last.get("messages") or []):
                lm = (last["messages"] or [{}])[-1]
                if (lm.get("role") or "").lower() == role:
                    last_fp = lm.get("fp") or fingerprint_text(clean_text(lm.get("content") or ""))
                    if last_fp == fp:
                        return False
        except Exception:
            # never block chat on dedupe failures
            pass

        now = now_utc()
        msg_doc = {
            "at": now,
            "role": role,
            "content": content_clean,
            "fp": fp,
        }
        if meta and isinstance(meta, dict):
            msg_doc["meta"] = meta

        # Cap session messages
        try:
            max_msgs = int(os.getenv("CHAT_SESSION_MAX_MESSAGES", "200"))
        except Exception:
            max_msgs = 200
        max_msgs = max(50, min(max_msgs, 2000))

        self.sessions_col.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": {"$each": [msg_doc], "$slice": -max_msgs}},
                "$set": {"updated_at": now},
            },
        )

        # If we know owner_id + kind, also write to rag_history
        sess = self.sessions_col.find_one({"session_id": session_id}, {"payload": 1, "kind": 1})
        if sess:
            payload = sess.get("payload") or {}
            kind = sess.get("kind") or payload.get("kind") or payload.get("mode") or ""
            if kind in ("candidate", "recruiter"):
                if kind == "candidate":
                    owner_id = payload.get("candidate_id")
                else:
                    owner_id = payload.get("recruiter_user_id") or payload.get("recruiter_id") or payload.get("user_id")
                owner_id = clean_text(owner_id)
                if owner_id:
                    # cap history too
                    try:
                        max_hist = int(os.getenv("CHAT_HISTORY_MAX_MESSAGES", "600"))
                    except Exception:
                        max_hist = 600
                    max_hist = max(100, min(max_hist, 5000))

                    self.history_col.update_one(
                        {"owner_id": owner_id, "kind": kind},
                        {
                            "$setOnInsert": {"owner_id": owner_id, "kind": kind, "created_at": now},
                            "$push": {"messages": {"$each": [msg_doc], "$slice": -max_hist}},
                            "$set": {"updated_at": now},
                        },
                        upsert=True,
                    )
        return True
    def get_history_messages(self, owner_id: str, kind: str, limit: int = 20) -> List[Dict[str, Any]]:
        owner_id = clean_text(owner_id)
        kind = clean_text(kind)
        if not owner_id or not kind:
            return []
        limit = max(1, int(limit))
        session_cap = int(os.getenv("CHAT_HISTORY_SESSION_LIMIT", "100"))
        cur = (
            self.history_col.find({"owner_id": owner_id, "kind": kind})
            .sort("updated_at", -1)
            .limit(max(1, session_cap))
        )
        out: List[Dict[str, Any]] = []
        for sess in cur:
            session_id = sess.get("session_id")
            messages = sess.get("messages") or []
            for msg in reversed(messages):
                if msg and msg.get("content"):
                    out.append(
                        {
                            "role": msg.get("role"),
                            "content": msg.get("content"),
                            "at": msg.get("at"),
                            "session_id": session_id,
                        }
                    )
                if len(out) >= limit:
                    break
            if len(out) >= limit:
                break
        out.reverse()
        return out

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

    def get_applied_candidate_ids(self, job_id: str, statuses: Optional[List[str]] = None, limit: Optional[int] = None) -> List[str]:
        oid = _to_oid(job_id)
        job_id_clean = clean_text(job_id)
        if not oid and not job_id_clean:
            return []

        if oid:
            query: Dict[str, Any] = {"job_id": {"$in": [oid, job_id_clean]}}
        else:
            query = {"job_id": job_id_clean}

        if statuses:
            norm_statuses = [clean_text(s) for s in statuses if clean_text(s)]
            if norm_statuses:
                query["application_status"] = {"$in": norm_statuses}

        cur = self.db["applications"].find(query, {"candidate_id": 1})
        if limit:
            cur = cur.limit(int(limit))

        out: List[str] = []
        for d in cur:
            cid = d.get("candidate_id")
            if cid:
                out.append(str(cid))

        return _dedupe_keep_order(out)

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
        try:
            qemb = self.embed(query)
        except Exception as exc:
            logger.warning("Vector search embedding failed: %s", exc, exc_info=True)
            return []
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
        try:
            return list(self.rag_col.aggregate(pipeline))
        except Exception as exc:
            logger.warning("Text search failed: %s", exc, exc_info=True)
            return []

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
        if out:
            return self._cross_rerank(query, out, topk=self.rerank_topk)

        # Fallback: basic find if both searches fail
        basic_flt: Dict[str, Any] = {"metadata.doc_type": doc_type}
        if visibility:
            basic_flt["metadata.visibility"] = visibility
        for kf, vf in (filters or {}).items():
            if vf is None:
                continue
            basic_flt[kf] = vf
        try:
            cur = self.rag_col.find(basic_flt, {"_id": 1, "text": 1, "metadata": 1}).limit(limit)
            return list(cur)
        except Exception:
            return []

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
        try:
            qemb = self.embed(query)
            # embed candidates in batch for speed
            embs = self._get_embedder().encode(texts, normalize_embeddings=True)
        except Exception as exc:
            logger.warning("Rerank embeddings failed: %s", exc, exc_info=True)
            return texts[: max(1, k)]
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
            hard_reasons.append("Thiếu kỹ năng bắt buộc")

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
    def _load_skill_templates(self) -> Dict[str, Any]:
        path = self.skill_templates_path
        if not path or not os.path.exists(path):
            return {}
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            return {}
        return data if isinstance(data, dict) else {}

    def _get_skill_templates(self, category: str, kind: str) -> List[Dict[str, Any]]:
        data = self.skill_templates or {}
        if not isinstance(data, dict):
            return []
        defaults = data.get("default") or {}
        categories = data.get("categories") or {}
        cat_block = categories.get(category) or {}
        templates = cat_block.get(kind) or defaults.get(kind) or []
        if isinstance(templates, list):
            return templates
        return []

    def _fallback_templates(self, kind: str) -> List[Dict[str, Any]]:
        if kind == "interview":
            return [
                {
                    "question": "Bạn đã từng dùng {skill} chưa? Hãy mô tả một tình huống bạn áp dụng nó.",
                    "rubric": ["Bối cảnh rõ ràng", "Quyết định có lý do", "Kết quả/ảnh hưởng"],
                },
                {
                    "question": "Giải thích khái niệm cốt lõi của {skill} và khi nào nên dùng.",
                    "rubric": ["Đúng khái niệm", "Nêu được use cases", "Hiểu tradeoffs"],
                },
            ]
        return [
            {
                "action": "Ôn lý thuyết nền tảng về {skill} và ghi chú 10 ý chính.",
                "topics": ["khái niệm cốt lõi", "use cases"],
                "keywords": ["{skill} basics", "{skill} overview"],
            },
            {
                "action": "Thực hành {skill} qua bài tập nhỏ/mini project.",
                "topics": ["thực hành", "phản hồi"],
                "keywords": ["{skill} practice", "{skill} mini project"],
            },
            {
                "action": "Nâng cấp: áp dụng {skill} vào tình huống thực tế và rút kinh nghiệm.",
                "topics": ["best practices", "tradeoffs"],
                "keywords": ["{skill} best practices", "{skill} pitfalls"],
            },
        ]

    def _render_template(self, text: Any, **kwargs: Any) -> str:
        value = clean_text(text)
        if not value:
            return ""
        try:
            return value.format(**kwargs)
        except Exception:
            return value

    def _render_list(self, items: Iterable[Any], **kwargs: Any) -> List[str]:
        rendered: List[str] = []
        for item in items or []:
            out = self._render_template(item, **kwargs)
            if out:
                rendered.append(out)
        return rendered

    def generate_roadmap_14_days(self, *, missing: List[str], missing_critical: List[str], job_title: str = "") -> List[Dict[str, Any]]:
        """Deterministic 14-day plan driven by missing skills (demo-safe, no hallucination).

        Returns list: [{"day": 1, "task": "...", "focus": "skill"}, ...]
        """
        # Prioritize critical first
        skills = [clean_text(s) for s in (missing_critical + missing) if clean_text(s)]
        # de-dup, preserve order
        seen = set()
        ordered: List[str] = []
        for s in skills:
            k = s.lower()
            if k not in seen:
                ordered.append(s)
                seen.add(k)

        if not ordered:
            # When there is nothing missing, propose interview + portfolio polishing
            ordered = ["CV t?i ?u", "Portfolio", "System design", "Luy?n ph?ng v?n"]

        def format_task(action: str, topics: List[str], keywords: List[str]) -> str:
            parts = [action]
            if topics:
                parts.append(f"Ch? ?? ch?nh: {', '.join(topics)}.")
            if keywords:
                parts.append(f"T? kh?a t?m hi?u: {', '.join(keywords)}.")
            parts.append("Ngu?n g?i ?: t?i li?u ch?nh th?c + tutorial/video uy t?n.")
            return " ".join(parts).strip()

        def pick_template(templates: List[Dict[str, Any]], repeat: int) -> Dict[str, Any]:
            idx = min(max(repeat - 1, 0), len(templates) - 1)
            return templates[idx]

        def day_task(skill: str, repeat: int) -> str:
            category = self.skill_norm.category_for_skill(skill)
            templates = self._get_skill_templates(category, "roadmap")
            if not templates:
                templates = self._fallback_templates("roadmap")
            t = pick_template(templates, repeat) if templates else {}
            if not isinstance(t, dict):
                t = {}
            action = self._render_template(t.get("action"), skill=skill, category=category)
            topics = self._render_list(t.get("topics") or [], skill=skill, category=category)
            keywords = self._render_list(t.get("keywords") or [], skill=skill, category=category)
            if not action:
                action = f"?n t?p {skill} theo l? tr?nh c? b?n."
            return format_task(action, topics, keywords)

        plan: List[Dict[str, Any]] = []
        counts: Dict[str, int] = {}
        for day in range(1, 15):
            skill = ordered[(day - 1) % len(ordered)]
            key = skill.lower()
            counts[key] = counts.get(key, 0) + 1
            task = day_task(skill, counts[key])
            title = clean_text(job_title)
            prefix = f"(M?c ti?u: {title}) " if title else ""
            plan.append({"day": day, "focus": skill, "task": prefix + task})
        return plan
    def build_interview_pack(self, *, job_title: str, matched: List[str], missing: List[str], missing_critical: List[str]) -> Dict[str, Any]:
        """Generate a deterministic interview simulation pack (questions + scoring rubric)."""
        title = clean_text(job_title) or "v? tr? ?? ch?n"

        focus = [clean_text(x) for x in (missing_critical + missing) if clean_text(x)]
        if not focus:
            focus = ["System design", "Behavioral", "Project deep dive"]

        def pick_template(templates: List[Dict[str, Any]], repeat: int) -> Dict[str, Any]:
            idx = min(max(repeat - 1, 0), len(templates) - 1)
            return templates[idx]

        questions: List[Dict[str, Any]] = []
        counts: Dict[str, int] = {}
        for i, sk in enumerate(focus[:6], start=1):
            category = self.skill_norm.category_for_skill(sk)
            counts[category] = counts.get(category, 0) + 1
            templates = self._get_skill_templates(category, "interview")
            if not templates:
                templates = self._fallback_templates("interview")
            t = pick_template(templates, counts[category]) if templates else {}
            if not isinstance(t, dict):
                t = {}
            q = self._render_template(t.get("question"), skill=sk, job_title=title, category=category)
            rub = self._render_list(t.get("rubric") or [], skill=sk, job_title=title, category=category)
            if not q:
                q = f"B?n ?? t?ng d?ng {sk} ch?a? H?y m? t? m?t t?nh hu?ng b?n ?p d?ng n?."
                rub = ["B?i c?nh r? r?ng", "Quy?t ??nh c? l? do", "K?t qu?/?nh h??ng"]

            questions.append({"no": i, "focus": sk, "question": q, "rubric": rub})

        behavioral_templates: List[Dict[str, Any]] = []
        if isinstance(self.skill_templates, dict):
            raw = self.skill_templates.get("behavioral") or []
            if isinstance(raw, list):
                behavioral_templates = raw

        behavioral: List[Dict[str, Any]] = []
        if behavioral_templates:
            for idx, item in enumerate(behavioral_templates, start=100):
                if not isinstance(item, dict):
                    continue
                q = self._render_template(item.get("question"), job_title=title)
                rub = self._render_list(item.get("rubric") or [], job_title=title)
                if not q:
                    continue
                behavioral.append(
                    {
                        "no": item.get("no") or idx,
                        "focus": item.get("focus") or "Behavioral",
                        "question": q,
                        "rubric": rub,
                    }
                )

        if not behavioral:
            behavioral = [
                {
                    "no": 100,
                    "focus": "Behavioral",
                    "question": "K? v? m?t l?n b?n g?p bug kh? v? b?n x? l? th? n?o?",
                    "rubric": ["Situation-Task-Action-Result", "H?c ???c g?", "Giao ti?p"],
                },
                {
                    "no": 101,
                    "focus": "Behavioral",
                    "question": "N?u b? deadline g?p nh?ng scope l?n, b?n ?u ti?n th? n?o?",
                    "rubric": ["Prioritization", "Communication", "Risk management"],
                },
            ]

        return {
            "title": title,
            "focus_skills": focus[:6],
            "matched_skills": matched[:10],
            "questions": questions + behavioral,
            "how_to_use": "Tr? l?i t?ng c?u, t? ch?m theo rubric (0-2 ?i?m m?i ti?u ch?).",
        }
    def _fallback_templates(self, kind: str) -> List[Dict[str, Any]]:
        if kind == "interview":
            return [
                {
                    "question": "Bạn đã từng dùng {skill} chưa? Hãy mô tả một tình huống bạn áp dụng nó.",
                    "rubric": ["Bối cảnh rõ ràng", "Quyết định có lý do", "Kết quả/ảnh hưởng"],
                },
                {
                    "question": "Giải thích khái niệm cốt lõi của {skill} và khi nào nên dùng.",
                    "rubric": ["Đúng khái niệm", "Nêu được use cases", "Hiểu tradeoffs"],
                },
            ]
        return [
            {
                "action": "Ôn lại lý thuyết nền tảng về {skill} và ghi chú 10 ý chính.",
                "topics": ["khái niệm cốt lõi", "use cases"],
                "keywords": ["{skill} basics", "{skill} overview"],
            },
            {
                "action": "Thực hành {skill} qua bài tập nhỏ/mini project.",
                "topics": ["thực hành", "phản hồi"],
                "keywords": ["{skill} practice", "{skill} mini project"],
            },
            {
                "action": "Nâng cấp: áp dụng {skill} vào tình huống thực tế và rút kinh nghiệm.",
                "topics": ["best practices", "tradeoffs"],
                "keywords": ["{skill} best practices", "{skill} pitfalls"],
            },
        ]

    def generate_roadmap_14_days(
        self, *, missing: List[str], missing_critical: List[str], job_title: str = ""
    ) -> List[Dict[str, Any]]:
        """Deterministic 14-day plan driven by missing skills (demo-safe, no hallucination)."""
        skills = [clean_text(s) for s in (missing_critical + missing) if clean_text(s)]
        seen = set()
        ordered: List[str] = []
        for s in skills:
            k = s.lower()
            if k not in seen:
                ordered.append(s)
                seen.add(k)

        if not ordered:
            ordered = ["CV tối ưu", "Portfolio", "System design", "Luyện phỏng vấn"]

        def format_task(action: str, topics: List[str], keywords: List[str]) -> str:
            parts = [action]
            if topics:
                parts.append(f"Chủ đề chính: {', '.join(topics)}.")
            if keywords:
                parts.append(f"Từ khóa tìm hiểu: {', '.join(keywords)}.")
            parts.append("Nguồn gợi ý: tài liệu chính thức + tutorial/video uy tín.")
            return " ".join(parts).strip()

        def pick_template(templates: List[Dict[str, Any]], repeat: int) -> Dict[str, Any]:
            idx = min(max(repeat - 1, 0), len(templates) - 1)
            return templates[idx]

        def day_task(skill: str, repeat: int) -> str:
            category = self.skill_norm.category_for_skill(skill)
            templates = self._get_skill_templates(category, "roadmap")
            if not templates:
                templates = self._fallback_templates("roadmap")
            t = pick_template(templates, repeat) if templates else {}
            if not isinstance(t, dict):
                t = {}
            action = self._render_template(t.get("action"), skill=skill, category=category)
            topics = self._render_list(t.get("topics") or [], skill=skill, category=category)
            keywords = self._render_list(t.get("keywords") or [], skill=skill, category=category)
            if not action:
                action = f"Ôn tập {skill} theo lộ trình cơ bản."
            return format_task(action, topics, keywords)

        plan: List[Dict[str, Any]] = []
        counts: Dict[str, int] = {}
        for day in range(1, 15):
            skill = ordered[(day - 1) % len(ordered)]
            key = skill.lower()
            counts[key] = counts.get(key, 0) + 1
            task = day_task(skill, counts[key])
            title = clean_text(job_title)
            prefix = f"(Mục tiêu: {title}) " if title else ""
            plan.append({"day": day, "focus": skill, "task": prefix + task})
        return plan

    def build_interview_pack(
        self, *, job_title: str, matched: List[str], missing: List[str], missing_critical: List[str]
    ) -> Dict[str, Any]:
        """Generate a deterministic interview simulation pack (questions + scoring rubric)."""
        title = clean_text(job_title) or "vị trí đã chọn"

        focus = [clean_text(x) for x in (missing_critical + missing) if clean_text(x)]
        if not focus:
            focus = ["System design", "Behavioral", "Project deep dive"]

        def pick_template(templates: List[Dict[str, Any]], repeat: int) -> Dict[str, Any]:
            idx = min(max(repeat - 1, 0), len(templates) - 1)
            return templates[idx]

        questions: List[Dict[str, Any]] = []
        counts: Dict[str, int] = {}
        for i, sk in enumerate(focus[:6], start=1):
            category = self.skill_norm.category_for_skill(sk)
            counts[category] = counts.get(category, 0) + 1
            templates = self._get_skill_templates(category, "interview")
            if not templates:
                templates = self._fallback_templates("interview")
            t = pick_template(templates, counts[category]) if templates else {}
            if not isinstance(t, dict):
                t = {}
            q = self._render_template(t.get("question"), skill=sk, job_title=title, category=category)
            rub = self._render_list(t.get("rubric") or [], skill=sk, job_title=title, category=category)
            if not q:
                q = f"Bạn đã từng dùng {sk} chưa? Hãy mô tả một tình huống bạn áp dụng nó."
                rub = ["Bối cảnh rõ ràng", "Quyết định có lý do", "Kết quả/ảnh hưởng"]

            questions.append({"no": i, "focus": sk, "question": q, "rubric": rub})

        behavioral_templates: List[Dict[str, Any]] = []
        if isinstance(self.skill_templates, dict):
            raw = self.skill_templates.get("behavioral") or []
            if isinstance(raw, list):
                behavioral_templates = raw

        behavioral: List[Dict[str, Any]] = []
        if behavioral_templates:
            for idx, item in enumerate(behavioral_templates, start=100):
                if not isinstance(item, dict):
                    continue
                q = self._render_template(item.get("question"), job_title=title)
                rub = self._render_list(item.get("rubric") or [], job_title=title)
                if not q:
                    continue
                behavioral.append(
                    {
                        "no": item.get("no") or idx,
                        "focus": item.get("focus") or "Behavioral",
                        "question": q,
                        "rubric": rub,
                    }
                )

        if not behavioral:
            behavioral = [
                {
                    "no": 100,
                    "focus": "Behavioral",
                    "question": "Kể về một lần bạn gặp bug khó và bạn xử lý thế nào?",
                    "rubric": ["Situation-Task-Action-Result", "Học được gì", "Giao tiếp"],
                },
                {
                    "no": 101,
                    "focus": "Behavioral",
                    "question": "Nếu bị deadline gấp nhưng scope lớn, bạn ưu tiên thế nào?",
                    "rubric": ["Prioritization", "Communication", "Risk management"],
                },
            ]

        return {
            "title": title,
            "focus_skills": focus[:6],
            "matched_skills": matched[:10],
            "questions": questions + behavioral,
            "how_to_use": "Trả lời từng câu, tự chấm theo rubric (0-2 điểm mỗi tiêu chí).",
        }

    def _role_hint_tokens(self, role_hint: str) -> List[str]:
        tokens = []
        for t in norm_basic(role_hint).split():
            if len(t) < 3:
                continue
            if t in {"nhan", "vien", "cong", "ty", "thuc", "tap", "intern"}:
                continue
            tokens.append(t)
        return tokens

    def _role_hint_matches(self, title: str, role_hint: str) -> bool:
        hint_tokens = self._role_hint_tokens(role_hint)
        if not hint_tokens:
            return False
        title_tokens = set(norm_basic(title).split())
        overlap = sum(1 for t in hint_tokens if t in title_tokens)
        if len(hint_tokens) >= 2:
            return overlap >= 2
        return overlap >= 1

    def _seniority_rank(self, raw: str) -> int:
        s = norm_basic(raw)
        if not s:
            return -1
        mapping = {
            "intern": 0,
            "fresher": 1,
            "entry": 1,
            "junior": 2,
            "mid": 3,
            "middle": 3,
            "senior": 4,
            "lead": 5,
            "staff": 5,
            "principal": 6,
            "executive": 6,
            "manager": 6,
            "head": 6,
        }
        for key, val in mapping.items():
            if key in s:
                return val
        return -1

    def _score_job_for_candidate(self, cand: Dict[str, Any], job: Dict[str, Any], prefs: ChatPrefs) -> Tuple[float, float, float, float]:
        cand_skills = set(norm_basic(x) for x in (cand.get("skills_known_norm") or []) if norm_basic(x))
        cand_primary = set(norm_basic(x) for x in (cand.get("primary_skills_known_norm") or []) if norm_basic(x))
        cand_skills = cand_skills.union(cand_primary)

        job_skills = job.get("required_skills_norm") or []
        if not job_skills:
            job_skills = [norm_basic(x) for x in (job.get("required_skills") or []) if norm_basic(x)]
        job_skills = set(norm_basic(x) for x in job_skills if norm_basic(x))

        skill_score = 0.0
        if job_skills:
            skill_score = len(cand_skills.intersection(job_skills)) / max(1, len(job_skills))

        pref_city = norm_basic(prefs.city or cand.get("city") or "")
        job_city = norm_basic(job.get("city") or "")
        location_score = 1.0 if pref_city and job_city and pref_city == job_city else 0.0

        role_hint = clean_text(prefs.role_hint)
        role_score = 1.0 if role_hint and self._role_hint_matches(job.get("title") or "", role_hint) else 0.0

        cand_rank = self._seniority_rank(cand.get("seniority_hint") or "")
        job_rank = self._seniority_rank(job.get("seniority") or "")
        if cand_rank >= 0 and job_rank >= 0:
            diff = abs(cand_rank - job_rank)
            if diff == 0:
                seniority_score = 1.0
            elif diff == 1:
                seniority_score = 0.5
            else:
                seniority_score = 0.0
        else:
            seniority_score = 0.0

        position_score = max(role_score, seniority_score)
        retrieval_score = float(job.get("_retrieval_score") or 0.0)
        return (skill_score, location_score, position_score, retrieval_score)

    def _sort_jobs_for_candidate(self, cand: Dict[str, Any], jobs: List[Dict[str, Any]], prefs: ChatPrefs) -> List[Dict[str, Any]]:
        scored: List[Tuple[Tuple[float, float, float, float], Dict[str, Any]]] = []
        for j in jobs:
            scored.append((self._score_job_for_candidate(cand, j, prefs), j))
        scored.sort(key=lambda x: x[0], reverse=True)
        out: List[Dict[str, Any]] = []
        for _, j in scored:
            if "_retrieval_score" in j:
                j.pop("_retrieval_score", None)
            out.append(j)
        return out

    def suggest_jobs(self, query: str, limit: int = 5, prefs: Optional[ChatPrefs] = None) -> List[Dict[str, Any]]:
        prefs = prefs or ChatPrefs()
        q = clean_text(query)
        role_hint = clean_text(prefs.role_hint)
        if role_hint and role_hint.lower() not in q.lower():
            q = f"{q} {role_hint}".strip()
        filters: Dict[str, Any] = {}
        if prefs.city_norm:
            filters["metadata.job_location_city_norm"] = prefs.city_norm
        if prefs.work_location_norm:
            filters["metadata.job_work_location_norm"] = prefs.work_location_norm
        if prefs.avoid_work_location_norm:
            # can't do "not equals" in Atlas filter easily here; we'll post-filter
            pass

        rows = self.hybrid_search(query=q, doc_type="job", visibility="public", filters=filters, limit=max(10, limit * 3))
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
            rscore = float(r.get("rrf_score") or r.get("score") or 0.0)
            if sid not in job_map:
                job_map[sid] = {
                    "job_id": sid,
                    "title": md.get("job_title"),
                    "company": md.get("job_company_name"),
                    "city": md.get("job_location_city"),
                    "work_location": md.get("job_work_location"),
                    "seniority": md.get("job_seniority_level"),
                    "required_skills": md.get("job_required_skills_known_display") or [],
                    "required_skills_norm": md.get("job_required_skills_known_norm") or [],
                    "_retrieval_score": rscore,
                }
            else:
                prev = float(job_map[sid].get("_retrieval_score") or 0.0)
                if rscore > prev:
                    job_map[sid]["_retrieval_score"] = rscore
            if len(job_map) >= limit:
                break
        jobs = list(job_map.values())
        if role_hint:
            filtered = [j for j in jobs if self._role_hint_matches(j.get("title") or "", role_hint)]
            if filtered:
                return filtered[:limit]
        return jobs

    def suggest_jobs_for_candidate(self, candidate_id: str, limit: int = 10, query_hint: str = "", prefs: Optional[ChatPrefs] = None) -> List[Dict[str, Any]]:
        cand = self.get_candidate_meta(candidate_id) or {}
        prefs = prefs or ChatPrefs()
        # build query from candidate skills + optional user hint
        stop_raw = {
            "presentation",
            "presentation skills",
            "self learning",
            "active listening",
            "teamwork",
            "communication",
            "negotiation",
            "adaptability",
            "ownership",
            "growth mindset",
            "problem solving",
            "leadership",
            "time management",
            "critical thinking",
        }
        stop_norm = {norm_basic(x) for x in stop_raw}

        primary = cand.get("primary_skills_known_display") or []
        known = cand.get("skills_known_display") or []
        exp = cand.get("skills_from_experience_known_display") or []
        combined = _dedupe_keep_order(list(primary) + list(known) + list(exp))
        skills = [s for s in combined if norm_basic(s) and norm_basic(s) not in stop_norm]
        if not skills:
            unknown = cand.get("skills_unknown_norm") or []
            skills = [s for s in unknown if norm_basic(s) and norm_basic(s) not in stop_norm]
        skills = skills[:8]
        city = cand.get("city") or prefs.city or ""
        query_parts = []
        if query_hint:
            query_parts.append(query_hint)
        role_hint = prefs.role_hint or ""
        if role_hint:
            query_parts.append(role_hint)
        if skills:
            query_parts.append(" ".join(skills))
        if city:
            query_parts.append(f"ở {city}")
        q = " ".join([clean_text(x) for x in query_parts if clean_text(x)])
        jobs = self.suggest_jobs(q, limit=limit, prefs=prefs)
        if jobs:
            return self._sort_jobs_for_candidate(cand, jobs, prefs)
        return jobs

    # ----------------------------
    # Screening helpers
    # ----------------------------
    def screen_candidates_by_metadata(
        self,
        *,
        skills_norm: Optional[List[str]] = None,
        city_norm: str = "",
        years_min: Optional[int] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        filt: Dict[str, Any] = {"metadata.doc_type": "candidate_profile", "metadata.chunk_index": 0}
        if city_norm:
            filt["metadata.city_norm"] = city_norm
        if years_min is not None:
            filt["metadata.years_exp"] = {"$gte": years_min}

        cur = self.rag_col.find(filt, {"metadata": 1}).limit(max(1, limit * 4))
        out: List[Dict[str, Any]] = []
        req = [norm_basic(x) for x in (skills_norm or []) if norm_basic(x)]
        for d in cur:
            md = d.get("metadata") or {}
            skills = md.get("skills_known_norm") or []
            primary = md.get("primary_skills_known_norm") or []
            have = {norm_basic(x) for x in (skills + primary) if norm_basic(x)}
            if req and not all(r in have for r in req):
                continue
            out.append(md)
            if len(out) >= limit:
                break
        return out


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
        current_state: Optional[Dict[str, Any]] = None,
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
Nếu thông tin không có trong context, hãy trả lời: "Xin lỗi, thông tin này không có trong mô tả công việc, bạn nên hỏi trực tiếp HR khi phỏng vấn".

Mục tiêu: trả lời theo nhu cầu user, giúp họ hiểu:
- Điểm phù hợp (%), đạt/không đạt
- Match/missing (nhấn mạnh missing_critical)
- Lộ trình cải thiện (ngắn, actionable)
- Nếu user hỏi lương/remote/level -> hỏi thêm 1 câu nếu thiếu dữ liệu

User question: {question}

=== CURRENT STATE ===
{json.dumps(current_state or {}, ensure_ascii=False)}

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

        count_ranked = len(ranked or [])

        return f"""
Bạn là trợ lý tuyển dụng (Recruiter assistant). Giọng điệu chuyên nghiệp, rõ ràng.
CHỈ dựa trên FACTS (job_meta + ranked). Không được bịa. Nếu thiếu dữ liệu thì nói thiếu.
Rang buoc: chi duoc dung ung vien trong mang ranked (khong duoc tao them). Neu ranked < 5, phai noi ro so luong thuc te (vd: "chi co {count_ranked} ung vien"). Tra loi ngan gon, trung thuc.

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
