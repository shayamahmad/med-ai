import React, { useState } from 'react';
import { DietLifestyleReport as ReportType } from '../../types/lifestyle';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const ReportSection: React.FC<SectionProps> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="clinical-section">
      <button type="button" className="clinical-section__toggle" onClick={() => setOpen(v => !v)} aria-expanded={open}>
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
  <ul className="clinical-list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
);

interface Props {
  report: ReportType;
  conditionName: string;
  onRestart: () => void;
}

const DietLifestyleReportView: React.FC<Props> = ({ report, conditionName, onRestart }) => {
  const fu = report.follow_up_monitoring;

  return (
    <div className="lifestyle-report fade-in">
      <div className="lifestyle-report__hero">
        <div className="mono-label">Personalized Nutrition &amp; Lifestyle Guidance</div>
        <h4 style={{ color: TEXT, fontSize: 22, fontWeight: 800, margin: '10px 0 8px' }}>{conditionName}</h4>
        {report.condition_summary && (
          <p style={{ color: DIM, fontSize: 15, lineHeight: 1.75 }}>{report.condition_summary}</p>
        )}
        {report.personalized_overview && (
          <p style={{ color: TEXT, fontSize: 15, lineHeight: 1.75, marginTop: 10 }}>{report.personalized_overview}</p>
        )}
      </div>

      {report.recommended_foods.length > 0 && (
        <ReportSection title="Recommended foods">
          <BulletList items={report.recommended_foods} />
        </ReportSection>
      )}

      {report.foods_to_limit.length > 0 && (
        <ReportSection title="Foods to limit">
          <BulletList items={report.foods_to_limit} />
        </ReportSection>
      )}

      {report.foods_to_avoid.length > 0 && (
        <ReportSection title="Foods to avoid">
          <BulletList items={report.foods_to_avoid} />
        </ReportSection>
      )}

      {report.suggested_meal_patterns.length > 0 && (
        <ReportSection title="Suggested meal patterns">
          <BulletList items={report.suggested_meal_patterns} />
        </ReportSection>
      )}

      {report.hydration_recommendations.length > 0 && (
        <ReportSection title="Hydration">
          <BulletList items={report.hydration_recommendations} />
        </ReportSection>
      )}

      {report.nutrient_priorities.length > 0 && (
        <ReportSection title="Nutrient priorities">
          <BulletList items={report.nutrient_priorities} />
        </ReportSection>
      )}

      {report.lifestyle_modifications.length > 0 && (
        <ReportSection title="Lifestyle modifications">
          <BulletList items={report.lifestyle_modifications} />
        </ReportSection>
      )}

      {report.exercise_considerations.length > 0 && (
        <ReportSection title="Exercise considerations">
          <BulletList items={report.exercise_considerations} />
        </ReportSection>
      )}

      {report.recovery_nutrition.length > 0 && (
        <ReportSection title="Recovery-focused nutrition">
          <BulletList items={report.recovery_nutrition} />
        </ReportSection>
      )}

      {report.practical_dietary_tips.length > 0 && (
        <ReportSection title="Practical dietary tips">
          <BulletList items={report.practical_dietary_tips} />
        </ReportSection>
      )}

      {report.recommendation_rationale.length > 0 && (
        <ReportSection title="Why these recommendations support your condition" defaultOpen={false}>
          <div className="lifestyle-rationale-list">
            {report.recommendation_rationale.map((r, i) => (
              <div key={i} className="lifestyle-rationale-item">
                <strong style={{ color: TEXT }}>{r.recommendation}</strong>
                <p style={{ color: DIM, fontSize: 14, lineHeight: 1.7, marginTop: 6 }}>{r.clinical_rationale}</p>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      <div className="lifestyle-followup-block" id="follow-up-monitoring">
        <div className="mono-label" style={{ marginBottom: 12 }}>Follow-Up Monitoring</div>
        {fu.follow_up_intervals.length > 0 && (
          <>
            <p className="cds-subheading">Follow-up intervals</p>
            <BulletList items={fu.follow_up_intervals} />
          </>
        )}
        {fu.symptoms_to_track.length > 0 && (
          <>
            <p className="cds-subheading">Symptoms to track</p>
            <BulletList items={fu.symptoms_to_track} />
          </>
        )}
        {fu.dietary_adherence_tips.length > 0 && (
          <>
            <p className="cds-subheading">Dietary adherence tips</p>
            <BulletList items={fu.dietary_adherence_tips} />
          </>
        )}
        {fu.when_to_seek_care.length > 0 && (
          <div className="clinical-warning" style={{ marginTop: 16 }}>
            <div className="clinical-warning__title">When to seek medical care</div>
            <BulletList items={fu.when_to_seek_care} />
          </div>
        )}
      </div>

      {report.guideline_references.length > 0 && (
        <ReportSection title="Guideline references" defaultOpen={false}>
          <BulletList items={report.guideline_references} />
        </ReportSection>
      )}

      <div className="clinical-disclaimer" style={{ marginTop: 18 }}>{report.disclaimer}</div>

      <button type="button" className="btn-outline" style={{ marginTop: 16 }} onClick={onRestart}>
        Start over with a different condition
      </button>
    </div>
  );
};

export default DietLifestyleReportView;
