// Central definitions for environment themes and HDRI assets
// Add new themes here to make them appear in the selector automatically.

import { assetUrl } from '../utils/assetPaths'
const hospitalHDR = assetUrl('hdri/hospital_room_1k.hdr')
const surgeryHDR = assetUrl('hdri/surgery_1k.hdr')
const orchardHDR = assetUrl('hdri/citrus_orchard_road_puresky_1k.hdr')

export type EnvId =
  | 'proc_hazard_hospital'
  | 'proc_hazard_lab'
  | 'proc_blue_sky'
  | 'proc_darkmode'
  | 'whitebox'
  | 'hospital'
  | 'surgery'
  | 'orchard'

export type EnvType = 'procedural' | 'hdri' | 'whitebox'

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
  // Procedural presets (top of the list)
  {
    id: 'proc_hazard_hospital',
    label: 'Procedure_Hazard_Hospital',
    type: 'procedural',
    background: false,
    exposure: 1.05,
    fog: { enabled: true, color: '#0e1a22', near: 40, far: 140, type: 'linear' },
    ambient: { intensity: 0.22, color: '#9adbe7' },
    arenaColors: { base: '#0b222c', veins: '#11b5c9', telegraph: '#33f1ff' },
  },
  {
    id: 'proc_hazard_lab',
    label: 'Procedure_Hazard_Lab',
    type: 'procedural',
    background: false,
    exposure: 1.0,
    fog: { enabled: true, color: '#0f1522', near: 50, far: 160, type: 'linear' },
    ambient: { intensity: 0.24, color: '#bfe3ff' },
    arenaColors: { base: '#092536', veins: '#ff3e7d', telegraph: '#ffd2e5' },
  },
  {
    id: 'proc_blue_sky',
    label: 'Procedure_BlueSky',
    type: 'procedural',
    background: false,
    exposure: 0.98,
    fog: { enabled: true, color: '#cfe8ff', density: 0.006, type: 'exp2' },
    ambient: { intensity: 0.2, color: '#cfe8ff' },
    arenaColors: { base: '#d8ecfa', veins: '#5fb3ff', telegraph: '#7fd1ff' },
  },
  {
    id: 'proc_darkmode',
    label: 'Procedure_DarkMode',
    type: 'procedural',
    background: false,
    exposure: 0.92,
    fog: { enabled: true, color: '#05080c', near: 30, far: 120, type: 'linear' },
    ambient: { intensity: 0.18, color: '#243447' },
    arenaColors: { base: '#0a121a', veins: '#2b6cb0', telegraph: '#5dade2' },
  },
  // Whitebox (no HDRI)
  {
    id: 'whitebox',
    label: 'Whitebox (No HDRI)',
    type: 'whitebox',
    background: false,
    exposure: 1.0,
    fog: { enabled: true, color: '#eaeef3', near: 80, far: 200, type: 'linear' },
    ambient: { intensity: 0.3, color: '#ffffff' },
    arenaColors: { base: '#eaeef3', veins: '#7aa7cc', telegraph: '#406080' },
  },
  {
    id: 'hospital',
    label: 'Hospital Room (HDRI)',
    type: 'hdri',
    hdri: hospitalHDR,
    background: false,
    exposure: 1.1,
    fog: { enabled: true, color: '#eaeef3', near: 60, far: 160, type: 'linear' },
    ambient: { intensity: 0.25, color: '#e0f2f1' },
    arenaColors: { base: '#edf7f7', veins: '#38b6c1', telegraph: '#5ed7e3' },
  },
  {
    id: 'surgery',
    label: 'Surgery Suite (HDRI)',
    type: 'hdri',
    hdri: surgeryHDR,
    background: false,
    exposure: 1.0,
    fog: { enabled: true, color: '#e3f2fd', near: 80, far: 180, type: 'linear' },
    ambient: { intensity: 0.22, color: '#e3f2fd' },
    arenaColors: { base: '#eef6ff', veins: '#4fb1ff', telegraph: '#7ec9ff' },
  },
  {
    id: 'orchard',
    label: 'Outdoor Puresky (HDRI)',
    type: 'hdri',
    hdri: orchardHDR,
    background: true,
    exposure: 0.95,
    fog: { enabled: true, color: '#cfe8ff', density: 0.008, type: 'exp2' },
    ambient: { intensity: 0.18, color: '#cfe8ff' },
    arenaColors: { base: '#f3f9ff', veins: '#6fbaff', telegraph: '#a6d6ff' },
  },
]

export const DEFAULT_ENV_ID: EnvId = 'proc_hazard_hospital'

export function getEnvById(id: EnvId): EnvironmentSpec {
  return ENVIRONMENTS.find(e => e.id === id) || ENVIRONMENTS[0]
}

// Optional: export a stable order for UI (procedurals first)
export const ENV_OPTIONS_ORDERED: Array<{ id: EnvId; label: string }> = ENVIRONMENTS.map(e => ({ id: e.id, label: e.label }))
