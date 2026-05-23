import React, { useState } from 'react';
import { checkSymptoms } from '../api';
import MarkdownMessage from '../components/MarkdownMessage';

const TEXT   = '#d0e4f0';
const DIM    = 'rgba(180,220,240,0.75)';
const DIMMER = 'rgba(140,180,210,0.5)';
const ACCENT = '#00e5ff';

interface SymptomResponse {
  answer: string;
  sources: string[];
  input_symptoms: string[];
  disclaimer: string;
}

const EXAMPLES = [
  { text: 'fever, dry cough, shortness of breath, fatigue' },
  { text: 'severe headache, blurred vision, nausea, balance issues' },
  { text: 'chest pain, palpitations, dizziness on exertion' },
  { text: 'skin rash, itching, discoloration, dry patches' },
  { text: 'joint pain, swelling, morning stiffness in knees' },
  { text: 'frequent urination, excessive thirst, blurred vision, fatigue' },
];

const SymptomChecker: React.FC = () => {
  const [input, setInput]       = useState('');
  const [result, setResult]     = useState<SymptomResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [searched, setSearched] = useState(false);
  const [hovered, setHovered]   = useState<string | null>(null);

  const handleCheck = async (text?: string) => {
    const s = (text || input).trim();
    if (!s) return;
    if (text) setInput(text);
    setLoading(true); setError(''); setSearched(true); setResult(null);
    try {
      const data = await checkSymptoms(s);
      setResult(data as unknown as SymptomResponse);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not connect to backend. Ensure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '3.5rem 3rem' }}>

      {/* HEADER */}
      <div className="fade-in" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20,
          background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 100, padding: '8px 20px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 10px ${ACCENT}` }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            Mistral RAG · ChromaDB · Clinical NLP
          </span>
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2.4rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: -2.5, color: TEXT, marginBottom: 14, lineHeight: 1 }}>
          Symptom Checker
        </h1>
        <p style={{ color: DIM, fontSize: 18, maxWidth: 600, lineHeight: 1.7 }}>
          Describe your symptoms and receive AI-powered differential diagnosis
          from your ChromaDB medical knowledge base and Mistral LLM.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Input */}
          <div className="glass" style={{ borderRadius: 16, padding: '28px 30px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
              Describe Your Symptoms
            </div>
            <textarea className="input-med"
              style={{ minHeight: 110, resize: 'none' as const, marginBottom: 20, fontSize: 16, lineHeight: 1.8 }}
              placeholder="e.g. I have fever, dry cough, fatigue and difficulty breathing for the past 3 days..."
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => handleCheck()} disabled={!input.trim() || loading}
                className="btn-cyan"
                style={{ fontSize: 15, padding: '13px 32px', opacity: (!input.trim() || loading) ? 0.4 : 1 }}>
                {loading ? 'Analyzing...' : 'Check Symptoms'}
              </button>
              <button onClick={() => { setInput(''); setResult(null); setSearched(false); setError(''); }}
                className="btn-outline" style={{ fontSize: 15, padding: '13px 24px' }}>
                Clear
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.25)',
              borderRadius: 12, padding: '16px 20px', color: '#ff6b6b', fontSize: 15 }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="glass" style={{ borderRadius: 16, padding: '44px', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
                {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
              </div>
              <p style={{ color: DIM, fontSize: 15, fontFamily: 'JetBrains Mono, monospace' }}>
                Querying medical knowledge base...
              </p>
            </div>
          )}

          {/* Result */}
          {!loading && result && (
            <div className="glass fade-in" style={{ borderRadius: 16, padding: '28px 30px' }}>

              {/* Symptoms analyzed */}
              {result.input_symptoms?.length > 0 && (
                <div style={{ marginBottom: 24, paddingBottom: 22, borderBottom: '1px solid rgba(0,229,255,0.08)' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
                    Symptoms Analyzed
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.input_symptoms.map((s, i) => (
                      <span key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                        padding: '5px 14px', borderRadius: 20,
                        background: 'rgba(0,229,255,0.08)', color: ACCENT,
                        border: '1px solid rgba(0,229,255,0.2)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8,
                  background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: DIMMER,
                  textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                  Clinical Assessment · Mistral RAG
                </span>
              </div>

              <div style={{ marginBottom: 22 }}>
                <MarkdownMessage content={result.answer} fontSize={16} />
              </div>

              {/* Sources */}
              {result.sources?.length > 0 && (
                <div style={{ paddingTop: 18, borderTop: '1px solid rgba(0,229,255,0.08)', marginBottom: 18 }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: DIMMER,
                    marginBottom: 10 }}>Retrieved from:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.sources.map((s, i) => (
                      <span key={i} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                        padding: '4px 12px', borderRadius: 5,
                        background: 'rgba(0,153,255,0.1)', color: '#40b8ff',
                        border: '1px solid rgba(0,153,255,0.15)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,229,255,0.06)' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                  color: 'rgba(255,215,64,0.6)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {result.disclaimer}
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!searched && !loading && (
            <div className="glass" style={{ borderRadius: 16, padding: '44px 36px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16,
                background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(0,229,255,0.5)" strokeWidth="1.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: TEXT, marginBottom: 12 }}>
                Describe Your Symptoms
              </h3>
              <p style={{ color: DIMMER, fontSize: 15, lineHeight: 1.75, maxWidth: 400, margin: '0 auto' }}>
                Enter your symptoms above or click an example on the right.
                The AI will provide a differential diagnosis with clinical reasoning.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — examples + how it works */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div className="glass" style={{ borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
              Example Cases
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EXAMPLES.map(ex => (
                <button key={ex.text} onClick={() => handleCheck(ex.text)}
                  onMouseEnter={() => setHovered(ex.text)} onMouseLeave={() => setHovered(null)}
                  style={{ padding: '13px 16px', borderRadius: 10, textAlign: 'left' as const,
                    background: hovered === ex.text ? 'rgba(0,229,255,0.06)' : 'rgba(0,8,20,0.5)',
                    border: `1px solid ${hovered === ex.text ? 'rgba(0,229,255,0.28)' : 'rgba(0,229,255,0.08)'}`,
                    color: hovered === ex.text ? TEXT : DIM,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'Outfit, sans-serif', lineHeight: 1.6 }}>
                  {ex.text}
                </button>
              ))}
            </div>
          </div>

          <div className="glass" style={{ borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
              How It Works
            </div>
            {[
              ['01', 'Enter symptoms',    'Type or select from examples'],
              ['02', 'ChromaDB retrieval','Searches 88K+ medical chunks'],
              ['03', 'Mistral LLM',       'Generates differential diagnosis'],
              ['04', 'Clinical output',   'Urgency, reasoning, and advice'],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ACCENT, flexShrink: 0, marginTop: 2 }}>{num}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 3 }}>{title}</p>
                  <p style={{ fontSize: 12, color: DIMMER, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '16px 20px', borderRadius: 12,
            background: 'rgba(255,215,64,0.05)', border: '1px solid rgba(255,215,64,0.15)' }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: '#ffd740', lineHeight: 1.7 }}>
              For educational use only. Always consult a qualified physician for diagnosis and treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymptomChecker;