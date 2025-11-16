import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function GeometryExample() {
  const groupRef = useRef();

  const geometries = [
    { geometry: new THREE.BoxGeometry(1, 1, 1), position: [-2, 0, 0], color: 0xff0000 },
    { geometry: new THREE.SphereGeometry(0.5, 32, 32), position: [0, 0, 0], color: 0x00ff00 },
    { geometry: new THREE.CylinderGeometry(0.5, 0.5, 1, 32), position: [2, 0, 0], color: 0x0000ff },
    { geometry: new THREE.TorusGeometry(0.5, 0.2, 16, 100), position: [0, 2, 0], color: 0xffff00 },
    { geometry: new THREE.OctahedronGeometry(0.5), position: [0, -2, 0], color: 0xff00ff },
  ];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.children.forEach((child, index) => {
        child.rotation.x += 0.01 * (index + 1);
        child.rotation.z += 0.005 * (index + 1);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {geometries.map((item, index) => (
        <mesh key={index} geometry={item.geometry} position={item.position}>
          <meshPhongMaterial color={item.color} />
        </mesh>
      ))}
    </group>
  );
}