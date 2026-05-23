import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/organs',   label: 'Organs'    },
  { to: '/detect',   label: 'Detection' },
  { to: '/classify', label: 'Classify'  },
  { to: '/tutor',    label: 'AI Tutor'  },
  { to: '/symptoms', label: 'Symptoms'  },
  { to: '/quiz',     label: 'Quiz'      },
  { to: '/viewer3d', label: '3D Viewer' },
];

const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className="nav-glass">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2.5rem', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,184,212,0.1))',
            border: '1px solid rgba(0,229,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(0,229,255,0.2)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 17, color: '#00e5ff', letterSpacing: -0.5, textShadow: '0 0 20px rgba(0,229,255,0.35)' }}>MED</span>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300, fontSize: 17, color: '#d0e4f0', letterSpacing: 1 }}>AI</span>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {links.map(({ to, label }) => {
            const active = pathname === to;
            return (
              <Link key={to} to={to} style={{
                textDecoration: 'none',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                fontWeight: 500, padding: '7px 14px', borderRadius: 6,
                color: active ? '#00e5ff' : 'rgba(160,200,220,0.5)',
                background: active ? 'rgba(0,229,255,0.08)' : 'transparent',
                borderBottom: active ? '1px solid rgba(0,229,255,0.35)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}>
                {label}
              </Link>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.18)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00e676', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            System Online
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
