"""Pydantic schemas for structured clinical data."""

from typing import Literal

from pydantic import BaseModel, Field


SeverityLevel = Literal["mild", "moderate", "severe", "critical"]
UrgencyLevel = Literal["low", "medium", "high"]


class MedicationCategory(BaseModel):
    category: str
    purpose: str
    note: str = Field(
        default="Category overview only — not a prescription. Consult a licensed clinician."
    )


class StructuredDiagnosis(BaseModel):
    rank: int
    name: str
    slug: str
    match_reason: str
    distinguishing_features: str
    urgency: UrgencyLevel
    urgency_guidance: str
    seek_care_now: bool = False
    clinical_available: bool = False


class SymptomCheckResponse(BaseModel):
    input_symptoms: list[str]
    summary: str = ""
    diagnoses: list[StructuredDiagnosis] = Field(default_factory=list)
    answer: str = ""
    sources: list[str] = Field(default_factory=list)
    disclaimer: str


class DiseaseProfile(BaseModel):
    slug: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    severity: SeverityLevel
    overview: str
    underlying_cause: str
    first_line_treatment: list[str]
    management_strategies: list[str]
    supportive_care: list[str]
    medication_categories: list[MedicationCategory]
    home_care: list[str]
    diagnostic_tests: list[str]
    recovery_timeline: str
    prevention: list[str]
    warning_signs: list[str]
    patient_education: list[str]
    disclaimer: str
    generated_by_ai: bool = False


class DiseaseLookupRequest(BaseModel):
    name: str
    generate_if_missing: bool = True
