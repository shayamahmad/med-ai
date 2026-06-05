import React, { useCallback, useState } from 'react';
import axios from 'axios';
import { fetchClinicalProfile } from '../../api';
import { DiseaseProfile, StructuredDiagnosis, SymptomCheckResult } from '../../types/clinical';
import DiagnosisCard from './DiagnosisCard';
import ClinicalTreatmentPanel from './ClinicalTreatmentPanel';

const ACCENT = '#00e5ff';
const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';

interface Props {
  result: SymptomCheckResult;
}

const DiagnosisResults: React.FC<Props> = ({ result }) => {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, DiseaseProfile>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  const diagnoses = result.diagnoses?.length
    ? result.diagnoses
    : [];

  const handleToggle = useCallback(async (diagnosis: StructuredDiagnosis) => {
    if (expandedSlug === diagnosis.slug) {
      setExpandedSlug(null);
      setPanelError(null);
      return;
    }

    setExpandedSlug(diagnosis.slug);
    setPanelError(null);

    if (profiles[diagnosis.slug]) {
      return;
    }

    setLoadingSlug(diagnosis.slug);
    try {
      const profile = await fetchClinicalProfile(diagnosis.slug, diagnosis.name);
      setProfiles(prev => ({ ...prev, [diagnosis.slug]: profile }));
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err)
        ? String(err.response?.data?.detail ?? err.message)
        : 'Unable to load clinical guide.';
      setPanelError(detail);
    } finally {
      setLoadingSlug(null);
    }
  }, [expandedSlug, profiles]);

  return (
    <div className="diagnosis-results">
      {result.summary && (
        <p style={{ color: DIM, fontSize: 15, lineHeight: 1.75, marginBottom: 20 }}>
          {result.summary}
        </p>
      )}

      {diagnoses.length > 0 ? (
        <>
          <div className="mono-label" style={{ marginBottom: 12 }}>
            Possible conditions — tap to open clinical guide
          </div>
          <div className="diagnosis-results__list">
            {diagnoses.map(diagnosis => (
              <div key={`${diagnosis.slug}-${diagnosis.rank}`} className="diagnosis-results__item">
                <DiagnosisCard
                  diagnosis={diagnosis}
                  expanded={expandedSlug === diagnosis.slug}
                  loading={loadingSlug === diagnosis.slug}
                  onToggle={() => handleToggle(diagnosis)}
                />
                {expandedSlug === diagnosis.slug && (
                  <div className="diagnosis-results__panel-wrap">
                    {loadingSlug === diagnosis.slug && !profiles[diagnosis.slug] && (
                      <div className="clinical-panel-skeleton glass" aria-live="polite">
                        <div className="skeleton" style={{ height: 24, width: '45%', marginBottom: 16 }} />
                        <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 10 }} />
                        <div className="skeleton" style={{ height: 14, width: '92%', marginBottom: 10 }} />
                        <div className="skeleton" style={{ height: 14, width: '88%' }} />
                      </div>
                    )}
                    {panelError && !profiles[diagnosis.slug] && (
                      <div className="clinical-panel-error">{panelError}</div>
                    )}
                    {profiles[diagnosis.slug] && (
                      <ClinicalTreatmentPanel profile={profiles[diagnosis.slug]} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ color: DIM, fontSize: 15, lineHeight: 1.75 }}>{result.answer}</p>
      )}

      {result.sources?.length > 0 && (
        <div style={{ paddingTop: 18, borderTop: '1px solid rgba(0,229,255,0.08)', marginTop: 22 }}>
          <div className="mono-label" style={{ marginBottom: 10 }}>Retrieved from</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {result.sources.map((s, i) => (
              <span key={i} className="tag-cyan">{s}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,229,255,0.06)', marginTop: 18 }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,215,64,0.75)', lineHeight: 1.7 }}>
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
};

export default DiagnosisResults;
