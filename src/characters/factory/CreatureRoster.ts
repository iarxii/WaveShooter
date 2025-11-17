import { CreatureMeshSpec } from './CreatureSpec';

export const CreatureRoster: Record<string, CreatureMeshSpec> = {
  cockroach_broodmother: {
    id: 'cockroach_broodmother',
    seed: 91021,
    kind: 'insect',
    body: { length: 2.0, width: 0.8, height: 0.6, segments: 3 },
    appendages: {
      limbs: { count: 6, length: 1.0, thickness: 0.1 },
      antennae: { count: 2, length: 0.5 }
    },
    features: {
      eyes: { size: 0.1, count: 2 },
      mouth: 'mandibles',
      texture: 'smooth'
    },
    colors: { body: '#5C3A23', accent: '#C4A074', eyes: '#000000' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  },
  fly_colossus: {
    id: 'fly_colossus',
    seed: 44112,
    kind: 'insect',
    body: { length: 1.5, width: 0.5, height: 0.4, segments: 2 },
    appendages: {
      limbs: { count: 6, length: 0.8, thickness: 0.08 },
      wings: { span: 2.4, length: 2.0, flapHz: 11 },
      antennae: { count: 2, length: 0.3 }
    },
    features: {
      eyes: { size: 0.16, count: 2 },
      mouth: 'snout',
      texture: 'smooth'
    },
    colors: { body: '#2F2F2F', accent: '#8FE1E9', eyes: '#FFFFFF' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  },
  mosquito_matriarch: {
    id: 'mosquito_matriarch',
    seed: 66331,
    kind: 'insect',
    body: { length: 1.2, width: 0.3, height: 0.3, segments: 2 },
    appendages: {
      limbs: { count: 6, length: 0.6, thickness: 0.05 },
      wings: { span: 2.0, length: 2.2, flapHz: 18 }
    },
    features: {
      eyes: { size: 0.1, count: 2 },
      mouth: 'snout',
      texture: 'smooth'
    },
    colors: { body: '#3D3A38', accent: '#E7B466', eyes: '#000000' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  },
  bee_medics: {
    id: 'bee_medics',
    seed: 31415,
    kind: 'insect',
    body: { length: 1.0, width: 0.4, height: 0.3, segments: 2 },
    appendages: {
      limbs: { count: 6, length: 0.5, thickness: 0.06 },
      wings: { span: 1.8, length: 1.6, flapHz: 16 }
    },
    features: {
      eyes: { size: 0.08, count: 2 },
      mouth: 'snout',
      texture: 'smooth'
    },
    colors: { body: '#2F2B2B', accent: '#FFC93B', eyes: '#000000' },
    detail: 0,
    animation: { spin: 0, breathe: 0 }
  },
  ladybug_sterilizers: {
    id: 'ladybug_sterilizers',
    seed: 27182,
    kind: 'insect',
    body: { length: 0.8, width: 0.6, height: 0.4, segments: 1 },
    appendages: {
      limbs: { count: 6, length: 0.4, thickness: 0.05 },
      wings: { span: 1.2, length: 0.8, flapHz: 10 }
    },
    features: {
      eyes: { size: 0.06, count: 2 },
      mouth: 'mandibles',
      texture: 'smooth'
    },
    colors: { body: '#CE2A2A', accent: '#1E1E1E', eyes: '#000000' },
    detail: 0,
    animation: { spin: 0, breathe: 0 }
  },
  dragonfly_sentinels: {
    id: 'dragonfly_sentinels',
    seed: 16180,
    kind: 'insect',
    body: { length: 1.5, width: 0.2, height: 0.2, segments: 3 },
    appendages: {
      limbs: { count: 6, length: 0.7, thickness: 0.04 },
      wings: { span: 2.8, length: 2.4, flapHz: 12 }
    },
    features: {
      eyes: { size: 0.12, count: 2 },
      mouth: 'mandibles',
      texture: 'smooth'
    },
    colors: { body: '#2C566E', accent: '#9FE8FF', eyes: '#000000' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  },
  // Add mammal, bird, etc. later
  rat_king: {
    id: 'rat_king',
    seed: 77005,
    kind: 'mammal',
    body: { length: 1.5, width: 0.5, height: 0.4, segments: 1 },
    appendages: {
      limbs: { count: 4, length: 0.8, thickness: 0.1 },
      tail: { length: 1.4, type: 'straight' }
    },
    features: {
      eyes: { size: 0.08, count: 2 },
      mouth: 'snout',
      texture: 'fur'
    },
    colors: { body: '#6B5D52', accent: '#8B7355', eyes: '#000000' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  },
  vulture_harbinger: {
    id: 'vulture_harbinger',
    seed: 55090,
    kind: 'bird',
    body: { length: 2.0, width: 0.6, height: 0.5, segments: 1 },
    appendages: {
      limbs: { count: 2, length: 0.3, thickness: 0.08 },
      wings: { span: 3.0, length: 2.5, flapHz: 6 },
      tail: { length: 0.8, type: 'straight' }
    },
    features: {
      eyes: { size: 0.1, count: 2 },
      mouth: 'beak',
      texture: 'feathers'
    },
    colors: { body: '#2B2F3A', accent: '#E5B65D', eyes: '#000000' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  },
  swallow_sweep: {
    id: 'swallow_sweep',
    seed: 14142,
    kind: 'bird',
    body: { length: 1.2, width: 0.3, height: 0.25, segments: 1 },
    appendages: {
      limbs: { count: 2, length: 0.2, thickness: 0.05 },
      wings: { span: 2.0, length: 1.8, flapHz: 7 },
      tail: { length: 0.6, type: 'straight' }
    },
    features: {
      eyes: { size: 0.06, count: 2 },
      mouth: 'beak',
      texture: 'feathers'
    },
    colors: { body: '#22324A', accent: '#EAD088', eyes: '#000000' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  },
  therapy_dog: {
    id: 'therapy_dog',
    seed: 42424,
    kind: 'mammal',
    body: { length: 1.8, width: 0.6, height: 0.5, segments: 1 },
    appendages: {
      limbs: { count: 4, length: 1.0, thickness: 0.12 },
      tail: { length: 1.0, type: 'curved' }
    },
    features: {
      eyes: { size: 0.08, count: 2 },
      mouth: 'snout',
      texture: 'fur'
    },
    colors: { body: '#7A5D43', accent: '#E9D6C0', eyes: '#000000' },
    detail: 1,
    animation: { spin: 0, breathe: 0 }
  }
};