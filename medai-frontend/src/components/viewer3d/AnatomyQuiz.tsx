import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AnatomyCanvas from './AnatomyCanvas';
import { ORGANS } from './data/organs';

type QuizMode = 'identify' | 'find';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

const AnatomyQuiz: React.FC = () => {
  const [mode, setMode] = useState<QuizMode>('find');
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0 });
  const [targetOrgan, setTargetOrgan] = useState(ORGANS[0]);
  const [clickedOrgan, setClickedOrgan] = useState<string | null>(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [timer, setTimer] = useState(10);

  const pickRandomOrgan = useCallback(() => {
    const idx = Math.floor(Math.random() * ORGANS.length);
    setTargetOrgan(ORGANS[idx]);
    setClickedOrgan(null);
    setGuess('');
    setFeedback('');
    setTimer(10);
  }, []);

  useEffect(() => { pickRandomOrgan(); }, [pickRandomOrgan]);

  useEffect(() => {
    if (mode !== 'find' || feedback) return;
    if (timer <= 0) {
      setFeedback(`Time's up! It was ${targetOrgan.label}.`);
      setScore(s => ({ correct: s.correct, total: s.total + 1, streak: 0 }));
      return;
    }
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, mode, feedback, targetOrgan.label]);

  const handleQuizClick = (organId: string) => {
    setClickedOrgan(organId);

    if (mode === 'find') {
      const correct = organId === targetOrgan.id;
      setScore(s => ({
        correct: s.correct + (correct ? 1 : 0),
        total: s.total + 1,
        streak: correct ? s.streak + 1 : 0,
      }));
      setFeedback(correct
        ? `Correct! That is the ${targetOrgan.label}.`
        : `Incorrect. You clicked ${ORGANS.find(o => o.id === organId)?.label ?? organId}.`);
      setTimeout(pickRandomOrgan, 2000);
    }
  };

  const checkIdentify = () => {
    if (!clickedOrgan) {
      setFeedback('Click an organ on the model first.');
      return;
    }
    const selected = ORGANS.find(o =>
      o.label.toLowerCase() === guess.toLowerCase()
      || o.id === guess.toLowerCase().replace(/\s/g, '_'),
    );
    const correct = selected?.id === clickedOrgan;
    setScore(s => ({
      correct: s.correct + (correct ? 1 : 0),
      total: s.total + 1,
      streak: correct ? s.streak + 1 : 0,
    }));
    const actual = ORGANS.find(o => o.id === clickedOrgan);
    setFeedback(correct
      ? `Correct! That is the ${actual?.label}.`
      : `Incorrect. That was ${actual?.label}.`);
    setTimeout(pickRandomOrgan, 2000);
  };

  const organOptions = useMemo(() => ORGANS.map(o => o.label), []);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: 28,
          color: TEXT, marginBottom: 8,
        }}>
          3D Anatomy Quiz
        </h2>
        <p style={{ color: DIM, fontSize: 15, maxWidth: 600 }}>
          Test your anatomical knowledge with interactive 3D organ identification challenges.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => { setMode('find'); pickRandomOrgan(); }}
          className={mode === 'find' ? 'btn-cyan' : 'btn-outline'}
        >
          Find the Structure
        </button>
        <button
          type="button"
          onClick={() => { setMode('identify'); pickRandomOrgan(); }}
          className={mode === 'identify' ? 'btn-cyan' : 'btn-outline'}
        >
          Organ Identification
        </button>
      </div>

      <div className="study-analytics__stats" style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        {[
          ['Correct', score.correct],
          ['Total', score.total],
          ['Streak', score.streak],
        ].map(([label, value]) => (
          <div key={label as string} className="study-stat-card" style={{ flex: 1, minWidth: 100 }}>
            <div className="mono-label">{label}</div>
            <p style={{ color: ACCENT, fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</p>
          </div>
        ))}
        {mode === 'find' && (
          <div className="study-stat-card" style={{ flex: 1, minWidth: 100 }}>
            <div className="mono-label">Timer</div>
            <p style={{ color: timer <= 3 ? '#ff5252' : ACCENT, fontSize: 28, fontWeight: 900, marginTop: 6 }}>
              {timer}s
            </p>
          </div>
        )}
      </div>

      {mode === 'find' && (
        <div className="glass" style={{
          borderRadius: 14, padding: '16px 20px', marginBottom: 16, textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: ACCENT,
            letterSpacing: '0.06em',
          }}>
            Click the <span style={{ color: targetOrgan.color, fontWeight: 700 }}>{targetOrgan.label.toUpperCase()}</span>
          </p>
        </div>
      )}

      <AnatomyCanvas quizMode hideLabels onQuizOrganClick={handleQuizClick} />

      {mode === 'identify' && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={guess}
            onChange={e => setGuess(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8,
              background: 'rgba(10,20,38,0.82)', border: '1px solid rgba(0,229,255,0.12)',
              color: TEXT, fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
            }}
          >
            <option value="">Select organ name…</option>
            {organOptions.map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
          <button type="button" onClick={checkIdentify} className="btn-cyan">
            Check Answer
          </button>
        </div>
      )}

      {feedback && (
        <div className="glass" style={{
          marginTop: 16, borderRadius: 12, padding: '12px 18px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: DIM,
        }}>
          {feedback}
        </div>
      )}
    </div>
  );
};

export default AnatomyQuiz;
