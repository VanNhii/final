# src/tools.py (Optional tool-calling stubs)
from __future__ import annotations

from typing import Any, Dict, Optional

# NOTE: For demo, these are placeholders.
# In production you would query your own salary dataset / traffic API, etc.

SALARY_TABLE = {
    ("backend", "ho chi minh"): {"min": 15000000, "median": 25000000, "max": 45000000},
    ("android", "ho chi minh"): {"min": 14000000, "median": 23000000, "max": 42000000},
    ("qa", "ho chi minh"): {"min": 12000000, "median": 20000000, "max": 35000000},
    ("backend", "da nang"): {"min": 12000000, "median": 20000000, "max": 35000000},
}


def get_salary_average(role_hint: str, city_norm: str) -> Dict[str, Any]:
    role_hint = (role_hint or "").lower().strip()
    city_norm = (city_norm or "").lower().strip()
    key = (role_hint, city_norm)
    return {"role": role_hint, "city_norm": city_norm, "range_vnd": SALARY_TABLE.get(key)}


def check_traffic_from_home(location: str) -> Dict[str, Any]:
    # Stub – replace with real data source
    return {"location": location, "traffic_score": None, "note": "No traffic dataset configured."}
