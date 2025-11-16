import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';

export function InstancingExample({ colors: propColors, speed = 1, animationType = 'bounce', shape = 'box', gap = 1 }) {
  const meshRef = useRef();
  const timerRef = useRef(new THREE.Timer());
  const { mouse, camera } = useThree();

  const amount = 100;
  const count = Math.pow(amount, 2);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo(() => {
    const s = [];
    for (let i = 0; i < count; i++) {
      s.push(Math.random());
    }
    return s;
  }, [count]);

  const baseColors = useMemo(() => {
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      color.setHSL(1, 0.5 + (Math.random() * 0.5), 0.5 + (Math.random() * 0.5));
      colors.push(color.getHex());
    }
    return colors;
  }, [count]);

  const colors = useMemo(() => propColors ? propColors.map(c => new THREE.Color(c)) : [
    new THREE.Color(0x00ffff),
    new THREE.Color(0xffff00),
    new THREE.Color(0xff00ff)
  ], [propColors]);

  const animation = useRef({ t: 0 });
  const currentColorIndex = useRef(0);
  const nextColorIndex = useRef(1);
  const maxDistance = 75;

  const geometries = useMemo(() => [
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.TetrahedronGeometry(1),
    new THREE.SphereGeometry(1, 8, 6),
    new THREE.CylinderGeometry(0.5, 0.5, 2, 8),
    new THREE.OctahedronGeometry(1)
  ], []);

  const geometry = useMemo(() => {
    switch (shape) {
      case 'tetrahedron':
        return new THREE.TetrahedronGeometry(1);
      case 'sphere':
        return new THREE.SphereGeometry(1, 8, 6);
      case 'cylinder':
        return new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
      case 'octahedron':
        return new THREE.OctahedronGeometry(1);
      case 'box':
      default:
        return new THREE.BoxGeometry(1, 2, 1);
    }
  }, [shape]);

  const meshesRef = useRef([]);
  const instanceCounts = useRef([]);

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const positions = useRef([]);

  useEffect(() => {
    const isMixed = shape === 'mixed';
    const numMeshes = isMixed ? 5 : 1;
    meshesRef.current = [];
    instanceCounts.current = [];

    for (let j = 0; j < numMeshes; j++) {
      const geom = isMixed ? geometries[j] : geometry;
      const instCount = isMixed ? Math.floor(count / 5) + (j < count % 5 ? 1 : 0) : count;
      instanceCounts.current.push(instCount);
      const mesh = new THREE.InstancedMesh(geom, material, instCount);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      meshesRef.current.push(mesh);
    }

    let globalI = 0;
    const offset = (amount - 1) / 2;
    positions.current = [];

    // Populate positions
    for (let i = 0; i < amount; i++) {
      for (let j = 0; j < amount; j++) {
        positions.current.push({ x: (i - offset) * gap, z: (j - offset) * gap });
      }
    }

    let meshIndex = 0;
    let localI = 0;

    for (let globalI = 0; globalI < count; globalI++) {
      const pos = positions.current[globalI];
      const mesh = meshesRef.current[meshIndex];

      dummy.position.set(pos.x, -3, pos.z);
      dummy.scale.set(1, 2, 1);
      if (shape === 'tetrahedron' || (isMixed && meshIndex === 1)) {
        dummy.rotation.y = (globalI % 2) * Math.PI;
      } else {
        dummy.rotation.y = 0;
      }
      dummy.updateMatrix();

      const color = new THREE.Color(baseColors[globalI]);
      mesh.setMatrixAt(localI, dummy.matrix);
      mesh.setColorAt(localI, color);

      localI++;
      if (localI >= instanceCounts.current[meshIndex]) {
        meshIndex++;
        localI = 0;
      }
    }

    meshesRef.current.forEach(mesh => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    });
  }, [shape, gap, baseColors, geometry, geometries]);

  useEffect(() => {
    const interval = setInterval(startTween, 3000 / speed);
    return () => clearInterval(interval);
  }, [speed]);

  useEffect(() => {
    if (meshesRef.current.length === 0) return;

    let globalI = 0;
    meshesRef.current.forEach(mesh => {
      for (let localI = 0; localI < mesh.count; localI++) {
        const color = new THREE.Color(baseColors[globalI]).multiply(colors[0]);
        mesh.setColorAt(localI, color);
        globalI++;
      }
      mesh.instanceColor.needsUpdate = true;
    });
  }, [colors]);

  const startTween = () => {
    new TWEEN.Tween(animation.current)
      .to({ t: 1 }, 2000)
      .easing(TWEEN.Easing.Sinusoidal.In)
      .onComplete(() => {
        animation.current.t = 0;
        currentColorIndex.current = nextColorIndex.current;
        nextColorIndex.current++;
        if (nextColorIndex.current >= colors.length) nextColorIndex.current = 0;
      })
      .start();
  };

  useFrame((state, delta) => {
    if (meshesRef.current.length === 0) return;

    timerRef.current.update();
    const time = timerRef.current.getElapsed();

    TWEEN.update();

    let globalI = 0;
    meshesRef.current.forEach((mesh, meshIndex) => {
      const color = new THREE.Color();
      for (let localI = 0; localI < mesh.count; localI++) {
        mesh.getMatrixAt(localI, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

        const pos = positions.current[globalI];
        let y = 0;

        switch (animationType) {
          case 'bounce':
            y = Math.abs(Math.sin((time * speed + seeds[globalI]) * 2 + seeds[globalI]));
            break;
          case 'waveRadial':
            const distance = Math.sqrt(pos.x ** 2 + pos.z ** 2);
            y = Math.sin(time * speed - distance * 0.3) * 0.5 + 0.5;
            break;
          case 'waveHorizontal':
            y = Math.sin(time * speed - pos.x * 0.5) * 0.5 + 0.5;
            break;
          case 'waveVertical':
            y = Math.sin(time * speed - pos.z * 0.5) * 0.5 + 0.5;
            break;
          case 'waveDiagonal':
            y = Math.sin(time * speed - (pos.x + pos.z) * 0.3) * 0.5 + 0.5;
            break;
          case 'mouseRaise':
            if (!mouse) break;
            const mouseX = mouse.x * 50;
            const mouseZ = mouse.y * 50;
            const dist = Math.sqrt((pos.x - mouseX) ** 2 + (pos.z - mouseZ) ** 2);
            y = Math.max(0, 2 - dist * 0.2);
            break;
          case 'static':
          default:
            y = 0;
            break;
        }

        dummy.position.y = -3 + y;

        dummy.updateMatrix();
        mesh.setMatrixAt(localI, dummy.matrix);

        if (animation.current.t > 0) {
          const currentColor = colors[currentColorIndex.current];
          const nextColor = colors[nextColorIndex.current];

          const f = dummy.position.length() / maxDistance;

          if (f <= animation.current.t) {
            color.set(baseColors[globalI]).multiply(nextColor);
          } else {
            color.set(baseColors[globalI]).multiply(currentColor);
          }

          mesh.setColorAt(localI, color);
        }

        globalI++;
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (animation.current.t > 0) mesh.instanceColor.needsUpdate = true;

      mesh.computeBoundingSphere();
    });
  });

  return (
    <>
      {meshesRef.current.map((mesh, index) => (
        <primitive key={index} object={mesh} frustumCulled={false} />
      ))}
    </>
  );
}