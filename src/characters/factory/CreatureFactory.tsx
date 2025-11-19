import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useFBX } from '@react-three/drei';
import { CreatureMeshBuilder } from './CreatureMeshBuilder';
import { MaterialPool } from './MaterialPool';
import { CreatureMeshSpec } from './CreatureSpec';

// Model cache for performance optimization
const modelCache = new Map<string, any>();

interface CreatureFromSpecProps {
  spec: CreatureMeshSpec;
}

export function CreatureFromSpec({ spec }: CreatureFromSpecProps) {
  const meshRef = React.useRef<THREE.Group>(null);

  // Determine model type and load accordingly
  const isFBX = spec.modelUrl && spec.modelUrl.toLowerCase().endsWith('.fbx');
  const isGLB = spec.modelUrl && (spec.modelUrl.toLowerCase().endsWith('.glb') || spec.modelUrl.toLowerCase().endsWith('.gltf'));
  
  const gltf = isGLB ? useGLTF(spec.modelUrl) : null;
  const fbx = isFBX ? useFBX(spec.modelUrl) : null;

  const geometry = React.useMemo(() => {
    if (spec.modelUrl) return null; // Use model
    const builder = new CreatureMeshBuilder(spec);
    const geom = builder.build();
    console.log('Creature geometry vertices:', geom.attributes.position.count);
    return geom;
  }, [spec]);

  const material = React.useMemo(() => {
    if (spec.modelUrl) return null; // Use model materials
    // For legacy specs without modelUrl, they should have baseColor
    const bodyColor = (spec as any).baseColor || spec.colors?.body || '#ff0000';
    return MaterialPool.getStandardMaterial(bodyColor);
  }, [spec.modelUrl, (spec as any).baseColor, spec.colors?.body]);

  // Basic animation
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      // Only apply spin rotation to procedural creatures, not models
      if (!spec.modelUrl) {
        meshRef.current.rotation.y += spec.animation.spin;
        // For procedural, apply breathe
        meshRef.current.scale.setScalar(1 + Math.sin(time * 2) * spec.animation.breathe);
      }
    }
  });

  if (isGLB && gltf) {
    return (
      <group ref={meshRef} scale={[0.5, 0.5, 0.5]}>
        <primitive object={gltf.scene} />
      </group>
    );
  }

  if (isFBX && fbx) {
    // Scale down FBX models significantly as they tend to be large
    const scale = spec.modelUrl.includes('cockroach') ? 0.01 : 0.1;
    
    // Override materials to ensure opacity for cockroach
    React.useEffect(() => {
      if (spec.modelUrl.includes('cockroach') && fbx) {
        fbx.traverse((child: any) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => {
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.alphaTest = 0.1;
              });
            } else {
              (child.material as any).transparent = false;
              (child.material as any).opacity = 1.0;
              (child.material as any).alphaTest = 0.1;
            }
          }
        });
      }
    }, [fbx, spec.modelUrl]);
    
    return (
      <group ref={meshRef} scale={[scale, scale, scale]}>
        <primitive object={fbx} />
      </group>
    );
  }

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}