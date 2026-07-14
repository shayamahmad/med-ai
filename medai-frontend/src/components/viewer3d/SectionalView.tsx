import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SectionAxis } from './types/anatomy.types';
import { useAnatomy } from './AnatomyContext';

const AXIS_NORMALS: Record<SectionAxis, THREE.Vector3> = {
  sagittal: new THREE.Vector3(1, 0, 0),
  coronal: new THREE.Vector3(0, 0, 1),
  transverse: new THREE.Vector3(0, 1, 0),
};

const SectionalViewController: React.FC = () => {
  const { viewerMode, sectionAxis, sectionConstant } = useAnatomy();
  const { gl, scene } = useThree();
  const active = viewerMode === 'sectional';

  useEffect(() => {
    const plane = new THREE.Plane(AXIS_NORMALS[sectionAxis].clone(), sectionConstant);

    gl.localClippingEnabled = active;

    scene.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(mat => {
          const m = mat as THREE.MeshStandardMaterial;
          m.clippingPlanes = active ? [plane] : [];
          m.needsUpdate = true;
        });
      }
    });

    return () => {
      gl.localClippingEnabled = false;
      scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(mat => {
            (mat as THREE.MeshStandardMaterial).clippingPlanes = [];
          });
        }
      });
    };
  }, [active, sectionAxis, sectionConstant, gl, scene]);

  return null;
};

export default SectionalViewController;
