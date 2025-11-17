import * as THREE from 'three';

export class MaterialPool {
  private static materials: Map<string, THREE.Material> = new Map();

  static getMaterial(key: string, createFn: () => THREE.Material): THREE.Material {
    if (!this.materials.has(key)) {
      this.materials.set(key, createFn());
    }
    return this.materials.get(key)!;
  }

  static getStandardMaterial(color: string): THREE.MeshStandardMaterial {
    const key = `standard_${color}`;
    return this.getMaterial(key, () => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide })) as THREE.MeshStandardMaterial;
  }
}