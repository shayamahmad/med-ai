import React from 'react';
import { AssessmentResult, StudyAnalytics } from '../../types/study';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';
const ACCENT = '#00e5ff';

interface Props {
  analytics: StudyAnalytics;
  breakdown?: AssessmentResult['topic_breakdown'];
  results?: AssessmentResult['results'];
}

const StudyAnalyticsPanel: React.FC<Props> = ({ analytics, breakdown, results }) => {
  return (
    <div className="study-analytics fade-in">
      <div className="study-analytics__stats">
        {[
          ['Attempts', analytics.total_attempts],
          ['Average', `${analytics.average_score}%`],
          ['Best', `${analytics.best_score}%`],
        ].map(([label, value]) => (
          <div key={label} className="study-stat-card">
            <div className="mono-label">{label}</div>
            <p style={{ color: ACCENT, fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</p>
          </div>
        ))}
      </div>

      {breakdown && breakdown.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="mono-label" style={{ marginBottom: 12 }}>Topic breakdown</div>
          {breakdown.map(item => (
            <div key={item.topic} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: DIM, marginBottom: 4 }}>
                <span>{item.topic}</span>
                <span>{item.percentage}%</span>
              </div>
              <div className="conf-bar-track" style={{ height: 6 }}>
                <div className="conf-bar-fill" style={{
                  width: `${item.percentage}%`,
                  background: item.percentage >= 70 ? '#00e676' : item.percentage >= 50 ? '#ffd740' : '#ff5252',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {analytics.recent_trend.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="mono-label" style={{ marginBottom: 12 }}>Recent performance</div>
          <div className="study-trend">
            {analytics.recent_trend.map((point, i) => (
              <div key={i} className="study-trend__bar-wrap">
                <div className="study-trend__bar" style={{ height: `${Math.max(8, point.percentage)}%` }} title={`${point.percentage}%`} />
                <span>{point.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="mono-label" style={{ marginBottom: 12 }}>Answer review</div>
          {results.map(r => (
            <div key={r.id} className="study-review-item" style={{
              borderColor: r.correct ? 'rgba(0,230,118,0.25)' : 'rgba(255,82,82,0.25)',
            }}>
              <strong style={{ color: r.correct ? '#00e676' : '#ff5252' }}>
                {r.correct ? 'Correct' : 'Incorrect'} · {r.topic}
              </strong>
              <p style={{ color: DIM, fontSize: 13, marginTop: 6 }}>{r.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {analytics.recommendations?.length > 0 && (
        <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)' }}>
          <div className="mono-label" style={{ marginBottom: 8 }}>Recommendations</div>
          <ul className="clinical-list">
            {analytics.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StudyAnalyticsPanel;
