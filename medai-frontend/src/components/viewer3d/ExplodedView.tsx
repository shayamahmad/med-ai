import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { ORGANS } from './data/organs';
import { useAnatomy } from './AnatomyContext';

const ExplodedViewController: React.FC = () => {
  const { exploded } = useAnatomy();
  const { scene } = useThree();
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    const tl = gsap.timeline();
    ORGANS.forEach(organ => {
      const mesh = scene.getObjectByName(organ.id);
      if (!mesh) return;
      const rest = (mesh.userData.restPosition as [number, number, number]) ?? organ.restPosition;
      const [rx, ry, rz] = rest;
      const [ex, ey, ez] = organ.explodeOffset;

      if (exploded) {
        tl.to(mesh.position, {
          x: rx + ex,
          y: ry + ey,
          z: rz + ez,
          duration: 1.4,
          ease: 'expo.inOut',
        }, 0);
      } else {
        tl.to(mesh.position, {
          x: rx,
          y: ry,
          z: rz,
          duration: 1.4,
          ease: 'expo.inOut',
        }, 0);
      }
    });

    timelineRef.current = tl;
    return () => { timelineRef.current?.kill(); };
  }, [exploded, scene]);

  return null;
};

export default ExplodedViewController;
