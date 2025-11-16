import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function FlockingExample() {
  const groupRef = useRef();

  const birdCount = 50;
  const birds = useMemo(() => {
    return Array.from({ length: birdCount }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ),
      phase: Math.random() * Math.PI * 2
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;

      birds.forEach((bird, index) => {
        // Simple flocking-like behavior - move in waves
        const speed = 0.02;
        const amplitude = 2;

        bird.phase += speed;
        bird.position.x += Math.sin(bird.phase + index) * 0.01;
        bird.position.y += Math.cos(bird.phase * 0.7 + index) * 0.01;
        bird.position.z += Math.sin(bird.phase * 0.3 + index * 0.5) * 0.01;

        // Keep birds within bounds
        if (Math.abs(bird.position.x) > 10) bird.position.x *= -0.9;
        if (Math.abs(bird.position.y) > 10) bird.position.y *= -0.9;
        if (Math.abs(bird.position.z) > 10) bird.position.z *= -0.9;

        // Update the mesh position
        const mesh = groupRef.current.children[index];
        if (mesh) {
          mesh.position.copy(bird.position);
          mesh.rotation.y = bird.phase;
          mesh.rotation.x = Math.sin(bird.phase * 2) * 0.3;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      {birds.map((bird, index) => (
        <mesh key={index} position={bird.position}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshPhongMaterial color={new THREE.Color().setHSL(index / birdCount, 0.7, 0.6)} />
        </mesh>
      ))}
    </group>
  );
}