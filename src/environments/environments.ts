// Central definitions for environment themes and HDRI assets
// Add new themes here to make them appear in the selector automatically.

import { assetUrl } from '../utils/assetPaths'
const hospitalHDR = assetUrl('hdri/hospital_room_1k.hdr')
const surgeryHDR = assetUrl('hdri/surgery_1k.hdr')
const orchardHDR = assetUrl('hdri/citrus_orchard_road_puresky_1k.hdr')

// Note: For mobile performance, consider using compressed HDRI formats (e.g., .ktx2 with Basis Universal)
// if loading times or memory usage become issues. Current .hdr files are uncompressed.

export type EnvId =
  | 'instance_dynamic'
  | 'ocean'

export type EnvType = 'dynamic' | 'hdri' | 'whitebox'

export interface EnvironmentSpec {
  id: EnvId
  label: string
  type: EnvType
  hdri?: string
  background?: boolean
  exposure: number
  fog?: {
    enabled: boolean
    color: string
    near?: number
    far?: number
    density?: number // use for exp2 if defined
    type?: 'linear' | 'exp2'
  }
  ambient?: {
    intensity: number
    color?: string
  }
  // Optional arena shader colors for dynamic floor / telegraphs
  arenaColors?: {
    base: string // base albedo of the floor
    veins: string // emissive vein color
    telegraph: string // hazard telegraph / pulse color
  }
}

export const ENVIRONMENTS: EnvironmentSpec[] = [
  // Dynamic environments (from SceneViewer examples)
  {
    id: 'instance_dynamic',
    label: 'Instance Dynamic',
    type: 'dynamic',
    hdri: orchardHDR,
    background: true,
    exposure: 1.0,
    fog: { enabled: true, color: '#ffffff', near: 80, far: 200, type: 'linear' },
    ambient: { intensity: 0.3, color: '#ffffff' },
    arenaColors: { base: '#ffffff', veins: '#cccccc', telegraph: '#999999' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    type: 'dynamic',
    hdri: orchardHDR,
    background: true,
    exposure: 1.0,
    fog: { enabled: true, color: '#87ceeb', near: 100, far: 500, type: 'linear' },
    ambient: { intensity: 0.4, color: '#87ceeb' },
    arenaColors: { base: '#006994', veins: '#00aaff', telegraph: '#ffffff' },
  },
]

export const DEFAULT_ENV_ID: EnvId = 'orchard'

export function getEnvById(id: EnvId): EnvironmentSpec {
  return ENVIRONMENTS.find(e => e.id === id) || ENVIRONMENTS[0]
}

// Optional: export a stable order for UI (procedurals first)
export const ENV_OPTIONS_ORDERED: Array<{ id: EnvId; label: string }> = ENVIRONMENTS.map(e => ({ id: e.id, label: e.label }))
