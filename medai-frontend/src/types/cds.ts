export type ConfidenceTier = 'high' | 'moderate' | 'low';
export type SeverityCategory = 'mild' | 'moderate' | 'severe' | 'critical';

export interface DifferentialItem {
  condition: string;
  probability_percent?: number | null;
  rationale?: string;
}

export interface DetectionSummary {
  predicted_disease: string;
  confidence_percent: number;
  confidence_tier: ConfidenceTier;
  key_imaging_findings: string[];
  gradcam_interpretation: string;
  differential_diagnoses: DifferentialItem[];
}

export interface SeverityAssessment {
  category: SeverityCategory;
  rationale: string;
  influencing_factors: string[];
}

export interface MedicationClassItem {
  category: string;
  purpose?: string;
}

export interface TreatmentPathway {
  immediate_actions: string[];
  first_line_management: string[];
  medication_classes: MedicationClassItem[];
  procedural_interventions: string[];
  supportive_care: string[];
}

export interface FollowUpPlan {
  follow_up_intervals: string[];
  repeat_imaging: string[];
  monitoring_parameters: string[];
  expected_response_indicators: string[];
}

export interface GuidelineReference {
  organization: string;
  title: string;
  relevance?: string;
}

export interface CDSReportRequest {
  modality: string;
  modality_label: string;
  architecture: string;
  predicted_class: string;
  confidence: number;
  all_scores: Record<string, number>;
  gradcam_available: boolean;
}

export interface CDSReport {
  detection_summary: DetectionSummary;
  diagnostic_confirmation_tests: string[];
  severity_assessment: SeverityAssessment;
  treatment_pathway: TreatmentPathway;
  specialist_referrals: string[];
  follow_up_plan: FollowUpPlan;
  red_flags: string[];
  clinical_reasoning: string;
  references: GuidelineReference[];
  low_confidence_advisory?: string | null;
  disclaimer: string;
  generated_at: string;
}
