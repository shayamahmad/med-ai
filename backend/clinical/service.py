"""Clinical disease profile service with RAG-backed generation."""

import json
import logging
import re

from clinical.db import (
    DISCLAIMER,
    find_disease_by_name,
    get_disease_by_slug,
    save_generated_profile,
)
from clinical.schemas import DiseaseProfile, StructuredDiagnosis
from clinical.utils import normalize_severity, slugify

logger = logging.getLogger(__name__)

GENERATION_PROMPT = """You are a medical education content writer for a clinical learning platform.
Create educational clinical guidance for the disease: "{name}".

Rules (strict):
- Educational content ONLY — never prescribe dosages or specific drug regimens for an individual patient
- Never claim diagnostic certainty
- Never tell the user what they personally should take
- Use general, guideline-level educational language
- Medication sections describe CATEGORIES and PURPOSES only

Return ONLY valid JSON matching this schema:
{{
  "name": "{name}",
  "aliases": ["alias1", "alias2"],
  "severity": "mild|moderate|severe|critical",
  "overview": "2-3 sentences",
  "underlying_cause": "concise explanation",
  "first_line_treatment": ["item1", "item2"],
  "management_strategies": ["item1", "item2"],
  "supportive_care": ["item1", "item2"],
  "medication_categories": [
    {{"category": "Name", "purpose": "Educational purpose", "note": "Not a prescription"}}
  ],
  "home_care": ["item1", "item2"],
  "diagnostic_tests": ["item1", "item2"],
  "recovery_timeline": "brief timeline",
  "prevention": ["item1", "item2"],
  "warning_signs": ["item1", "item2"],
  "patient_education": ["item1", "item2"]
}}
"""


def attach_clinical_flags(diagnoses: list[dict]) -> list[StructuredDiagnosis]:
    enriched: list[StructuredDiagnosis] = []
    for item in diagnoses:
        slug = item.get("slug") or slugify(item.get("name", ""))
        profile = get_disease_by_slug(slug) or find_disease_by_name(item.get("name", ""))
        if profile:
            slug = profile.slug
        enriched.append(
            StructuredDiagnosis(
                rank=int(item.get("rank", len(enriched) + 1)),
                name=item.get("name", "Unknown condition"),
                slug=slug,
                match_reason=item.get("match_reason", ""),
                distinguishing_features=item.get("distinguishing_features", ""),
                urgency=item.get("urgency", "medium"),
                urgency_guidance=item.get("urgency_guidance", ""),
                seek_care_now=bool(item.get("seek_care_now", False)),
                clinical_available=profile is not None,
            )
        )
    return enriched


def get_or_generate_profile(name: str, rag_instance=None, generate: bool = True) -> DiseaseProfile | None:
    profile = find_disease_by_name(name)
    if profile or not generate or rag_instance is None:
        return profile

    try:
        raw = _generate_profile_json(name, rag_instance)
        data = json.loads(raw)
        data["name"] = data.get("name") or name
        data["slug"] = slugify(data["name"])
        data["severity"] = normalize_severity(data.get("severity"))
        data["disclaimer"] = DISCLAIMER
        return save_generated_profile(data)
    except Exception as exc:
        logger.error("[Clinical] Failed to generate profile for '%s': %s", name, exc)
        return None


def _generate_profile_json(name: str, rag_instance) -> str:
    prompt = GENERATION_PROMPT.format(name=name)
    result = rag_instance.query(
        question=prompt,
        context_hint=name,
        max_tokens=1800,
        mode="disease",
    )
    text = result.get("answer", "")
    text = re.sub(r"```json|```", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object in model response")
    return text[start : end + 1]
