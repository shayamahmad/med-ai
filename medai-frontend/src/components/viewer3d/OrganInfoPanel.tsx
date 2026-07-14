import React, { useEffect, useState } from 'react';
import { askOrganAI } from '../../api';
import MarkdownMessage from '../MarkdownMessage';
import { getOrganById } from './data/organs';
import { DiseaseEntry } from './types/anatomy.types';
import { useAnatomy } from './AnatomyContext';

const DIM = 'rgba(180,220,240,0.75)';

interface OrganInfoPanelProps {
  onDiseaseClick: (organId: string, disease: DiseaseEntry) => void;
}

const OrganInfoPanel: React.FC<OrganInfoPanelProps> = ({ onDiseaseClick }) => {
  const { selection } = useAnatomy();
  const organ = selection.selectedOrgan ? getOrganById(selection.selectedOrgan) : null;
  const open = !!organ;

  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [expanded, setExpanded] = useState({ basic: true, medical: true, ai: true });

  useEffect(() => {
    if (!organ) {
      setAiInsights('');
      return;
    }
    setAiLoading(true);
    askOrganAI(organ.label)
      .then(res => setAiInsights(res.answer))
      .catch(() => setAiInsights('Unable to load AI insights at this time.'))
      .finally(() => setAiLoading(false));
  }, [organ?.id]);

  const sub = organ?.subStructures.find(s => s.id === selection.selectedSubStructure);

  const toggle = (key: keyof typeof expanded) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="glass" style={{
      position: 'absolute', top: 0, right: 0, width: 340, height: '100%',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 20, borderRadius: '0 18px 18px 0',
      padding: '20px 22px', overflowY: 'auto',
    }}>
      {organ && (
        <>
          <button
            type="button"
            onClick={() => selection.clearSelection()}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'transparent', border: 'none', color: DIM,
              fontSize: 22, cursor: 'pointer', lineHeight: 1,
            }}
            aria-label="Close panel"
          >
            ×
          </button>

          <p style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
            fontSize: 22, color: organ.color, margin: '0 0 8px',
          }}>
            {organ.label}
          </p>

          {organ.subStructures.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {organ.subStructures.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selection.selectOrgan(organ.id, s.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 100, cursor: 'pointer',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                    background: selection.selectedSubStructure === s.id
                      ? 'rgba(0,229,255,0.15)' : 'rgba(0,229,255,0.05)',
                    border: `1px solid ${selection.selectedSubStructure === s.id
                      ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.1)'}`,
                    color: selection.selectedSubStructure === s.id ? '#00e5ff' : DIM,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: DIM, padding: '3px 10px',
            background: 'rgba(0,229,255,0.05)',
            border: '1px solid rgba(0,229,255,0.1)',
            borderRadius: 4,
          }}>
            {organ.system} System
          </span>

          {sub && (
            <p style={{ fontSize: 13, color: DIM, marginTop: 12, lineHeight: 1.7 }}>
              {sub.description}
            </p>
          )}

          <Section title="Basic Info" open={expanded.basic} onToggle={() => toggle('basic')}>
            <InfoRow label="Location" value={organ.location} />
            <p style={{ fontSize: 13, color: DIM, lineHeight: 1.7, marginTop: 8 }}>{organ.shortInfo}</p>
          </Section>

          <Section title="Medical Info" open={expanded.medical} onToggle={() => toggle('medical')}>
            <InfoRow label="Function" value={organ.physiologicalFunction} />
            {organ.diseases.map(d => (
              <button
                key={d.name}
                type="button"
                onClick={() => onDiseaseClick(organ.id, d)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  marginTop: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(0,8,20,0.45)',
                  border: '1px solid rgba(0,229,255,0.08)',
                }}
              >
                <p style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13, color: d.materialColorOverride, margin: 0 }}>
                  {d.name}
                </p>
                <p style={{ fontSize: 11, color: DIM, margin: '4px 0 0' }}>
                  Symptoms: {d.symptoms.slice(0, 3).join(', ')}…
                </p>
              </button>
            ))}
          </Section>

          <Section title="AI Insights" open={expanded.ai} onToggle={() => toggle('ai')}>
            {aiLoading ? (
              <div style={{ display: 'flex', gap: 6, padding: '8px 0' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            ) : (
              <MarkdownMessage content={aiInsights} fontSize={13} />
            )}
          </Section>
        </>
      )}
    </div>
  );
};

const Section: React.FC<{
  title: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ title, open, onToggle, children }) => (
  <div style={{ marginTop: 18, borderTop: '1px solid rgba(0,229,255,0.07)', paddingTop: 14 }}>
    <button
      type="button"
      onClick={onToggle}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer', width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#00e5ff',
        letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0,
      }}
    >
      {title}
      <span>{open ? '−' : '+'}</span>
    </button>
    {open && <div style={{ marginTop: 10 }}>{children}</div>}
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: 6 }}>
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(140,180,210,0.5)' }}>
      {label}
    </span>
    <p style={{ fontSize: 13, color: DIM, margin: '2px 0 0', lineHeight: 1.6 }}>{value}</p>
  </div>
);

export default OrganInfoPanel;
