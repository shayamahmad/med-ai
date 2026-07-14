import React from 'react';
import { ANATOMY_SYSTEMS } from './data/organs';
import { AnatomySystem } from './types/anatomy.types';
import { useAnatomy } from './AnatomyContext';

const SystemSwitcher: React.FC = () => {
  const { selection } = useAnatomy();

  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12, right: 12,
      display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
      zIndex: 10,
    }}>
      {ANATOMY_SYSTEMS.map(sys => (
        <button
          key={sys}
          type="button"
          onClick={() => selection.setSystem(sys as AnatomySystem)}
          className={selection.activeSystem === sys ? 'btn-cyan' : 'btn-outline'}
          style={{ fontSize: 10, padding: '5px 12px' }}
        >
          {sys}
        </button>
      ))}
    </div>
  );
};

export default SystemSwitcher;
