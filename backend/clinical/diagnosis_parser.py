"""Parse structured differential diagnoses from LLM output."""

import json
import logging
import re

from clinical.utils import slugify

logger = logging.getLogger(__name__)

STRUCTURED_SYMPTOM_PROMPT = """A patient case is described below:
{symptoms}

Provide a differential diagnosis for EDUCATIONAL purposes only.
Do NOT claim any definitive diagnosis for this patient.
Rank the most likely conditions (up to 6).

Return ONLY a single complete JSON object — no markdown fences, no commentary before or after.
Keep string values concise so the full JSON fits in the response.

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
    if len(symptoms) == 1:
        symptom_text = symptoms[0]
    else:
        symptom_text = ", ".join(symptoms)
    return STRUCTURED_SYMPTOM_PROMPT.format(symptoms=symptom_text)


def parse_structured_response(answer: str) -> dict:
    if not answer or not answer.strip():
        return {"summary": "", "diagnoses": []}

    data = _extract_json_object(answer)
    if data is not None:
        return _normalize_payload(data)

    partial = _extract_partial_json_fields(answer)
    if partial is not None:
        logger.info("[SymptomChecker] Recovered partial JSON from truncated LLM output")
        return _normalize_payload(partial)

    if _looks_like_json_blob(answer):
        logger.warning("[SymptomChecker] JSON-like output could not be parsed")
        return {"summary": _extract_summary_regex(answer), "diagnoses": _extract_diagnoses_regex(answer)}

    return _parse_markdown_fallback(answer)


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    return cleaned.strip()


def _balanced_json_slice(text: str) -> str | None:
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for idx in range(start, len(text)):
        ch = text[idx]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : idx + 1]
    return text[start:]


def _extract_json_object(answer: str) -> dict | None:
    cleaned = _strip_fences(answer)
    candidates = [cleaned]
    balanced = _balanced_json_slice(cleaned)
    if balanced:
        candidates.append(balanced)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        candidates.append(cleaned[start : end + 1])

    seen: set[str] = set()
    for candidate in candidates:
        if not candidate or candidate in seen:
            continue
        seen.add(candidate)
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            repaired = _repair_truncated_json(candidate)
            if repaired is None:
                continue
            data = repaired
        if isinstance(data, dict):
            return data
    return None


def _repair_truncated_json(text: str) -> dict | None:
    start = text.find("{")
    if start == -1:
        return None
    fragment = text[start:]

    suffixes = [
        "",
        '"}',
        '"}]}',
        '"} ]}',
        '"]}',
        "]}",
        "}",
    ]
    for suffix in suffixes:
        try:
            data = json.loads(fragment + suffix)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            continue
    return None


def _unescape_json_string(value: str) -> str:
    try:
        return json.loads(f'"{value}"')
    except json.JSONDecodeError:
        return value.replace('\\"', '"').replace("\\n", "\n").strip()


def _extract_summary_regex(text: str) -> str:
    match = re.search(r'"summary"\s*:\s*"((?:[^"\\]|\\.)*)"', text, re.DOTALL)
    if not match:
        return ""
    return _unescape_json_string(match.group(1))


def _extract_diagnoses_regex(text: str) -> list[dict]:
    diagnoses: list[dict] = []
    pattern = re.compile(
        r'\{\s*"rank"\s*:\s*(\d+)\s*,\s*"name"\s*:\s*"([^"]+)"'
        r'(?:\s*,\s*"match_reason"\s*:\s*"((?:[^"\\]|\\.)*)")?'
        r'(?:\s*,\s*"distinguishing_features"\s*:\s*"((?:[^"\\]|\\.)*)")?'
        r'(?:\s*,\s*"urgency"\s*:\s*"(low|medium|high)")?'
        r'(?:\s*,\s*"urgency_guidance"\s*:\s*"((?:[^"\\]|\\.)*)")?'
        r'(?:\s*,\s*"seek_care_now"\s*:\s*(true|false))?',
        re.DOTALL | re.IGNORECASE,
    )
    for match in pattern.finditer(text):
        name = match.group(2).strip()
        if not _is_valid_diagnosis_name(name):
            continue
        urgency = (match.group(5) or "medium").lower()
        if urgency not in {"low", "medium", "high"}:
            urgency = "medium"
        diagnoses.append(
            {
                "rank": int(match.group(1)),
                "name": name,
                "slug": slugify(name),
                "match_reason": _unescape_json_string(match.group(3) or ""),
                "distinguishing_features": _unescape_json_string(match.group(4) or ""),
                "urgency": urgency,
                "urgency_guidance": _unescape_json_string(match.group(6) or ""),
                "seek_care_now": (match.group(7) or "false").lower() == "true",
            }
        )
    return sorted(diagnoses, key=lambda d: d["rank"])


def _extract_partial_json_fields(text: str) -> dict | None:
    summary = _extract_summary_regex(text)
    diagnoses = _extract_diagnoses_regex(text)
    if summary or diagnoses:
        return {"summary": summary, "diagnoses": diagnoses}
    return None


def _looks_like_json_blob(text: str) -> bool:
    stripped = text.strip()
    return (
        stripped.startswith(("```", "{"))
        or '"diagnoses"' in stripped
        or '"summary"' in stripped[:240]
    )


def _coerce_diagnoses(raw) -> list:
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return _extract_diagnoses_regex(raw)
    if isinstance(raw, dict):
        return [raw]
    if isinstance(raw, list):
        return raw
    return []


def _is_valid_diagnosis_name(name: str) -> bool:
    if not name or len(name) > 120:
        return False
    lowered = name.strip().lower()
    if lowered in {"{", "}", "[", "]", "json", "summary", "diagnoses", "clinical assessment"}:
        return False
    if lowered.startswith(("```", "{", "[", '"')):
        return False
    if re.fullmatch(r"[\W_]+", name):
        return False
    return True


def _clean_summary(text: str) -> str:
    summary = str(text or "").strip()
    if not summary:
        return ""
    if _looks_like_json_blob(summary):
        embedded = _extract_summary_regex(summary)
        return embedded or ""
    return summary


def _normalize_payload(data: dict) -> dict:
    diagnoses = []
    for idx, item in enumerate(_coerce_diagnoses(data.get("diagnoses")), start=1):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        if not _is_valid_diagnosis_name(name):
            continue
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

    summary = _clean_summary(str(data.get("summary", "")).strip())
    if not summary and diagnoses:
        summary = f"Educational differential based on the presentation — {len(diagnoses)} possible condition(s) listed."

    return {
        "summary": summary,
        "diagnoses": sorted(diagnoses, key=lambda d: d["rank"]),
    }


def _parse_markdown_fallback(answer: str) -> dict:
    """Best-effort extraction from numbered markdown sections."""
    if _looks_like_json_blob(answer):
        partial = _extract_partial_json_fields(answer)
        if partial and (partial.get("summary") or partial.get("diagnoses")):
            return _normalize_payload(partial)

    diagnoses = []
    blocks = re.split(r"\n(?=\d+[\.)]\s+|\#{2,3}\s+)", answer)
    rank = 1
    for block in blocks:
        block = block.strip()
        if not block or len(block) < 10:
            continue
        lines = block.splitlines()
        title = re.sub(r"^\d+[\.)]\s*", "", lines[0]).strip("*# ")
        if not _is_valid_diagnosis_name(title):
            continue
        body = "\n".join(lines[1:]).strip()
        if _looks_like_json_blob(body):
            continue
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
        summary = _extract_summary_regex(answer)
        regex_diagnoses = _extract_diagnoses_regex(answer)
        if summary or regex_diagnoses:
            return _normalize_payload({"summary": summary, "diagnoses": regex_diagnoses})

        clean_text = _strip_fences(answer).strip()
        if clean_text and not _looks_like_json_blob(clean_text):
            diagnoses = [
                {
                    "rank": 1,
                    "name": "Clinical assessment",
                    "slug": "clinical-assessment",
                    "match_reason": clean_text[:600],
                    "distinguishing_features": "",
                    "urgency": "medium",
                    "urgency_guidance": "Consult a qualified clinician for evaluation.",
                    "seek_care_now": False,
                }
            ]

    raw = answer[:280].strip()
    clean_summary = "" if _looks_like_json_blob(raw) else raw
    return {"summary": clean_summary, "diagnoses": diagnoses}
