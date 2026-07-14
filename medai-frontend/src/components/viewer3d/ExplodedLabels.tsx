import React from 'react';
import { Html } from '@react-three/drei';
import { ORGANS } from './data/organs';
import { useAnatomy } from './AnatomyContext';

const ExplodedLabels: React.FC = () => {
  const { exploded } = useAnatomy();
  if (!exploded) return null;

  return (
    <>
      {ORGANS.map(organ => (
        <Html key={organ.id} position={organ.restPosition} center>
          <div style={{
            background: 'rgba(10,20,38,0.82)',
            border: '1px solid rgba(0,229,255,0.25)',
            backdropFilter: 'blur(12px)',
            borderRadius: 6,
            padding: '4px 10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: '#00e5ff',
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {organ.label}
          </div>
        </Html>
      ))}
    </>
  );
};

export default ExplodedLabels;
