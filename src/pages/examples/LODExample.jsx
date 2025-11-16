import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function LODExample() {
  const groupRef = useRef();

  // Create LOD objects with different detail levels
  const lods = useMemo(() => {
    const lodObjects = [];
    const positions = [];

    for (let i = 0; i < 20; i++) {
      // Create random positions in a sphere
      const radius = 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions.push({ x, y, z });
    }

    positions.forEach((pos, index) => {
      const lod = new THREE.LOD();

      // High detail (close) - high poly icosahedron
      const highDetail = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 3),
        new THREE.MeshPhongMaterial({ color: 0xff6b6b, wireframe: false })
      );
      lod.addLevel(highDetail, 0);

      // Medium detail - medium poly
      const mediumDetail = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 2),
        new THREE.MeshPhongMaterial({ color: 0x4ecdc4, wireframe: false })
      );
      lod.addLevel(mediumDetail, 5);

      // Low detail (far) - low poly
      const lowDetail = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.5, 1),
        new THREE.MeshPhongMaterial({ color: 0x45b7d1, wireframe: false })
      );
      lod.addLevel(lowDetail, 10);

      // Very low detail (very far) - just a box
      const veryLowDetail = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshPhongMaterial({ color: 0x96ceb4, wireframe: false })
      );
      lod.addLevel(veryLowDetail, 15);

      lod.position.set(pos.x, pos.y, pos.z);
      lodObjects.push(lod);
    });

    return lodObjects;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      groupRef.current.rotation.y += 0.002;

      // Update LOD for each object based on camera distance
      lods.forEach((lod, index) => {
        const offset = index * 0.1;
        lod.rotation.x = time * 0.5 + offset;
        lod.rotation.z = time * 0.3 + offset;
        lod.update(state.camera);
      });
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      {lods.map((lod, index) => (
        <primitive key={index} object={lod} />
      ))}
    </group>
  );
}