"""Diet & lifestyle guidance schemas."""

from typing import Literal

from pydantic import BaseModel, Field

DietaryPreference = Literal[
    "vegetarian",
    "vegan",
    "eggetarian",
    "non_vegetarian",
    "pescatarian",
    "jain",
    "mixed",
    "other",
]

ActivityLevel = Literal[
    "sedentary",
    "lightly_active",
    "moderately_active",
    "very_active",
    "athlete",
]

SmokingStatus = Literal["never", "former", "occasional", "daily"]
AlcoholConsumption = Literal["none", "occasional", "moderate", "heavy"]

HealthGoal = Literal[
    "weight_loss",
    "weight_gain",
    "disease_management",
    "improved_recovery",
    "symptom_reduction",
    "general_wellness",
]


class DietLifestyleProfile(BaseModel):
    dietary_preference: DietaryPreference
    dietary_preference_other: str = ""
    food_allergies: list[str] = Field(default_factory=list)
    food_intolerances: list[str] = Field(default_factory=list)
    cultural_restrictions: str = ""
    preferred_cuisine: str = ""
    weight_kg: float | None = None
    height_cm: float | None = None
    activity_level: ActivityLevel
    water_intake_liters: float | None = None
    smoking_status: SmokingStatus
    alcohol_consumption: AlcoholConsumption
    existing_conditions: list[str] = Field(default_factory=list)
    current_medications: str = ""
    health_goals: list[HealthGoal] = Field(default_factory=list)
    additional_notes: str = ""


class ConditionContext(BaseModel):
    name: str
    slug: str = ""
    symptoms: list[str] = Field(default_factory=list)
    severity: str = ""
    urgency: str = ""


class RecommendationRationale(BaseModel):
    recommendation: str
    clinical_rationale: str


class FollowUpMonitoring(BaseModel):
    follow_up_intervals: list[str] = Field(default_factory=list)
    symptoms_to_track: list[str] = Field(default_factory=list)
    dietary_adherence_tips: list[str] = Field(default_factory=list)
    when_to_seek_care: list[str] = Field(default_factory=list)


class DietLifestyleReport(BaseModel):
    condition_summary: str = ""
    personalized_overview: str = ""
    recommended_foods: list[str] = Field(default_factory=list)
    foods_to_limit: list[str] = Field(default_factory=list)
    foods_to_avoid: list[str] = Field(default_factory=list)
    suggested_meal_patterns: list[str] = Field(default_factory=list)
    hydration_recommendations: list[str] = Field(default_factory=list)
    nutrient_priorities: list[str] = Field(default_factory=list)
    lifestyle_modifications: list[str] = Field(default_factory=list)
    exercise_considerations: list[str] = Field(default_factory=list)
    recovery_nutrition: list[str] = Field(default_factory=list)
    practical_dietary_tips: list[str] = Field(default_factory=list)
    recommendation_rationale: list[RecommendationRationale] = Field(default_factory=list)
    follow_up_monitoring: FollowUpMonitoring = Field(default_factory=FollowUpMonitoring)
    guideline_references: list[str] = Field(default_factory=list)
    disclaimer: str


class DietLifestyleRequest(BaseModel):
    condition: ConditionContext
    profile: DietLifestyleProfile


class DietLifestyleResponse(BaseModel):
    report: DietLifestyleReport
    generated_at: str
