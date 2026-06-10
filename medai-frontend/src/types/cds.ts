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

export type ValidationVerdict =
  | 'Prediction Highly Consistent with Imaging Findings'
  | 'Prediction Consistent but Requires Further Testing'
  | 'Prediction Uncertain'
  | 'Prediction Likely Incorrect';

export type ReliabilityLevel =
  | 'strongly_supported'
  | 'moderately_supported'
  | 'weakly_supported'
  | 'inconclusive';

export interface RadiologicalFeatureAnalysis {
  feature: string;
  observed_findings: string;
  disease_correlation: string;
  evidence_weight: 'supporting' | 'neutral' | 'conflicting';
}

export interface AlternativeDiagnosisEvaluation {
  condition: string;
  why_evaluated: string;
  similarities_to_scan: string[];
  missing_or_contradictory_features: string[];
  relative_likelihood: string;
}

export interface PredictionValidationReport {
  radiological_feature_analysis: RadiologicalFeatureAnalysis[];
  primary_diagnosis_justification: string;
  supporting_evidence: string[];
  conflicting_evidence: string[];
  alternative_diagnosis_evaluations: AlternativeDiagnosisEvaluation[];
  reliability_level: ReliabilityLevel;
  reliability_assessment: string;
  clinical_consistency_analysis: string;
  gradcam_explainability: string;
  validation_verdict: ValidationVerdict;
  verdict_explanation: string;
  validation_disclaimer: string;
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
  prediction_validation: PredictionValidationReport;
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
