import * as THREE from 'three';
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CreatureMeshSpec } from '../../CreatureSpec';

// Simple seeded random for deterministic generation
function seededRandom(seed: number): () => number {
  let x = Math.sin(seed) * 10000;
  return () => {
    x = Math.sin(x) * 10000;
    return x - Math.floor(x);
  };
}

export class BirdBodyGenerator {
  private spec: CreatureMeshSpec;
  private random: () => number;

  constructor(spec: CreatureMeshSpec) {
    this.spec = spec;
    this.random = seededRandom(spec.seed);
  }

  generate(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // Generate main body
    const bodyGeometry = this.createBody();
    geometries.push(bodyGeometry);

    // Generate wings if specified
    if (this.spec.appendages?.wings) {
      const wingGeometries = this.createWings();
      geometries.push(...wingGeometries);
    }

    // Generate beak if mouth type is beak
    if (this.spec.features?.type === 'beak') {
      const beakGeometry = this.createBeak();
      geometries.push(beakGeometry);
    }

    // Generate tail if specified
    if (this.spec.appendages?.tail) {
      const tailGeometry = this.createTail();
      geometries.push(tailGeometry);
    }

    // Merge all parts into one geometry
    if (geometries.length === 1) {
      return geometries[0];
    }

    const mergedGeometry = mergeGeometries(geometries);
    return mergedGeometry;
  }

  private createBody(): THREE.BufferGeometry {
    const { body } = this.spec;
    // Create a streamlined ellipsoid for the body
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    geometry.scale(body.width / 2, body.height / 2, body.length / 2);
    return geometry;
  }

  private createWings(): THREE.BufferGeometry[] {
    const { appendages } = this.spec;
    const geometries: THREE.BufferGeometry[] = [];
    const wingSpan = appendages?.wings?.span || 1.0;
    const wingLength = appendages?.wings?.length || 0.8;

    // Create two wings as planes
    for (let i = 0; i < 2; i++) {
      const geometry = new THREE.PlaneGeometry(wingSpan / 2, wingLength);
      const side = i === 0 ? 1 : -1;
      geometry.translate(side * wingSpan / 4, 0, 0);
      geometries.push(geometry);
    }

    return geometries;
  }

  private createBeak(): THREE.BufferGeometry {
    const beakLength = 0.2;
    const geometry = new THREE.ConeGeometry(0.05, beakLength, 6);
    geometry.translate(0, 0, this.spec.body.length / 2 + beakLength / 2);
    return geometry;
  }

  private createTail(): THREE.BufferGeometry {
    const { appendages } = this.spec;
    const tailLength = appendages?.tail?.length || 0.3;
    const geometry = new THREE.PlaneGeometry(0.2, tailLength);
    geometry.translate(0, 0, -this.spec.body.length / 2 - tailLength / 2);
    return geometry;
  }
}