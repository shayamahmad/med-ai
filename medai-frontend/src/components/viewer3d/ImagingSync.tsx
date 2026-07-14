import React, { useEffect, useMemo } from 'react';
import { ORGANS } from './data/organs';
import { useAnatomy } from './AnatomyContext';

function placeholderSlice(modality: string, index: number): string {
  const hue = modality === 'ct' ? 200 : modality === 'mri' ? 280 : 0;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <rect width="80" height="80" fill="hsl(${hue},30%,12%)"/>
      <text x="40" y="36" text-anchor="middle" fill="#00e5ff" font-size="8" font-family="monospace">[DEMO]</text>
      <text x="40" y="52" text-anchor="middle" fill="#d0e4f0" font-size="10" font-family="monospace">${modality.toUpperCase()} ${index}</text>
    </svg>`,
  )}`;
}

const ImagingSync: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { imagingSlice, setImagingSlice, imagingModality, setImagingModality, selection } = useAnatomy();

  const matchingOrgan = useMemo(() => {
    return ORGANS.find(o => {
      const range = o.imagingSliceRange?.[imagingModality === 'xray' ? 'ct' : imagingModality];
      if (!range) return false;
      return imagingSlice >= range[0] && imagingSlice <= range[1];
    });
  }, [imagingSlice, imagingModality]);

  useEffect(() => {
    if (matchingOrgan) {
      selection.highlightOrganEmissive(matchingOrgan.id, 0.5);
    }
  }, [matchingOrgan, selection]);

  useEffect(() => {
    if (selection.selectedOrgan) {
      const organ = ORGANS.find(o => o.id === selection.selectedOrgan);
      const range = organ?.imagingSliceRange?.ct;
      if (range) setImagingSlice(range[0]);
    }
  }, [selection.selectedOrgan, setImagingSlice]);

  const thumbnails = useMemo(
    () => Array.from({ length: 12 }, (_, i) => Math.floor((i / 11) * 100)),
    [imagingModality],
  );

  return (
    <div className="glass" style={{
      position: 'absolute', top: 60, right: 16, width: 280,
      borderRadius: 14, padding: '16px 18px', zIndex: 15,
      maxHeight: 'calc(100% - 120px)', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00e5ff',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Imaging Sync
        </span>
        <button type="button" onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'rgba(180,220,240,0.5)',
          cursor: 'pointer', fontSize: 18,
        }}>
          ×
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['ct', 'mri', 'xray'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setImagingModality(tab)}
            className={imagingModality === tab ? 'btn-cyan' : 'btn-outline'}
            style={{ fontSize: 10, padding: '4px 10px', flex: 1 }}
          >
            {tab === 'xray' ? 'X-Ray' : tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        maxHeight: 200, overflowY: 'auto', marginBottom: 12,
      }}>
        {thumbnails.map(idx => (
          <button
            key={idx}
            type="button"
            onClick={() => setImagingSlice(idx)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 6, borderRadius: 8, cursor: 'pointer',
              background: imagingSlice === idx ? 'rgba(0,229,255,0.08)' : 'transparent',
              border: `1px solid ${imagingSlice === idx ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.04)'}`,
            }}
          >
            <img src={placeholderSlice(imagingModality, idx)} alt={`Slice ${idx}`} width={40} height={40} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#d0e4f0' }}>
              Slice {idx}
            </span>
          </button>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={imagingSlice}
        onChange={e => setImagingSlice(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#00e5ff' }}
      />

      {matchingOrgan && (
        <p style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: matchingOrgan.color, marginTop: 10,
        }}>
          Highlighting: {matchingOrgan.label}
        </p>
      )}
    </div>
  );
};

export default ImagingSync;
