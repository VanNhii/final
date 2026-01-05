# src/llm_service.py (V5)
from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, Generator, Optional

import requests

from .facts_layer import clean_text


def _try_parse_json(s: str) -> Optional[Dict[str, Any]]:
    s = clean_text(s)
    if not s:
        return None
    # strip code fences
    s = re.sub(r"^```(?:json)?\s*", "", s)
    s = re.sub(r"\s*```$", "", s)
    # find first {...}
    m = re.search(r"\{.*\}", s, flags=re.S)
    if m:
        s = m.group(0)
    try:
        obj = json.loads(s)
        if isinstance(obj, dict):
            return obj
    except Exception:
        return None
    return None


class LLMService:
    """
    Ollama chat wrapper.
    - ask(): returns text
    - ask_json(): returns dict (best-effort repair)
    - ask_stream(): yields tokens (SSE-ready)
    """

    def __init__(self):
        self.url = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
        self.enabled = str(os.getenv("LLM_ENABLED", "true")).lower() == "true"

        # generation tuning
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.4"))
        self.top_p = float(os.getenv("LLM_TOP_P", "0.9"))
        self.num_predict = int(os.getenv("LLM_NUM_PREDICT", "768"))

    def ask(self, prompt: str, question: str = "", user_text: str = "") -> str:
        prompt = clean_text(prompt)
        question = clean_text(question) or clean_text(user_text)

        if not self.enabled:
            return "LLM disabled."

        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": question},
            ],
            "options": {
                "temperature": self.temperature,
                "top_p": self.top_p,
                "num_predict": self.num_predict,
            },
        }

        r = requests.post(self.url, json=payload, timeout=120)
        r.raise_for_status()
        data = r.json()
        # Ollama returns {"message":{"role":"assistant","content":"..."}}
        msg = ((data or {}).get("message") or {}).get("content")
        return clean_text(msg)

    def ask_stream(self, prompt: str, question: str = "", user_text: str = "") -> Generator[str, None, None]:
        prompt = clean_text(prompt)
        question = clean_text(question) or clean_text(user_text)

        if not self.enabled:
            yield "LLM disabled."
            return

        payload = {
            "model": self.model,
            "stream": True,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": question},
            ],
            "options": {
                "temperature": self.temperature,
                "top_p": self.top_p,
                "num_predict": self.num_predict,
            },
        }

        with requests.post(self.url, json=payload, stream=True, timeout=120) as r:
            r.raise_for_status()
            for line in r.iter_lines(decode_unicode=True):
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get("done") is True:
                    break
                token = ((obj.get("message") or {}).get("content")) or ""
                if token:
                    yield token

    def ask_json(
        self,
        prompt: str,
        question: str = "",
        user_text: str = "",
        schema_hint: str = "",
        max_repair: int = 1,
    ) -> Dict[str, Any]:
        """
        Best-effort JSON mode:
        1) Ask model to output JSON
        2) If parse fails, do 1 repair pass: ask model to FIX JSON
        """
        schema_hint = clean_text(schema_hint)
        base_prompt = clean_text(prompt)

        json_prompt = base_prompt
        if schema_hint:
            json_prompt += "\n\nOUTPUT JSON SCHEMA:\n" + schema_hint
        json_prompt += "\n\nIMPORTANT: Output ONLY valid JSON. No markdown."

        txt = self.ask(json_prompt, question=question, user_text=user_text)
        obj = _try_parse_json(txt)
        if obj is not None:
            return obj

        # repair pass
        for _ in range(max(0, int(max_repair))):
            fix_prompt = (
                "You are a JSON repair tool. Return ONLY valid JSON.\n"
                "Given the schema and the invalid JSON, output a corrected JSON that matches the schema.\n\n"
                f"SCHEMA:\n{schema_hint}\n\nINVALID_JSON:\n{txt}"
            )
            fixed = self.ask(fix_prompt, question="Fix JSON")
            obj = _try_parse_json(fixed)
            if obj is not None:
                return obj

        # fallback
        return {"raw": txt, "parse_error": True}
