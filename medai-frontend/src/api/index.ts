import axios from 'axios';
import { ClassificationResult, RAGResponse, SymptomResult, AutoClassifyResult, TopKItem } from '../types';
import { DiseaseProfile, SymptomCheckResult } from '../types/clinical';
import {
  AssessmentResult,
  ChatMessage,
  QuizQuestion,
  StudyAnalytics,
  StudyBook,
} from '../types/study';
import { CDSReport, CDSReportRequest } from '../types/cds';
import {
  ConditionContext,
  DietLifestyleProfile,
  DietLifestyleReport,
} from '../types/lifestyle';

const BASE =
  process.env.REACT_APP_API_URL !== undefined && process.env.REACT_APP_API_URL !== ''
    ? process.env.REACT_APP_API_URL
    : process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:8000';
const api = axios.create({ baseURL: BASE, timeout: 30000 });
const form = (file: File) => { const fd = new FormData(); fd.append('file', file); return fd; };

// Normalize backend response → frontend shape
const normalize = (data: any): ClassificationResult => ({
  predicted_class: data.prediction ?? data.predicted_class ?? '',
  confidence:      data.confidence ?? 0,
  all_scores:      Array.isArray(data.top_k)
    ? Object.fromEntries(data.top_k.map((t: TopKItem) => [t.label, t.confidence]))
    : (data.all_scores ?? {}),
});

// ── Classifiers ───────────────────────────────────────────────
export const classifyOrgan  = (file: File) => api.post('/classify/organ',  form(file)).then(r => normalize(r.data));
export const classifyChest  = (file: File) => api.post('/classify/chest',  form(file)).then(r => normalize(r.data));
export const classifyBrain  = (file: File) => api.post('/classify/brain',  form(file)).then(r => normalize(r.data));
export const classifyEye    = (file: File) => api.post('/classify/eye',    form(file)).then(r => normalize(r.data));
export const classifySkin   = (file: File) => api.post('/classify/skin',   form(file)).then(r => normalize(r.data));
export const classifyBone   = (file: File) => api.post('/classify/bone',   form(file)).then(r => normalize(r.data));
export const classifyKnee   = (file: File) => api.post('/classify/knee',   form(file)).then(r => normalize(r.data));
export const classifyDental = (file: File) => api.post('/classify/dental', form(file)).then(r => normalize(r.data));

// ── Auto pipeline ─────────────────────────────────────────────
export const autoClassify = async (file: File): Promise<AutoClassifyResult> => {
  const { data } = await api.post('/classify/auto', form(file));
  return {
    organ:            data.organ?.prediction ?? '',
    organ_confidence: data.organ?.confidence ?? 0,
    disease_result:   data.disease ? normalize(data.disease) : undefined,
    disease_model:    data.disease_model,
    note:             data.note,
  };
};

// ── Grad-CAM ──────────────────────────────────────────────────
export const getGradcam = async (file: File, modelType: string): Promise<{ gradcam_image: string }> => {
  const { data } = await api.post(`/explain/gradcam?model_key=${modelType}`, form(file));
  return { gradcam_image: data.overlay_base64 };
};

// ── Clinical Decision Support (Imaging) ───────────────────────
export const generateImagingCDSReport = async (payload: CDSReportRequest): Promise<CDSReport> => {
  const { data } = await axios.post(`${BASE}/cds/imaging-report`, payload, { timeout: 120000 });
  return data;
};

// ── RAG Tutor ─────────────────────────────────────────────────
export const askTutor = async (question: string): Promise<RAGResponse> => {
  const { data } = await api.post('/rag/query', { query: question });
  return { answer: data.answer, sources: data.sources ?? [] };
};

export const askOrganAI = (organName: string) => askTutor(
  `For ${organName}: list AI clinical insights including disease detection possibilities, early warning signs, and top 3 preventive measures. Be concise and clinical.`,
);

// ── Symptom Checker ───────────────────────────────────────────
export const checkSymptoms = async (symptoms: string): Promise<SymptomCheckResult> => {
  const symptomList = symptoms
    .split(/[,;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const { data } = await api.post('/symptom-check', { symptoms: symptomList }, { timeout: 90000 });
  return data;
};

export const fetchClinicalProfile = async (
  slug: string,
  name: string,
): Promise<DiseaseProfile> => {
  const { data } = await api.get(`/clinical/diseases/${encodeURIComponent(slug)}`, {
    params: { name, generate: true },
    timeout: 60000,
  });
  return data;
};

export const generateDietLifestyleReport = async (
  condition: ConditionContext,
  profile: DietLifestyleProfile,
): Promise<{ report: DietLifestyleReport; generated_at: string }> => {
  const { data } = await axios.post(`${BASE}/lifestyle/recommendations`, { condition, profile }, { timeout: 120000 });
  return data;
};

// ── Study Companion ───────────────────────────────────────────
const studyApi = axios.create({ baseURL: BASE, timeout: 60000 });

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    await axios.get(`${BASE}/health`, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
};

export const listStudyBooks = async (): Promise<StudyBook[]> => {
  const { data } = await studyApi.get('/study/books', { timeout: 15000 });
  return data.books ?? [];
};

export const getStudyBook = async (bookId: string): Promise<StudyBook> => {
  const { data } = await studyApi.get(`/study/books/${bookId}`);
  return data;
};

export const uploadStudyBook = async (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await studyApi.post('/study/books/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  });
  return data as { book_id: string; title: string; status: string; message: string };
};

export const deleteStudyBook = async (bookId: string) => {
  await studyApi.delete(`/study/books/${encodeURIComponent(bookId)}`);
};

export const chatWithBook = async (
  bookId: string,
  message: string,
  history: ChatMessage[],
  chapterId?: string,
) => {
  const { data } = await studyApi.post(`/study/books/${bookId}/chat`, {
    message,
    history,
    chapter_id: chapterId || null,
  });
  return data as { answer: string; citations: ChatMessage['citations']; disclaimer: string };
};

export const generateBookQuiz = async (bookId: string, config: Record<string, unknown>) => {
  const { data } = await studyApi.post(`/study/books/${bookId}/quiz/generate`, config, {
    timeout: 120000,
  });
  return data as { attempt_id: string; questions: QuizQuestion[]; disclaimer: string };
};

export const generateBookExam = async (bookId: string, config: Record<string, unknown>) => {
  const { data } = await studyApi.post(`/study/books/${bookId}/exam/generate`, config);
  return data as { attempt_id: string; questions: QuizQuestion[]; time_limit_minutes: number; disclaimer: string };
};

export const submitBookAssessment = async (bookId: string, payload: Record<string, unknown>) => {
  const { data } = await studyApi.post(`/study/books/${bookId}/assessment/submit`, payload);
  return data as AssessmentResult;
};

export const fetchStudyAnalytics = async (bookId: string): Promise<StudyAnalytics> => {
  const { data } = await studyApi.get(`/study/books/${bookId}/analytics`);
  return data;
};

export const runStudyTool = async (bookId: string, tool: string, payload: Record<string, unknown>) => {
  const { data } = await studyApi.post(`/study/books/${bookId}/tools/${tool}`, payload);
  return data as { tool: string; content: string; disclaimer: string };
};

// ── Wikipedia ─────────────────────────────────────────────────
export const wikiSearch = async (query: string) => {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' anatomy')}&format=json&origin=*&srlimit=5`;
  const res  = await fetch(url);
  const data = await res.json();
  return data.query.search;
};

export const wikiSummary = async (title: string) => {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
};
