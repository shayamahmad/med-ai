import React, { useState } from 'react';
import ImagingQuiz from './ImagingQuiz';
import StudyCompanion from './study/StudyCompanion';
import AnatomyQuiz from '../components/viewer3d/AnatomyQuiz';

type MainTab = 'imaging' | 'study' | 'anatomy3d';

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
        <button
          type="button"
          onClick={() => setMainTab('anatomy3d')}
          className={mainTab === 'anatomy3d' ? 'study-main-tab study-main-tab--active' : 'study-main-tab'}
        >
          3D Anatomy Quiz
        </button>
      </div>

      {mainTab === 'imaging' && <ImagingQuiz />}
      {mainTab === 'study' && <StudyCompanion />}
      {mainTab === 'anatomy3d' && <AnatomyQuiz />}
    </div>
  );
};

export default Quiz;
