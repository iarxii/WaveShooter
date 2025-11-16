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
  portal: PortalExample
};

export function CurrentExample({ example, instancingColors, animationSpeed, animationType, shape, gap }) {
  const Component = EXAMPLES[example] || EXAMPLES.instancing;
  if (example === 'instancing') {
    return <Component colors={instancingColors} speed={animationSpeed} animationType={animationType} shape={shape} gap={gap} />;
  }
  return <Component />;
}