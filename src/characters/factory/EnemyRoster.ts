// src/characters/factory/EnemyRoster.ts
import type { AvatarSpec } from './AvatarSpec';

export const EnemyRoster: Record<string, AvatarSpec> = {
  // Example entry for your shared image (see section 7 for tuned values)
  'candida_auris': {
    id:'candida_auris', seed: 3107,
    baseShape:'icosahedron',
    detail: 1,
    radius: 1.0,
    spikeCount: 48, spikeLength: 0.48, spikeRadius: 0.12,
    nodeCount: 5, arcCount: 6,
    baseColor:'#B5764C', spikeColor:'#B5764C', nodeColor:'#FFD24A', arcColor:'#FFE9A3',
    emissive:'#B0774F',
    metalnessCore: 0.25, roughnessCore: 0.85,
    metalnessNodes: 1.0, roughnessNodes: 0.25,
    spin: 0.22, breathe: 0.014, flickerSpeed: 7.5,
    quality:'high'
  },

  // Add more enemy ids here, e.g. 'k_pneumoniae_esbl', 'mrsa', etc.
};