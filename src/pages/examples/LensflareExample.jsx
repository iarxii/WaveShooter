import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function LensflareExample() {
  const groupRef = useRef();

  // Create some basic geometry for the scene
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const material = useMemo(() => new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 50 }), []);

  // Create lensflare effect (simplified)
  const lensflareGeometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const lensflareMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  }), []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ambient light */}
      <ambientLight intensity={0.2} />

      {/* Directional light with lensflare effect */}
      <directionalLight
        position={[0, -1, 0]}
        intensity={0.5}
        color="#ffffff"
      />

      {/* Point light with lensflare */}
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" />

      {/* Some spheres to light */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material}
          position={[
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
          ]}
          rotation={[
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          ]}
        />
      ))}

      {/* Simplified lensflare elements */}
      <mesh
        geometry={lensflareGeometry}
        material={lensflareMaterial}
        position={[5, 5, 5]}
        scale={[0.5, 0.5, 0.5]}
      />
      <mesh
        geometry={lensflareGeometry}
        material={lensflareMaterial}
        position={[6, 6, 6]}
        scale={[0.3, 0.3, 0.3]}
      />
    </group>
  );
}