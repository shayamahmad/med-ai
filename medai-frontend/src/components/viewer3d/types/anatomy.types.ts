export interface SubStructure {
  id: string;
  label: string;
  description: string;
}

export interface DiseaseEntry {
  name: string;
  symptoms: string[];
  riskFactors: string[];
  treatments: string[];
  materialColorOverride: string;
}

export type LayerName =
  | 'skin_layer'
  | 'muscle_layer'
  | 'vessel_layer'
  | 'nerve_layer'
  | 'bone_layer'
  | 'organ_system_layer'
  | 'organ';

export interface OrganData {
  id: string;
  label: string;
  file: string;
  color: string;
  system: string;
  shortInfo: string;
  location: string;
  physiologicalFunction: string;
  diseases: DiseaseEntry[];
  subStructures: SubStructure[];
  explodeOffset: [number, number, number];
  restPosition: [number, number, number];
  cameraTarget: [number, number, number];
  imagingSliceRange?: {
    ct?: [number, number];
    mri?: [number, number];
  };
  layerGroup: LayerName;
}

export type AnatomySystem =
  | 'All Systems'
  | 'Cardiovascular'
  | 'Cardiorespiratory'
  | 'Respiratory'
  | 'Nervous'
  | 'Digestive'
  | 'Urinary'
  | 'Muscular'
  | 'Reproductive';

export type ViewerMode = 'exploded' | 'sectional' | 'imaging' | 'disease' | null;

export type SectionAxis = 'sagittal' | 'coronal' | 'transverse';

export interface OrganSelectionState {
  selectedOrgan: string | null;
  selectedSubStructure: string | null;
  activeSystem: AnatomySystem;
  viewerMode: ViewerMode;
  isFemale: boolean;
  autoRotate: boolean;
  exploded: boolean;
  diseaseCompare: { organId: string; disease: DiseaseEntry } | null;
}
