import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { CreatureMeshBuilder } from './CreatureMeshBuilder';
import { MaterialPool } from './MaterialPool';
import { CreatureMeshSpec } from './CreatureSpec';

interface CreatureFromSpecProps {
  spec: CreatureMeshSpec;
}

export function CreatureFromSpec({ spec }: CreatureFromSpecProps) {
  const meshRef = React.useRef<THREE.Group>(null);

  // If modelUrl is provided, load GLB
  const gltf = spec.modelUrl ? useGLTF(spec.modelUrl) : null;

  const geometry = React.useMemo(() => {
    if (spec.modelUrl) return null; // Use GLB
    const builder = new CreatureMeshBuilder(spec);
    const geom = builder.build();
    console.log('Creature geometry vertices:', geom.attributes.position.count);
    return geom;
  }, [spec]);

  const material = React.useMemo(() => {
    if (spec.modelUrl) return null; // Use GLB materials
    return MaterialPool.getStandardMaterial(spec.colors.body);
  }, [spec.colors.body]);

  // Basic animation
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.rotation.y += spec.animation.spin;
      if (!spec.modelUrl) {
        // For procedural, apply breathe
        meshRef.current.scale.setScalar(1 + Math.sin(time * 2) * spec.animation.breathe);
      }
    }
  });

  if (spec.modelUrl && gltf) {
    return (
      <group ref={meshRef}>
        <primitive object={gltf.scene} />
      </group>
    );
  }

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}