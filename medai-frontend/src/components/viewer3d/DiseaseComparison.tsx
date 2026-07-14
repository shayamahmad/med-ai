import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getOrganById } from './data/organs';
import { DiseaseEntry } from './types/anatomy.types';

interface DiseaseComparisonProps {
  organId: string;
  disease: DiseaseEntry;
  onClose: () => void;
}

function scaleModel(scene: THREE.Object3D): THREE.Object3D {
  const clone = scene.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2.0 / maxDim;
  clone.scale.setScalar(scale);
  clone.position.sub(center.multiplyScalar(scale));
  return clone;
}

const HealthyModel: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.clear();
    ref.current.add(scaleModel(scene));
  }, [scene]);
  return <group ref={ref} />;
};

const DiseasedModel: React.FC<{ url: string; disease: DiseaseEntry }> = ({ url, disease }) => {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.clear();
    const clone = scaleModel(scene);
    clone.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.color.set(disease.materialColorOverride);
        mat.emissive.set(disease.materialColorOverride);
        mat.emissiveIntensity = 0.15;
      }
    });
    ref.current.add(clone);
  }, [scene, disease]);
  return <group ref={ref} />;
};

const DiseaseComparison: React.FC<DiseaseComparisonProps> = ({ organId, disease, onClose }) => {
  const organ = getOrganById(organId);
  if (!organ) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 25,
      background: 'rgba(4,12,24,0.95)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2px 1fr', height: '100%' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', top: 12, left: 12, zIndex: 5,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#00e676',
              letterSpacing: '0.1em',
            }}>
              HEALTHY
            </span>
            <Canvas camera={{ position: [0, 0, 3], fov: 42 }} style={{ height: '100%' }}>
              <ambientLight intensity={2.5} />
              <directionalLight position={[5, 8, 7]} intensity={4} />
              <HealthyModel url={organ.file} />
              <OrbitControls enableDamping />
            </Canvas>
          </div>
          <div style={{ background: 'rgba(0,229,255,0.2)' }} />
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', top: 12, left: 12, zIndex: 5,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: disease.materialColorOverride,
              letterSpacing: '0.1em',
            }}>
              DISEASED
            </span>
            <Canvas camera={{ position: [0, 0, 3], fov: 42 }} style={{ height: '100%' }}>
              <ambientLight intensity={2.5} />
              <directionalLight position={[5, 8, 7]} intensity={4} />
              <DiseasedModel url={organ.file} disease={disease} />
              <OrbitControls enableDamping />
            </Canvas>
          </div>
        </div>
      </div>

      <div className="glass" style={{
        margin: 16, borderRadius: 14, padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 18,
            color: disease.materialColorOverride, margin: 0,
          }}>
            {disease.name}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(180,220,240,0.75)', margin: '6px 0 0' }}>
            {organ.label} — Symptoms: {disease.symptoms.join(', ')}
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn-outline" style={{ fontSize: 12 }}>
          Close
        </button>
      </div>
    </div>
  );
};

export default DiseaseComparison;
