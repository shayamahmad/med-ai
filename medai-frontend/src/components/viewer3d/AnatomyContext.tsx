import React, { createContext, useContext, useRef } from 'react';
import { DiseaseEntry, SectionAxis, ViewerMode } from './types/anatomy.types';
import { useOrganSelection } from './hooks/useOrganSelection';

export interface AnatomyContextValue {
  selection: ReturnType<typeof useOrganSelection>;
  autoRotate: boolean;
  setAutoRotate: (v: boolean) => void;
  isFemale: boolean;
  setIsFemale: (v: boolean) => void;
  exploded: boolean;
  setExploded: React.Dispatch<React.SetStateAction<boolean>>;
  viewerMode: ViewerMode;
  setViewerMode: (m: ViewerMode) => void;
  sectionAxis: SectionAxis;
  setSectionAxis: (a: SectionAxis) => void;
  sectionConstant: number;
  setSectionConstant: (n: number) => void;
  diseaseCompare: { organId: string; disease: DiseaseEntry } | null;
  setDiseaseCompare: (d: { organId: string; disease: DiseaseEntry } | null) => void;
  flyToRef: React.MutableRefObject<((organId: string | null) => void) | null>;
  hideLabels: boolean;
  setHideLabels: (v: boolean) => void;
  layerVisibility: Record<string, boolean>;
  setLayerVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  imagingSlice: number;
  setImagingSlice: (n: number) => void;
  imagingModality: 'ct' | 'mri' | 'xray';
  setImagingModality: (m: 'ct' | 'mri' | 'xray') => void;
}

const AnatomyContext = createContext<AnatomyContextValue | null>(null);

export function useAnatomy(): AnatomyContextValue {
  const ctx = useContext(AnatomyContext);
  if (!ctx) throw new Error('useAnatomy must be used within AnatomyProvider');
  return ctx;
}

interface ProviderProps {
  value: AnatomyContextValue;
  children: React.ReactNode;
}

export function AnatomyProvider({ value, children }: ProviderProps) {
  return <AnatomyContext.Provider value={value}>{children}</AnatomyContext.Provider>;
}

export function useFlyToRef() {
  return useRef<((organId: string | null) => void) | null>(null);
}
