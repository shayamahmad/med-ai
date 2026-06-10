"""Pydantic schemas for imaging CDS reports."""

from typing import Literal

from pydantic import BaseModel, Field

SeverityCategory = Literal["mild", "moderate", "severe", "critical"]


class DifferentialItem(BaseModel):
    condition: str
    probability_percent: float | None = None
    rationale: str = ""


class DetectionSummary(BaseModel):
    predicted_disease: str
    confidence_percent: float
    confidence_tier: Literal["high", "moderate", "low"]
    key_imaging_findings: list[str] = Field(default_factory=list)
    gradcam_interpretation: str = ""
    differential_diagnoses: list[DifferentialItem] = Field(default_factory=list)


class SeverityAssessment(BaseModel):
    category: SeverityCategory
    rationale: str = ""
    influencing_factors: list[str] = Field(default_factory=list)


class MedicationClassItem(BaseModel):
    category: str
    purpose: str = ""


class TreatmentPathway(BaseModel):
    immediate_actions: list[str] = Field(default_factory=list)
    first_line_management: list[str] = Field(default_factory=list)
    medication_classes: list[MedicationClassItem] = Field(default_factory=list)
    procedural_interventions: list[str] = Field(default_factory=list)
    supportive_care: list[str] = Field(default_factory=list)


class FollowUpPlan(BaseModel):
    follow_up_intervals: list[str] = Field(default_factory=list)
    repeat_imaging: list[str] = Field(default_factory=list)
    monitoring_parameters: list[str] = Field(default_factory=list)
    expected_response_indicators: list[str] = Field(default_factory=list)


class GuidelineReference(BaseModel):
    organization: str
    title: str
    relevance: str = ""


ValidationVerdict = Literal[
    "Prediction Highly Consistent with Imaging Findings",
    "Prediction Consistent but Requires Further Testing",
    "Prediction Uncertain",
    "Prediction Likely Incorrect",
]

ReliabilityLevel = Literal[
    "strongly_supported",
    "moderately_supported",
    "weakly_supported",
    "inconclusive",
]


class RadiologicalFeatureAnalysis(BaseModel):
    feature: str
    observed_findings: str = ""
    disease_correlation: str = ""
    evidence_weight: Literal["supporting", "neutral", "conflicting"] = "neutral"


class AlternativeDiagnosisEvaluation(BaseModel):
    condition: str
    why_evaluated: str = ""
    similarities_to_scan: list[str] = Field(default_factory=list)
    missing_or_contradictory_features: list[str] = Field(default_factory=list)
    relative_likelihood: str = ""


class PredictionValidationReport(BaseModel):
    radiological_feature_analysis: list[RadiologicalFeatureAnalysis] = Field(default_factory=list)
    primary_diagnosis_justification: str = ""
    supporting_evidence: list[str] = Field(default_factory=list)
    conflicting_evidence: list[str] = Field(default_factory=list)
    alternative_diagnosis_evaluations: list[AlternativeDiagnosisEvaluation] = Field(
        default_factory=list
    )
    reliability_level: ReliabilityLevel = "moderately_supported"
    reliability_assessment: str = ""
    clinical_consistency_analysis: str = ""
    gradcam_explainability: str = ""
    validation_verdict: ValidationVerdict = "Prediction Consistent but Requires Further Testing"
    verdict_explanation: str = ""
    validation_disclaimer: str = ""


class CDSReportRequest(BaseModel):
    modality: str
    modality_label: str
    architecture: str
    predicted_class: str
    confidence: float = Field(ge=0.0, le=1.0)
    all_scores: dict[str, float] = Field(default_factory=dict)
    gradcam_available: bool = False


class CDSReportResponse(BaseModel):
    detection_summary: DetectionSummary
    prediction_validation: PredictionValidationReport
    diagnostic_confirmation_tests: list[str] = Field(default_factory=list)
    severity_assessment: SeverityAssessment
    treatment_pathway: TreatmentPathway
    specialist_referrals: list[str] = Field(default_factory=list)
    follow_up_plan: FollowUpPlan
    red_flags: list[str] = Field(default_factory=list)
    clinical_reasoning: str = ""
    references: list[GuidelineReference] = Field(default_factory=list)
    low_confidence_advisory: str | None = None
    disclaimer: str
    generated_at: str
