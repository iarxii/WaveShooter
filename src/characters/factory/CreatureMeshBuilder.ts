import * as THREE from 'three';
import { CreatureMeshSpec } from './CreatureSpec';
import { InsectBodyGenerator } from './parts/insect/InsectBodyGenerator';
import { MammalBodyGenerator } from './parts/mammal/MammalBodyGenerator';
import { BirdBodyGenerator } from './parts/bird/BirdBodyGenerator';
import { MeshCombinator } from './MeshCombinator';

export class CreatureMeshBuilder {
  private spec: CreatureMeshSpec;

  constructor(spec: CreatureMeshSpec) {
    this.spec = spec;
  }

  build(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // Body
    switch (this.spec.kind) {
      case 'insect':
        geometries.push(new InsectBodyGenerator(this.spec).generate());
        break;
      case 'mammal':
        geometries.push(new MammalBodyGenerator(this.spec).generate());
        break;
      case 'bird':
        geometries.push(new BirdBodyGenerator(this.spec).generate());
        break;
      default:
        geometries.push(new THREE.BoxGeometry(1, 1, 1));
    }

    // Appendages
    this.addLimbs(geometries);
    this.addWings(geometries);
    this.addAntennae(geometries);
    this.addTail(geometries);

    // Features
    this.addEyes(geometries);
    this.addMouth(geometries);

    return MeshCombinator.combine(geometries);
  }

  private addLimbs(geometries: THREE.BufferGeometry[]) {
    const { limbs } = this.spec.appendages;
    if (!limbs) return;
    for (let i = 0; i < limbs.count; i++) {
      const limb = new THREE.CylinderGeometry(limbs.thickness, limbs.thickness, limbs.length, 6);
      limb.translate(Math.cos((i / limbs.count) * Math.PI * 2) * this.spec.body.width,
                     -this.spec.body.height / 2,
                     Math.sin((i / limbs.count) * Math.PI * 2) * this.spec.body.width);
      geometries.push(limb);
    }
  }

  private addWings(geometries: THREE.BufferGeometry[]) {
    const { wings } = this.spec.appendages;
    if (!wings) return;
    const wingGeom = new THREE.PlaneGeometry(wings.length, wings.span);
    wingGeom.translate(0, this.spec.body.height / 2, 0);
    geometries.push(wingGeom);
  }

  private addAntennae(geometries: THREE.BufferGeometry[]) {
    const { antennae } = this.spec.appendages;
    if (!antennae) return;
    for (let i = 0; i < antennae.count; i++) {
      const ant = new THREE.CylinderGeometry(0.02, 0.02, antennae.length, 4);
      ant.translate(0, this.spec.body.height / 2, (i === 0 ? -0.1 : 0.1));
      geometries.push(ant);
    }
  }

  private addTail(geometries: THREE.BufferGeometry[]) {
    const { tail } = this.spec.appendages;
    if (!tail) return;
    const tailGeom = new THREE.CylinderGeometry(0.05, 0.05, tail.length, 6);
    tailGeom.translate(0, -this.spec.body.height / 2 - tail.length / 2, 0);
    geometries.push(tailGeom);
  }

  private addEyes(geometries: THREE.BufferGeometry[]) {
    const { eyes } = this.spec.features;
    for (let i = 0; i < eyes.count; i++) {
      const eye = new THREE.SphereGeometry(eyes.size, 6, 6);
      eye.translate((i === 0 ? -0.2 : 0.2), this.spec.body.height / 2, 0.3);
      geometries.push(eye);
    }
  }

  private addMouth(geometries: THREE.BufferGeometry[]) {
    const { mouth } = this.spec.features;
    let mouthGeom: THREE.BufferGeometry;
    switch (mouth.type) {
      case 'beak':
        mouthGeom = new THREE.ConeGeometry(0.1, 0.3, 6);
        break;
      case 'mandibles':
        mouthGeom = new THREE.BoxGeometry(0.2, 0.05, 0.05);
        break;
      default:
        mouthGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6);
    }
    mouthGeom.translate(0, 0, this.spec.body.length / 2);
    geometries.push(mouthGeom);
  }
}