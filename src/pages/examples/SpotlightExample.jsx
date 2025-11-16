import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Player from '../../entities/Player.jsx';

export function SpotlightExample() {
  const spotLightRef = useRef();
  const cubeRef = useRef();

  // Create geometry and materials
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const material = useMemo(() => new THREE.MeshPhongMaterial({ color: 0x808080 }), []);

  // Create floor
  const floorGeometry = useMemo(() => new THREE.PlaneGeometry(10, 10), []);
  const floorMaterial = useMemo(() => new THREE.MeshPhongMaterial({ color: 0x404040 }), []);

  useFrame((state) => {
    if (spotLightRef.current) {
      // Move the spotlight in a circle
      const time = state.clock.elapsedTime;
      spotLightRef.current.position.x = Math.sin(time) * 3;
      spotLightRef.current.position.z = Math.cos(time) * 3;
    }

    if (cubeRef.current) {
      // Rotate the cube
      cubeRef.current.rotation.x += 0.01;
      cubeRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group>
      {/* Ambient light */}
      <ambientLight intensity={0.2} />

      {/* Spotlight */}
      <spotLight
        ref={spotLightRef}
        position={[0, 5, 0]}
        angle={Math.PI / 6}
        penumbra={0.5}
        intensity={100}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Cube */}
      <mesh ref={cubeRef} geometry={geometry} material={material} position={[0, 0.5, 0]} castShadow />

      {/* Floor */}
      <mesh
        geometry={floorGeometry}
        material={floorMaterial}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />

      {/* Player character for testing */}
      <Player
        position={[2, 0.5, 2]}
        onShoot={() => {}}
        isPaused={false}
        autoFire={false}
        setPositionRef={() => {}}
        heroName={'Dokta'}
        heroRenderMode={'model'}
      />
    </group>
  );
}