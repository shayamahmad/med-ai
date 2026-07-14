import React from 'react';
import { LAYERS } from './data/layers';
import { useAnatomy } from './AnatomyContext';

const LayerControls: React.FC = () => {
  const { layerVisibility, setLayerVisibility } = useAnatomy();

  const toggle = (id: string) => {
    setLayerVisibility(prev => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  return (
    <div className="glass" style={{
      position: 'absolute', left: 16, top: '50%',
      transform: 'translateY(-50%)',
      borderRadius: 14, padding: '16px 18px',
      zIndex: 10, minWidth: 180,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00e5ff',
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
      }}>
        Layers
      </div>
      {LAYERS.map(layer => {
        const active = layerVisibility[layer.id] !== false;
        return (
          <div key={layer.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, gap: 12,
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: 'rgba(180,220,240,0.75)',
            }}>
              {layer.label}
            </span>
            <button
              type="button"
              onClick={() => toggle(layer.id)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? '#00e5ff' : 'rgba(0,8,20,0.6)',
                position: 'relative', transition: 'all 0.15s',
              }}
              aria-label={`Toggle ${layer.label}`}
            >
              <span style={{
                position: 'absolute', top: 2,
                left: active ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: active ? '#060c14' : 'rgba(180,220,240,0.4)',
                transition: 'left 0.15s',
              }} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default LayerControls;
