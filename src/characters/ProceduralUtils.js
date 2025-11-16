// src/characters/ProceduralUtils.js
// Shared utilities for procedural enemy generation

import * as THREE from "three";

/**
 * Creates a grouped mesh for complex procedural entities.
 * Used for Pathogen, Mutagen, and InfectionVector factories.
 * @param {Object} params - Parameters for the mesh
 * @param {string} params.shape - Shape type (e.g., 'Hexagon', 'Circle')
 * @param {string} params.color - Base color
 * @param {number} params.radius - Radius of the mesh
 * @param {number} params.detail - Detail level
 * @param {number} params.seed - Seed for randomness
 * @returns {THREE.Group} - A Three.js group containing the meshes
 */
export function createGroupedMeshes({ shape, color, radius = 1, detail = 1, seed = 1 }) {
  const group = new THREE.Group();

  // Simple shape mapping
  let geometry;
  switch (shape) {
    case 'Hexagon':
      geometry = new THREE.CylinderGeometry(radius, radius, radius * 0.5, 6, detail);
      break;
    case 'Square':
      geometry = new THREE.BoxGeometry(radius, radius, radius * 0.5);
      break;
    case 'Pentagon':
      geometry = new THREE.CylinderGeometry(radius, radius, radius * 0.5, 5, detail);
      break;
    case 'Octagon':
      geometry = new THREE.CylinderGeometry(radius, radius, radius * 0.5, 8, detail);
      break;
    case 'Triangle':
      geometry = new THREE.CylinderGeometry(radius, radius, radius * 0.5, 3, detail);
      break;
    case 'Diamond':
      geometry = new THREE.OctahedronGeometry(radius, detail);
      break;
    case 'Circle':
      geometry = new THREE.SphereGeometry(radius, 16, 8);
      break;
    case 'Oval':
      geometry = new THREE.SphereGeometry(radius, 12, 6);
      break;
    case 'Star':
      geometry = new THREE.CylinderGeometry(radius, radius, radius * 0.5, 10, detail); // Approximate star
      break;
    case 'Rectangle':
      geometry = new THREE.BoxGeometry(radius * 1.5, radius, radius * 0.5);
      break;
    case 'Crescent':
      // Simple crescent approximation
      geometry = new THREE.TorusGeometry(radius, radius * 0.3, 8, 16, Math.PI);
      break;
    default:
      geometry = new THREE.SphereGeometry(radius, 8, 6);
  }

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.1,
    roughness: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Add some procedural elements, e.g., spikes or nodes
  const spikeCount = 8;
  for (let i = 0; i < spikeCount; i++) {
    const spikeGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
    const spikeMaterial = new THREE.MeshStandardMaterial({ color });
    const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
    const angle = (i / spikeCount) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    spike.lookAt(0, 0, 0);
    group.add(spike);
  }

  return group;
}

/**
 * Tiny deterministic RNG
 */
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}