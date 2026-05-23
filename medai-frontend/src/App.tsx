import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import MedBackground from './components/MedBackground';
import Home from './pages/Home';
import OrganSearch from './pages/OrganSearch';
import OrganClassifier from './pages/OrganClassifier';
import DiseaseDetection from './pages/DiseaseDetection';
import AiTutor from './pages/AiTutor';
import SymptomChecker from './pages/SymptomChecker';
import Quiz from './pages/Quiz';
import Viewer3D from './pages/Viewer3D';

const App: React.FC = () => (
  <BrowserRouter>
    <MedBackground />
    <Navbar />
    <Routes>
      <Route path="/"         element={<Home />} />
      <Route path="/organs"   element={<OrganSearch />} />
      <Route path="/classify" element={<OrganClassifier />} />
      <Route path="/detect"   element={<DiseaseDetection />} />
      <Route path="/tutor"    element={<AiTutor />} />
      <Route path="/symptoms" element={<SymptomChecker />} />
      <Route path="/quiz"     element={<Quiz />} />
      <Route path="/viewer3d" element={<Viewer3D />} />
    </Routes>
  </BrowserRouter>
);

export default App;
