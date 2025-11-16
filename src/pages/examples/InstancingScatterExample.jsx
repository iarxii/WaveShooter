import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function InstancingScatterExample() {
  const meshRef = useRef();

  const count = 1000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Create positions for scattered instances
  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < count; i++) {
      // Create a roughly spherical distribution
      const radius = 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      pos.push({ x, y, z });
    }
    return pos;
  }, []);

  // Create colors for instances
  const colors = useMemo(() => {
    const cols = [];
    for (let i = 0; i < count; i++) {
      cols.push(new THREE.Color().setHSL(Math.random(), 0.7, 0.5));
    }
    return cols;
  }, []);

  const geometry = useMemo(() => new THREE.BoxGeometry(0.1, 0.1, 0.1), []);
  const material = useMemo(() => new THREE.MeshPhongMaterial(), []);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;

      // Animate the instances
      positions.forEach((pos, i) => {
        const offset = i * 0.01;
        const scale = 0.5 + Math.sin(time * 2 + offset) * 0.3;

        dummy.position.set(pos.x, pos.y, pos.z);
        dummy.rotation.set(
          time + offset,
          time * 0.7 + offset,
          time * 0.3 + offset
        );
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();

        meshRef.current.setMatrixAt(i, dummy.matrix);
        meshRef.current.setColorAt(i, colors[i]);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, count]}
      />
    </group>
  );
}