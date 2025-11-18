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

export class InsectBodyGenerator {
  private spec: CreatureMeshSpec;
  private random: () => number;

  constructor(spec: CreatureMeshSpec) {
    this.spec = spec;
    this.random = seededRandom(spec.seed);
  }

  generate(): THREE.BufferGeometry {
    const { body, appendages, features, detail } = this.spec;
    const geometries: THREE.BufferGeometry[] = [];

    console.log('Generating insect with appendages:', appendages);

    // Generate segmented body
    for (let i = 0; i < body.segments; i++) {
      const segmentGeometry = this.createBodySegment(i, body.segments);
      geometries.push(segmentGeometry);
    }
    console.log('Body segments added:', body.segments);

    // Generate limbs
    if (appendages.limbs) {
      console.log('Adding limbs:', appendages.limbs.count);
      for (let i = 0; i < appendages.limbs.count; i++) {
        const limbGeometry = this.createLimb(i, appendages.limbs.count);
        geometries.push(limbGeometry);
      }
    }

    // Generate wings
    if (appendages.wings) {
      console.log('Adding wings');
      const wingGeometry = this.createWings();
      geometries.push(wingGeometry);
    }

    // Generate antennae
    if (appendages.antennae) {
      console.log('Adding antennae');
      for (let i = 0; i < appendages.antennae.count; i++) {
        const antennaGeometry = this.createAntenna(i, appendages.antennae.count);
        geometries.push(antennaGeometry);
      }
    }

    // Generate eyes
    if (features.eyes) {
      console.log('Adding eyes');
      for (let i = 0; i < features.eyes.count; i++) {
        const eyeGeometry = this.createEye(i, features.eyes.count);
        geometries.push(eyeGeometry);
      }
    }

    // Generate mouth
    if (features.mouth) {
      console.log('Adding mouth');
      const mouthGeometry = this.createMouth();
      geometries.push(mouthGeometry);
    }

    console.log('Total geometries:', geometries.length);

    // Merge all segments into one geometry
    if (geometries.length === 1) {
      return geometries[0];
    }

    const mergedGeometry = mergeGeometries(geometries);
    return mergedGeometry;
  }

  private createBodySegment(index: number, totalSegments: number): THREE.BufferGeometry {
    const { body, detail } = this.spec;
    const segmentLength = body.length / totalSegments;
    const radius = (body.width + body.height) / 4; // Approximate radius

    // Create a cylinder for each segment
    const geometry = new THREE.CylinderGeometry(radius, radius, segmentLength, 8, 1);

    // Position the segment along the body
    const zOffset = (index - (totalSegments - 1) / 2) * segmentLength;
    geometry.translate(0, 0, zOffset);

    return geometry;
  }

  private createLimb(index: number, totalLimbs: number): THREE.BufferGeometry {
    const { body, appendages } = this.spec;
    const limbLength = appendages.limbs.length;
    const thickness = appendages.limbs.thickness;

    // Create a cylinder for the limb
    const geometry = new THREE.CylinderGeometry(thickness / 2, thickness / 2, limbLength, 6, 1);

    // Position limbs around the body
    const angle = (index / totalLimbs) * Math.PI * 2;
    const radius = body.width / 2 + thickness;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = 0; // Attach to middle segment
    geometry.translate(x, y, z);

    // Rotate to point outward
    geometry.rotateZ(angle);

    return geometry;
  }

  private createWings(): THREE.BufferGeometry {
    const { appendages } = this.spec;
    const span = appendages.wings.span;
    const length = appendages.wings.length;

    // Create two planes for wings
    const wingGeometry = new THREE.PlaneGeometry(span / 2, length, 2, 2);

    // Position wings on back
    wingGeometry.translate(0, 0, -length / 2);

    // Duplicate for left wing
    const leftWing = wingGeometry.clone();
    leftWing.translate(-span / 4, 0, 0);

    const rightWing = wingGeometry.clone();
    rightWing.translate(span / 4, 0, 0);

    return mergeGeometries([leftWing, rightWing]);
  }

  private createAntenna(index: number, totalAntennae: number): THREE.BufferGeometry {
    const { appendages } = this.spec;
    const length = appendages.antennae.length;
    const thickness = 0.02;

    // Create a thin cylinder for antenna
    const geometry = new THREE.CylinderGeometry(thickness / 2, thickness / 2, length, 4, 1);

    // Position on head (front segment)
    const angle = index === 0 ? Math.PI / 6 : -Math.PI / 6;
    const x = Math.sin(angle) * 0.1;
    const y = Math.cos(angle) * 0.1;
    const z = this.spec.body.length / 2 - length / 2;
    geometry.translate(x, y, z);

    return geometry;
  }

  private createEye(index: number, totalEyes: number): THREE.BufferGeometry {
    const { features } = this.spec;
    const size = features.eyes.size;

    // Create a sphere for the eye
    const geometry = new THREE.SphereGeometry(size, 8, 6);

    // Position eyes on head
    const angle = (index / (totalEyes - 1) - 0.5) * Math.PI / 3;
    const x = Math.sin(angle) * 0.15;
    const y = Math.cos(angle) * 0.15;
    const z = this.spec.body.length / 2;
    geometry.translate(x, y, z);

    return geometry;
  }

  private createMouth(): THREE.BufferGeometry {
    const { features } = this.spec;

    if (features.mouth.type === 'mandibles') {
      // Create simple mandibles as small cones
      const mandibleGeometry = new THREE.ConeGeometry(0.05, 0.1, 4);
      mandibleGeometry.translate(0, -0.05, this.spec.body.length / 2 + 0.05);

      const leftMandible = mandibleGeometry.clone();
      leftMandible.translate(-0.05, 0, 0);

      const rightMandible = mandibleGeometry.clone();
      rightMandible.translate(0.05, 0, 0);

      return mergeGeometries([leftMandible, rightMandible]);
    }

    // Default: small sphere
    const geometry = new THREE.SphereGeometry(0.03, 6, 4);
    geometry.translate(0, -0.05, this.spec.body.length / 2);
    return geometry;
  }
}