import React from 'react';
import { SymptomWorkflowStep, WORKFLOW_STEPS } from '../../types/lifestyle';

interface Props {
  current: SymptomWorkflowStep;
}

const STEP_ORDER: SymptomWorkflowStep[] = ['symptoms', 'detection', 'clinical', 'diet', 'followup'];

const SymptomWorkflowStepper: React.FC<Props> = ({ current }) => {
  const currentIdx = STEP_ORDER.indexOf(current);

  return (
    <nav className="symptom-workflow" aria-label="Symptom care pathway">
      {WORKFLOW_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = step.id === current;
        return (
          <div key={step.label} className={`symptom-workflow__step ${active ? 'symptom-workflow__step--active' : ''} ${done ? 'symptom-workflow__step--done' : ''}`}>
            <span className="symptom-workflow__dot">{done ? '✓' : i + 1}</span>
            <span className="symptom-workflow__label">{step.label}</span>
            {i < WORKFLOW_STEPS.length - 1 && <span className="symptom-workflow__line" aria-hidden="true" />}
          </div>
        );
      })}
    </nav>
  );
};

export default SymptomWorkflowStepper;
