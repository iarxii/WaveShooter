// src/characters/SupportVector.jsx
// Factory for Support Vector allies based on roster data

import React from 'react';
import { createGroupedMeshes } from './ProceduralUtils';

export function SupportVector({ enemyData, ...props }) {
  if (!enemyData) return null;

  const { name, shape, color, stats, vfx, specId } = enemyData;

  // Allies are non-hostile; use grouped meshes
  const mesh = createGroupedMeshes({ shape: 'Model', color, radius: 1 });

  return <primitive object={mesh} />;
}