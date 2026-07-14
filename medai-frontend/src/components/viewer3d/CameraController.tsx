import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { getOrganById } from './data/organs';
import { useAnatomy } from './AnatomyContext';

const DEFAULT_CAMERA: [number, number, number] = [0, 0.3, 3.5];

const CameraController: React.FC = () => {
  const { camera } = useThree();
  const { flyToRef, selection } = useAnatomy();

  useEffect(() => {
    flyToRef.current = (organId: string | null) => {
      let targetPos = DEFAULT_CAMERA;
      const lookAt = { x: 0, y: 0.2, z: 0 };

      if (organId) {
        const organ = getOrganById(organId);
        if (organ) {
          const [tx, ty, tz] = organ.cameraTarget;
          targetPos = [tx, ty, tz + 1.5];
          const [lx, ly, lz] = organ.restPosition;
          lookAt.x = lx;
          lookAt.y = ly;
          lookAt.z = lz;
        }
      }

      gsap.to(camera.position, {
        duration: 1.1,
        ease: 'power3.inOut',
        x: targetPos[0],
        y: targetPos[1],
        z: targetPos[2],
        onUpdate: () => camera.lookAt(lookAt.x, lookAt.y, lookAt.z),
      });
    };
  }, [camera, flyToRef]);

  useEffect(() => {
    if (selection.selectedOrgan) {
      flyToRef.current?.(selection.selectedOrgan);
    }
  }, [selection.selectedOrgan, flyToRef]);

  return null;
};

export default CameraController;
