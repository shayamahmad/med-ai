export type UrgencyLevel = 'low' | 'medium' | 'high';
export type SeverityLevel = 'mild' | 'moderate' | 'severe' | 'critical';

export interface StructuredDiagnosis {
  rank: number;
  name: string;
  slug: string;
  match_reason: string;
  distinguishing_features: string;
  urgency: UrgencyLevel;
  urgency_guidance: string;
  seek_care_now: boolean;
  clinical_available: boolean;
}

export interface SymptomCheckResult {
  input_symptoms: string[];
  summary: string;
  diagnoses: StructuredDiagnosis[];
  answer: string;
  sources: string[];
  disclaimer: string;
}

export interface MedicationCategory {
  category: string;
  purpose: string;
  note: string;
}

export interface DiseaseProfile {
  slug: string;
  name: string;
  aliases: string[];
  severity: SeverityLevel;
  overview: string;
  underlying_cause: string;
  first_line_treatment: string[];
  management_strategies: string[];
  supportive_care: string[];
  medication_categories: MedicationCategory[];
  home_care: string[];
  diagnostic_tests: string[];
  recovery_timeline: string;
  prevention: string[];
  warning_signs: string[];
  patient_education: string[];
  disclaimer: string;
  generated_by_ai: boolean;
}
