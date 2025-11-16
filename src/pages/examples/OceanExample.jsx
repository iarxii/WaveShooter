import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';

export function OceanExample({ elevation = 2, azimuth = 180, distortionScale = 3.7 }) {
  const { scene, camera, gl } = useThree();

  const waterGeometry = useMemo(() => new THREE.PlaneGeometry(10000, 10000), []);

  const water = useMemo(() => {
    const waterNormals = new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/waternormals.jpg',
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    );

    const waterObj = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: distortionScale,
      fog: scene.fog !== undefined
    });

    waterObj.rotation.x = -Math.PI / 2;
    return waterObj;
  }, [waterGeometry, distortionScale, scene.fog]);

  useFrame((state) => {
    if (water.material && water.material.uniforms) {
      water.material.uniforms['time'].value += 1.0 / 60.0;
    }
  });

  return (
    <group>
      {/* Water */}
      <primitive object={water} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </group>
  );
}