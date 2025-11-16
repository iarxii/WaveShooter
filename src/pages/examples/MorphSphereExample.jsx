import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function MorphSphereExample() {
  const meshRef = useRef();

  // Create base sphere geometry
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 32, 32);

    // Create morph targets
    const positions = geo.attributes.position.array;
    const morphPositions = [];

    // First morph target - squished sphere
    const morph1 = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      morph1[i] = positions[i] * 1.5;     // x
      morph1[i + 1] = positions[i + 1] * 0.5; // y
      morph1[i + 2] = positions[i + 2] * 1.5; // z
    }
    morphPositions.push(morph1);

    // Second morph target - twisted sphere
    const morph2 = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const angle = Math.atan2(z, x);
      const radius = Math.sqrt(x * x + z * z);

      morph2[i] = Math.cos(angle + y) * radius;
      morph2[i + 1] = y;
      morph2[i + 2] = Math.sin(angle + y) * radius;
    }
    morphPositions.push(morph2);

    // Add morph targets to geometry
    geo.morphAttributes.position = morphPositions.map(pos => new THREE.BufferAttribute(pos, 3));

    return geo;
  }, []);

  const material = useMemo(() => new THREE.MeshPhongMaterial({
    color: 0x00ff88,
    shininess: 100,
    morphTargets: true
  }), []);

  useFrame((state) => {
    if (meshRef.current && meshRef.current.morphTargetInfluences) {
      const time = state.clock.elapsedTime;

      // Animate morph target influences
      meshRef.current.morphTargetInfluences[0] = Math.sin(time) * 0.5 + 0.5;
      meshRef.current.morphTargetInfluences[1] = Math.cos(time * 0.7) * 0.5 + 0.5;

      // Rotate the sphere
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}