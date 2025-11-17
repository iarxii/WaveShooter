export interface CreatureMeshSpec {
  id: string;
  seed: number;
  kind: 'insect' | 'mammal' | 'bird' | 'reptile' | 'other';
  body: {
    length: number;
    width: number;
    height: number;
    segments: number;
    orientation?: 'horizontal' | 'vertical'; // NEW
  };
  appendages: {
    limbs: { count: number; length: number; thickness: number; joints?: number }; // NEW
    wings?: { span: number; length: number; flapHz: number; shape?: 'flat' | 'tapered' }; // NEW
    antennae?: { count: number; length: number; curvature?: number }; // NEW
    tail?: { length: number; type: 'straight' | 'curved'; thickness?: number }; // NEW
  };
  features: {
    eyes: { size: number; count: number; relativeScale?: boolean }; // NEW
    mouth: { type: 'beak' | 'mandibles' | 'snout' };
    texture: 'smooth' | 'fur' | 'scales' | 'feathers';
    textureDetail?: number; // NEW
  };
  colors: {
    body: string;
    accent: string;
    eyes: string;
    pattern?: string; // e.g., 'striped', 'spotted' // NEW
  };
  detail: number; // 0-2 for LOD
  modelUrl?: string; // For GLB model loading
  animation: {
    spin: number;
    breathe: number;
    wingFlapAmplitude?: number; // NEW
  };
}