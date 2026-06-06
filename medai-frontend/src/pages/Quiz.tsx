import React, { useState } from 'react';
import ImagingQuiz from './ImagingQuiz';
import StudyCompanion from './study/StudyCompanion';

type MainTab = 'imaging' | 'study';

const Quiz: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('imaging');

  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '3.5rem 3rem' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setMainTab('imaging')}
          className={mainTab === 'imaging' ? 'study-main-tab study-main-tab--active' : 'study-main-tab'}
        >
          Imaging Quiz
        </button>
        <button
          type="button"
          onClick={() => setMainTab('study')}
          className={mainTab === 'study' ? 'study-main-tab study-main-tab--active study-main-tab--study' : 'study-main-tab'}
        >
          Study Companion
        </button>
      </div>

      {mainTab === 'imaging' ? <ImagingQuiz /> : <StudyCompanion />}
    </div>
  );
};

export default Quiz;
