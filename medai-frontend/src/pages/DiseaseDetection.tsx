import React, { useState, useCallback } from 'react';
import ImageUploader from '../components/ImageUploader';
import ConfidenceBar from '../components/ConfidenceBar';
import { classifyChest, classifyBrain, classifyEye, classifySkin, classifyBone, classifyKnee, classifyDental, getGradcam } from '../api';
import { ClassificationResult } from '../types';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

const SCANS = [
  {
    id: 'chest',  label: 'Chest X-Ray',  arch: 'DenseNet121',    color: '#00e5ff', fn: classifyChest,
    classes: ['COVID-19','Normal','Pneumonia','Lung Opacity','Tuberculosis'],
    image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=120&q=80',
  },
  {
    id: 'brain',  label: 'Brain MRI',    arch: 'ResNet50',       color: '#b47bff', fn: classifyBrain,
    classes: ['Glioma','Meningioma','No Tumor','Pituitary'],
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=120&q=80',
  },
  {
    id: 'eye',    label: 'Eye Fundus',   arch: 'ResNet50',       color: '#00e676', fn: classifyEye,
    classes: ['9 ocular conditions'],
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=120&q=80',
  },
  {
    id: 'skin',   label: 'Skin Lesion',  arch: 'EfficientNetB0', color: '#ff5252', fn: classifySkin,
    classes: ['Melanoma','Nevus','BCC','AK','BKL','DF','VASC'],
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&q=80',
  },
  {
    id: 'bone',   label: 'Bone X-Ray',   arch: 'ResNet34',       color: '#ffd740', fn: classifyBone,
    classes: ['Fractured','Normal'],
    image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=120&q=80',
  },
  {
    id: 'knee',   label: 'Knee MRI',     arch: 'ResNet50',       color: '#00e676', fn: classifyKnee,
    classes: ['KL Grade 0','KL Grade 1','KL Grade 2','KL Grade 3','KL Grade 4'],
    image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=120&q=80',
  },
  {
    id: 'dental', label: 'Dental X-Ray', arch: 'ResNet50',       color: '#00e5ff', fn: classifyDental,
    classes: ['6 dental pathology classes'],
    image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=120&q=80',
  },
];

const DiseaseDetection: React.FC = () => {
  const [active, setActive]       = useState(SCANS[0]);
  const [file, setFile]           = useState<File | null>(null);
  const [result, setResult]       = useState<ClassificationResult | null>(null);
  const [gradcam, setGradcam]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [gcLoading, setGcLoading] = useState(false);
  const [error, setError]         = useState('');

  // Switching scan modality resets ALL state including ImageUploader.
  // key={active.id} on <ImageUploader> causes React to fully remount it,
  // clearing its internal preview/fileName/fileSize state automatically.
  const handleScanSwitch = (scan: typeof SCANS[0]) => {
    setActive(scan);
    setFile(null);
    setResult(null);
    setGradcam(null);
    setError('');
  };

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setGradcam(null);
    setError('');
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null); setGradcam(null);
    try {
      const res = await active.fn(file);
      setResult(res);
      setGcLoading(true);
      try { const gc = await getGradcam(file, active.id); setGradcam(gc.gradcam_image); } catch {}
      finally { setGcLoading(false); }
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail) {
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      } else if (e?.code === 'ECONNABORTED' || e?.message?.includes('Network Error')) {
        setError('Backend not responding. Run: npm start (from project root) or start uvicorn on port 8000.');
      } else {
        setError('Analysis failed. Ensure the backend is running on port 8000.');
      }
    } finally { setLoading(false); }
  };

  const sorted = result ? Object.entries(result.all_scores).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '3.5rem 3rem' }}>

      {/* ── HEADER ── */}
      <div className="fade-in" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '2.4rem' }}>
        <div style={{
          width: 90, height: 90, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
          border: `1px solid ${active.color}55`,
          boxShadow: `0 0 28px ${active.color}25`,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          <img
            src={active.image}
            alt={active.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(20%) brightness(0.85)', transition: 'opacity 0.3s' }}
          />
        </div>

        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
            background: `${active.color}0d`, border: `1px solid ${active.color}35`,
            borderRadius: 100, padding: '8px 20px', transition: 'all 0.3s',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: active.color, display: 'inline-block', boxShadow: `0 0 10px ${active.color}` }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: active.color, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              CNN Disease Detection — {active.label}
            </span>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: -2, color: TEXT, lineHeight: 1 }}>
            Disease Detection
          </h1>
          <p style={{ color: DIM, fontSize: 16, fontWeight: 300, marginTop: 8, maxWidth: 560 }}>
            Select a scan modality, upload a medical image, and receive AI-powered diagnosis with Grad-CAM explainability.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: 22 }}>

        {/* ── SCAN SELECTOR ── */}
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
            Scan Modality
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SCANS.map(s => {
              const isActive = active.id === s.id;
              return (
                <button key={s.id}
                  onClick={() => handleScanSwitch(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 11,
                    background: isActive ? `${s.color}10` : 'rgba(0,8,20,0.55)',
                    border: `1px solid ${isActive ? s.color + '45' : 'rgba(0,229,255,0.09)'}`,
                    cursor: 'pointer', transition: 'all 0.18s', textAlign: 'left' as const,
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                    border: `1px solid ${isActive ? s.color + '50' : 'rgba(255,255,255,0.07)'}`,
                  }}>
                    <img src={s.image} alt={s.label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `grayscale(${isActive ? 10 : 50}%) brightness(${isActive ? 0.9 : 0.6})`, transition: 'all 0.2s' }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isActive ? TEXT : DIM, marginBottom: 3 }}>{s.label}</p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: isActive ? s.color : 'rgba(0,200,255,0.45)' }}>{s.arch}</p>
                  </div>

                  <div style={{ width: 3, height: 32, borderRadius: 2, background: isActive ? s.color : 'transparent', flexShrink: 0, boxShadow: isActive ? `0 0 8px ${s.color}` : 'none', transition: 'all 0.2s' }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── UPLOAD + RESULTS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div className="glass" style={{ borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
              Model Output Classes
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {active.classes.map(c => (
                <span key={c} style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                  padding: '6px 14px', borderRadius: 7,
                  background: `${active.color}12`, color: active.color,
                  border: `1px solid ${active.color}30`,
                }}>{c}</span>
              ))}
            </div>
          </div>

          {/* KEY FIX 1: key={active.id} remounts ImageUploader on every scan switch,
              wiping its internal preview/fileName/fileSize state automatically.   */}
          <ImageUploader
            key={active.id}
            onFile={handleFile}
            label={`Upload ${active.label}`}
          />

          <button onClick={handleAnalyze} disabled={!file || loading}
            style={{
              width: '100%', justifyContent: 'center', padding: '17px',
              fontSize: 16, fontFamily: 'Outfit, sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              border: 'none', borderRadius: 12, cursor: 'pointer',
              background: `linear-gradient(135deg, ${active.color}, ${active.color}99)`,
              color: '#000e1a', opacity: (!file || loading) ? 0.4 : 1,
              boxShadow: `0 4px 28px ${active.color}35`, transition: 'all 0.2s',
            }}>
            {loading ? 'Analyzing…' : `Analyze ${active.label}`}
          </button>

          {error && (
            <div style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.28)', borderRadius: 12, padding: '16px 20px', color: '#ff6b6b', fontSize: 15 }}>
              {error}
            </div>
          )}

          {result && (
            <div className="glass fade-in" style={{ borderRadius: 14, padding: '26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(0,229,255,0.09)' }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    Primary Diagnosis
                  </div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.7rem', fontWeight: 800, color: active.color, lineHeight: 1 }}>
                    {result.predicted_class.replace(/_/g, ' ')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    Confidence
                  </div>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.8rem', fontWeight: 900, color: active.color, lineHeight: 1 }}>
                    {Math.round(result.confidence * 100)}%
                  </p>
                </div>
              </div>

              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
                Class Probability Distribution
              </div>
              {sorted.map(([cls, score], i) => (
                <ConfidenceBar key={cls} label={cls} score={score} isTop={i === 0} color={i === 0 ? active.color : undefined} />
              ))}

              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(0,200,255,0.4)', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,229,255,0.07)' }}>
                DISCLAIMER: For educational and research purposes only. Not intended for clinical use.
              </p>
            </div>
          )}
        </div>

        {/* ── GRAD-CAM ── */}
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
            Grad-CAM Visualization
          </div>

          <div className="glass scan-effect" style={{ borderRadius: 14, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            {gcLoading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 18, opacity: 0.5 }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <p style={{ color: DIM, fontSize: 14, marginBottom: 16 }}>Computing activation maps…</p>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
              </div>
            )}
            {gradcam && !gcLoading && (
              <div style={{ width: '100%' }}>
                <img src={`data:image/png;base64,${gradcam}`} alt="Grad-CAM Heatmap"
                  style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(0,229,255,0.18)' }} />
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(0,200,255,0.55)', textAlign: 'center', marginTop: 12 }}>
                  Gradient-weighted Class Activation Map
                </p>
              </div>
            )}
            {!gradcam && !gcLoading && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 16, opacity: 0.2 }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="3" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="21" y2="12"/></svg>
                </div>
                <p style={{ color: 'rgba(0,200,255,0.5)', fontSize: 14 }}>Activation map will render after analysis</p>
              </div>
            )}
          </div>

          {result && (
            <div className="glass" style={{ borderRadius: 12, padding: '20px 22px', marginTop: 16 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
                Model Metadata
              </div>
              {[['Architecture', active.arch], ['Modality', active.label], ['Output Classes', active.classes.length.toString()], ['Method', 'Grad-CAM']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, padding: '8px 0', borderBottom: '1px solid rgba(0,229,255,0.05)' }}>
                  <span style={{ color: 'rgba(0,200,255,0.6)', fontFamily: 'Outfit, sans-serif' }}>{k}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: TEXT }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DiseaseDetection;