import axios from 'axios';
import { ClassificationResult, RAGResponse, SymptomResult, AutoClassifyResult, TopKItem } from '../types';
import { DiseaseProfile, SymptomCheckResult } from '../types/clinical';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
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

// ── RAG Tutor ─────────────────────────────────────────────────
export const askTutor = async (question: string): Promise<RAGResponse> => {
  const { data } = await api.post('/rag/query', { query: question });
  return { answer: data.answer, sources: data.sources ?? [] };
};

// ── Symptom Checker ───────────────────────────────────────────
export const checkSymptoms = async (symptoms: string): Promise<SymptomCheckResult> => {
  const symptomList = symptoms
    .split(/[,;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const { data } = await api.post('/symptom-check', { symptoms: symptomList });
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