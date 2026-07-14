import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ORGANS } from '../data/organs';
import { AnatomySystem } from '../types/anatomy.types';

const DEFAULT_OPACITY = 1;
const DIM_OPACITY = 0.12;
const SYSTEM_DIM_OPACITY = 0.04;

export function useOrganSelection() {
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const [selectedSubStructure, setSelectedSubStructure] = useState<string | null>(null);
  const [activeSystem, setActiveSystem] = useState<AnatomySystem>('All Systems');
  const meshRefs = useRef<Map<string, THREE.Object3D>>(new Map());

  const registerMesh = useCallback((organId: string, object: THREE.Object3D) => {
    meshRefs.current.set(organId, object);
  }, []);

  const unregisterMesh = useCallback((organId: string) => {
    meshRefs.current.delete(organId);
  }, []);

  const applyOpacity = useCallback((object: THREE.Object3D, opacity: number) => {
    object.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          const m = mat as THREE.MeshStandardMaterial;
          m.transparent = opacity < 1;
          m.opacity = opacity;
          m.needsUpdate = true;
        });
      }
    });
  }, []);

  const applyEmissive = useCallback((object: THREE.Object3D, color: string | null, intensity = 0.3) => {
    object.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          const m = mat as THREE.MeshStandardMaterial;
          if (color) {
            m.emissive = new THREE.Color(color);
            m.emissiveIntensity = intensity;
          } else {
            m.emissive = new THREE.Color(0x000000);
            m.emissiveIntensity = 0;
          }
          m.needsUpdate = true;
        });
      }
    });
  }, []);

  const updateVisuals = useCallback(
    (organId: string | null, system: AnatomySystem) => {
      meshRefs.current.forEach((object, id) => {
        const organ = ORGANS.find(o => o.id === id);
        if (!organ) return;

        if (organId) {
          if (id === organId) {
            applyOpacity(object, DEFAULT_OPACITY);
            applyEmissive(object, organ.color, 0.3);
          } else {
            applyOpacity(object, DIM_OPACITY);
            applyEmissive(object, null);
          }
        } else if (system !== 'All Systems') {
          const inSystem = organ.system === system
            || (system === 'Cardiovascular' && organ.system === 'Cardiorespiratory')
            || (system === 'Respiratory' && (organ.system === 'Cardiorespiratory' || organ.id === 'human_heart_and_lungs'));
          applyOpacity(object, inSystem ? DEFAULT_OPACITY : SYSTEM_DIM_OPACITY);
          applyEmissive(object, null);
        } else {
          applyOpacity(object, DEFAULT_OPACITY);
          applyEmissive(object, null);
        }
      });
    },
    [applyEmissive, applyOpacity],
  );

  const selectOrgan = useCallback(
    (organId: string | null, subStructureId?: string | null) => {
      setSelectedOrgan(organId);
      setSelectedSubStructure(subStructureId ?? null);
      updateVisuals(organId, activeSystem);
    },
    [activeSystem, updateVisuals],
  );

  const clearSelection = useCallback(() => {
    setSelectedOrgan(null);
    setSelectedSubStructure(null);
    updateVisuals(null, activeSystem);
  }, [activeSystem, updateVisuals]);

  const setSystem = useCallback(
    (system: AnatomySystem) => {
      setActiveSystem(system);
      setSelectedOrgan(null);
      setSelectedSubStructure(null);
      updateVisuals(null, system);
    },
    [updateVisuals],
  );

  const highlightOrganEmissive = useCallback(
    (organId: string, intensity = 0.5) => {
      const object = meshRefs.current.get(organId);
      const organ = ORGANS.find(o => o.id === organId);
      if (object && organ) applyEmissive(object, organ.color, intensity);
    },
    [applyEmissive],
  );

  const getMesh = useCallback((organId: string) => meshRefs.current.get(organId), []);

  return useMemo(() => ({
    selectedOrgan,
    selectedSubStructure,
    activeSystem,
    selectOrgan,
    clearSelection,
    setSystem,
    registerMesh,
    unregisterMesh,
    highlightOrganEmissive,
    getMesh,
    updateVisuals,
    applyOpacity,
    applyEmissive,
  }), [
    selectedOrgan,
    selectedSubStructure,
    activeSystem,
    selectOrgan,
    clearSelection,
    setSystem,
    registerMesh,
    unregisterMesh,
    highlightOrganEmissive,
    getMesh,
    updateVisuals,
    applyOpacity,
    applyEmissive,
  ]);
}
