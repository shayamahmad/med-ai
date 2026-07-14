import { useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { getOrganById } from '../data/organs';

const DEFAULT_CAMERA: [number, number, number] = [0, 0.3, 3.5];
const DEFAULT_LOOK_AT: [number, number, number] = [0, 0.2, 0];

export function useAnatomyCamera() {
  const { camera } = useThree();
  const animRef = useRef<gsap.core.Tween | null>(null);

  const flyTo = useCallback(
    (organId: string | null, onComplete?: () => void) => {
      if (animRef.current) animRef.current.kill();

      let targetPos: [number, number, number] = DEFAULT_CAMERA;
      let lookAt: [number, number, number] = DEFAULT_LOOK_AT;

      if (organId) {
        const organ = getOrganById(organId);
        if (organ) {
          const [tx, ty, tz] = organ.cameraTarget;
          targetPos = [tx, ty, tz + 1.5];
          lookAt = organ.restPosition;
        }
      }

      const lookTarget = new THREE.Vector3(...lookAt);

      animRef.current = gsap.to(camera.position, {
        duration: 1.1,
        ease: 'power3.inOut',
        x: targetPos[0],
        y: targetPos[1],
        z: targetPos[2],
        onUpdate: () => {
          camera.lookAt(lookTarget);
        },
        onComplete,
      });
    },
    [camera],
  );

  const resetCamera = useCallback(
    (onComplete?: () => void) => {
      flyTo(null, onComplete);
    },
    [flyTo],
  );

  return { flyTo, resetCamera, DEFAULT_CAMERA };
}
