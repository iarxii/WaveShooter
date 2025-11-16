import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ParticlesExample() {
  const pointsRef = useRef();

  const particleCount = 1000;

  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  const colors = useMemo(() => {
    const colors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random();
      colors[i * 3 + 2] = Math.random();
    }
    return colors;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.elapsedTime;
      const positions = pointsRef.current.geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] += Math.sin(time + i) * 0.01;
        positions[i3 + 1] += Math.cos(time + i) * 0.01;
        positions[i3 + 2] += Math.sin(time * 0.5 + i) * 0.01;
      }

      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.rotation.y += 0.005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        alphaTest={0.5}
      />
    </points>
  );
}