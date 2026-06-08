export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'eggetarian'
  | 'non_vegetarian'
  | 'pescatarian'
  | 'jain'
  | 'mixed'
  | 'other';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'athlete';

export type SmokingStatus = 'never' | 'former' | 'occasional' | 'daily';
export type AlcoholConsumption = 'none' | 'occasional' | 'moderate' | 'heavy';

export type HealthGoal =
  | 'weight_loss'
  | 'weight_gain'
  | 'disease_management'
  | 'improved_recovery'
  | 'symptom_reduction'
  | 'general_wellness';

export type SymptomWorkflowStep = 'symptoms' | 'detection' | 'clinical' | 'diet' | 'followup';

export interface DietLifestyleProfile {
  dietary_preference: DietaryPreference;
  dietary_preference_other: string;
  food_allergies: string[];
  food_intolerances: string[];
  cultural_restrictions: string;
  preferred_cuisine: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  activity_level: ActivityLevel;
  water_intake_liters?: number | null;
  smoking_status: SmokingStatus;
  alcohol_consumption: AlcoholConsumption;
  existing_conditions: string[];
  current_medications: string;
  health_goals: HealthGoal[];
  additional_notes: string;
}

export interface ConditionContext {
  name: string;
  slug?: string;
  symptoms: string[];
  severity?: string;
  urgency?: string;
}

export interface RecommendationRationale {
  recommendation: string;
  clinical_rationale: string;
}

export interface FollowUpMonitoring {
  follow_up_intervals: string[];
  symptoms_to_track: string[];
  dietary_adherence_tips: string[];
  when_to_seek_care: string[];
}

export interface DietLifestyleReport {
  condition_summary: string;
  personalized_overview: string;
  recommended_foods: string[];
  foods_to_limit: string[];
  foods_to_avoid: string[];
  suggested_meal_patterns: string[];
  hydration_recommendations: string[];
  nutrient_priorities: string[];
  lifestyle_modifications: string[];
  exercise_considerations: string[];
  recovery_nutrition: string[];
  practical_dietary_tips: string[];
  recommendation_rationale: RecommendationRationale[];
  follow_up_monitoring: FollowUpMonitoring;
  guideline_references: string[];
  disclaimer: string;
}

export interface DietLifestyleResponse {
  report: DietLifestyleReport;
  generated_at: string;
}

export const DIETARY_PREFERENCES: { value: DietaryPreference; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'non_vegetarian', label: 'Non-Vegetarian' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'jain', label: 'Jain Diet' },
  { value: 'mixed', label: 'Mixed Diet' },
  { value: 'other', label: 'Other' },
];

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'lightly_active', label: 'Lightly active' },
  { value: 'moderately_active', label: 'Moderately active' },
  { value: 'very_active', label: 'Very active' },
  { value: 'athlete', label: 'Athlete / high performance' },
];

export const HEALTH_GOALS: { value: HealthGoal; label: string }[] = [
  { value: 'weight_loss', label: 'Weight loss' },
  { value: 'weight_gain', label: 'Weight gain' },
  { value: 'disease_management', label: 'Disease management' },
  { value: 'improved_recovery', label: 'Improved recovery' },
  { value: 'symptom_reduction', label: 'Symptom reduction' },
  { value: 'general_wellness', label: 'General wellness' },
];

export const WORKFLOW_STEPS: { id: SymptomWorkflowStep; label: string }[] = [
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'detection', label: 'Disease Detection' },
  { id: 'clinical', label: 'Clinical Guidance' },
  { id: 'diet', label: 'Diet & Lifestyle' },
  { id: 'followup', label: 'Follow-Up Monitoring' },
];

export const DEFAULT_LIFESTYLE_PROFILE: DietLifestyleProfile = {
  dietary_preference: 'mixed',
  dietary_preference_other: '',
  food_allergies: [],
  food_intolerances: [],
  cultural_restrictions: '',
  preferred_cuisine: '',
  weight_kg: null,
  height_cm: null,
  activity_level: 'moderately_active',
  water_intake_liters: null,
  smoking_status: 'never',
  alcohol_consumption: 'none',
  existing_conditions: [],
  current_medications: '',
  health_goals: ['disease_management'],
  additional_notes: '',
};
