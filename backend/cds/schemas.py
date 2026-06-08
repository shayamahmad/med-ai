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
