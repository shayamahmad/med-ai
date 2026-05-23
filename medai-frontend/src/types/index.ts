export interface TopKItem {
  label: string;
  confidence: number;
}

export interface ClassificationResult {
  predicted_class: string;
  confidence: number;
  all_scores: Record<string, number>;
  gradcam_image?: string;
}

export interface AutoClassifyResult {
  organ: string;
  organ_confidence: number;
  disease_result?: ClassificationResult;
  disease_model?: string;
  note?: string;
}

export interface RAGResponse {
  answer: string;
  sources: string[];
}

export interface SymptomResult {
  answer: string;
  sources: string[];
  input_symptoms: string[];
  disclaimer: string;
}