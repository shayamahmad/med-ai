import React, { useState } from 'react';
import { DiseaseProfile } from '../../types/clinical';

const ACCENT = '#00e5ff';
const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';

const SEVERITY_LABEL: Record<string, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
  critical: 'Critical',
};

interface SectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const PanelSection: React.FC<SectionProps> = ({ id, title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="clinical-section" aria-labelledby={id}>
      <button
        type="button"
        id={id}
        className="clinical-section__toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="clinical-section__icon">{icon}</span>
        <span>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"
          style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`clinical-section__body ${open ? 'clinical-section__body--open' : ''}`}>
        {children}
      </div>
    </section>
  );
};

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="clinical-list">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

interface Props {
  profile: DiseaseProfile;
}

const ClinicalTreatmentPanel: React.FC<Props> = ({ profile }) => {
  return (
    <div
      id={`panel-${profile.slug}`}
      className="clinical-panel fade-in"
      role="region"
      aria-label={`Clinical education for ${profile.name}`}
    >
      <div className="clinical-panel__hero">
        <div>
          <div className="mono-label" style={{ marginBottom: 8 }}>Disease Overview</div>
          <h4 style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{profile.name}</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="tag-purple">Severity: {SEVERITY_LABEL[profile.severity] ?? profile.severity}</span>
            {profile.generated_by_ai && <span className="tag-amber">AI-generated guide</span>}
          </div>
          <p style={{ color: DIM, fontSize: 15, lineHeight: 1.75 }}>{profile.overview}</p>
        </div>
      </div>

      <div className="clinical-panel__grid">
        <div className="clinical-panel__fact">
          <span className="mono-label">Underlying cause</span>
          <p>{profile.underlying_cause}</p>
        </div>
        <div className="clinical-panel__fact">
          <span className="mono-label">Expected recovery</span>
          <p>{profile.recovery_timeline}</p>
        </div>
      </div>

      <PanelSection
        id={`${profile.slug}-treatment`}
        title="First-line & standard management"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
        defaultOpen
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <div className="mono-label" style={{ marginBottom: 8 }}>First-line approaches</div>
            <BulletList items={profile.first_line_treatment} />
          </div>
          <div>
            <div className="mono-label" style={{ marginBottom: 8 }}>Management strategies</div>
            <BulletList items={profile.management_strategies} />
          </div>
        </div>
      </PanelSection>

      <PanelSection
        id={`${profile.slug}-support`}
        title="Supportive care & home guidance"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <div className="mono-label" style={{ marginBottom: 8 }}>Supportive care</div>
            <BulletList items={profile.supportive_care} />
          </div>
          <div>
            <div className="mono-label" style={{ marginBottom: 8 }}>Home care guidance</div>
            <BulletList items={profile.home_care} />
          </div>
        </div>
      </PanelSection>

      <PanelSection
        id={`${profile.slug}-meds`}
        title="Medication categories (educational)"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M12 8v8"/></svg>}
      >
        <div className="clinical-med-grid">
          {profile.medication_categories.map((med, i) => (
            <div key={i} className="clinical-med-card">
              <strong>{med.category}</strong>
              <p>{med.purpose}</p>
              <span>{med.note}</span>
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        id={`${profile.slug}-dx`}
        title="Diagnostic tests"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>}
      >
        <BulletList items={profile.diagnostic_tests} />
      </PanelSection>

      <PanelSection
        id={`${profile.slug}-prevent`}
        title="Prevention & patient education"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <div className="mono-label" style={{ marginBottom: 8 }}>Prevention</div>
            <BulletList items={profile.prevention} />
          </div>
          <div>
            <div className="mono-label" style={{ marginBottom: 8 }}>Patient education</div>
            <BulletList items={profile.patient_education} />
          </div>
        </div>
      </PanelSection>

      <div className="clinical-warning">
        <div className="clinical-warning__title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5252" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Warning signs — seek urgent medical care
        </div>
        <BulletList items={profile.warning_signs} />
      </div>

      <div className="clinical-disclaimer">
        {profile.disclaimer}
      </div>
    </div>
  );
};

export default ClinicalTreatmentPanel;
