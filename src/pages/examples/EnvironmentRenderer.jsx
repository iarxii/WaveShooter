import React, { Suspense } from 'react';
import { Environment as DreiEnvironment } from '@react-three/drei';
import { ENVIRONMENTS, getEnvById } from '../../environments/environments';
import WorldSky from '../../environments/WorldSky';
import { InstancingExample } from './InstancingExample';
import { OceanExample } from './OceanExample';

/**
 * @param {Object} props
 * @param {string} props.environmentId
 * @param {Array} props.instancingColors
 * @param {number} props.animationSpeed
 * @param {string} props.animationType
 * @param {string} props.shape
 * @param {number} props.gap
 * @param {number} props.oceanElevation
 * @param {number} props.oceanAzimuth
 * @param {number} props.oceanDistortion
 */
export function EnvironmentRenderer({ environmentId, instancingColors, animationSpeed, animationType, shape, gap, oceanElevation, oceanAzimuth, oceanDistortion }) {
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

  if (env.type === 'dynamic') {
    return (
      <>
        <ambientLight
          color={env.ambient?.color || '#ffffff'}
          intensity={env.ambient?.intensity || 0.3}
        />
        {env.id === 'instance_dynamic' && <InstancingExample colors={instancingColors} speed={animationSpeed} animationType={animationType} shape={shape} gap={gap} />}
        {env.id === 'ocean' && <OceanExample elevation={oceanElevation} azimuth={oceanAzimuth} distortionScale={oceanDistortion} />}
      </>
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