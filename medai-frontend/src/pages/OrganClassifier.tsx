import React, { useState, useCallback } from 'react';
import ImageUploader from '../components/ImageUploader';
import ConfidenceBar from '../components/ConfidenceBar';
import { classifyOrgan } from '../api';
import { ClassificationResult } from '../types';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';
const RED = '#ff5252';

const CLASSES = [
  'Brain', 'Breast', 'Cervix', 'Chest', 'Colon', 'Eye',
  'Kidney', 'Knee', 'Liver', 'Oral', 'Prostate', 'Skin', 'Spine', 'Thyroid',
];

const OrganClassifier: React.FC = () => {
  const [file, setFile]         = useState<File | null>(null);
  const [result, setResult]     = useState<ClassificationResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => { setFile(f); setResult(null); setError(''); }, []);

  const handleClassify = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult(await classifyOrgan(file)); }
    catch (e: any) { setError(e?.response?.data?.detail || 'Classification failed. Ensure the backend is running.'); }
    finally { setLoading(false); }
  };

  const sorted = result ? Object.entries(result.all_scores).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '3.5rem 3rem' }}>

      {/* ── HEADER ── */}
      <div className="fade-in" style={{ marginBottom: '2.8rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
          background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.25)',
          borderRadius: 100, padding: '8px 20px',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, display: 'inline-block' }} />
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: RED,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          }}>
            ResNet50 — 14 Organ Classes
          </span>
        </div>
        <h1 style={{
          fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 900, letterSpacing: -2, color: TEXT, lineHeight: 1, display: 'block',
        }}>
          Organ Classifier
        </h1>
        <p style={{ color: DIM, fontSize: 16, fontWeight: 400, marginTop: 10, maxWidth: 520 }}>
          Upload any medical image. ResNet50 identifies the organ type with full probability distribution.
        </p>
      </div>

      {/* ── TOP TWO-COLUMN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 28 }}>

        {/* ── LEFT — classes list ── */}
        <div className="glass" style={{ borderRadius: 14, padding: '22px 24px' }}>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16,
          }}>
            Supported Organ Classes
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CLASSES.map((name, i) => (
              <div
                key={name}
                onMouseEnter={() => setHoveredClass(name)}
                onMouseLeave={() => setHoveredClass(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 9,
                  background: hoveredClass === name
                    ? 'rgba(0,229,255,0.04)'
                    : 'rgba(0,8,20,0.65)',
                  border: hoveredClass === name
                    ? '1px solid rgba(0,229,255,0.28)'
                    : '1px solid rgba(0,229,255,0.08)',
                  opacity: hoveredClass === name ? 0.55 : 1,
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                }}
              >
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  color: 'rgba(0,210,255,0.55)', minWidth: 20,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{
                  fontSize: 13, color: '#d0e4f0',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 600,
                }}>
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT — results panel ── */}
        <div>

          {/* Awaiting */}
          {!result && !loading && (
            <div className="glass" style={{
              borderRadius: 14, minHeight: 440,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '48px 24px', textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16, marginBottom: 20,
                background: 'rgba(255,82,82,0.07)', border: '1px solid rgba(255,82,82,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,82,82,0.7)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem',
                fontWeight: 700, color: '#d0e4f0', marginBottom: 10,
              }}>
                Awaiting Input
              </p>
              <p style={{ color: 'rgba(180,220,240,0.75)', fontSize: 15 }}>
                Upload a medical image below to begin classification
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="glass" style={{
              borderRadius: 14, minHeight: 440,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '48px 24px', textAlign: 'center',
            }}>
              <div style={{ marginBottom: 22, opacity: 0.65 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <p style={{ color: '#d0e4f0', fontSize: 16, marginBottom: 20 }}>
                Running ResNet50 forward pass…
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="typing-dot"
                    style={{ background: RED, animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="glass fade-in" style={{ borderRadius: 14, padding: '28px 26px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-end', marginBottom: 24,
              }}>
                <div>
                  <p style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: RED,
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 6,
                  }}>
                    Identified Organ
                  </p>
                  <p style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: '2rem',
                    fontWeight: 900, color: RED, letterSpacing: -1, lineHeight: 1,
                  }}>
                    {result.predicted_class.replace(/_/g, ' ')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: '2.2rem',
                    fontWeight: 900, color: '#d0e4f0', lineHeight: 1,
                  }}>
                    {Math.round(result.confidence * 100)}%
                  </p>
                  <p style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: 'rgba(0,210,255,0.7)', marginTop: 4,
                  }}>
                    confidence
                  </p>
                </div>
              </div>

              <p style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16,
              }}>
                Full Probability Distribution
              </p>
              {sorted.map(([cls, score], i) => (
                <ConfidenceBar key={cls} label={cls} score={score} isTop={i === 0} color={i === 0 ? RED : undefined} />
              ))}
              <p style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'rgba(0,200,255,0.45)', marginTop: 18, paddingTop: 16,
                borderTop: '1px solid rgba(0,229,255,0.07)',
              }}>
                DISCLAIMER: For educational and research purposes only.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FULL-WIDTH UPLOAD SECTION ── */}
      <div className="glass" style={{ borderRadius: 14, padding: '28px 28px 24px' }}>
        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
          letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 18,
        }}>
          Upload Medical Image
        </p>

        <ImageUploader onFile={handleFile} label="Upload Medical Organ Image" />

        <button
          onClick={handleClassify}
          disabled={!file || loading}
          style={{
            width: '100%', padding: '17px', borderRadius: 12,
            border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${RED}, #c62828)`,
            color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
            fontSize: 16, letterSpacing: '0.07em', textTransform: 'uppercase' as const,
            opacity: (!file || loading) ? 0.4 : 1, transition: 'opacity 0.2s',
            boxShadow: '0 4px 26px rgba(255,82,82,0.28)', marginTop: 18,
          }}>
          {loading ? 'Running Inference…' : 'Classify Organ'}
        </button>

        {error && (
          <div style={{
            background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.28)',
            borderRadius: 12, padding: '16px 20px',
            color: '#ff8a80', fontSize: 15, marginTop: 16,
          }}>
            {error}
          </div>
        )}

        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: 'rgba(0,200,255,0.45)', marginTop: 16, paddingTop: 14,
          borderTop: '1px solid rgba(0,229,255,0.07)',
        }}>
          DISCLAIMER: For educational and research purposes only.
        </p>
      </div>

    </div>
  );
};

export default OrganClassifier;