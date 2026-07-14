import React, { useMemo, useState } from 'react';
import { getSearchOptions } from './data/organs';
import { useAnatomy } from './AnatomyContext';

const AnatomySearch: React.FC = () => {
  const { selection, flyToRef } = useAnatomy();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const options = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return getSearchOptions()
      .filter(o => o.label.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [query]);

  const handleSelect = (organId: string, label: string) => {
    selection.selectOrgan(organId);
    flyToRef.current?.(organId);
    setQuery('');
    setFocused(false);
  };

  return (
    <div style={{
      position: 'absolute', top: 16, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 15, width: 320,
    }}>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search anatomy…"
        style={{
          background: 'rgba(10,20,38,0.82)',
          border: `1px solid ${focused ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.12)'}`,
          borderRadius: 8, padding: '9px 16px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
          color: '#d0e4f0', outline: 'none', width: '100%',
        }}
      />
      {focused && options.length > 0 && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {options.map((opt, i) => (
            <button
              key={`${opt.id}-${opt.label}`}
              type="button"
              onMouseDown={() => handleSelect(opt.id, opt.label)}
              style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
                background: i === 0 ? 'rgba(0,229,255,0.08)' : 'rgba(4,12,24,0.9)',
                border: `1px solid ${i === 0 ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.04)'}`,
                color: '#d0e4f0',
              }}
            >
              {opt.label}
              <span style={{ color: 'rgba(140,180,210,0.5)', marginLeft: 8, fontSize: 10 }}>
                {opt.type === 'sub' ? 'structure' : 'organ'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnatomySearch;
