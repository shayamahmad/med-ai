import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { OrganData } from './types/anatomy.types';
import { useAnatomy } from './AnatomyContext';

interface OrganMeshProps {
  organ: OrganData;
  onClick: (organId: string) => void;
}

function scaleAndCenter(scene: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 0.8 / maxDim;
  scene.scale.setScalar(scale);
  scene.position.sub(center.multiplyScalar(scale));
}

const OrganMesh: React.FC<OrganMeshProps> = ({ organ, onClick }) => {
  const { scene } = useGLTF(organ.file);
  const groupRef = useRef<THREE.Group>(null);
  const { selection, layerVisibility } = useAnatomy();
  const cloned = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const clone = scene.clone(true);
    scaleAndCenter(clone);
    clone.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.organId = organ.id;
      }
    });
    clone.name = organ.id;
    clone.userData.organId = organ.id;
    group.add(clone);
    cloned.current = clone;
    selection.registerMesh(organ.id, clone);

    const [rx, ry, rz] = organ.restPosition;
    group.position.set(rx, ry, rz);
    group.userData.restPosition = [...organ.restPosition];

    return () => {
      selection.unregisterMesh(organ.id);
      group.remove(clone);
    };
  }, [organ, scene, selection]);

  useEffect(() => {
    if (!groupRef.current) return;
    const visible = layerVisibility.organ !== false;
    groupRef.current.visible = visible;
  }, [layerVisibility]);

  const handleClick = (e: THREE.Event & { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick(organ.id);
  };

  return (
    <group
      ref={groupRef}
      name={organ.id}
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    />
  );
};

export default OrganMesh;
