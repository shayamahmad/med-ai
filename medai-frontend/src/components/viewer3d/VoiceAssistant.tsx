import React, { useState } from 'react';
import { askTutor } from '../../api';
import { useVoiceCommand } from './hooks/useVoiceCommand';
import { useAnatomy } from './AnatomyContext';

interface VoiceAssistantProps {
  onToast: (text: string) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onToast }) => {
  const { selection, flyToRef, setExploded, setViewerMode } = useAnatomy();
  const [responseText, setResponseText] = useState('');

  const { listening, supported, startListening, speak } = useVoiceCommand({
    onShowOrgan: (organId) => {
      selection.selectOrgan(organId);
      flyToRef.current?.(organId);
    },
    onExplainOrgan: (organId) => {
      selection.selectOrgan(organId);
      flyToRef.current?.(organId);
    },
    onAskDisease: async (query) => {
      try {
        const res = await askTutor(query);
        setResponseText(res.answer);
        onToast(res.answer);
        speak(res.answer.slice(0, 300));
      } catch {
        const msg = 'Unable to process your question.';
        setResponseText(msg);
        onToast(msg);
      }
    },
    onSwitchSystem: (system) => selection.setSystem(system),
    onToggleExploded: () => setExploded(prev => !prev),
    onReset: () => {
      selection.clearSelection();
      flyToRef.current?.(null);
      setViewerMode(null);
    },
  });

  if (!supported) return null;

  return (
    <>
      <button
        type="button"
        onClick={startListening}
        style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 50,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,184,212,0.1))',
          border: '1px solid rgba(0,229,255,0.4)',
          boxShadow: listening ? '0 0 30px rgba(0,229,255,0.5)' : '0 0 18px rgba(0,229,255,0.2)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          animation: listening ? 'pulse-ring 1.5s ease-in-out infinite' : 'none',
        }}
        aria-label="Voice assistant"
      >
        🎙
      </button>

      {responseText && (
        <div className="glass" style={{
          position: 'fixed', bottom: 100, left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 12, padding: '12px 20px',
          maxWidth: 480, textAlign: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, color: '#d0e4f0',
          zIndex: 40,
        }}>
          {responseText.slice(0, 400)}
          {responseText.length > 400 ? '…' : ''}
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
