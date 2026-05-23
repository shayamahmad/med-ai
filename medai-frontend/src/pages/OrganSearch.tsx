import React, { useState } from 'react';
import { askTutor } from '../api';
import MarkdownMessage from '../components/MarkdownMessage';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const DIMMER = 'rgba(140,180,210,0.5)';
const ACCENT = '#00e5ff';

const PRESET_CATEGORIES = [
  {
    label: 'Organs',
    items: ['Heart', 'Brain', 'Lungs', 'Liver', 'Kidney', 'Pancreas', 'Thyroid gland', 'Spleen', 'Stomach', 'Intestine'],
  },
  {
    label: 'Diseases',
    items: ['Pneumonia', 'Glioblastoma', 'Diabetes mellitus', 'Hypertension', 'Melanoma', 'Glaucoma', 'Osteoporosis', 'Tuberculosis'],
  },
  {
    label: 'Topics',
    items: ['Anatomy', 'Radiology', 'Pathology', 'Histology', 'Physiology', 'Neuroscience', 'Cardiology', 'Oncology'],
  },
];

const SUGGESTED_QUERIES = [
  'What is the anatomy of the heart and how does it pump blood?',
  'Explain the structure and function of the lungs.',
  'What are the symptoms and causes of glioblastoma?',
  'How does the kidney filter blood and regulate fluid balance?',
  'What is diabetic retinopathy and how is it diagnosed?',
  'Explain the Kellgren-Lawrence grading scale for knee osteoarthritis.',
  'What are the radiological features of COVID-19 pneumonia?',
  'How does melanoma differ from benign skin lesions?',
];

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: string[];
}

const OrganSearch: React.FC = () => {
  const [query, setQuery]       = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [hovered, setHovered]   = useState<string | null>(null);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;
    setQuery('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await askTutor(text);
      setMessages(prev => [...prev, { role: 'ai', content: res.answer, sources: res.sources }]);
    } catch {
      setError('Could not reach the backend. Ensure FastAPI is running on port 8000.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (name: string) => {
    ask(`Explain ${name} — its anatomy, function, and associated medical conditions.`);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '3rem 2.5rem' }}>

      {/* HEADER */}
      <div className="fade-in" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16,
          background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 100, padding: '6px 16px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            Mistral LLM + ChromaDB RAG
          </span>
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 900, letterSpacing: -2, color: TEXT, marginBottom: 10, lineHeight: 1 }}>
          Medical Knowledge Base
        </h1>
        <p style={{ color: DIM, fontSize: 16, maxWidth: 580 }}>
          Ask anything about anatomy, physiology, diseases, radiology, pathology, or treatments.
          Powered by your ChromaDB knowledge base and Mistral LLM.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>

        {/* LEFT — chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Messages */}
          {messages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map((m, i) => (
                <div key={i}>
                  {m.role === 'user' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ maxWidth: '80%', padding: '14px 18px',
                        borderRadius: '14px 14px 4px 14px',
                        background: 'linear-gradient(135deg, #00e5ff, #00b8d4)',
                        color: '#000e1a', fontSize: 15, fontWeight: 500, lineHeight: 1.6,
                        fontFamily: 'Outfit, sans-serif' }}>
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6,
                          background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                          </svg>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: DIMMER, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                          MedAI · Mistral RAG
                        </span>
                      </div>
                      <div className="glass" style={{ borderRadius: '4px 14px 14px 14px', padding: '18px 20px' }}>
                        <MarkdownMessage content={m.content} fontSize={15} />
                        {m.sources && m.sources.length > 0 && (
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,229,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: DIMMER }}>Sources:</span>
                            {m.sources.map((s, j) => (
                              <span key={j} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                                padding: '3px 10px', borderRadius: 4,
                                background: 'rgba(0,153,255,0.1)', color: '#40b8ff',
                                border: '1px solid rgba(0,153,255,0.15)' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading */}
              {loading && (
                <div>
                  <div className="glass" style={{ borderRadius: '4px 14px 14px 14px', padding: '16px 20px', display: 'inline-flex', gap: 5 }}>
                    {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="glass" style={{ borderRadius: 14, padding: '40px 28px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(0,229,255,0.06)',
                border: '1px solid rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,229,255,0.5)" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: TEXT, marginBottom: 10 }}>
                Ask the Medical AI
              </h3>
              <p style={{ color: DIMMER, fontSize: 14, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>
                Ask any medical question — anatomy, diseases, radiology, pathology, physiology, or treatments.
                Click a preset on the right or type your own question below.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTED_QUERIES.slice(0, 4).map(q => (
                  <button key={q} onClick={() => ask(q)}
                    style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(0,229,255,0.03)',
                      border: '1px solid rgba(0,229,255,0.1)', color: DIM, fontSize: 13,
                      cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.15s', fontFamily: 'Outfit, sans-serif' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = TEXT; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = DIM; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.1)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)',
              borderRadius: 12, padding: '14px 18px', color: '#ff8a80', fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <input className="input-med" style={{ flex: 1, height: 52, fontSize: 15 }}
              placeholder="Ask about anatomy, diseases, imaging, pathology..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask(query)}
              disabled={loading}
            />
            <button onClick={() => ask(query)} disabled={!query.trim() || loading} className="btn-cyan"
              style={{ height: 52, padding: '0 24px', fontSize: 14, opacity: (!query.trim() || loading) ? 0.4 : 1 }}>
              Ask
            </button>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="btn-outline"
                style={{ height: 52, padding: '0 16px', fontSize: 13 }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PRESET_CATEGORIES.map(cat => (
            <div key={cat.label} className="glass" style={{ borderRadius: 12, padding: '16px 18px' }}>
              <div className="mono-label" style={{ marginBottom: 12 }}>{cat.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cat.items.map(item => (
                  <button key={item} onClick={() => handlePreset(item)}
                    onMouseEnter={() => setHovered(item)} onMouseLeave={() => setHovered(null)}
                    style={{ padding: '9px 12px', borderRadius: 8, textAlign: 'left' as const,
                      background: hovered === item ? 'rgba(0,229,255,0.05)' : 'rgba(0,8,20,0.5)',
                      border: `1px solid ${hovered === item ? 'rgba(0,229,255,0.25)' : 'rgba(0,229,255,0.08)'}`,
                      color: hovered === item ? TEXT : DIM,
                      fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                      fontFamily: 'Outfit, sans-serif', fontWeight: hovered === item ? 500 : 400 }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* More queries */}
          <div className="glass" style={{ borderRadius: 12, padding: '16px 18px' }}>
            <div className="mono-label" style={{ marginBottom: 12 }}>More Queries</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {SUGGESTED_QUERIES.slice(4).map(q => (
                <button key={q} onClick={() => ask(q)}
                  onMouseEnter={() => setHovered(q)} onMouseLeave={() => setHovered(null)}
                  style={{ padding: '9px 12px', borderRadius: 8, textAlign: 'left' as const,
                    background: hovered === q ? 'rgba(0,229,255,0.05)' : 'rgba(0,8,20,0.5)',
                    border: `1px solid ${hovered === q ? 'rgba(0,229,255,0.25)' : 'rgba(0,229,255,0.08)'}`,
                    color: hovered === q ? TEXT : DIM,
                    fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'Outfit, sans-serif', lineHeight: 1.5 }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganSearch;