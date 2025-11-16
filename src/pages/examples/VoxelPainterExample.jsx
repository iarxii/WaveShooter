import React, { useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function VoxelPainterExample() {
  const { camera, scene, gl } = useThree();
  const rollOverMeshRef = useRef();
  const planeRef = useRef();
  const objectsRef = useRef([]);
  const [cubes, setCubes] = useState([]);

  const cubeGeo = new THREE.BoxGeometry(50, 50, 50);
  const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xfeb74c });

  const rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
  const rollOverMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    opacity: 0.5,
    transparent: true
  });

  const planeGeo = new THREE.PlaneGeometry(1000, 1000);
  planeGeo.rotateX(-Math.PI / 2);
  const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const onPointerMove = useCallback((event) => {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objectsRef.current);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      if (rollOverMeshRef.current) {
        rollOverMeshRef.current.position.copy(intersect.point).add(intersect.face.normal);
        rollOverMeshRef.current.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
      }
    }
  }, [camera, pointer, raycaster]);

  const onPointerDown = useCallback((event) => {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objectsRef.current);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      // create cube
      const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
      voxel.position.copy(intersect.point).add(intersect.face.normal);
      voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
      scene.add(voxel);
      objectsRef.current.push(voxel);
      setCubes(prev => [...prev, voxel]);
    }
  }, [camera, pointer, raycaster, scene, cubeGeo, cubeMaterial]);

  React.useEffect(() => {
    if (planeRef.current) {
      objectsRef.current = [planeRef.current];
    }
  }, []);

  React.useEffect(() => {
    const handlePointerMove = (event) => onPointerMove(event);
    const handlePointerDown = (event) => onPointerDown(event);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onPointerMove, onPointerDown]);

  return (
    <>
      {/* Grid */}
      <gridHelper args={[1000, 20]} />

      {/* Roll-over mesh */}
      <mesh ref={rollOverMeshRef} geometry={rollOverGeo} material={rollOverMaterial} />

      {/* Invisible plane for raycasting */}
      <mesh ref={planeRef} geometry={planeGeo} material={planeMaterial} />

      {/* Ambient light */}
      <ambientLight intensity={3} />

      {/* Directional light */}
      <directionalLight position={[1, 0.75, 0.5]} intensity={3} />

      {/* Rendered cubes */}
      {cubes.map((cube, index) => (
        <primitive key={index} object={cube} />
      ))}
    </>
  );
}