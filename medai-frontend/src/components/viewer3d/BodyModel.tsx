import React, { Suspense } from 'react';
import { ORGANS } from './data/organs';
import OrganMesh from './OrganMesh';

interface BodyModelProps {
  onOrganClick: (organId: string) => void;
}

const BodyModel: React.FC<BodyModelProps> = ({ onOrganClick }) => (
  <group name="body_model">
    {ORGANS.map(organ => (
      <Suspense key={organ.id} fallback={null}>
        <OrganMesh organ={organ} onClick={onOrganClick} />
      </Suspense>
    ))}
  </group>
);

export default BodyModel;
