// src/characters/Mutagen.jsx
// Factory for Mutagen enemies based on roster data

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createGroupedMeshes } from './ProceduralUtils';

export function Mutagen({ enemyData, playerPosRef, onProjectile, ...props }) {
  if (!enemyData) return null; // or default

  const { name, shape, color, stats, vfx } = enemyData;
  const groupRef = useRef();
  const [lasers, setLasers] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const attackTimer = useRef(0);
  const agitationTimer = useRef(0);

  useFrame((_, dt) => {
    if (!groupRef.current) return;

    const pos = groupRef.current.position;
    const playerPos = playerPosRef?.current || new THREE.Vector3();

    switch (name) {
      case 'UV Radiation':
        // Hover: float up and down
        pos.y = 2 + Math.sin(performance.now() * 0.001) * 0.5;
        // Shoot lasers every 4 seconds
        attackTimer.current += dt;
        if (attackTimer.current > 4) {
          attackTimer.current = 0;
          // Create 3 lasers in non-linear alternation
          const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-0.5, 0, Math.sqrt(3)/2),
            new THREE.Vector3(-0.5, 0, -Math.sqrt(3)/2)
          ];
          directions.forEach((dir, i) => {
            setTimeout(() => {
              const laser = {
                id: Date.now() + i,
                start: pos.clone(),
                direction: dir.clone(),
                duration: 4,
                time: 0
              };
              setLasers(prev => [...prev, laser]);
            }, i * 500); // stagger
          });
        }
        // Update lasers
        setLasers(prev => prev.map(l => ({ ...l, time: l.time + dt })).filter(l => l.time < l.duration));
        break;

      case 'Benzene':
        // Spin
        groupRef.current.rotation.y += dt * 2;
        // Spew smoke/fire every 2 seconds
        attackTimer.current += dt;
        if (attackTimer.current > 2) {
          attackTimer.current = 0;
          // Emit projectiles radially
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            const projectile = {
              id: Date.now() + i,
              position: pos.clone(),
              velocity: dir.clone().multiplyScalar(5),
              type: 'smoke-fire',
              time: 0
            };
            setProjectiles(prev => [...prev, projectile]);
            onProjectile && onProjectile(projectile);
          }
        }
        break;

      case 'X-rays':
        // Stationary
        // Shoot slow lasers every 3 seconds
        attackTimer.current += dt;
        if (attackTimer.current > 3) {
          attackTimer.current = 0;
          const dir = new THREE.Vector3().subVectors(playerPos, pos).normalize();
          const laser = {
            id: Date.now(),
            start: pos.clone(),
            direction: dir,
            duration: 5,
            time: 0,
            slow: true
          };
          setLasers(prev => [...prev, laser]);
        }
        // Update lasers
        setLasers(prev => prev.map(l => ({ ...l, time: l.time + dt })).filter(l => l.time < l.duration));
        break;

      case 'Nitrosamines':
        // Roam slowly
        const roamDir = new THREE.Vector3(Math.sin(performance.now() * 0.0005), 0, Math.cos(performance.now() * 0.0005));
        pos.add(roamDir.clone().multiplyScalar(dt * 2));
        // Check distance to player for agitation
        const dist = pos.distanceTo(playerPos);
        if (dist < 5) {
          agitationTimer.current += dt;
          if (agitationTimer.current > 1) {
            agitationTimer.current = 0;
            // Shoot two projectiles toward player
            const dir = new THREE.Vector3().subVectors(playerPos, pos).normalize();
            for (let i = 0; i < 2; i++) {
              const offset = new THREE.Vector3(0, 0, i === 0 ? 1 : -1).cross(dir).normalize().multiplyScalar(0.5);
              const projectile = {
                id: Date.now() + i,
                position: pos.clone().add(offset),
                velocity: dir.clone().multiplyScalar(10),
                type: 'smoke-fire',
                time: 0
              };
              setProjectiles(prev => [...prev, projectile]);
              onProjectile && onProjectile(projectile);
            }
          }
        } else {
          agitationTimer.current = 0;
        }
        break;

      default:
        break;
    }

    // Update projectiles
    setProjectiles(prev => prev.map(p => ({
      ...p,
      position: p.position.clone().add(p.velocity.clone().multiplyScalar(dt)),
      time: p.time + dt
    })).filter(p => p.time < 10)); // lifetime
  });

  // Create mesh based on name
  let mesh;
  switch (name) {
    case 'UV Radiation':
      // 10-pointed star
      const starGeometry = new THREE.CylinderGeometry(1, 1, 0.5, 10, 1);
      const starMaterial = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#e0e0ff',
        emissiveIntensity: 0.5
      });
      mesh = new THREE.Mesh(starGeometry, starMaterial);
      break;
    case 'Benzene':
      // Ring structure
      mesh = createGroupedMeshes({ shape: 'Circle', color, radius: 1.5 });
      break;
    case 'X-rays':
      // Flashlight shape
      const flashlightGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8, 1);
      const flashlightMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
      mesh = new THREE.Mesh(flashlightGeometry, flashlightMaterial);
      break;
    case 'Nitrosamines':
      // Molecule structure
      mesh = createGroupedMeshes({ shape: 'Rectangle', color, radius: 1 });
      break;
    default:
      mesh = createGroupedMeshes({ shape, color });
  }

  return (
    <group ref={groupRef}>
      <primitive object={mesh} />
      {/* Render lasers */}
      {lasers.map(laser => {
        const end = laser.start.clone().add(laser.direction.clone().multiplyScalar(laser.slow ? laser.time * 2 : 10));
        return (
          <line key={laser.id}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([laser.start.x, laser.start.y, laser.start.z, end.x, end.y, end.z])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#00ffff" />
          </line>
        );
      })}
      {/* Render projectiles */}
      {projectiles.map(proj => (
        <mesh key={proj.id} position={proj.position}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial color={proj.type === 'smoke-fire' ? '#ff0000' : '#000000'} />
        </mesh>
      ))}
    </group>
  );
}