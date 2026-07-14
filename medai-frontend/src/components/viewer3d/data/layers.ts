import { LayerName } from '../types/anatomy.types';

export interface LayerDefinition {
  id: LayerName | 'organ';
  label: string;
  meshGroupName: string;
  defaultVisible: boolean;
}

export const LAYERS: LayerDefinition[] = [
  { id: 'skin_layer', label: 'Skin', meshGroupName: 'skin_layer', defaultVisible: true },
  { id: 'muscle_layer', label: 'Muscles', meshGroupName: 'muscle_layer', defaultVisible: true },
  { id: 'vessel_layer', label: 'Blood Vessels', meshGroupName: 'vessel_layer', defaultVisible: true },
  { id: 'nerve_layer', label: 'Nerves', meshGroupName: 'nerve_layer', defaultVisible: true },
  { id: 'bone_layer', label: 'Bones', meshGroupName: 'bone_layer', defaultVisible: true },
  { id: 'organ_system_layer', label: 'Organ Systems', meshGroupName: 'organ_system_layer', defaultVisible: true },
  { id: 'organ', label: 'Individual Organs', meshGroupName: 'organ', defaultVisible: true },
];
