import React, { useState, useCallback } from 'react';
import ImageUploader from '../components/ImageUploader';
import ConfidenceBar from '../components/ConfidenceBar';
import { classifyOrgan, classifyChest, classifyBrain } from '../api';
import { ClassificationResult } from '../types';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

const MODES = [
  {
    id: 'organ', label: 'Organ Identification', color: '#00e5ff', fn: classifyOrgan,
    classes: ['Brain','Breast','Cervix','Chest','Colon','Eye','Kidney','Knee','Liver','Oral','Prostate','Skin','Spine','Thyroid'],
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=120&q=80',
  },
  {
    id: 'chest', label: 'Chest Pathology', color: '#00e676', fn: classifyChest,
    classes: ['COVID-19','Normal','Pneumonia','Lung Opacity','Tuberculosis'],
    image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=120&q=80',
  },
  {
    id: 'brain', label: 'Brain Tumor', color: '#b47bff', fn: classifyBrain,
    classes: ['Glioma','Meningioma','No Tumor','Pituitary'],
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=120&q=80',
  },
];

type Phase = 'upload' | 'guess' | 'reveal';

const ImagingQuiz: React.FC = () => {
  const [mode, setMode]           = useState(MODES[0]);
  const [phase, setPhase]         = useState<Phase>('upload');
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [guess, setGuess]         = useState('');
  const [result, setResult]       = useState<ClassificationResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore]         = useState({ correct: 0, total: 0 });

  const handleFile = useCallback((f: File) => {
    setFile(f); setPreview(URL.createObjectURL(f));
    setPhase('guess'); setGuess(''); setResult(null); setIsCorrect(null);
  }, []);

  const handleReveal = async () => {
    if (!file || !guess) return;
    setLoading(true);
    try {
      const res = await mode.fn(file);
      setResult(res);
      const correct = res.predicted_class.toLowerCase().replace(/_/g, ' ') === guess.toLowerCase().replace(/_/g, ' ');
      setIsCorrect(correct);
      setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
      setPhase('reveal');
    } catch { setResult(null); }
    finally { setLoading(false); }
  };

  const reset = () => { setFile(null); setPreview(null); setPhase('upload'); setGuess(''); setResult(null); setIsCorrect(null); };
  const sorted = result ? Object.entries(result.all_scores).sort((a, b) => b[1] - a[1]) : [];
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <>
      <div className="fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.2rem' }}>
          <div style={{
            width: 90, height: 90, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
            border: '1px solid rgba(255,215,64,0.35)',
            boxShadow: '0 0 28px rgba(255,215,64,0.15)',
          }}>
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80"
              alt="Quiz"
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(15%) brightness(0.85)' }}
            />
          </div>

          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
              background: 'rgba(255,215,64,0.06)', border: '1px solid rgba(255,215,64,0.25)',
              borderRadius: 100, padding: '8px 20px',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffd740', display: 'inline-block', boxShadow: '0 0 10px rgba(255,215,64,0.8)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#ffd740', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                Diagnostic Assessment
              </span>
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: -2, color: TEXT, lineHeight: 1 }}>
              Knowledge Quiz
            </h1>
            <p style={{ color: DIM, fontSize: 16, fontWeight: 300, marginTop: 8 }}>
              Test your medical imaging diagnostic skills against AI
            </p>
          </div>
        </div>

        <div className="glass" style={{ borderRadius: 16, padding: '24px 36px', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '3rem', fontWeight: 900, color: ACCENT, lineHeight: 1 }}>
            {score.correct}/{score.total}
          </p>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginTop: 8 }}>
            Score
          </div>
          {score.total > 0 && (
            <p style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, marginTop: 8,
              color: accuracy >= 70 ? '#00e676' : accuracy >= 40 ? '#ffd740' : '#ff5252',
            }}>
              {accuracy}% accuracy
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m); reset(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 22px', borderRadius: 12,
              background: mode.id === m.id ? `${m.color}12` : 'rgba(0,8,20,0.55)',
              border: `1px solid ${mode.id === m.id ? m.color + '45' : 'rgba(0,229,255,0.09)'}`,
              color: mode.id === m.id ? m.color : DIM,
              cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              fontWeight: 700, fontSize: 14, transition: 'all 0.18s',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 7, overflow: 'hidden', flexShrink: 0, border: `1px solid ${mode.id === m.id ? m.color + '50' : 'rgba(255,255,255,0.08)'}` }}>
              <img src={m.image} alt={m.label}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `grayscale(${mode.id === m.id ? 10 : 55}%) brightness(${mode.id === m.id ? 0.9 : 0.55})`, transition: 'all 0.2s' }}
              />
            </div>
            <div style={{ width: 3, height: 20, borderRadius: 2, background: mode.id === m.id ? m.color : 'transparent', transition: 'all 0.2s' }} />
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 26 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {phase === 'upload' ? (
            <ImageUploader onFile={handleFile} label={`Upload a ${mode.label} image`} />
          ) : (
            <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
              {preview && (
                <img src={preview} alt="assessment"
                  style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
              )}
              {phase === 'reveal' && isCorrect !== null && (
                <div style={{
                  padding: '18px', textAlign: 'center',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 18,
                  background: isCorrect ? 'rgba(0,230,118,0.09)' : 'rgba(255,82,82,0.09)',
                  color: isCorrect ? '#00e676' : '#ff5252',
                  borderTop: `1px solid ${isCorrect ? 'rgba(0,230,118,0.22)' : 'rgba(255,82,82,0.22)'}`,
                }}>
                  {isCorrect ? '✓ Correct Diagnosis' : '✗ Incorrect — Review Below'}
                </div>
              )}
            </div>
          )}

          {phase === 'guess' && (
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
                Select Your Diagnosis
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {mode.classes.map(c => (
                  <button key={c} onClick={() => setGuess(c)}
                    style={{
                      padding: '13px 16px', borderRadius: 10,
                      textAlign: 'left' as const, fontSize: 14,
                      background: guess === c ? `${mode.color}14` : 'rgba(0,8,20,0.65)',
                      border: `1px solid ${guess === c ? mode.color + '45' : 'rgba(0,229,255,0.09)'}`,
                      color: guess === c ? mode.color : DIM,
                      cursor: 'pointer', transition: 'all 0.15s',
                      fontFamily: 'Outfit, sans-serif', fontWeight: guess === c ? 700 : 400,
                    }}
                  >{c}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {phase === 'upload' && (
            <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', minHeight: 360, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 140, overflow: 'hidden', position: 'relative' as const }}>
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80"
                  alt="assessment"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%) brightness(0.5)' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(4,12,24,0.95))' }} />
              </div>
              <div style={{ padding: '22px 26px', flex: 1 }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: TEXT, marginBottom: 18 }}>
                  Assessment Instructions
                </p>
                {[
                  'Upload a medical imaging scan',
                  'Review the image carefully',
                  'Select your clinical diagnosis',
                  'Compare against AI model output',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
                    }}>{i + 1}</div>
                    <span style={{ color: DIM, fontSize: 15, lineHeight: 1.6 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase === 'guess' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass" style={{ borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
                  Your Selection
                </div>
                {guess
                  ? <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, color: mode.color }}>{guess}</p>
                  : <p style={{ color: 'rgba(0,200,255,0.4)', fontSize: 15, fontStyle: 'italic' }}>No diagnosis selected yet</p>
                }
              </div>
              <button onClick={handleReveal} disabled={!guess || loading}
                style={{
                  padding: '17px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${mode.color}, ${mode.color}aa)`,
                  color: '#000e1a', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
                  fontSize: 16, letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                  opacity: (!guess || loading) ? 0.4 : 1,
                  boxShadow: `0 4px 26px ${mode.color}35`, transition: 'all 0.2s',
                }}>
                {loading ? 'Processing…' : 'Reveal AI Diagnosis'}
              </button>
            </div>
          )}

          {phase === 'reveal' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="glass" style={{ borderRadius: 14, padding: '22px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid rgba(0,229,255,0.08)' }}>
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                      AI Diagnosis
                    </div>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: ACCENT }}>
                      {result.predicted_class.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                      Your Answer
                    </div>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: isCorrect ? '#00e676' : '#ff5252' }}>
                      {guess}
                    </p>
                  </div>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
                  Probability Distribution
                </div>
                {sorted.slice(0, 5).map(([cls, sc], i) => (
                  <ConfidenceBar key={cls} label={cls} score={sc} isTop={i === 0} color={i === 0 ? mode.color : undefined} />
                ))}
              </div>
              <button onClick={reset} className="btn-cyan"
                style={{ justifyContent: 'center', padding: '16px', fontSize: 16, borderRadius: 12 }}>
                Next Case
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ImagingQuiz;
