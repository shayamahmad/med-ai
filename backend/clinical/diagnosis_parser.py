"""Parse structured differential diagnoses from LLM output."""

import json
import logging
import re

from clinical.utils import slugify

logger = logging.getLogger(__name__)

STRUCTURED_SYMPTOM_PROMPT = """A patient presents with these symptoms: {symptoms}

Provide a differential diagnosis for EDUCATIONAL purposes only.
Do NOT claim any definitive diagnosis for this patient.
Rank the most likely conditions (up to 6).

Return ONLY valid JSON:
{{
  "summary": "1-2 sentence educational overview",
  "diagnoses": [
    {{
      "rank": 1,
      "name": "Condition name",
      "match_reason": "Why symptoms may fit",
      "distinguishing_features": "Features that help differentiate",
      "urgency": "low|medium|high",
      "urgency_guidance": "When to seek care",
      "seek_care_now": false
    }}
  ]
}}
"""


def build_structured_symptom_query(symptoms: list[str]) -> str:
    symptom_text = ", ".join(symptoms)
    return STRUCTURED_SYMPTOM_PROMPT.format(symptoms=symptom_text)


def parse_structured_response(answer: str) -> dict:
    cleaned = re.sub(r"```json|```", "", answer).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1:
        try:
            data = json.loads(cleaned[start : end + 1])
            if isinstance(data, dict) and "diagnoses" in data:
                return _normalize_payload(data)
        except json.JSONDecodeError as exc:
            logger.warning("[SymptomChecker] JSON parse failed: %s", exc)

    return _parse_markdown_fallback(answer)


def _normalize_payload(data: dict) -> dict:
    diagnoses = []
    for idx, item in enumerate(data.get("diagnoses", []), start=1):
        name = str(item.get("name", f"Condition {idx}")).strip()
        urgency = str(item.get("urgency", "medium")).lower()
        if urgency not in {"low", "medium", "high"}:
            urgency = "medium"
        diagnoses.append(
            {
                "rank": int(item.get("rank", idx)),
                "name": name,
                "slug": slugify(name),
                "match_reason": str(item.get("match_reason", "")).strip(),
                "distinguishing_features": str(item.get("distinguishing_features", "")).strip(),
                "urgency": urgency,
                "urgency_guidance": str(item.get("urgency_guidance", "")).strip(),
                "seek_care_now": bool(item.get("seek_care_now", False)),
            }
        )
    return {
        "summary": str(data.get("summary", "")).strip(),
        "diagnoses": sorted(diagnoses, key=lambda d: d["rank"]),
    }


def _parse_markdown_fallback(answer: str) -> dict:
    """Best-effort extraction from numbered markdown sections."""
    diagnoses = []
    blocks = re.split(r"\n(?=\d+[\.)]\s+|\#{2,3}\s+)", answer)
    rank = 1
    for block in blocks:
        block = block.strip()
        if not block or len(block) < 10:
            continue
        lines = block.splitlines()
        title = re.sub(r"^\d+[\.)]\s*", "", lines[0]).strip("*# ")
        if not title or len(title) > 120:
            continue
        body = "\n".join(lines[1:]).strip()
        diagnoses.append(
            {
                "rank": rank,
                "name": title,
                "slug": slugify(title),
                "match_reason": body[:400] or "See clinical assessment text.",
                "distinguishing_features": "",
                "urgency": "medium",
                "urgency_guidance": "Consult a healthcare provider if symptoms worsen.",
                "seek_care_now": False,
            }
        )
        rank += 1
        if rank > 6:
            break

    if not diagnoses:
        diagnoses = [
            {
                "rank": 1,
                "name": "Clinical assessment",
                "slug": "clinical-assessment",
                "match_reason": answer[:600],
                "distinguishing_features": "",
                "urgency": "medium",
                "urgency_guidance": "Consult a qualified clinician for evaluation.",
                "seek_care_now": False,
            }
        ]

    # Don't expose raw JSON or markdown fences as the summary
    raw = answer[:280].strip()
    clean_summary = "" if raw.startswith(("{", "[", "```")) else raw
    return {"summary": clean_summary, "diagnoses": diagnoses}
