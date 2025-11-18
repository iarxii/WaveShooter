import React, { useEffect, useState } from 'react';
import SpriteSheetAnimator from './SpriteSheetAnimator';

type EffectMetadata = {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  sheetWidth: number;
  sheetHeight: number;
  frameRate: number;
};

type HeroEffectProps = {
  effectName: string; // e.g., 'blue_glowing_orb'
  scale?: number;
  loop?: boolean;
};

export default function HeroEffect({ effectName, scale = 1, loop = true }: HeroEffectProps) {
  const [metadata, setMetadata] = useState<EffectMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load metadata
    fetch(`/effects/metadata/${effectName}_metadata.json`)
      .then(res => res.json())
      .then(setMetadata)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [effectName]);

  if (loading || !metadata) {
    return <div>Loading effect...</div>;
  }

  const spriteSheetUrl = `/effects/spritesheets/${effectName}_spritesheet.png`;

  return (
    <SpriteSheetAnimator
      spriteSheetUrl={spriteSheetUrl}
      frameCount={metadata.frameCount}
      frameRate={1 / metadata.frameRate} // Convert to frames per second
      width={metadata.frameWidth * scale / 100} // Scale down for scene units
      height={metadata.frameHeight * scale / 100}
      loop={loop}
    />
  );
}