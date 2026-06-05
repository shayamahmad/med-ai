import React from 'react';
import { StructuredDiagnosis, UrgencyLevel } from '../../types/clinical';

const ACCENT = '#00e5ff';
const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';

const URGENCY_META: Record<UrgencyLevel, { label: string; className: string }> = {
  low: { label: 'Low urgency', className: 'tag-green' },
  medium: { label: 'Medium urgency', className: 'tag-amber' },
  high: { label: 'High urgency', className: 'tag-red' },
};

interface Props {
  diagnosis: StructuredDiagnosis;
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
}

const DiagnosisCard: React.FC<Props> = ({ diagnosis, expanded, loading, onToggle }) => {
  const urgency = URGENCY_META[diagnosis.urgency] ?? URGENCY_META.medium;

  return (
    <article
      className={`diagnosis-card ${expanded ? 'diagnosis-card--expanded' : ''}`}
      style={{ animationDelay: `${Math.min(diagnosis.rank, 6) * 0.06}s` }}
    >
      <button
        type="button"
        className="diagnosis-card__header"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`panel-${diagnosis.slug}`}
      >
        <div className="diagnosis-card__rank">{diagnosis.rank}</div>
        <div className="diagnosis-card__main">
          <div className="diagnosis-card__title-row">
            <h3 style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: 0 }}>
              {diagnosis.name}
            </h3>
            <span className={urgency.className}>{urgency.label}</span>
            {diagnosis.seek_care_now && <span className="tag-red">Seek care now</span>}
            {diagnosis.clinical_available && !expanded && (
              <span className="tag-cyan">Clinical guide</span>
            )}
          </div>
          <p style={{ color: DIM, fontSize: 14, lineHeight: 1.65, margin: '8px 0 0' }}>
            {diagnosis.match_reason}
          </p>
          {diagnosis.distinguishing_features && (
            <p style={{ color: 'rgba(140,180,210,0.65)', fontSize: 13, lineHeight: 1.6, margin: '8px 0 0' }}>
              <strong style={{ color: ACCENT, fontWeight: 600 }}>Key features: </strong>
              {diagnosis.distinguishing_features}
            </p>
          )}
        </div>
        <div className="diagnosis-card__chevron" aria-hidden="true">
          {loading ? (
            <span className="clinical-spinner" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={ACCENT}
              strokeWidth="2"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          )}
        </div>
      </button>
    </article>
  );
};

export default DiagnosisCard;
