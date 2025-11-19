import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSpecialItems, SPECIAL_ITEM_TYPES } from '../contexts/SpecialItemsContext.jsx';

// Hazard entities that will be placed in the game world
export const HAZARD_TYPES = {
  VACUUM_PORTAL: 'vacuum_portal',
  BLEACH_BLOCK: 'bleach_block',
  ANTIBIOTIC_BOMB: 'antibiotic_bomb',
};

// Hazard component definitions
const HAZARD_COMPONENTS = {
  [HAZARD_TYPES.VACUUM_PORTAL]: VacuumPortalHazard,
  [HAZARD_TYPES.BLEACH_BLOCK]: BleachBlockHazard,
  [HAZARD_TYPES.ANTIBIOTIC_BOMB]: AntibioticBombHazard,
};

function VacuumPortalHazard({ position, onExpire }) {
  const meshRef = useRef();
  const [lifetime, setLifetime] = useState(15000); // 15 seconds

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
    }

    setLifetime(prev => {
      if (prev <= 0) {
        onExpire();
        return 0;
      }
      return prev - delta * 1000;
    });
  });

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[2, 2, 0.1, 16]} />
      <meshBasicMaterial color={0x440088} transparent opacity={0.8} />
    </mesh>
  );
}

function BleachBlockHazard({ position, onExpire }) {
  const meshRef = useRef();
  const [lifetime, setLifetime] = useState(30000); // 30 seconds

  useFrame((state, delta) => {
    setLifetime(prev => {
      if (prev <= 0) {
        onExpire();
        return 0;
      }
      return prev - delta * 1000;
    });
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[2, 2, 2]} />
      <meshLambertMaterial color={0xffffff} />
    </mesh>
  );
}

function AntibioticBombHazard({ position, onExpire }) {
  const meshRef = useRef();
  const [lifetime, setLifetime] = useState(5000); // 5 seconds

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 8) * 0.2);
    }

    setLifetime(prev => {
      if (prev <= 0) {
        onExpire();
        return 0;
      }
      return prev - delta * 1000;
    });
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1.5, 16, 16]} />
      <meshBasicMaterial color={0xff4444} transparent opacity={0.7} />
    </mesh>
  );
}

// Main hazard placement system
export function HazardPlacementSystem({ isActive, selectedItemType, onPlaceHazard, playerPosRef }) {
  const { camera, scene, gl } = useThree();
  const rollOverMeshRef = useRef();
  const planeRef = useRef();
  const objectsRef = useRef([]);
  const [isPlacing, setIsPlacing] = useState(false);

  const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
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
    if (!isActive || !isPlacing) return;

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
        rollOverMeshRef.current.position.divideScalar(2).floor().multiplyScalar(2).addScalar(1);
      }
    }
  }, [camera, isActive, isPlacing]);

  const onPointerDown = useCallback((event) => {
    if (!isActive || !isPlacing) return;

    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objectsRef.current);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      // Place hazard
      const position = intersect.point.clone().add(intersect.face.normal);
      position.divideScalar(2).floor().multiplyScalar(2).addScalar(1);

      onPlaceHazard(selectedItemType, position);
      setIsPlacing(false);
    }
  }, [camera, isActive, isPlacing, selectedItemType, onPlaceHazard]);

  useEffect(() => {
    if (planeRef.current) {
      objectsRef.current = [planeRef.current];
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      setIsPlacing(true);
    } else {
      setIsPlacing(false);
    }
  }, [isActive]);

  useEffect(() => {
    const handlePointerMove = (event) => onPointerMove(event);
    const handlePointerDown = (event) => onPointerDown(event);

    if (isActive) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerdown', handlePointerDown);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onPointerMove, onPointerDown, isActive]);

  if (!isActive) return null;

  return (
    <>
      {/* Invisible plane for raycasting */}
      <mesh ref={planeRef} geometry={planeGeo} material={planeMaterial} />

      {/* Roll-over preview */}
      {isPlacing && (
        <mesh ref={rollOverMeshRef} geometry={cubeGeo} material={rollOverMaterial} />
      )}
    </>
  );
}

// Component to render active hazards in the game world
export function ActiveHazards({ hazards, onHazardExpire }) {
  return (
    <>
      {hazards.map((hazard) => {
        const HazardComponent = HAZARD_COMPONENTS[hazard.type];
        if (!HazardComponent) return null;

        return (
          <HazardComponent
            key={hazard.id}
            position={hazard.position}
            onExpire={() => onHazardExpire(hazard.id)}
          />
        );
      })}
    </>
  );
}