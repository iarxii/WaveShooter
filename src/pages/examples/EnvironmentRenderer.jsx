import React, { Suspense } from 'react';
import { Environment as DreiEnvironment } from '@react-three/drei';
import { ENVIRONMENTS, getEnvById } from '../../environments/environments';
import WorldSky from '../../environments/WorldSky';

/**
 * @param {Object} props
 * @param {string} props.environmentId
 */
export function EnvironmentRenderer({ environmentId }) {
  const env = getEnvById(environmentId);

  // Apply fog settings
  React.useEffect(() => {
    if (!env.fog || !env.fog.enabled) {
      // Clear fog if not enabled
      return;
    }

    // Note: In a real implementation, we'd need access to the scene
    // For now, we'll just handle the basic environment rendering
  }, [env]);

  // Handle different environment types
  if (env.type === 'hdri' && env.hdri) {
    return (
      <Suspense fallback={null}>
        <DreiEnvironment
          files={env.hdri}
          background={!!env.background}
          frames={1}
          resolution={256}
        />
      </Suspense>
    );
  }

  if (env.type === 'procedural') {
    // Use procedural sky for procedural environments
    return (
      <WorldSky
        sunY={0.5}
        infectionInfluence={0}
        infectionColor={env?.arenaColors?.telegraph || '#ffcc00'}
      />
    );
  }

  // For whitebox or other types, just return ambient lighting
  return (
    <ambientLight
      color={env.ambient?.color || '#ffffff'}
      intensity={env.ambient?.intensity || 0.3}
    />
  );
}