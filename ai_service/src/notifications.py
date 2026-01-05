# src/notifications.py (Optional - digest generation stub)
from __future__ import annotations

from typing import Any, Dict, List, Optional

from .rag_service import RAGService
from .chat_prefs import ChatPrefs


def build_daily_digest(rag: RAGService, candidate_id: str, prefs: Optional[ChatPrefs] = None, limit: int = 3) -> Dict[str, Any]:
    """
    Generate a proactive message, e.g. "Today you have 2 new jobs in Da Nang".
    This is a stub: it simply suggests jobs using existing retrieval.
    """
    prefs = prefs or ChatPrefs()
    sugs = rag.suggest_jobs_for_candidate(candidate_id, limit=limit, prefs=prefs)
    if not sugs:
        msg = (
            "Hôm nay mình chưa thấy job phù hợp với hồ sơ của bạn. "
            "Bạn có thể cập nhật CV hoặc tiêu chí để mình gợi ý lại."
        )
        return {"message": msg, "suggestions": sugs}
    msg = "Hôm nay mình thấy có vài job khá khớp với hồ sơ của bạn:\n"
    for i, j in enumerate(sugs, start=1):
        msg += f"{i}) {j.get('title')} - {j.get('company')} ({j.get('city')}, {j.get('work_location')})\n"
    msg += "\nBạn muốn mình chấm fit job nào trước? (gõ: 'chọn 1')"
    return {"message": msg, "suggestions": sugs}
