import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function PortalExample() {
  const portalRef = useRef();
  const { scene } = useThree();

  // Create a reflective portal surface
  const portalGeometry = useMemo(() => new THREE.PlaneGeometry(2, 3), []);
  const portalMaterial = useMemo(() => new THREE.MeshPhongMaterial({
    color: 0x444444,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  }), []);

  // Create some objects that appear "through" the portal
  const portalObjects = useMemo(() => {
    const objects = [];
    for (let i = 0; i < 8; i++) {
      objects.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          -2 - Math.random() * 2
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        scale: 0.3 + Math.random() * 0.4,
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6)
      });
    }
    return objects;
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Animate portal objects
    portalObjects.forEach((obj, index) => {
      const mesh = portalRef.current.children[index + 1]; // Skip the portal plane
      if (mesh) {
        mesh.rotation.x += 0.01 * (index + 1);
        mesh.rotation.y += 0.015 * (index + 1);
        mesh.position.z = obj.position.z + Math.sin(time + index) * 0.5;
      }
    });

    // Animate portal material
    if (portalRef.current.children[0]) {
      const portalMesh = portalRef.current.children[0];
      portalMesh.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <group ref={portalRef}>
      {/* Portal frame/background */}
      <mesh geometry={portalGeometry} material={portalMaterial} position={[0, 0, 0]} />

      {/* Objects visible through portal */}
      {portalObjects.map((obj, index) => (
        <mesh
          key={index}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial color={obj.color} />
        </mesh>
      ))}

      {/* Portal frame decoration */}
      <mesh position={[0, 1.6, 0.1]}>
        <torusGeometry args={[1.1, 0.05, 8, 16]} />
        <meshPhongMaterial color={0x888888} />
      </mesh>
      <mesh position={[0, -1.6, 0.1]}>
        <torusGeometry args={[1.1, 0.05, 8, 16]} />
        <meshPhongMaterial color={0x888888} />
      </mesh>
    </group>
  );
}