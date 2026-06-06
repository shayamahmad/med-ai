export type BookStatus = 'processing' | 'ready' | 'failed';

export interface BookChapter {
  id: string;
  title: string;
  start_page: number;
  end_page: number;
}

export interface StudyBook {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  status: BookStatus;
  progress: number;
  chunk_count: number;
  page_count: number;
  chapters: BookChapter[];
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: { chapter: string; page?: number; score: number }[];
}

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  topic?: string;
  chapter?: string;
  difficulty?: string;
}

export interface QuestionResult {
  id: string;
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  explanation: string;
  topic?: string;
}

export interface AssessmentResult {
  score: number;
  percentage: number;
  total: number;
  correct: number;
  results: QuestionResult[];
  topic_breakdown: { topic: string; correct: number; total: number; percentage: number }[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  readiness_level: string;
  disclaimer: string;
}

export interface StudyAnalytics {
  total_attempts: number;
  average_score: number;
  best_score: number;
  recent_trend: { date: string; percentage: number; mode: string }[];
  topic_mastery: { topic: string; average: number; attempts: number }[];
  recommendations: string[];
}

export type WorkspaceTab = 'library' | 'chat' | 'quiz' | 'exam' | 'tools' | 'analytics';
