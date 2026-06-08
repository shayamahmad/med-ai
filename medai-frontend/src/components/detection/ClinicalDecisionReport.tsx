import React, { useState } from 'react';
import { CDSReport } from '../../types/cds';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

const SEVERITY_LABEL: Record<string, string> = {
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
  critical: 'Critical',
};

const TIER_LABEL: Record<string, string> = {
  high: 'High confidence',
  moderate: 'Moderate confidence',
  low: 'Low confidence',
};

interface SectionProps {
  id: string;
  title: string;
  number: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'warning';
}

const ReportSection: React.FC<SectionProps> = ({
  id, title, number, children, defaultOpen = true, variant = 'default',
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`cds-section ${variant === 'warning' ? 'cds-section--warning' : ''}`} aria-labelledby={id}>
      <button type="button" id={id} className="clinical-section__toggle" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <span className="cds-section__num">{number}</span>
        <span>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"
          style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`clinical-section__body ${open ? 'clinical-section__body--open' : ''}`}>{children}</div>
    </section>
  );
};

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="clinical-list">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

interface Props {
  report: CDSReport;
  accent?: string;
}

const ClinicalDecisionReport: React.FC<Props> = ({ report, accent = ACCENT }) => {
  const s = report.detection_summary;
  const sev = report.severity_assessment;
  const tx = report.treatment_pathway;
  const fu = report.follow_up_plan;

  return (
    <div className="cds-report fade-in" role="region" aria-label="Clinical Decision Support Report">
      <div className="cds-report__header">
        <div>
          <div className="mono-label" style={{ marginBottom: 8 }}>Clinical Decision Support Report</div>
          <h3 style={{ color: TEXT, fontSize: '1.35rem', fontWeight: 800, marginBottom: 6 }}>
            Physician-facing imaging CDS
          </h3>
          <p style={{ color: DIM, fontSize: 14, lineHeight: 1.65, maxWidth: 720 }}>
            Structured decision support generated from AI detection output, Grad-CAM explainability, and evidence-based guidelines.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className={`tag-${sev.category === 'critical' || sev.category === 'severe' ? 'red' : sev.category === 'moderate' ? 'amber' : 'green'}`}>
            Severity: {SEVERITY_LABEL[sev.category] ?? sev.category}
          </span>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: DIM, marginTop: 8 }}>
            {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
      </div>

      {report.low_confidence_advisory && (
        <div className="clinical-warning" style={{ marginBottom: 18 }}>
          <div className="clinical-warning__title">Low / moderate model confidence — verify before treatment</div>
          <p style={{ color: DIM, fontSize: 14, lineHeight: 1.7 }}>{report.low_confidence_advisory}</p>
        </div>
      )}

      <ReportSection id="cds-1" number={1} title="Detection Summary">
        <div className="cds-summary-grid">
          <div className="cds-summary-card">
            <span className="mono-label">Predicted condition</span>
            <p style={{ color: accent, fontSize: 22, fontWeight: 800, marginTop: 8 }}>{s.predicted_disease}</p>
          </div>
          <div className="cds-summary-card">
            <span className="mono-label">AI confidence</span>
            <p style={{ color: TEXT, fontSize: 22, fontWeight: 800, marginTop: 8 }}>{s.confidence_percent}%</p>
            <span className="tag-cyan" style={{ marginTop: 8, display: 'inline-block' }}>{TIER_LABEL[s.confidence_tier] ?? s.confidence_tier}</span>
          </div>
        </div>
        {s.key_imaging_findings.length > 0 && (
          <>
            <p className="cds-subheading">Key imaging findings</p>
            <BulletList items={s.key_imaging_findings} />
          </>
        )}
        {s.gradcam_interpretation && (
          <>
            <p className="cds-subheading">Grad-CAM interpretation</p>
            <p style={{ color: DIM, fontSize: 14, lineHeight: 1.75 }}>{s.gradcam_interpretation}</p>
          </>
        )}
        {s.differential_diagnoses.length > 0 && (
          <>
            <p className="cds-subheading">Differential diagnoses</p>
            <div className="cds-diff-list">
              {s.differential_diagnoses.map((d, i) => (
                <div key={i} className="cds-diff-item">
                  <strong style={{ color: TEXT }}>{d.condition}</strong>
                  {d.probability_percent != null && (
                    <span className="tag-purple">{d.probability_percent}%</span>
                  )}
                  {d.rationale && <p style={{ color: DIM, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>{d.rationale}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </ReportSection>

      <ReportSection id="cds-2" number={2} title="Recommended Diagnostic Confirmation Tests">
        <BulletList items={report.diagnostic_confirmation_tests} />
      </ReportSection>

      <ReportSection id="cds-3" number={3} title="Severity Assessment">
        <p style={{ color: DIM, fontSize: 14, lineHeight: 1.75, marginBottom: 12 }}>{sev.rationale}</p>
        {sev.influencing_factors.length > 0 && (
          <>
            <p className="cds-subheading">Factors influencing severity</p>
            <BulletList items={sev.influencing_factors} />
          </>
        )}
      </ReportSection>

      <ReportSection id="cds-4" number={4} title="Evidence-Based Treatment Pathway">
        {tx.immediate_actions.length > 0 && (
          <>
            <p className="cds-subheading">Immediate actions</p>
            <BulletList items={tx.immediate_actions} />
          </>
        )}
        {tx.first_line_management.length > 0 && (
          <>
            <p className="cds-subheading">First-line medical management</p>
            <BulletList items={tx.first_line_management} />
          </>
        )}
        {tx.medication_classes.length > 0 && (
          <>
            <p className="cds-subheading">Medication classes (educational — not prescriptions)</p>
            <div className="clinical-med-grid">
              {tx.medication_classes.map((m, i) => (
                <div key={i} className="clinical-med-card">
                  <strong>{m.category}</strong>
                  {m.purpose && <p>{m.purpose}</p>}
                  <span>Requires physician assessment</span>
                </div>
              ))}
            </div>
          </>
        )}
        {tx.procedural_interventions.length > 0 && (
          <>
            <p className="cds-subheading">Procedural / surgical interventions</p>
            <BulletList items={tx.procedural_interventions} />
          </>
        )}
        {tx.supportive_care.length > 0 && (
          <>
            <p className="cds-subheading">Supportive care</p>
            <BulletList items={tx.supportive_care} />
          </>
        )}
      </ReportSection>

      <ReportSection id="cds-5" number={5} title="Specialist Referral Recommendations">
        <BulletList items={report.specialist_referrals} />
      </ReportSection>

      <ReportSection id="cds-6" number={6} title="Follow-Up and Monitoring Plan">
        {fu.follow_up_intervals.length > 0 && (
          <>
            <p className="cds-subheading">Follow-up intervals</p>
            <BulletList items={fu.follow_up_intervals} />
          </>
        )}
        {fu.repeat_imaging.length > 0 && (
          <>
            <p className="cds-subheading">Repeat imaging</p>
            <BulletList items={fu.repeat_imaging} />
          </>
        )}
        {fu.monitoring_parameters.length > 0 && (
          <>
            <p className="cds-subheading">Monitoring parameters</p>
            <BulletList items={fu.monitoring_parameters} />
          </>
        )}
        {fu.expected_response_indicators.length > 0 && (
          <>
            <p className="cds-subheading">Expected treatment response indicators</p>
            <BulletList items={fu.expected_response_indicators} />
          </>
        )}
      </ReportSection>

      <ReportSection id="cds-7" number={7} title="Red Flag Findings — Urgent Escalation" variant="warning">
        <BulletList items={report.red_flags} />
      </ReportSection>

      <ReportSection id="cds-8" number={8} title="Clinical Reasoning" defaultOpen={false}>
        <p style={{ color: DIM, fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{report.clinical_reasoning}</p>
      </ReportSection>

      <ReportSection id="cds-9" number={9} title="Guideline References" defaultOpen={false}>
        <div className="cds-ref-list">
          {report.references.map((ref, i) => (
            <div key={i} className="cds-ref-item">
              <strong style={{ color: accent }}>{ref.organization}</strong>
              <p style={{ color: TEXT, fontSize: 14, marginTop: 4 }}>{ref.title}</p>
              {ref.relevance && <p style={{ color: DIM, fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>{ref.relevance}</p>}
            </div>
          ))}
        </div>
      </ReportSection>

      <div className="clinical-disclaimer" style={{ marginTop: 20 }}>
        {report.disclaimer}
      </div>
    </div>
  );
};

export default ClinicalDecisionReport;
