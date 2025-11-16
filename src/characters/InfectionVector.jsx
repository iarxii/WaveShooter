// src/characters/InfectionVector.jsx
// Factory for Infection Vector enemies based on roster data

import React from 'react';
import { createGroupedMeshes } from './ProceduralUtils';

export function InfectionVector({ enemyData, ...props }) {
  if (!enemyData) return null;

  const { name, shape, color, stats, vfx, specId } = enemyData;

  // For now, use grouped meshes; later integrate with CreatureFactory if available
  const mesh = createGroupedMeshes({ shape: 'Model', color, radius: 2 }); // Larger for bosses

  return <primitive object={mesh} />;
}