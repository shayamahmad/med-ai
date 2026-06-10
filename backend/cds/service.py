"""Generate doctor-facing Clinical Decision Support reports from imaging AI output."""

import json
import logging
import os
import re
from datetime import datetime, timezone

from cds.schemas import (
    CDSReportRequest,
    CDSReportResponse,
    DetectionSummary,
    DifferentialItem,
    FollowUpPlan,
    GuidelineReference,
    MedicationClassItem,
    PredictionValidationReport,
    RadiologicalFeatureAnalysis,
    AlternativeDiagnosisEvaluation,
    SeverityAssessment,
    TreatmentPathway,
)
from mistralai.client import Mistral

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "CLINICAL DECISION SUPPORT ONLY — NOT A DEFINITIVE DIAGNOSIS. "
    "This AI-generated report is intended to assist licensed healthcare professionals "
    "and must not replace clinical judgment. Final diagnosis and treatment decisions "
    "require integration of patient history, physical examination, laboratory results, "
    "comorbidities, allergies, current medications, and other relevant clinical data "
    "by a qualified physician."
)

VALIDATION_DISCLAIMER = (
    "This Prediction Validation & Explainability Report is intended for clinical decision "
    "support only. It does not replace professional medical judgment, pathological "
    "confirmation, laboratory testing, or additional imaging studies. All conclusions "
    "must be verified by a qualified physician using complete clinical context."
)

LOW_CONFIDENCE_THRESHOLD = 0.65
MODERATE_CONFIDENCE_THRESHOLD = 0.85

MODALITY_GUIDELINES: dict[str, list[str]] = {
    "chest": ["WHO TB guidelines", "IDSA/ATS community-acquired pneumonia", "CDC COVID-19", "RSNA thoracic imaging"],
    "brain": ["NCCN CNS Cancers", "WHO CNS tumor classification", "EANO glioma guidelines", "ASNR neuro-oncology"],
    "eye": ["AAO preferred practice patterns", "ICD-11 retinal disease", "WHO vision care"],
    "skin": ["AAD melanoma guidelines", "WHO skin cancer", "NICE skin cancer pathway"],
    "bone": ["AAOS fracture management", "NICE fragility fracture", "WHO musculoskeletal trauma"],
    "knee": ["OARSI osteoarthritis guidelines", "AAOS knee OA", "KL grading standards"],
    "dental": ["ADA oral pathology", "NICE dental radiograph interpretation", "WHO oral health"],
    "organ": ["Radiology specialty societies", "WHO diagnostic imaging"],
}


def _confidence_tier(confidence: float) -> str:
    if confidence >= MODERATE_CONFIDENCE_THRESHOLD:
        return "high"
    if confidence >= LOW_CONFIDENCE_THRESHOLD:
        return "moderate"
    return "low"


def _low_confidence_advisory(confidence: float, predicted: str) -> str | None:
    tier = _confidence_tier(confidence)
    if tier == "high":
        return None
    pct = round(confidence * 100, 1)
    return (
        f"Model confidence for '{predicted}' is {pct}% ({tier}). "
        "Do not initiate treatment based on this AI output alone. "
        "Obtain confirmatory imaging, specialist review, and correlation with clinical findings "
        "before making management decisions."
    )


def _build_differentials(payload: CDSReportRequest) -> list[dict]:
    ranked = sorted(payload.all_scores.items(), key=lambda item: item[1], reverse=True)
    items = []
    for label, score in ranked[:5]:
        if label == payload.predicted_class:
            continue
        items.append(
            {
                "condition": label.replace("_", " "),
                "probability_percent": round(score * 100, 1),
                "rationale": "Alternative class considered by the imaging classifier.",
            }
        )
    return items[:4]


def _rag_context(rag_instance, query: str) -> str:
    if rag_instance is None:
        return ""
    try:
        result = rag_instance.query(
            question=query,
            context_hint=query,
            max_tokens=800,
            mode="tutor",
        )
        return result.get("answer", "")[:2500]
    except Exception as exc:
        logger.warning("[CDS] RAG context unavailable: %s", exc)
        return ""


def _mistral_client() -> Mistral:
    key = os.environ.get("MISTRAL_API_KEY", "").strip()
    if not key or key.startswith("your_"):
        raise RuntimeError("MISTRAL_API_KEY not set. Add it to .env and restart the backend.")
    return Mistral(api_key=key)


def _parse_validation_report(data: dict, payload: CDSReportRequest, tier: str) -> PredictionValidationReport:
    raw = data.get("prediction_validation") or {}
    verdict = raw.get("validation_verdict", "Prediction Consistent but Requires Further Testing")
    valid_verdicts = {
        "Prediction Highly Consistent with Imaging Findings",
        "Prediction Consistent but Requires Further Testing",
        "Prediction Uncertain",
        "Prediction Likely Incorrect",
    }
    if verdict not in valid_verdicts:
        verdict = "Prediction Consistent but Requires Further Testing"

    reliability = raw.get("reliability_level", "moderately_supported")
    if reliability not in ("strongly_supported", "moderately_supported", "weakly_supported", "inconclusive"):
        reliability = "moderately_supported"

    features = []
    for item in raw.get("radiological_feature_analysis") or []:
        if isinstance(item, dict):
            weight = item.get("evidence_weight", "neutral")
            if weight not in ("supporting", "neutral", "conflicting"):
                weight = "neutral"
            features.append(
                RadiologicalFeatureAnalysis(
                    feature=item.get("feature", "Finding"),
                    observed_findings=item.get("observed_findings", ""),
                    disease_correlation=item.get("disease_correlation", ""),
                    evidence_weight=weight,
                )
            )

    alternatives = []
    for item in raw.get("alternative_diagnosis_evaluations") or []:
        if isinstance(item, dict):
            alternatives.append(
                AlternativeDiagnosisEvaluation(
                    condition=item.get("condition", "Alternative"),
                    why_evaluated=item.get("why_evaluated", ""),
                    similarities_to_scan=item.get("similarities_to_scan") or [],
                    missing_or_contradictory_features=item.get("missing_or_contradictory_features") or [],
                    relative_likelihood=item.get("relative_likelihood", ""),
                )
            )

    gradcam_text = raw.get("gradcam_explainability") or ""
    if payload.gradcam_available and not gradcam_text:
        gradcam_text = (
            "Grad-CAM heatmap regions indicate where the CNN weighted pixels for this prediction. "
            "Overlap with expected pathology distribution supports explainability; discordance "
            "suggests the model may be attending to confounding features."
        )

    return PredictionValidationReport(
        radiological_feature_analysis=features,
        primary_diagnosis_justification=raw.get("primary_diagnosis_justification", ""),
        supporting_evidence=raw.get("supporting_evidence") or [],
        conflicting_evidence=raw.get("conflicting_evidence") or [],
        alternative_diagnosis_evaluations=alternatives,
        reliability_level=reliability,
        reliability_assessment=raw.get("reliability_assessment", ""),
        clinical_consistency_analysis=raw.get("clinical_consistency_analysis", ""),
        gradcam_explainability=gradcam_text,
        validation_verdict=verdict,
        verdict_explanation=raw.get("verdict_explanation", ""),
        validation_disclaimer=raw.get("validation_disclaimer") or VALIDATION_DISCLAIMER,
    )


def generate_imaging_cds_report(payload: CDSReportRequest, rag_instance=None) -> CDSReportResponse:
    tier = _confidence_tier(payload.confidence)
    differentials = _build_differentials(payload)
    guideline_hints = MODALITY_GUIDELINES.get(payload.modality, MODALITY_GUIDELINES["organ"])
    disease_query = (
        f"{payload.modality_label} {payload.predicted_class} diagnosis confirmation "
        f"treatment pathway specialist referral monitoring guidelines"
    )
    rag_text = _rag_context(rag_instance, disease_query)

    scores_text = ", ".join(
        f"{k.replace('_', ' ')}: {round(v * 100, 1)}%"
        for k, v in sorted(payload.all_scores.items(), key=lambda x: x[1], reverse=True)
    )

    system = f"""You are a clinical decision support assistant for licensed physicians reviewing AI imaging output.
Generate an educational CDS report in strict JSON only. Never prescribe patient-specific drug doses.
Use evidence-based, guideline-aligned language suitable for healthcare professionals.

Reference organizations where appropriate: {", ".join(guideline_hints)} plus WHO, NICE, CDC, IDSA, AHA, NCCN, ESMO as relevant.

Return ONLY valid JSON:
{{
  "detection_summary": {{
    "predicted_disease": "...",
    "confidence_percent": 0.0,
    "confidence_tier": "high|moderate|low",
    "key_imaging_findings": ["..."],
    "gradcam_interpretation": "...",
    "differential_diagnoses": [{{"condition": "...", "probability_percent": 0.0, "rationale": "..."}}]
  }},
  "prediction_validation": {{
    "radiological_feature_analysis": [
      {{
        "feature": "Lesion location|Size|Shape|Margins|Intensity patterns|Enhancement characteristics|Edema|Mass effect|Tissue infiltration|Anatomical involvement|Other",
        "observed_findings": "What is inferred from modality-typical presentation and AI output",
        "disease_correlation": "How this links to the predicted disease per literature",
        "evidence_weight": "supporting|neutral|conflicting"
      }}
    ],
    "primary_diagnosis_justification": "Detailed narrative linking observed features to predicted condition",
    "supporting_evidence": ["..."],
    "conflicting_evidence": ["..."],
    "alternative_diagnosis_evaluations": [
      {{
        "condition": "...",
        "why_evaluated": "Why the classifier or clinician would consider this",
        "similarities_to_scan": ["..."],
        "missing_or_contradictory_features": ["..."],
        "relative_likelihood": "Why less likely than primary prediction"
      }}
    ],
    "reliability_level": "strongly_supported|moderately_supported|weakly_supported|inconclusive",
    "reliability_assessment": "Narrative on overall prediction reliability",
    "clinical_consistency_analysis": "Compare findings with standard literature and known disease presentations",
    "gradcam_explainability": "How Grad-CAM supports or conflicts with the prediction (if available)",
    "validation_verdict": "Prediction Highly Consistent with Imaging Findings|Prediction Consistent but Requires Further Testing|Prediction Uncertain|Prediction Likely Incorrect",
    "verdict_explanation": "Detailed evidence-based explanation for the verdict",
    "validation_disclaimer": "CDS-only disclaimer; does not replace pathology, labs, or additional imaging"
  }},
  "diagnostic_confirmation_tests": ["..."],
  "severity_assessment": {{
    "category": "mild|moderate|severe|critical",
    "rationale": "...",
    "influencing_factors": ["..."]
  }},
  "treatment_pathway": {{
    "immediate_actions": ["..."],
    "first_line_management": ["..."],
    "medication_classes": [{{"category": "...", "purpose": "..."}}],
    "procedural_interventions": ["..."],
    "supportive_care": ["..."]
  }},
  "specialist_referrals": ["..."],
  "follow_up_plan": {{
    "follow_up_intervals": ["..."],
    "repeat_imaging": ["..."],
    "monitoring_parameters": ["..."],
    "expected_response_indicators": ["..."]
  }},
  "red_flags": ["..."],
  "clinical_reasoning": "Integrated narrative explaining recommendations based on imaging AI output, disease characteristics, severity, and guidelines.",
  "references": [{{"organization": "WHO|NICE|NCCN|...", "title": "...", "relevance": "..."}}]
}}

Rules:
- prediction_validation: critically evaluate whether the AI prediction is justified by available imaging evidence
- Analyze at minimum: lesion location, size, shape, margins, intensity patterns, enhancement, edema, mass effect, infiltration, anatomical involvement
- For each alternative diagnosis: explain why evaluated, similarities, and missing/contradictory features
- reliability_level must align with confidence tier and evidence balance
- validation_verdict must be one of the four exact verdict strings provided
- gradcam_interpretation: explain Grad-CAM as model-attention heatmap, not independent radiological measurement
- Include differential diagnoses from classifier scores where clinically relevant
- For benign/normal predictions, emphasize reassurance pathways and when to re-evaluate
- Medication sections: classes and purposes only — no patient-specific dosing
- red_flags: urgent escalation, emergency, ICU, immediate specialist review when applicable
- clinical_reasoning: connect each major recommendation to findings and guidelines
- Minimum 3 references from reputable guideline bodies
"""

    user = f"""Generate a Clinical Decision Support report for this AI imaging analysis:

Modality: {payload.modality_label}
Model architecture: {payload.architecture}
Primary AI prediction: {payload.predicted_class.replace('_', ' ')}
Confidence: {round(payload.confidence * 100, 1)}% (tier: {tier})
All class probabilities: {scores_text}
Grad-CAM visualization available: {payload.gradcam_available}
Alternative diagnoses to consider: {json.dumps(differentials)}

Supplementary medical knowledge (may be empty):
{rag_text or 'Use established specialty guidelines.'}
"""

    client = _mistral_client()
    response = client.chat.complete(
        model=os.environ.get("MISTRAL_MODEL", "mistral-small-latest"),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=6500,
    )
    raw = response.choices[0].message.content
    raw = re.sub(r"```json|```", "", raw).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("CDS model did not return valid JSON.")
    data = json.loads(raw[start : end + 1])

    summary_data = data.get("detection_summary", {})
    summary_data.setdefault("predicted_disease", payload.predicted_class.replace("_", " "))
    summary_data.setdefault("confidence_percent", round(payload.confidence * 100, 1))
    summary_data["confidence_tier"] = tier
    if not summary_data.get("differential_diagnoses"):
        summary_data["differential_diagnoses"] = differentials
    if payload.gradcam_available and not summary_data.get("gradcam_interpretation"):
        summary_data["gradcam_interpretation"] = (
            "Grad-CAM highlights image regions that most influenced the CNN prediction. "
            "High-activation areas suggest where the model focused, but this does not replace "
            "formal radiological measurement or histopathological confirmation."
        )

    severity_data = data.get("severity_assessment", {})
    severity_cat = severity_data.get("category", "moderate")
    if severity_cat not in ("mild", "moderate", "severe", "critical"):
        severity_cat = "moderate"
    pathway_data = data.get("treatment_pathway", {})
    follow_data = data.get("follow_up_plan", {})

    return CDSReportResponse(
        detection_summary=DetectionSummary(
            predicted_disease=summary_data.get("predicted_disease", payload.predicted_class),
            confidence_percent=float(summary_data.get("confidence_percent", payload.confidence * 100)),
            confidence_tier=summary_data.get("confidence_tier", tier),
            key_imaging_findings=summary_data.get("key_imaging_findings") or [],
            gradcam_interpretation=summary_data.get("gradcam_interpretation") or "",
            differential_diagnoses=[
                DifferentialItem(**item) if isinstance(item, dict) else DifferentialItem(condition=str(item))
                for item in summary_data.get("differential_diagnoses") or []
            ],
        ),
        prediction_validation=_parse_validation_report(data, payload, tier),
        diagnostic_confirmation_tests=data.get("diagnostic_confirmation_tests") or [],
        severity_assessment=SeverityAssessment(
            category=severity_cat,
            rationale=severity_data.get("rationale", ""),
            influencing_factors=severity_data.get("influencing_factors") or [],
        ),
        treatment_pathway=TreatmentPathway(
            immediate_actions=pathway_data.get("immediate_actions") or [],
            first_line_management=pathway_data.get("first_line_management") or [],
            medication_classes=[
                MedicationClassItem(**m) if isinstance(m, dict) else MedicationClassItem(category=str(m))
                for m in pathway_data.get("medication_classes") or []
            ],
            procedural_interventions=pathway_data.get("procedural_interventions") or [],
            supportive_care=pathway_data.get("supportive_care") or [],
        ),
        specialist_referrals=data.get("specialist_referrals") or [],
        follow_up_plan=FollowUpPlan(
            follow_up_intervals=follow_data.get("follow_up_intervals") or [],
            repeat_imaging=follow_data.get("repeat_imaging") or [],
            monitoring_parameters=follow_data.get("monitoring_parameters") or [],
            expected_response_indicators=follow_data.get("expected_response_indicators") or [],
        ),
        red_flags=data.get("red_flags") or [],
        clinical_reasoning=data.get("clinical_reasoning") or "",
        references=[
            GuidelineReference(**ref) if isinstance(ref, dict) else GuidelineReference(organization="Guideline", title=str(ref))
            for ref in data.get("references") or []
        ],
        low_confidence_advisory=_low_confidence_advisory(payload.confidence, payload.predicted_class),
        disclaimer=DISCLAIMER,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )
