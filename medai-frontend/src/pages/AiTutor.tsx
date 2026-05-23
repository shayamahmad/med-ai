import React, { useState, useRef, useEffect } from 'react';
import { askTutor } from '../api';
import MarkdownMessage from '../components/MarkdownMessage';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';   // was dark grey — now soft blue-white, visible
const ACCENT = '#00e5ff';
const ACCENT2 = '#40cfff';

interface Msg { role: 'user' | 'ai'; content: string; sources?: string[]; }

const STARTERS = [
  'What are the radiological features of COVID-19 pneumonia?',
  'Explain the pathophysiology of glioblastoma multiforme.',
  'How does Grad-CAM generate class activation maps?',
  'What is the Kellgren-Lawrence grading scale for knee OA?',
  'Describe the ABCDE criteria for melanoma diagnosis.',
];

const AiTutor: React.FC = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'ai', content: "Welcome to the Medical AI Tutor. I'm powered by a ChromaDB retrieval system and Mistral LLM. Ask any question about anatomy, pathology, radiology, or medical imaging — I'll retrieve relevant context from indexed clinical documents and generate a precise response." }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await askTutor(q);
      setMessages(prev => [...prev, { role: 'ai', content: res.answer, sources: res.sources }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Unable to reach the RAG backend. Ensure the FastAPI server is running on port 8000.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: 'relative', zIndex: 1,
      maxWidth: 1100, margin: '0 auto',
      padding: '3.5rem 3rem',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 62px)',
    }}>

      {/* ── HEADER ── */}
      <div className="fade-in" style={{ marginBottom: '2rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2.4rem' }}>

        {/* Medical image badge */}
        <div style={{
          width: 88, height: 88, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
          border: '1px solid rgba(0,229,255,0.3)',
          boxShadow: '0 0 28px rgba(0,229,255,0.15)',
        }}>
          <img
            src="https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=200&q=80"
            alt="Medical AI"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(20%) brightness(0.85)' }}
          />
        </div>

        <div>
          {/* Status pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 14,
            background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
            borderRadius: 100, padding: '8px 20px',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 10px ${ACCENT}` }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              RAG System — ChromaDB + Mistral
            </span>
          </div>
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 900, letterSpacing: -2, color: TEXT, lineHeight: 1,
          }}>
            AI Medical Tutor
          </h1>
          <p style={{ fontSize: 15, color: DIM, marginTop: 8, fontWeight: 300 }}>
            Ask anything about anatomy, pathology, radiology or clinical imaging
          </p>
        </div>
      </div>

      {/* ── CHAT WINDOW ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 22,
        paddingRight: 8, marginBottom: 18,
        scrollbarWidth: 'thin',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%' }}>

              {m.role === 'ai' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  {/* Changed from DIMMER grey → visible cyan */}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ACCENT2, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
                    MedAI · Mistral RAG
                  </span>
                </div>
              )}

              <div style={{
                padding: '18px 22px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #00e5ff, #00b8d4)'
                  : 'rgba(0,12,28,0.88)',
                border: m.role === 'ai' ? '1px solid rgba(0,229,255,0.12)' : 'none',
                color: m.role === 'user' ? '#000e1a' : TEXT,
                fontSize: 16, lineHeight: 1.85,
                fontWeight: m.role === 'user' ? 500 : 400,
                fontFamily: 'Outfit, sans-serif',
              }}>
                <MarkdownMessage content={m.content} variant={m.role} />
              </div>

              {m.sources && m.sources.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                  {/* "Retrieved from" — changed to cyan */}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT2, alignSelf: 'center' }}>
                    Retrieved from:
                  </span>
                  {m.sources.map((s, j) => (
                    <span key={j} style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                      padding: '4px 12px', borderRadius: 5,
                      background: 'rgba(0,153,255,0.1)', color: '#40c8ff',
                      border: '1px solid rgba(0,153,255,0.2)',
                    }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '18px 22px', borderRadius: '16px 16px 16px 4px',
              background: 'rgba(0,12,28,0.88)', border: '1px solid rgba(0,229,255,0.1)',
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── STARTERS ── */}
      {messages.length === 1 && (
        <div style={{ flexShrink: 0, marginBottom: 16 }}>
          {/* Changed from grey → bright cyan label */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: ACCENT, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            marginBottom: 12,
          }}>
            Suggested Queries
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{
                  fontSize: 13, padding: '10px 18px', borderRadius: 9,
                  background: 'rgba(0,8,20,0.8)', border: '1px solid rgba(0,229,255,0.18)',
                  color: DIM, cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'Outfit, sans-serif', lineHeight: 1.5,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = ACCENT;
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.4)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.05)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = DIM;
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.18)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,8,20,0.8)';
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 14 }}>
        <input
          className="input-med"
          style={{ flex: 1, height: 60, fontSize: 16, borderRadius: 12 }}
          placeholder="Ask about pathology, radiology, clinical features..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn-cyan"
          style={{ height: 60, padding: '0 32px', fontSize: 16, borderRadius: 12, opacity: (!input.trim() || loading) ? 0.4 : 1 }}
        >
          Send
        </button>
      </div>

    </div>
  );
};

export default AiTutor;