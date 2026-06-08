import React, { useState } from 'react';
import {
  ACTIVITY_LEVELS,
  DEFAULT_LIFESTYLE_PROFILE,
  DIETARY_PREFERENCES,
  DietLifestyleProfile,
  HEALTH_GOALS,
  HealthGoal,
} from '../../types/lifestyle';

const TEXT = '#d0e4f0';
const DIM = 'rgba(180,220,240,0.75)';

interface Props {
  conditionName: string;
  onSubmit: (profile: DietLifestyleProfile) => void;
  loading: boolean;
  onBack: () => void;
}

const parseList = (value: string) =>
  value.split(/[,;]+/).map(s => s.trim()).filter(Boolean);

const DietLifestyleIntake: React.FC<Props> = ({ conditionName, onSubmit, loading, onBack }) => {
  const [profile, setProfile] = useState<DietLifestyleProfile>({ ...DEFAULT_LIFESTYLE_PROFILE });
  const [allergyInput, setAllergyInput] = useState('');
  const [intoleranceInput, setIntoleranceInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');

  const toggleGoal = (goal: HealthGoal) => {
    setProfile(p => ({
      ...p,
      health_goals: p.health_goals.includes(goal)
        ? p.health_goals.filter(g => g !== goal)
        : [...p.health_goals, goal],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(profile);
  };

  return (
    <form className="lifestyle-intake fade-in" onSubmit={handleSubmit}>
      <div className="lifestyle-intake__header">
        <div className="mono-label">Diet &amp; Lifestyle Assessment</div>
        <h4 style={{ color: TEXT, fontSize: 20, fontWeight: 800, margin: '8px 0 6px' }}>
          Personalized guidance for {conditionName}
        </h4>
        <p style={{ color: DIM, fontSize: 14, lineHeight: 1.65 }}>
          Tell us about your diet, habits, and goals so recommendations fit your preferences — not a generic meal plan.
        </p>
      </div>

      <section className="lifestyle-intake__section">
        <div className="mono-label" style={{ marginBottom: 12 }}>Dietary preference</div>
        <div className="lifestyle-chip-grid">
          {DIETARY_PREFERENCES.map(opt => (
            <button key={opt.value} type="button"
              className={`lifestyle-chip ${profile.dietary_preference === opt.value ? 'lifestyle-chip--active' : ''}`}
              onClick={() => setProfile(p => ({ ...p, dietary_preference: opt.value }))}>
              {opt.label}
            </button>
          ))}
        </div>
        {profile.dietary_preference === 'other' && (
          <input className="input-med" style={{ marginTop: 10 }} placeholder="Describe your diet"
            value={profile.dietary_preference_other}
            onChange={e => setProfile(p => ({ ...p, dietary_preference_other: e.target.value }))} />
        )}
      </section>

      <section className="lifestyle-intake__section">
        <label className="lifestyle-label">Food allergies (comma-separated)</label>
        <input className="input-med" value={allergyInput}
          onChange={e => { setAllergyInput(e.target.value); setProfile(p => ({ ...p, food_allergies: parseList(e.target.value) })); }}
          placeholder="e.g. peanuts, shellfish, dairy" />
        <label className="lifestyle-label" style={{ marginTop: 14 }}>Food intolerances</label>
        <input className="input-med" value={intoleranceInput}
          onChange={e => { setIntoleranceInput(e.target.value); setProfile(p => ({ ...p, food_intolerances: parseList(e.target.value) })); }}
          placeholder="e.g. lactose, gluten" />
        <label className="lifestyle-label" style={{ marginTop: 14 }}>Religious / cultural dietary restrictions</label>
        <input className="input-med" value={profile.cultural_restrictions}
          onChange={e => setProfile(p => ({ ...p, cultural_restrictions: e.target.value }))}
          placeholder="e.g. halal, kosher, no onion/garlic" />
        <label className="lifestyle-label" style={{ marginTop: 14 }}>Preferred cuisine</label>
        <input className="input-med" value={profile.preferred_cuisine}
          onChange={e => setProfile(p => ({ ...p, preferred_cuisine: e.target.value }))}
          placeholder="e.g. Mediterranean, South Indian, Mexican" />
      </section>

      <section className="lifestyle-intake__section lifestyle-intake__grid">
        <div>
          <label className="lifestyle-label">Weight (kg)</label>
          <input className="input-med" type="number" min={20} max={300} step={0.1}
            value={profile.weight_kg ?? ''} onChange={e => setProfile(p => ({ ...p, weight_kg: e.target.value ? Number(e.target.value) : null }))} />
        </div>
        <div>
          <label className="lifestyle-label">Height (cm)</label>
          <input className="input-med" type="number" min={100} max={250} step={0.1}
            value={profile.height_cm ?? ''} onChange={e => setProfile(p => ({ ...p, height_cm: e.target.value ? Number(e.target.value) : null }))} />
        </div>
        <div>
          <label className="lifestyle-label">Daily water (liters)</label>
          <input className="input-med" type="number" min={0} max={10} step={0.1}
            value={profile.water_intake_liters ?? ''} onChange={e => setProfile(p => ({ ...p, water_intake_liters: e.target.value ? Number(e.target.value) : null }))} />
        </div>
      </section>

      <section className="lifestyle-intake__section">
        <div className="mono-label" style={{ marginBottom: 12 }}>Physical activity level</div>
        <div className="lifestyle-chip-grid">
          {ACTIVITY_LEVELS.map(opt => (
            <button key={opt.value} type="button"
              className={`lifestyle-chip ${profile.activity_level === opt.value ? 'lifestyle-chip--active' : ''}`}
              onClick={() => setProfile(p => ({ ...p, activity_level: opt.value }))}>
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="lifestyle-intake__section lifestyle-intake__grid">
        <div>
          <label className="lifestyle-label">Smoking status</label>
          <select className="input-med" value={profile.smoking_status}
            onChange={e => setProfile(p => ({ ...p, smoking_status: e.target.value as DietLifestyleProfile['smoking_status'] }))}>
            <option value="never">Never</option>
            <option value="former">Former smoker</option>
            <option value="occasional">Occasional</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        <div>
          <label className="lifestyle-label">Alcohol consumption</label>
          <select className="input-med" value={profile.alcohol_consumption}
            onChange={e => setProfile(p => ({ ...p, alcohol_consumption: e.target.value as DietLifestyleProfile['alcohol_consumption'] }))}>
            <option value="none">None</option>
            <option value="occasional">Occasional</option>
            <option value="moderate">Moderate</option>
            <option value="heavy">Heavy</option>
          </select>
        </div>
      </section>

      <section className="lifestyle-intake__section">
        <label className="lifestyle-label">Existing medical conditions</label>
        <input className="input-med" value={conditionInput}
          onChange={e => { setConditionInput(e.target.value); setProfile(p => ({ ...p, existing_conditions: parseList(e.target.value) })); }}
          placeholder="e.g. diabetes, hypertension" />
        <label className="lifestyle-label" style={{ marginTop: 14 }}>Current medications</label>
        <textarea className="input-med" style={{ minHeight: 70, resize: 'vertical' }}
          value={profile.current_medications}
          onChange={e => setProfile(p => ({ ...p, current_medications: e.target.value }))}
          placeholder="List medications — helps avoid diet conflicts" />
      </section>

      <section className="lifestyle-intake__section">
        <div className="mono-label" style={{ marginBottom: 12 }}>Health goals</div>
        <div className="lifestyle-chip-grid">
          {HEALTH_GOALS.map(opt => (
            <button key={opt.value} type="button"
              className={`lifestyle-chip ${profile.health_goals.includes(opt.value) ? 'lifestyle-chip--active' : ''}`}
              onClick={() => toggleGoal(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="lifestyle-intake__section">
        <label className="lifestyle-label">Additional notes (optional)</label>
        <textarea className="input-med" style={{ minHeight: 60, resize: 'vertical' }}
          value={profile.additional_notes}
          onChange={e => setProfile(p => ({ ...p, additional_notes: e.target.value }))} />
      </section>

      <div className="lifestyle-intake__actions">
        <button type="button" className="btn-outline" onClick={onBack} disabled={loading}>Back to Clinical Guidance</button>
        <button type="submit" className="btn-cyan" disabled={loading || profile.health_goals.length === 0}>
          {loading ? 'Generating report…' : 'Generate Diet & Lifestyle Report'}
        </button>
      </div>
    </form>
  );
};

export default DietLifestyleIntake;
