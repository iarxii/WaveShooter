import React from 'react';
import { InstancingExample } from './InstancingExample';
import { MarchingCubesExample } from './MarchingCubesExample';
import { SpotlightExample } from './SpotlightExample';
import { ParticlesExample } from './ParticlesExample';
import { GeometryExample } from './GeometryExample';
import { MorphSphereExample } from './MorphSphereExample';
import { InstancingScatterExample } from './InstancingScatterExample';
import { LODExample } from './LODExample';
import { FlockingExample } from './FlockingExample';
import { PortalExample } from './PortalExample';
import { VoxelPainterExample } from './VoxelPainterExample';
import { LensflareExample } from './LensflareExample';
import { OceanExample } from './OceanExample';

const EXAMPLES = {
  instancing: InstancingExample,
  marchingcubes: MarchingCubesExample,
  spotlight: SpotlightExample,
  particles: ParticlesExample,
  geometry: GeometryExample,
  morphsphere: MorphSphereExample,
  instancingscatter: InstancingScatterExample,
  lod: LODExample,
  flocking: FlockingExample,
  portal: PortalExample,
  voxelpainter: VoxelPainterExample,
  lensflare: LensflareExample,
  ocean: OceanExample
};

export function CurrentExample({ example, instancingColors, animationSpeed, animationType, shape, gap, particleCount, birdCount, morphSpeed, oceanElevation, oceanAzimuth, oceanDistortion }) {
  if (example === 'none') {
    return null;
  }
  const Component = EXAMPLES[example] || EXAMPLES.instancing;
  if (example === 'instancing') {
    return <Component colors={instancingColors} speed={animationSpeed} animationType={animationType} shape={shape} gap={gap} />;
  }
  if (example === 'particles') {
    return <Component particleCount={particleCount} />;
  }
  if (example === 'flocking') {
    return <Component birdCount={birdCount} />;
  }
  if (example === 'morphsphere') {
    return <Component morphSpeed={morphSpeed} />;
  }
  if (example === 'ocean') {
    return <Component elevation={oceanElevation} azimuth={oceanAzimuth} distortionScale={oceanDistortion} />;
  }
  return <Component />;
}