import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';

type SpriteSheetAnimatorProps = {
  spriteSheetUrl: string;
  frameCount: number;
  frameRate?: number; // frames per second
  width?: number;
  height?: number;
  loop?: boolean;
  onComplete?: () => void;
};

export default function SpriteSheetAnimator({
  spriteSheetUrl,
  frameCount,
  frameRate = 30,
  width = 1,
  height = 1,
  loop = true,
  onComplete
}: SpriteSheetAnimatorProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Load the texture
  const texture = useLoader(THREE.TextureLoader, spriteSheetUrl);

  // Set texture properties for sprite sheet
  useMemo(() => {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Animation state
  const frameTime = 1 / frameRate;
  const currentFrame = useRef(0);
  const elapsedTime = useRef(0);
  const completed = useRef(false);

  useFrame((state, delta) => {
    if (!materialRef.current || completed.current) return;

    elapsedTime.current += delta;

    if (elapsedTime.current >= frameTime) {
      currentFrame.current += Math.floor(elapsedTime.current / frameTime);
      elapsedTime.current = elapsedTime.current % frameTime;

      if (currentFrame.current >= frameCount) {
        if (loop) {
          currentFrame.current = currentFrame.current % frameCount;
        } else {
          currentFrame.current = frameCount - 1;
          completed.current = true;
          onComplete?.();
          return;
        }
      }

      // Update UV offset for horizontal sprite sheet
      const frameWidth = 1 / frameCount;
      materialRef.current.map!.offset.x = currentFrame.current * frameWidth;
      materialRef.current.map!.repeat.x = frameWidth;
    }
  });

  return (
    <mesh ref={meshRef} scale={[width, height, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}