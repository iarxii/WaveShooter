// Environment Layers Builder Types
export interface EnvironmentConfig {
  id: string
  name: string
  layers: {
    sky: SkyConfig
    lighting: LightingConfig
    surface: SurfaceConfig
    atmosphere: AtmosphereConfig
    procedural: ProceduralConfig
  }
  metadata: {
    created: Date
    author: string
    tags: string[]
  }
}

export interface SkyConfig {
  type: 'hdri' | 'procedural' | 'solid'
  hdriPath?: string
  proceduralType?: string
  solidColor?: string
  exposure: number
  rotation: number
  showBackground: boolean
}

export interface LightingConfig {
  preset?: string
  directional: {
    enabled: boolean
    position: [number, number, number]
    intensity: number
    color: string
  }
  hemisphere: {
    enabled: boolean
    skyColor: string
    groundColor: string
    intensity: number
  }
  fog: {
    enabled: boolean
    type: 'linear' | 'exp2'
    color: string
    near?: number
    far?: number
    density?: number
  }
  ambient: {
    enabled: boolean
    intensity: number
    color: string
  }
}

export interface SurfaceConfig {
  shader: string
  material: {
    metalness: number
    roughness: number
    color: string
  }
  displacement: {
    enabled: boolean
    scale: number
  }
  animation: {
    enabled: boolean
    speed: number
  }
}

export interface AtmosphereConfig {
  particles: {
    dust: {
      enabled: boolean
      density: number
      color: string
    }
    spores: {
      enabled: boolean
      density: number
      color: string
    }
    floating: {
      enabled: boolean
      density: number
      color: string
    }
  }
  effects: {
    vignette: {
      enabled: boolean
      intensity: number
    }
    bloom: {
      enabled: boolean
      intensity: number
    }
    godRays: {
      enabled: boolean
      intensity: number
    }
  }
}

export interface ProceduralConfig {
  hazards: {
    type: string
    frequency: number
    intensity: number
    patterns: string[]
  }
  factors: {
    wind: {
      enabled: boolean
      strength: number
      direction: number
    }
    temperature: {
      enabled: boolean
      value: number
    }
  }
  interactive: {
    breakables: boolean
    collectibles: boolean
  }
  timeBased: {
    dayNightCycle: boolean
    cycleSpeed: number
  }
}

// Preset types
export interface EnvironmentPreset {
  id: string
  name: string
  description: string
  config: EnvironmentConfig
  thumbnail?: string
}

// Builder state
export interface EnvironmentBuilderState {
  currentConfig: EnvironmentConfig
  presets: EnvironmentPreset[]
  selectedPreset?: string
  isDirty: boolean
  previewMode: boolean
}

// Layer control props
export interface LayerControlProps<T> {
  config: T
  onChange: (config: T) => void
  disabled?: boolean
}