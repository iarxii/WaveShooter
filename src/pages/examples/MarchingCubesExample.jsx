import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

export function MarchingCubesExample() {
  const effectRef = useRef();
  const { scene } = useThree();

  const material = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: 0xff0000,
      specular: 0x111111,
      shininess: 100
    });
  }, []);

  const effect = useMemo(() => {
    const resolution = 28;
    const effect = new MarchingCubes(resolution, material, true, true, 100000);
    effect.position.set(0, 0, 0);
    effect.scale.set(2, 2, 2); // Reduced scale for better visibility
    effect.enableUvs = false;
    effect.enableColors = false;
    return effect;
  }, [material]);

  useEffect(() => {
    scene.add(effect);
    return () => {
      scene.remove(effect);
    };
  }, [scene, effect]);

  useFrame((state) => {
    if (!effect) return;

    const time = state.clock.getElapsedTime();

    // Update the marching cubes
    effect.reset();

    // Fill the field with some metaballs
    const ballx = Math.sin(time * 0.7) * 0.5;
    const bally = Math.cos(time * 0.3) * 0.5;
    const ballz = Math.sin(time * 0.2) * 0.5;

    effect.addBall(ballx, bally, ballz, 0.5, 2.0);
    effect.addBall(ballx + 1, bally + 1, ballz + 1, 0.3, 1.0);
    effect.addBall(ballx - 1, bally - 1, ballz - 1, 0.4, 1.5);

    // Add some additional balls for more complex shapes
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(time + i) * 0.3;
      const y = Math.cos(time + i * 0.5) * 0.3;
      const z = Math.sin(time * 0.3 + i) * 0.3;
      effect.addBall(x, y, z, 0.2, 0.8);
    }
  });

  return null; // The effect is added to the scene directly
}