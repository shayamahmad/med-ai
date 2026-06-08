import React, { useCallback, useState } from 'react';
import axios from 'axios';
import { fetchClinicalProfile, generateDietLifestyleReport } from '../../api';
import { DiseaseProfile, StructuredDiagnosis, SymptomCheckResult } from '../../types/clinical';
import {
  DietLifestyleProfile,
  DietLifestyleReport,
  SymptomWorkflowStep,
} from '../../types/lifestyle';
import ClinicalTreatmentPanel from './ClinicalTreatmentPanel';
import DiagnosisCard from './DiagnosisCard';
import DietLifestyleIntake from './DietLifestyleIntake';
import DietLifestyleReportView from './DietLifestyleReport';
import SymptomWorkflowStepper from './SymptomWorkflowStepper';

const DIM = 'rgba(180,220,240,0.75)';
const TEXT = '#d0e4f0';

interface Props {
  result: SymptomCheckResult;
}

const DiagnosisResults: React.FC<Props> = ({ result }) => {
  const [workflowStep, setWorkflowStep] = useState<SymptomWorkflowStep>('detection');
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<StructuredDiagnosis | null>(null);
  const [profiles, setProfiles] = useState<Record<string, DiseaseProfile>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [lifestyleReport, setLifestyleReport] = useState<DietLifestyleReport | null>(null);
  const [lifestyleLoading, setLifestyleLoading] = useState(false);
  const [lifestyleError, setLifestyleError] = useState('');

  const diagnoses = result.diagnoses?.length ? result.diagnoses : [];

  const handleToggle = useCallback(async (diagnosis: StructuredDiagnosis) => {
    if (workflowStep === 'diet' || workflowStep === 'followup') return;

    if (expandedSlug === diagnosis.slug) {
      setExpandedSlug(null);
      setPanelError(null);
      return;
    }

    setExpandedSlug(diagnosis.slug);
    setSelectedDiagnosis(diagnosis);
    setWorkflowStep('clinical');
    setPanelError(null);
    setLifestyleReport(null);
    setLifestyleError('');

    if (profiles[diagnosis.slug]) return;

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
  }, [expandedSlug, profiles, workflowStep]);

  const goToDietStep = () => {
    if (!selectedDiagnosis) return;
    setWorkflowStep('diet');
    setLifestyleError('');
  };

  const handleLifestyleSubmit = async (profile: DietLifestyleProfile) => {
    if (!selectedDiagnosis) return;
    setLifestyleLoading(true);
    setLifestyleError('');
    try {
      const clinical = profiles[selectedDiagnosis.slug];
      const response = await generateDietLifestyleReport(
        {
          name: selectedDiagnosis.name,
          slug: selectedDiagnosis.slug,
          symptoms: result.input_symptoms ?? [],
          severity: clinical?.severity ?? '',
          urgency: selectedDiagnosis.urgency,
        },
        profile,
      );
      setLifestyleReport(response.report);
      setWorkflowStep('followup');
    } catch (err: unknown) {
      setLifestyleError(
        axios.isAxiosError(err)
          ? String(err.response?.data?.detail ?? err.message)
          : 'Could not generate lifestyle report.',
      );
    } finally {
      setLifestyleLoading(false);
    }
  };

  const restartWorkflow = () => {
    setWorkflowStep('detection');
    setExpandedSlug(null);
    setSelectedDiagnosis(null);
    setLifestyleReport(null);
    setLifestyleError('');
  };

  if (workflowStep === 'diet' && selectedDiagnosis) {
    return (
      <div className="diagnosis-results">
        <SymptomWorkflowStepper current="diet" />
        {lifestyleError && (
          <div className="clinical-panel-error" style={{ marginBottom: 16 }}>{lifestyleError}</div>
        )}
        <DietLifestyleIntake
          conditionName={selectedDiagnosis.name}
          onSubmit={handleLifestyleSubmit}
          loading={lifestyleLoading}
          onBack={() => setWorkflowStep('clinical')}
        />
      </div>
    );
  }

  if (workflowStep === 'followup' && selectedDiagnosis && lifestyleReport) {
    return (
      <div className="diagnosis-results">
        <SymptomWorkflowStepper current="followup" />
        <DietLifestyleReportView
          report={lifestyleReport}
          conditionName={selectedDiagnosis.name}
          onRestart={restartWorkflow}
        />
      </div>
    );
  }

  return (
    <div className="diagnosis-results">
      <SymptomWorkflowStepper current={workflowStep === 'clinical' ? 'clinical' : 'detection'} />

      {result.summary && (
        <p style={{ color: DIM, fontSize: 15, lineHeight: 1.75, marginBottom: 20 }}>
          {result.summary}
        </p>
      )}

      {diagnoses.length > 0 ? (
        <>
          <div className="mono-label" style={{ marginBottom: 12 }}>
            Possible conditions — tap to open clinical guide, then continue to diet &amp; lifestyle
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
                      <>
                        <ClinicalTreatmentPanel profile={profiles[diagnosis.slug]} />
                        <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid rgba(0,229,255,0.1)' }}>
                          <p style={{ color: DIM, fontSize: 14, lineHeight: 1.65, marginBottom: 14 }}>
                            Next: build a personalized nutrition and lifestyle plan aligned with{' '}
                            <strong style={{ color: TEXT }}>{diagnosis.name}</strong> and your dietary preferences.
                          </p>
                          <button type="button" className="btn-cyan" onClick={goToDietStep}>
                            Continue to Diet &amp; Lifestyle →
                          </button>
                        </div>
                      </>
                    )}
                    {!profiles[diagnosis.slug] && !loadingSlug && !panelError && (
                      <div style={{ marginTop: 14 }}>
                        <button type="button" className="btn-outline" onClick={goToDietStep}>
                          Skip to Diet &amp; Lifestyle →
                        </button>
                      </div>
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
