import React, { useEffect, useState } from 'react';

interface Props { label: string; score: number; isTop?: boolean; color?: string; }

const ConfidenceBar: React.FC<Props> = ({ label, score, isTop, color }) => {
  const [width, setWidth] = useState(0);
  const pct = Math.round(score * 100);
  const barColor = color || (pct >= 70 ? '#00e676' : pct >= 40 ? '#ffd740' : '#ff5252');
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 60); return () => clearTimeout(t); }, [pct]);

  return (
    <div style={{
      padding: '9px 12px', borderRadius: 7, marginBottom: 5,
      background: isTop ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isTop ? 'rgba(0,229,255,0.18)' : 'rgba(255,255,255,0.04)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: isTop ? 600 : 400, color: isTop ? '#d0e4f0' : 'rgba(130,180,210,0.5)', textTransform: 'capitalize' }}>
          {label.replace(/_/g, ' ')}
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: barColor }}>
          {pct}%
        </span>
      </div>
      <div className="conf-bar-track">
        <div className="conf-bar-fill" style={{ width: `${width}%`, background: barColor, boxShadow: `0 0 6px ${barColor}60` }} />
      </div>
    </div>
  );
};

export default ConfidenceBar;
