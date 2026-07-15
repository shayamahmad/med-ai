import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QuizQuestion } from '../../types/study';

const TEXT = '#d0e4f0';
const ACCENT = '#00e5ff';

type InputMode = 'true_false' | 'mcq' | 'text';

const NUMERIC_QUESTION = /\b(what is the|what are the|how many|how much|approximate|approx\.?|diameter|radius|volume|percentage|percent|rate|value|number of|amount of|size of|length of|width of|thickness of|concentration|calculate|compute|give the|state the|enter the)\b/i;

function optionsAreTrueFalseOnly(options: string[]): boolean {
  if (!options.length) return false;
  return options.every(opt => /^(true|false|t|f)$/i.test(opt.trim()));
}

function resolveInputMode(q: QuizQuestion): InputMode {
  const options = (q.options ?? []).map(o => o.trim()).filter(Boolean);

  if (q.type === 'short_answer' || q.type === 'fill_blank') {
    return 'text';
  }

  if (q.type === 'true_false' && optionsAreTrueFalseOnly(options.length ? options : ['True', 'False'])) {
    return 'true_false';
  }

  if (NUMERIC_QUESTION.test(q.question) || optionsAreTrueFalseOnly(options)) {
    return 'text';
  }

  if (q.type === 'mcq' && options.length >= 4 && !optionsAreTrueFalseOnly(options)) {
    return 'mcq';
  }

  if (options.length >= 4 && !optionsAreTrueFalseOnly(options)) {
    return 'mcq';
  }

  if (q.type === 'true_false') {
    return 'true_false';
  }

  return 'text';
}

function textPlaceholder(q: QuizQuestion): string {
  if (NUMERIC_QUESTION.test(q.question)) {
    return 'Enter the value (e.g. 9 nm or 50%)';
  }
  return 'Type your answer';
}

interface Props {
  questions: QuizQuestion[];
  mode: 'quiz' | 'exam';
  timeLimitMinutes?: number;
  onSubmit: (answers: Record<string, string>, durationSeconds: number) => Promise<void>;
}

const StudyAssessment: React.FC<Props> = ({ questions, mode, timeLimitMinutes = 45, onSubmit }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [startedAt] = useState(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes * 60);

  const finish = useCallback(async () => {
    setSubmitting(true);
    const duration = Math.round((Date.now() - startedAt) / 1000);
    await onSubmit(answers, duration);
    setSubmitting(false);
  }, [answers, onSubmit, startedAt]);

  useEffect(() => {
    if (mode !== 'exam') return;
    const timer = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timer);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, finish]);

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;
  const inputMode = q ? resolveInputMode(q) : 'text';

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [secondsLeft]);

  if (!q) return null;

  return (
    <div className="study-assessment fade-in">
      <div className="study-assessment__header">
        <span className="mono-label">{mode === 'exam' ? 'Exam Mode' : 'Quiz'} · Q{current + 1}/{questions.length}</span>
        {mode === 'exam' && <span className="tag-amber">{mmss} remaining</span>}
      </div>
      <div className="conf-bar-track" style={{ marginBottom: 18, height: 4 }}>
        <div className="conf-bar-fill" style={{ width: `${progress}%`, background: ACCENT }} />
      </div>

      <div className="study-question-card">
        {q.topic && <span className="tag-purple" style={{ marginBottom: 10, display: 'inline-block' }}>{q.topic}</span>}
        <p style={{ color: TEXT, fontSize: 17, fontWeight: 600, lineHeight: 1.7, marginBottom: 16 }}>{q.question}</p>

        {inputMode === 'true_false' && ['True', 'False'].map(opt => (
          <button key={opt} type="button" className={`study-option ${answers[q.id] === opt ? 'study-option--selected' : ''}`}
            onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>{opt}</button>
        ))}

        {inputMode === 'mcq' && (q.options ?? []).map(opt => (
          <button key={opt} type="button" className={`study-option ${answers[q.id] === opt ? 'study-option--selected' : ''}`}
            onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>{opt}</button>
        ))}

        {inputMode === 'text' && (
          <input
            className="input-med"
            value={answers[q.id] || ''}
            placeholder={textPlaceholder(q)}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
            aria-label="Your answer"
          />
        )}
      </div>

      <div className="study-assessment__nav">
        <button className="btn-outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>Previous</button>
        {current < questions.length - 1 ? (
          <button className="btn-cyan" disabled={!answers[q.id]?.trim()} onClick={() => setCurrent(c => c + 1)}>Next</button>
        ) : (
          <button className="btn-cyan" disabled={submitting || Object.keys(answers).length < questions.length}
            onClick={finish}>
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
};

export default StudyAssessment;
