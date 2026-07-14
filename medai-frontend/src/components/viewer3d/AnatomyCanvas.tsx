import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsap from 'gsap';
import * as THREE from 'three';
import { getOrganById } from './data/organs';
import { LAYERS } from './data/layers';
import { useOrganSelection } from './hooks/useOrganSelection';
import { AnatomyProvider, useFlyToRef } from './AnatomyContext';
import { DiseaseEntry, SectionAxis, ViewerMode } from './types/anatomy.types';
import BodyModel from './BodyModel';
import CameraController from './CameraController';
import ExplodedViewController from './ExplodedView';
import ExplodedLabels from './ExplodedLabels';
import SectionalViewController from './SectionalView';
import LayerControls from './LayerControls';
import SystemSwitcher from './SystemSwitcher';
import OrganInfoPanel from './OrganInfoPanel';
import AnatomySearch from './AnatomySearch';
import VoiceAssistant from './VoiceAssistant';

const ImagingSync = lazy(() => import('./ImagingSync'));
const DiseaseComparison = lazy(() => import('./DiseaseComparison'));

export const LoadingDots: React.FC = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    {[0, 1, 2].map(i => (
      <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
    ))}
  </div>
);

interface SceneContentProps {
  onOrganClick: (organId: string) => void;
  onBackgroundClick: () => void;
  accentColor: string;
  autoRotate: boolean;
}

const SceneContent: React.FC<SceneContentProps> = ({
  onOrganClick, onBackgroundClick, accentColor, autoRotate,
}) => (
  <>
    <color attach="background" args={['#1a2235']} />
    <gridHelper args={[20, 30, 0x2a3a55, 0x1e2d44]} position={[0, -2, 0]} />

    <ambientLight intensity={2.5} />
    <directionalLight position={[5, 8, 7]} intensity={4.0} castShadow shadow-mapSize={[2048, 2048]} />
    <directionalLight position={[-6, 3, -4]} intensity={2.5} color="#add8ff" />
    <directionalLight position={[0, -3, -6]} intensity={2.0} color="#fff0cc" />
    <pointLight position={[0, 1, 4]} intensity={3.0} distance={15} />
    <pointLight position={[3, 3, 3]} intensity={1.2} color={accentColor} distance={12} />
    <pointLight position={[0, -4, 1]} intensity={1.5} distance={8} />

    <BodyModel onOrganClick={onOrganClick} />
    <ExplodedViewController />
    <ExplodedLabels />
    <SectionalViewController />
    <CameraController />

    <OrbitControls
      enableDamping
      dampingFactor={0.06}
      autoRotate={autoRotate}
      autoRotateSpeed={1.0}
      minDistance={0.4}
      maxDistance={12}
      enablePan
      panSpeed={0.6}
    />

    <mesh visible={false} onClick={onBackgroundClick}>
      <sphereGeometry args={[50, 16, 16]} />
      <meshBasicMaterial side={THREE.BackSide} />
    </mesh>
  </>
);

interface AnatomyCanvasProps {
  hideLabels?: boolean;
  quizMode?: boolean;
  onQuizOrganClick?: (organId: string) => void;
}

const AnatomyCanvas: React.FC<AnatomyCanvasProps> = ({
  hideLabels = false,
  quizMode = false,
  onQuizOrganClick,
}) => {
  const selection = useOrganSelection();
  const flyToRef = useFlyToRef();
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFemale, setIsFemale] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [viewerMode, setViewerMode] = useState<ViewerMode>(null);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>('sagittal');
  const [sectionConstant, setSectionConstant] = useState(0);
  const [diseaseCompare, setDiseaseCompare] = useState<{ organId: string; disease: DiseaseEntry } | null>(null);
  const [hideLabelsState, setHideLabels] = useState(hideLabels);
  const [imagingSlice, setImagingSlice] = useState(50);
  const [imagingModality, setImagingModality] = useState<'ct' | 'mri' | 'xray'>('ct');
  const [loading, setLoading] = useState(true);

  const defaultLayerVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {};
    LAYERS.forEach(l => { vis[l.id] = l.defaultVisible; });
    return vis;
  }, []);
  const [layerVisibility, setLayerVisibility] = useState(defaultLayerVisibility);

  useEffect(() => {
    gsap.ticker.lagSmoothing(0);
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const accentColor = selection.selectedOrgan
    ? (getOrganById(selection.selectedOrgan)?.color ?? '#00e5ff')
    : '#00e5ff';

  const handleOrganClick = useCallback((organId: string) => {
    if (quizMode && onQuizOrganClick) {
      onQuizOrganClick(organId);
      return;
    }
    selection.selectOrgan(organId);
    flyToRef.current?.(organId);
  }, [quizMode, onQuizOrganClick, selection, flyToRef]);

  const handleBackgroundClick = useCallback(() => {
    if (quizMode) return;
    selection.clearSelection();
    flyToRef.current?.(null);
  }, [quizMode, selection, flyToRef]);

  const contextValue = useMemo(() => ({
    selection,
    autoRotate,
    setAutoRotate,
    isFemale,
    setIsFemale,
    exploded,
    setExploded,
    viewerMode,
    setViewerMode,
    sectionAxis,
    setSectionAxis,
    sectionConstant,
    setSectionConstant,
    diseaseCompare,
    setDiseaseCompare,
    flyToRef,
    hideLabels: hideLabelsState,
    setHideLabels,
    layerVisibility,
    setLayerVisibility,
    imagingSlice,
    setImagingSlice,
    imagingModality,
    setImagingModality,
  }), [
    selection, autoRotate, isFemale, exploded, viewerMode,
    sectionAxis, sectionConstant, diseaseCompare, flyToRef,
    hideLabelsState, layerVisibility, imagingSlice, imagingModality,
  ]);

  const toolbarModes: { label: string; mode: ViewerMode }[] = [
    { label: 'Exploded View', mode: 'exploded' },
    { label: 'Sectional View', mode: 'sectional' },
    { label: 'Imaging Sync', mode: 'imaging' },
    { label: 'Disease Compare', mode: 'disease' },
  ];

  return (
    <AnatomyProvider value={contextValue}>
      <div style={{
        position: 'relative', height: quizMode ? 480 : 600,
        borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${accentColor}28`,
        boxShadow: `0 0 60px ${accentColor}12, inset 0 0 30px rgba(0,0,0,0.3)`,
        background: '#040c18',
      }}>
        {!quizMode && <LayerControls />}
        {!quizMode && <AnatomySearch />}

        {!isFemale && (
          <button
            type="button"
            onClick={() => setIsFemale(v => !v)}
            style={{
              position: 'absolute', top: 16, left: 16, zIndex: 12,
              padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              background: 'rgba(4,12,24,0.8)',
              border: '1px solid rgba(0,229,255,0.12)',
              color: 'rgba(180,220,240,0.75)',
            }}
          >
            ♂ Male
          </button>
        )}
        {isFemale && (
          <button
            type="button"
            onClick={() => setIsFemale(v => !v)}
            style={{
              position: 'absolute', top: 16, left: 16, zIndex: 12,
              padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              background: 'rgba(0,229,255,0.12)',
              border: '1px solid rgba(0,229,255,0.4)',
              color: '#00e5ff',
            }}
          >
            ♀ Female
          </button>
        )}

        <Canvas
          shadows
          camera={{ position: [0, 0.3, 3.5], fov: 42, near: 0.01, far: 1000 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <SceneContent
            onOrganClick={handleOrganClick}
            onBackgroundClick={handleBackgroundClick}
            accentColor={accentColor}
            autoRotate={autoRotate && !selection.selectedOrgan}
          />
        </Canvas>

        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(4,12,24,0.88)', zIndex: 10,
          }}>
            <LoadingDots />
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(180,220,240,0.75)', marginTop: 16 }}>
              Loading anatomy scene…
            </p>
          </div>
        )}

        {!quizMode && (
          <>
            <div style={{
              position: 'absolute', top: 16, right: 16, zIndex: 12,
              display: 'flex', gap: 8,
            }}>
              <button
                type="button"
                onClick={() => setAutoRotate(v => !v)}
                className={autoRotate ? 'btn-cyan' : 'btn-outline'}
                style={{ fontSize: 11, padding: '6px 12px' }}
              >
                {autoRotate ? '⏸ Auto' : '▶ Auto'}
              </button>
            </div>

            <div style={{
              position: 'absolute', bottom: 56, right: 12, zIndex: 12,
              display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end',
            }}>
              {toolbarModes.map(({ label, mode }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (mode === 'exploded') {
                      setExploded(v => !v);
                      setViewerMode(prev => (prev === 'exploded' ? null : 'exploded'));
                    } else {
                      setViewerMode(prev => (prev === mode ? null : mode));
                    }
                  }}
                  className={viewerMode === mode || (mode === 'exploded' && exploded) ? 'btn-cyan' : 'btn-outline'}
                  style={{ fontSize: 10, padding: '5px 10px' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {viewerMode === 'sectional' && (
              <div style={{
                position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)',
                zIndex: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: 'rgba(4,12,24,0.85)', padding: '12px 18px', borderRadius: 12,
                border: '1px solid rgba(0,229,255,0.12)',
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([
                    ['sagittal', 'Sagittal (L/R)'],
                    ['coronal', 'Coronal (F/B)'],
                    ['transverse', 'Transverse (T/B)'],
                  ] as [SectionAxis, string][]).map(([axis, label]) => (
                    <button
                      key={axis}
                      type="button"
                      onClick={() => setSectionAxis(axis)}
                      className={sectionAxis === axis ? 'btn-cyan' : 'btn-outline'}
                      style={{ fontSize: 10, padding: '4px 8px' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={-2}
                  max={2}
                  step={0.01}
                  value={sectionConstant}
                  onChange={e => setSectionConstant(Number(e.target.value))}
                  style={{ width: 240, accentColor: '#00e5ff' }}
                />
              </div>
            )}

            <SystemSwitcher />
            <OrganInfoPanel onDiseaseClick={(organId, disease) => {
              setDiseaseCompare({ organId, disease });
              setViewerMode('disease');
            }} />

            <Suspense fallback={<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 15 }}><LoadingDots /></div>}>
              {viewerMode === 'imaging' && <ImagingSync onClose={() => setViewerMode(null)} />}
              {diseaseCompare && viewerMode === 'disease' && (
                <DiseaseComparison
                  organId={diseaseCompare.organId}
                  disease={diseaseCompare.disease}
                  onClose={() => { setDiseaseCompare(null); setViewerMode(null); }}
                />
              )}
            </Suspense>

            <VoiceAssistant onToast={() => {}} />
          </>
        )}
      </div>
    </AnatomyProvider>
  );
};

export default AnatomyCanvas;
