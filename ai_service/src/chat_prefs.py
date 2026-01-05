# src/chat_prefs.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .facts_layer import normalize_city, normalize_work_location, clean_text


@dataclass
class ChatPrefs:
    """
    Stores user preferences across a session.
    Example:
      - city_norm="da nang"
      - work_location_norm="remote"
      - avoid_work_location_norm="on-site"
      - rejected_job_ids=[...]
    """
    city: str = ""
    city_norm: str = ""
    work_location_norm: str = ""
    avoid_work_location_norm: str = ""
    role_hint: str = ""
    salary_min: Optional[int] = None
    rejected_job_ids: List[str] = field(default_factory=list)

    def patch(self, patch: Dict[str, Any]) -> None:
        if not patch:
            return
        if patch.get("city"):
            self.city = clean_text(patch["city"])
            self.city_norm = normalize_city(self.city)
        if patch.get("city_norm"):
            self.city_norm = clean_text(patch["city_norm"])
        if patch.get("work_location_norm"):
            self.work_location_norm = normalize_work_location(patch["work_location_norm"])
        if patch.get("avoid_work_location_norm"):
            self.avoid_work_location_norm = normalize_work_location(patch["avoid_work_location_norm"])
        if patch.get("role_hint"):
            self.role_hint = clean_text(patch["role_hint"])
        if patch.get("salary_min") is not None:
            try:
                self.salary_min = int(patch["salary_min"])
            except Exception:
                pass

    def to_dict(self) -> Dict[str, Any]:
        return {
            "city": self.city,
            "city_norm": self.city_norm,
            "work_location_norm": self.work_location_norm,
            "avoid_work_location_norm": self.avoid_work_location_norm,
            "role_hint": self.role_hint,
            "salary_min": self.salary_min,
            "rejected_job_ids": self.rejected_job_ids,
        }

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "ChatPrefs":
        prefs = (payload or {}).get("prefs") or {}
        obj = cls()
        obj.patch(prefs)
        obj.rejected_job_ids = list(prefs.get("rejected_job_ids") or [])
        return obj
