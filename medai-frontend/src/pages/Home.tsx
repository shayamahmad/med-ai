import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const TEXT = '#d0e4f0';
const DIM = 'rgba(130,180,210,0.6)';

const features = [
  {
    to: '/detect',
    title: 'Disease Detection',
    desc: 'Upload chest X-rays, brain MRIs, eye fundus, skin, bone, knee & dental scans.',
    tag: '7 Specialized Models',
    tagClass: 'tag-cyan',
    accent: '#00e5ff',
    image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=420&q=80', // chest xray
  },
  {
    to: '/organs',
    title: 'Organ Search',
    desc: 'Search any organ or anatomical structure with live Wikipedia summaries.',
    tag: 'Wikipedia API',
    tagClass: 'tag-green',
    accent: '#00e676',
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=420&q=80', // anatomy
  },
  {
    to: '/classify',
    title: 'Organ Classifier',
    desc: 'Upload any medical scan. ResNet50 identifies 14 organ classes with confidence scores.',
    tag: 'ResNet50 · 14 Classes',
    tagClass: 'tag-red',
    accent: '#ff5252',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=420&q=80', // MRI scan
  },
  {
    to: '/tutor',
    title: 'AI Medical Tutor',
    desc: 'RAG-powered Q&A. ChromaDB + Mistral LLM generates precise clinical answers.',
    tag: 'ChromaDB + Mistral',
    tagClass: 'tag-cyan',
    accent: '#00e5ff',
    image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=420&q=80', // medical books / education
  },
  {
    to: '/symptoms',
    title: 'Symptom Checker',
    desc: 'Describe symptoms in plain language. NLP matches against 26 disease profiles.',
    tag: 'NLP · 26 Diseases',
    tagClass: 'tag-green',
    accent: '#00e676',
    image: 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=420&q=80', // stethoscope / clinical
  },
  {
    to: '/quiz',
    title: 'Diagnostic Quiz',
    desc: 'Upload a scan, make your diagnosis, then compare against the AI prediction.',
    tag: 'Knowledge Assessment',
    tagClass: 'tag-amber',
    accent: '#ffd740',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=420&q=80', // laptop medical
  },
  {
    to: '/viewer3d',
    title: '3D Anatomy Viewer',
    desc: 'Interactive Three.js 3D organ models. Rotate, zoom and explore in real time.',
    tag: 'Three.js · WebGL',
    tagClass: 'tag-purple',
    accent: '#b47bff',
    image: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=420&q=80', // 3d anatomy / science
  },
];

function useCounter(target: number, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      let current = 0;
      const step = target / 60;
      const interval = setInterval(() => {
        current += step;
        if (current >= target) { setVal(target); clearInterval(interval); }
        else setVal(Math.floor(current));
      }, 16);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, delay]);
  return val;
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r},${g},${b}`;
}

interface Feature {
  to: string;
  title: string;
  desc: string;
  tag: string;
  tagClass: string;
  accent: string;
  image: string;
}

const FeatureCard: React.FC<{ f: Feature; size: 'large' | 'medium' }> = ({ f, size }) => {
  const [hovered, setHovered] = useState(false);
  const minH = size === 'large' ? 340 : 280;
  const titleSize = size === 'large' ? 28 : 22;
  const descSize = size === 'large' ? 15.5 : 14;
  const imgSize = size === 'large' ? 100 : 80;
  const pad = size === 'large' ? '3rem 3.2rem' : '2.4rem 2.6rem';

  return (
    <Link
      to={f.to}
      style={{
        background: hovered
          ? `rgba(${hexToRgb(f.accent)},0.05)`
          : 'rgba(4,12,24,0.97)',
        padding: pad,
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: minH,
        border: `1px solid ${hovered ? `rgba(${hexToRgb(f.accent)},0.32)` : 'rgba(0,229,255,0.08)'}`,
        borderRadius: 8,
        transition: 'all 0.25s ease',
        position: 'relative' as const,
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Subtle ambient glow top-right */}
      <div style={{
        position: 'absolute', top: -80, right: -80, width: 240, height: 240,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(${hexToRgb(f.accent)},${hovered ? 0.13 : 0.04}) 0%, transparent 70%)`,
        transition: 'all 0.3s ease',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', gap: '1.8rem', alignItems: 'flex-start' }}>
        {/* Image thumbnail */}
        <div style={{
          flexShrink: 0,
          width: imgSize,
          height: imgSize,
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid rgba(${hexToRgb(f.accent)},0.25)`,
          boxShadow: hovered ? `0 0 20px rgba(${hexToRgb(f.accent)},0.3)` : 'none',
          transition: 'box-shadow 0.25s ease',
        }}>
          <img
            src={f.image}
            alt={f.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'grayscale(30%) brightness(0.85)',
              transition: 'filter 0.25s ease, transform 0.3s ease',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
            }}
          />
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
            fontSize: titleSize, color: TEXT, marginBottom: 12, lineHeight: 1.15,
          }}>
            {f.title}
          </p>
          <p style={{ fontSize: descSize, color: DIM, lineHeight: 1.85 }}>
            {f.desc}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
        <span className={f.tagClass} style={{ fontSize: 12, padding: '6px 14px' }}>{f.tag}</span>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 20,
          color: hovered ? f.accent : 'rgba(0,229,255,0.22)',
          transition: 'all 0.2s',
          display: 'inline-block',
          transform: hovered ? 'translateX(5px)' : 'translateX(0)',
        }}>→</span>
      </div>
    </Link>
  );
};

const Home: React.FC = () => {
  const c1 = useCounter(8, 200);
  const c2 = useCounter(14, 350);
  const c3 = useCounter(26, 500);
  const c4 = useCounter(5, 650);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── HERO ── */}
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 3rem',
      }}>
        <div className="fade-in" style={{
          display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 40,
          background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 100, padding: '11px 26px',
        }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#00e5ff', display: 'inline-block', boxShadow: '0 0 14px #00e5ff' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#00e5ff', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            Medical AI Platform — 8 Models Active
          </span>
        </div>

        <h1 className="fade-in-1" style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 900,
          fontSize: 'clamp(4rem, 10vw, 8rem)',
          lineHeight: 1.0, letterSpacing: -5, marginBottom: 36, maxWidth: 1100,
        }}>
          <span style={{ color: TEXT }}>Clinical Intelligence</span><br />
          <span className="text-glow" style={{ color: '#00e5ff' }}>Powered by Deep Learning</span>
        </h1>

        <p className="fade-in-2" style={{
          fontSize: 21, fontWeight: 300, color: DIM,
          lineHeight: 1.9, marginBottom: 56, maxWidth: 680,
        }}>
          8 specialized CNN models · RAG clinical tutoring · Grad-CAM explainability · Interactive 3D anatomy
        </p>

        <div className="fade-in-3" style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <Link to="/detect" className="btn-cyan" style={{ textDecoration: 'none', fontSize: 17, padding: '18px 48px', borderRadius: 12 }}>
            Run Diagnosis
          </Link>
          <Link to="/tutor" className="btn-outline" style={{ textDecoration: 'none', fontSize: 17, padding: '18px 48px', borderRadius: 12 }}>
            Open AI Tutor
          </Link>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 2.5rem 5rem' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          background: 'rgba(0,229,255,0.025)', border: '1px solid rgba(0,229,255,0.1)',
          borderRadius: 20, overflow: 'hidden',
        }}>
          {[
            { val: c1, suffix: '',    label: 'Trained Models',   sub: 'PyTorch CNN',  color: '#00e5ff' },
            { val: c2, suffix: '',    label: 'Organ Classes',    sub: 'ResNet50',     color: '#00e676' },
            { val: c3, suffix: '',    label: 'Disease Profiles', sub: 'Symptom NLP',  color: '#ffd740' },
            { val: c4, suffix: 'K+',  label: 'Training Images', sub: 'Augmented',    color: '#b47bff' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '52px 36px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid rgba(0,229,255,0.08)' : 'none',
            }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '4.5rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 14 }}>
                {s.val}{s.suffix}
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 6 }}>{s.label}</div>
              <div className="mono-label" style={{ fontSize: 11 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES 2 + 2 + 3 ── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 2.5rem 7rem' }}>
        <div className="mono-label" style={{ marginBottom: 28, textAlign: 'center', fontSize: 12, letterSpacing: '0.14em' }}>Platform Modules</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Row 1 — 2 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {features.slice(0, 2).map(f => <FeatureCard key={f.to} f={f} size="large" />)}
          </div>

          {/* Row 2 — 2 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {features.slice(2, 4).map(f => <FeatureCard key={f.to} f={f} size="large" />)}
          </div>

          {/* Row 3 — 3 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
            {features.slice(4, 7).map(f => <FeatureCard key={f.to} f={f} size="medium" />)}
          </div>

        </div>
      </div>

    </div>
  );
};

export default Home;