"""Personalized diet and lifestyle report generation."""

import json
import logging
import os
import re
from datetime import datetime, timezone

from lifestyle.schemas import (
    DietLifestyleReport,
    DietLifestyleRequest,
    DietLifestyleResponse,
    FollowUpMonitoring,
    RecommendationRationale,
)
from mistralai.client import Mistral

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "These nutrition and lifestyle recommendations are educational and supportive in nature only. "
    "They must not replace consultation with a licensed physician, registered dietitian, or "
    "qualified healthcare professional. Seek professional guidance especially if you are pregnant, "
    "have complex or chronic disease, take medications with dietary interactions, or have "
    "severe food allergies."
)

PREFERENCE_LABELS = {
    "vegetarian": "Vegetarian",
    "vegan": "Vegan",
    "eggetarian": "Eggetarian (lacto-vegetarian with eggs)",
    "non_vegetarian": "Non-Vegetarian",
    "pescatarian": "Pescatarian",
    "jain": "Jain Diet",
    "mixed": "Mixed Diet",
    "other": "Other",
}


def _mistral_client() -> Mistral:
    key = os.environ.get("MISTRAL_API_KEY", "").strip()
    if not key or key.startswith("your_"):
        raise RuntimeError("MISTRAL_API_KEY not set. Add it to .env and restart the backend.")
    return Mistral(api_key=key)


def _rag_snippet(rag_instance, condition_name: str, symptoms: list[str]) -> str:
    if rag_instance is None:
        return ""
    try:
        hint = f"{condition_name} nutrition diet lifestyle recovery {' '.join(symptoms[:6])}"
        result = rag_instance.query(
            question=f"Nutrition and lifestyle guidance for {condition_name}",
            context_hint=hint,
            max_tokens=900,
            mode="disease",
        )
        return (result.get("answer") or "")[:2200]
    except Exception as exc:
        logger.warning("[Lifestyle] RAG context unavailable: %s", exc)
        return ""


def _profile_summary(req: DietLifestyleRequest) -> str:
    p = req.profile
    pref = PREFERENCE_LABELS.get(p.dietary_preference, p.dietary_preference)
    if p.dietary_preference == "other" and p.dietary_preference_other:
        pref = p.dietary_preference_other
    lines = [
        f"Dietary preference: {pref}",
        f"Allergies: {', '.join(p.food_allergies) or 'none reported'}",
        f"Intolerances: {', '.join(p.food_intolerances) or 'none reported'}",
        f"Cultural/religious restrictions: {p.cultural_restrictions or 'none reported'}",
        f"Preferred cuisine: {p.preferred_cuisine or 'not specified'}",
        f"Weight (kg): {p.weight_kg if p.weight_kg else 'not provided'}",
        f"Height (cm): {p.height_cm if p.height_cm else 'not provided'}",
        f"Activity level: {p.activity_level}",
        f"Daily water (L): {p.water_intake_liters if p.water_intake_liters else 'not provided'}",
        f"Smoking: {p.smoking_status}",
        f"Alcohol: {p.alcohol_consumption}",
        f"Existing conditions: {', '.join(p.existing_conditions) or 'none reported'}",
        f"Medications: {p.current_medications or 'none reported'}",
        f"Health goals: {', '.join(p.health_goals) or 'general wellness'}",
    ]
    if p.additional_notes:
        lines.append(f"Additional notes: {p.additional_notes}")
    return "\n".join(lines)


def generate_diet_lifestyle_report(
    payload: DietLifestyleRequest,
    rag_instance=None,
) -> DietLifestyleResponse:
    ctx = payload.condition
    rag_text = _rag_snippet(rag_instance, ctx.name, ctx.symptoms)
    profile_text = _profile_summary(payload)

    system = """You are a clinical nutrition education assistant for licensed healthcare teams.
Generate personalized, preference-aware diet and lifestyle guidance in strict JSON only.

Rules:
- Adapt ALL food suggestions to the patient's stated dietary preference (never suggest forbidden foods)
- Respect allergies, intolerances, and cultural/religious restrictions strictly
- No specific drug dosages; note medication-diet interaction cautions generally
- Categorize medication-aware advice without contradicting stated medications
- Use evidence-aligned language (WHO, ADA, AHA, ESPEN, national dietary guidelines)
- Explain WHY each major recommendation supports the identified condition
- Meal patterns must fit the dietary preference — no generic one-size-fits-all plans
- Include practical tips aligned with preferred cuisine when provided

Return ONLY valid JSON:
{
  "condition_summary": "brief link between condition and nutrition needs",
  "personalized_overview": "2-3 sentences tailored to profile",
  "recommended_foods": ["..."],
  "foods_to_limit": ["..."],
  "foods_to_avoid": ["..."],
  "suggested_meal_patterns": ["..."],
  "hydration_recommendations": ["..."],
  "nutrient_priorities": ["..."],
  "lifestyle_modifications": ["..."],
  "exercise_considerations": ["..."],
  "recovery_nutrition": ["..."],
  "practical_dietary_tips": ["..."],
  "recommendation_rationale": [
    {"recommendation": "...", "clinical_rationale": "..."}
  ],
  "follow_up_monitoring": {
    "follow_up_intervals": ["..."],
    "symptoms_to_track": ["..."],
    "dietary_adherence_tips": ["..."],
    "when_to_seek_care": ["..."]
  },
  "guideline_references": ["WHO ...", "NICE ...", etc.]
}"""

    user = f"""Condition: {ctx.name}
Urgency: {ctx.urgency or 'unspecified'}
Severity context: {ctx.severity or 'unspecified'}
Symptoms: {', '.join(ctx.symptoms) or 'not listed'}

Patient profile:
{profile_text}

Reference knowledge (may supplement):
{rag_text or 'Use established nutritional guidelines for this condition.'}
"""

    client = _mistral_client()
    response = client.chat.complete(
        model=os.environ.get("MISTRAL_MODEL", "mistral-small-latest"),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=4000,
    )
    raw = response.choices[0].message.content
    raw = re.sub(r"```json|```", "", raw).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Lifestyle model did not return valid JSON.")

    data = json.loads(raw[start : end + 1])
    follow_raw = data.get("follow_up_monitoring") or {}

    report = DietLifestyleReport(
        condition_summary=data.get("condition_summary", ""),
        personalized_overview=data.get("personalized_overview", ""),
        recommended_foods=data.get("recommended_foods") or [],
        foods_to_limit=data.get("foods_to_limit") or [],
        foods_to_avoid=data.get("foods_to_avoid") or [],
        suggested_meal_patterns=data.get("suggested_meal_patterns") or [],
        hydration_recommendations=data.get("hydration_recommendations") or [],
        nutrient_priorities=data.get("nutrient_priorities") or [],
        lifestyle_modifications=data.get("lifestyle_modifications") or [],
        exercise_considerations=data.get("exercise_considerations") or [],
        recovery_nutrition=data.get("recovery_nutrition") or [],
        practical_dietary_tips=data.get("practical_dietary_tips") or [],
        recommendation_rationale=[
            RecommendationRationale(**r) if isinstance(r, dict) else RecommendationRationale(recommendation=str(r), clinical_rationale="")
            for r in data.get("recommendation_rationale") or []
        ],
        follow_up_monitoring=FollowUpMonitoring(
            follow_up_intervals=follow_raw.get("follow_up_intervals") or [],
            symptoms_to_track=follow_raw.get("symptoms_to_track") or [],
            dietary_adherence_tips=follow_raw.get("dietary_adherence_tips") or [],
            when_to_seek_care=follow_raw.get("when_to_seek_care") or [],
        ),
        guideline_references=data.get("guideline_references") or [],
        disclaimer=DISCLAIMER,
    )

    return DietLifestyleResponse(
        report=report,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
