# src/facts_layer.py (V5 - State-of-the-Art Core)
from __future__ import annotations

import json
import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

# Optional: ObjectId support (if pymongo/bson installed)
try:
    from bson import ObjectId  # type: ignore
except Exception:  # pragma: no cover
    ObjectId = None  # type: ignore


# ----------------------------
# Common helpers
# ----------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def clean_text(x: Any) -> str:
    if x is None:
        return ""
    s = str(x)
    s = s.replace("\u00a0", " ")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\s+\n", "\n", s)
    return s.strip()


def strip_accents(s: str) -> str:
    # Vietnamese: convert đ/Đ early so it doesn't get lost in accent stripping
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    return "".join([c for c in s if unicodedata.category(c) != "Mn"])


def norm_basic(s: str) -> str:
    s = clean_text(s).lower()
    s = strip_accents(s)
    # Keep '_' because our skill IDs often use it (e.g., node_js).
    s = re.sub(r"[^a-z0-9\.\+\#_\s\-]", " ", s)
    s = s.replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def chunk_words(text: str, chunk_words: int = 240, overlap_words: int = 50) -> List[str]:
    text = clean_text(text)
    if not text:
        return []
    words = text.split()
    if chunk_words <= 0:
        return [text]
    out: List[str] = []
    i = 0
    while i < len(words):
        j = min(len(words), i + chunk_words)
        out.append(" ".join(words[i:j]))
        if j == len(words):
            break
        i = max(0, j - max(0, overlap_words))
    return out


# ----------------------------
# Normalization: City / Work-location
# ----------------------------
def normalize_city(city: str) -> str:
    """Normalize Vietnamese city names for filtering/search.

    - Lowercase + strip accents + remove punctuation via norm_basic
    - Apply a small alias map for common abbreviations/misspellings
      (extend freely for your dataset).
    """
    c = norm_basic(city)
    if not c:
        return c

    # common abbreviations / misspellings
    aliases = {
        "hcm": "ho chi minh",
        "tp hcm": "ho chi minh",
        "tphcm": "ho chi minh",
        "ho chi minh city": "ho chi minh",
        "sai gon": "ho chi minh",
        "saigon": "ho chi minh",
        "hn": "ha noi",
        "ha noi city": "ha noi",
        "dn": "da nang",
        "danang": "da nang",
        "da nang city": "da nang",
        "brvt": "ba ria vung tau",
        "buon me thuot": "buon ma thuot",
        "buon me thuat": "buon ma thuot",
        "buon ma thuat": "buon ma thuot",
        "hoi an town": "hoi an",
    }

    c = re.sub(r"\s+", " ", c).strip()
    c = aliases.get(c, c)
    return c



def normalize_work_location(s: str) -> str:
    s = norm_basic(s)
    if not s:
        return ""
    if "remote" in s:
        return "remote"
    if "hybrid" in s:
        return "hybrid"
    if "on site" in s or "onsite" in s or "on-site" in s:
        return "on-site"
    return ""


# ----------------------------
# Skill Normalization Engine (+ lightweight Knowledge Graph)
# ----------------------------
class SkillNormalizer:
    """
    Loads config/skills.json (or custom) and provides:
    - normalize_one_norm: returns canonical skill id (norm)
    - classify_many_norm: separates known vs unknown
    - detect_critical: maps required skills -> critical subset (heuristic)
    - expand_inferred: lightweight knowledge-graph inferences (React -> frontend, Kotlin -> Android)
    """

    def __init__(self, config_path: Optional[str] = None):
        # Accept both env names (people often mix them in scripts)
        self.config_path = (
            config_path
            or os.getenv("SKILLS_JSON_PATH")
            or os.getenv("SKILLS_CONFIG_PATH")
            or "./config/skills.json"
        )
        self._loaded = False
        self._id_to_display: Dict[str, str] = {}
        self._syn_to_id: Dict[str, str] = {}
        self._critical: List[str] = []
        self._category_map: Dict[str, str] = {}
        self._syn_patterns: Dict[str, List[re.Pattern]] = {}
        self._negative_keywords: Dict[str, List[str]] = {}
        self._load()

    def _load(self) -> None:
        if self._loaded:
            return
        path = self.config_path
        if not os.path.exists(path):
            # tolerate missing file in dev; still provide basic normalization
            self._critical = ["sql", "git", "docker", "linux"]
            self._loaded = True
            return

        data = json.loads(open(path, "r", encoding="utf-8").read() or "{}")
        
        # Handle new format: SKILL_ALIASES and SKILL_WHITELIST
        if "SKILL_ALIASES" in data or "SKILL_WHITELIST" in data:
            # Process SKILL_ALIASES: alias -> canonical display name
            skill_aliases = data.get("SKILL_ALIASES") or {}
            if isinstance(skill_aliases, dict):
                # Group aliases by their canonical display name
                display_to_aliases: Dict[str, List[str]] = {}
                for alias, display in skill_aliases.items():
                    if not display:
                        continue
                    display_clean = clean_text(display)
                    if display_clean not in display_to_aliases:
                        display_to_aliases[display_clean] = []
                    display_to_aliases[display_clean].append(alias)
                
                # Create skill entries: use normalized display as canonical ID
                for display, aliases in display_to_aliases.items():
                    sid = norm_basic(display)
                    if not sid:
                        continue
                    self._id_to_display[sid] = display
                    self._syn_to_id[sid] = sid  # canonical maps to itself
                    # Add all aliases as synonyms
                    for alias in aliases:
                        ns = norm_basic(clean_text(alias))
                        if ns and ns != sid:
                            self._syn_to_id[ns] = sid
                    # Also add the display name itself as a synonym (case variations)
                    display_norm = norm_basic(display)
                    if display_norm and display_norm != sid:
                        self._syn_to_id[display_norm] = sid
            
            # Process SKILL_WHITELIST: add all skills from categories
            skill_whitelist = data.get("SKILL_WHITELIST") or {}
            if isinstance(skill_whitelist, dict):
                all_whitelist_skills: set[str] = set()
                for category, skills_list in skill_whitelist.items():
                    if isinstance(skills_list, list):
                        for skill in skills_list:
                            if skill:
                                skill_clean = clean_text(skill)
                                all_whitelist_skills.add(skill_clean)
                                sid = norm_basic(skill_clean)
                                if sid and sid not in self._category_map:
                                    self._category_map[sid] = str(category)
                
                # Add whitelist skills that aren't already in aliases
                for skill_display in all_whitelist_skills:
                    sid = norm_basic(skill_display)
                    if not sid:
                        continue
                    # Only add if not already present
                    if sid not in self._id_to_display:
                        self._id_to_display[sid] = skill_display
                        self._syn_to_id[sid] = sid
                    # Ensure the display name maps to the canonical ID
                    display_norm = norm_basic(skill_display)
                    if display_norm and display_norm != sid:
                        if display_norm not in self._syn_to_id:
                            self._syn_to_id[display_norm] = sid
        
        # Handle old format: skills array (for backward compatibility)
        skills = data.get("skills") or []
        for it in skills:
            # IMPORTANT: Keep the canonical id stable (underscore-friendly)
            sid = norm_basic(clean_text(it.get("id") or ""))
            display = clean_text(it.get("display") or it.get("id") or "")
            if not sid:
                continue
            self._id_to_display[sid] = display or sid
            # canonical maps to itself
            self._syn_to_id[sid] = sid
            # synonyms
            for syn in (it.get("synonyms") or []):
                ns = norm_basic(syn)
                if ns:
                    self._syn_to_id[ns] = sid

        # Regex patterns for robust detection in free text (optional section in skills.json)
        sp = data.get("synonym_patterns") or {}
        if isinstance(sp, dict):
            for raw_id, patterns in sp.items():
                sid = norm_basic(raw_id)
                if not sid or not isinstance(patterns, list):
                    continue
                compiled: List[re.Pattern] = []
                for p in patterns:
                    p = clean_text(p)
                    if not p:
                        continue
                    try:
                        compiled.append(re.compile(p, flags=re.I))
                    except Exception:
                        # ignore invalid regex
                        continue
                if compiled:
                    self._syn_patterns[sid] = compiled

        neg = data.get("negative_keywords") or {}
        if isinstance(neg, dict):
            for raw_id, phrases in neg.items():
                sid = norm_basic(raw_id)
                if not sid or not isinstance(phrases, list):
                    continue
                self._negative_keywords[sid] = [norm_basic(x) for x in phrases if norm_basic(x)]

        self._critical = [norm_basic(x) for x in (data.get("critical_skills") or []) if norm_basic(x)]
        self._loaded = True

    def detect_in_text(self, text: str) -> List[str]:
        """Detect skills from free text using (1) regex patterns, then (2) synonym phrase matching.

        Returns a list of *normalized skill IDs* (known only).
        """
        text_raw = clean_text(text)
        if not text_raw:
            return []

        t_norm = norm_basic(text_raw)
        found: set[str] = set()

        # 1) regex patterns (fast + robust)
        for sid, patterns in (self._syn_patterns or {}).items():
            if sid not in self._id_to_display:
                continue
            # negative guard: if any negative phrase is present, skip this skill
            negs = self._negative_keywords.get(sid) or []
            if any(n in t_norm for n in negs):
                continue
            for pat in patterns:
                try:
                    if pat.search(text_raw):
                        found.add(sid)
                        break
                except Exception:
                    continue

        # 2) phrase matching on normalized text for synonyms (bounded)
        # This is intentionally conservative to avoid false positives.
        # Only consider synonyms up to 4 tokens.
        for syn_norm, sid in self._syn_to_id.items():
            if sid not in self._id_to_display:
                continue
            if syn_norm in found:
                continue
            if syn_norm.count(" ") > 3:
                continue
            if not syn_norm:
                continue
            # word-boundary-ish check
            if re.search(rf"\b{re.escape(syn_norm)}\b", t_norm):
                # negative guard
                negs = self._negative_keywords.get(sid) or []
                if any(n in t_norm for n in negs):
                    continue
                found.add(sid)

        return sorted(found)

    def normalize_one_norm(self, s: str, allow_unknown: bool = True) -> Optional[str]:
        ns = norm_basic(s)
        if not ns:
            return None
        # preserve patterns like node.js, next.js
        if ns in self._syn_to_id:
            return self._syn_to_id[ns]
        # try small tweaks
        ns2 = ns.replace("js", ".js") if ns.endswith("js") and len(ns) <= 10 else ns
        if ns2 in self._syn_to_id:
            return self._syn_to_id[ns2]
        return ns if allow_unknown else None

    def display_from_norm(self, sid: str) -> str:
        sid = norm_basic(sid)
        return self._id_to_display.get(sid, sid)

    def category_for_skill(self, s: str) -> str:
        sid = self.normalize_one_norm(s, allow_unknown=True)
        if not sid:
            return "general"
        cat = self._category_map.get(sid)
        if cat:
            return cat
        t = sid
        if "ui" in t or "ux" in t or "design" in t:
            return "design"
        if "project" in t or "pm" in t or "scrum" in t:
            return "management"
        if "qa" in t or "test" in t:
            return "qa_testing"
        if "devops" in t or "cicd" in t or "ci cd" in t or "linux" in t:
            return "cloud_devops"
        if "data" in t or "ml" in t or "ai" in t or "machine" in t:
            return "ai_data_science"
        return "general"

    def classify_many_norm(self, skills: Iterable[str], dedup: bool = True) -> Tuple[List[str], List[str], List[str]]:
        """
        Returns: (known_display, known_norm, unknown_norm)
        - "known" means present in skills.json dictionary
        """
        known_norm: List[str] = []
        unknown_norm: List[str] = []

        seen = set()
        for s in skills or []:
            n = self.normalize_one_norm(s, allow_unknown=True)
            if not n:
                continue
            if dedup and n in seen:
                continue
            seen.add(n)
            if n in self._id_to_display:
                known_norm.append(n)
            else:
                unknown_norm.append(n)

        known_display = [self.display_from_norm(x) for x in known_norm]
        return known_display, known_norm, unknown_norm

    def detect_critical(self, required_norm: Iterable[str]) -> List[str]:
        req = {norm_basic(x) for x in (required_norm or []) if norm_basic(x)}
        out = []
        for c in self._critical:
            if c in req:
                out.append(self.display_from_norm(c))
        # heuristic: if "scrum" required => critical scrum
        if "scrum" in req and "scrum" not in out:
            out.append("Scrum")
        return out

    def expand_inferred(self, known_norm: Iterable[str]) -> List[str]:
        """
        Lightweight knowledge graph inference.
        Returns extra normalized skill ids that can be used for retrieval/query expansion (NOT for strict fit).
        """
        ks = {norm_basic(x) for x in (known_norm or []) if norm_basic(x)}
        inferred: set[str] = set()

        # React -> frontend
        if "react" in ks:
            inferred.update(["frontend", "javascript", "web"])
        # Node.js -> backend
        if "node_js" in ks:
            inferred.update(["backend", "api", "express"])
        # Kotlin -> android
        if "kotlin" in ks:
            inferred.update(["android", "mobile"])
        # QA automation -> testing
        if "qa_automation" in ks:
            inferred.update(["testing", "selenium", "playwright"])

        # normalize through dictionary when possible
        normed = []
        for x in inferred:
            n = self.normalize_one_norm(x, allow_unknown=True)
            if n and n not in ks:
                normed.append(n)
        return sorted(list(set(normed)))


# Singleton convenience
_SKILL_NORM: Optional[SkillNormalizer] = None


def get_skill_normalizer(config_path: Optional[str] = None) -> SkillNormalizer:
    global _SKILL_NORM
    if _SKILL_NORM is None or (config_path and _SKILL_NORM.config_path != config_path):
        _SKILL_NORM = SkillNormalizer(config_path=config_path)
    return _SKILL_NORM


def normalize_skill(s: str) -> Optional[str]:
    return get_skill_normalizer().normalize_one_norm(s, allow_unknown=True)


def normalize_skill_list(xs: Iterable[str]) -> List[str]:
    out = []
    for x in xs or []:
        n = normalize_skill(x)
        if n:
            out.append(n)
    return sorted(list(set(out)))


import hashlib

def fingerprint_text(text: str) -> str:
    '''
    Create a stable short fingerprint for deduping chat messages.
    - uses norm_basic() so OK/ok/extra spaces won't duplicate
    '''
    t = norm_basic(text or "")
    if not t:
        return ""
    h = hashlib.sha1(t.encode("utf-8")).hexdigest()
    return h[:16]
