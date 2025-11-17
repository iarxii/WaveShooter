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

export class MammalBodyGenerator {
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

    // Generate limbs if specified
    if (this.spec.appendages?.limbs) {
      const limbGeometries = this.createLimbs();
      geometries.push(...limbGeometries);
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
    // Create an ellipsoid for the body
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    geometry.scale(body.width / 2, body.height / 2, body.length / 2);
    return geometry;
  }

  private createLimbs(): THREE.BufferGeometry[] {
    const { appendages } = this.spec;
    const geometries: THREE.BufferGeometry[] = [];
    const limbCount = appendages?.limbs?.count || 4;
    const limbLength = appendages?.limbs?.length || 0.5;

    for (let i = 0; i < limbCount; i++) {
      const geometry = new THREE.CylinderGeometry(0.05, 0.05, limbLength, 6);
      // Position limbs around the body
      const angle = (i / limbCount) * Math.PI * 2;
      const x = Math.cos(angle) * 0.3;
      const z = Math.sin(angle) * 0.3;
      geometry.translate(x, -limbLength / 2, z);
      geometries.push(geometry);
    }

    return geometries;
  }

  private createTail(): THREE.BufferGeometry {
    const { appendages } = this.spec;
    const tailLength = appendages?.tail?.length || 0.3;
    const geometry = new THREE.CylinderGeometry(0.03, 0.01, tailLength, 6);
    geometry.translate(0, 0, -this.spec.body.length / 2 - tailLength / 2);
    return geometry;
  }
}