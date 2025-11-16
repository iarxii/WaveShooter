import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { PresetManager } from '../utils/PresetManager'
import {
  EnvironmentConfig,
  EnvironmentPreset,
  EnvironmentBuilderState,
  SkyConfig,
  LightingConfig,
  SurfaceConfig,
  AtmosphereConfig,
  ProceduralConfig
} from '../types/environmentBuilder'

// Default configurations - Simplified to just whitebox and darkbox
const whiteboxSkyConfig: SkyConfig = {
  type: 'solid',
  solidColor: '#ffffff',
  exposure: 1.0,
  rotation: 0,
  showBackground: true
}

const darkboxSkyConfig: SkyConfig = {
  type: 'solid',
  solidColor: '#1a1a1a',
  exposure: 0.8,
  rotation: 0,
  showBackground: true
}

const hdriSkyConfig: SkyConfig = {
  type: 'hdri',
  hdriPath: 'hospital_room_1k.hdr',
  exposure: 0.8,
  rotation: 0,
  showBackground: true
}

const whiteboxLightingConfig: LightingConfig = {
  preset: 'whitebox',
  directional: {
    enabled: true,
    position: [10, 18, 8],
    intensity: 0.7,
    color: '#ffffff'
  },
  hemisphere: {
    enabled: true,
    skyColor: '#ffffff',
    groundColor: '#f0f0f0',
    intensity: 0.4
  },
  fog: {
    enabled: false,
    type: 'linear',
    color: '#ffffff',
    near: 10,
    far: 100
  },
  ambient: {
    enabled: true,
    intensity: 0.6,
    color: '#ffffff'
  }
}

const darkboxLightingConfig: LightingConfig = {
  preset: 'darkbox',
  directional: {
    enabled: true,
    position: [10, 18, 8],
    intensity: 0.3,
    color: '#666666'
  },
  hemisphere: {
    enabled: true,
    skyColor: '#333333',
    groundColor: '#111111',
    intensity: 0.2
  },
  fog: {
    enabled: false,
    type: 'linear',
    color: '#000000',
    near: 10,
    far: 50
  },
  ambient: {
    enabled: true,
    intensity: 0.3,
    color: '#333333'
  }
}

const hdriLightingConfig: LightingConfig = {
  preset: 'hdri',
  directional: {
    enabled: false, // HDRI provides its own lighting
    position: [10, 18, 8],
    intensity: 0.5,
    color: '#ffffff'
  },
  hemisphere: {
    enabled: false, // HDRI provides its own lighting
    skyColor: '#ffffff',
    groundColor: '#ffffff',
    intensity: 0.2
  },
  fog: {
    enabled: false,
    type: 'linear',
    color: '#ffffff',
    near: 10,
    far: 100
  },
  ambient: {
    enabled: true,
    intensity: 0.4,
    color: '#ffffff'
  }
}

const defaultSurfaceConfig: SurfaceConfig = {
  shader: 'veins',
  material: {
    metalness: 0.1,
    roughness: 0.8,
    color: '#ffffff'
  },
  displacement: {
    enabled: false,
    scale: 0.1
  },
  animation: {
    enabled: true,
    speed: 1.0
  },
  terrain: {
    type: 'flat',
    height: 2.0,
    frequency: 0.5,
    octaves: 3,
    seed: 12345,
    boundaryDistance: 20
  },
  arena: {
    shader: 'grid',
    material: {
      metalness: 0.8,
      roughness: 0.2,
      color: '#444444'
    },
    height: 2.0,
    thickness: 0.5
  }
}

const defaultAtmosphereConfig: AtmosphereConfig = {
  particles: {
    dust: {
      enabled: false,
      density: 0.5,
      color: '#ffffff'
    },
    spores: {
      enabled: false,
      density: 0.3,
      color: '#90EE90'
    },
    floating: {
      enabled: false,
      density: 0.2,
      color: '#ffffff'
    }
  },
  effects: {
    vignette: {
      enabled: false,
      intensity: 0.5
    },
    bloom: {
      enabled: false,
      intensity: 0.5
    },
    godRays: {
      enabled: false,
      intensity: 0.5
    }
  }
}

const defaultProceduralConfig: ProceduralConfig = {
  hazards: {
    type: 'pillars',
    frequency: 0.5,
    intensity: 0.7,
    patterns: ['random']
  },
  factors: {
    wind: {
      enabled: false,
      strength: 0.5,
      direction: 0
    },
    temperature: {
      enabled: false,
      value: 20
    }
  },
  interactive: {
    breakables: false,
    collectibles: false
  },
  timeBased: {
    dayNightCycle: false,
    cycleSpeed: 1.0
  }
}

export const defaultEnvironmentConfig: EnvironmentConfig = {
  id: 'whitebox',
  name: 'White Box',
  layers: {
    sky: whiteboxSkyConfig,
    lighting: whiteboxLightingConfig,
    surface: defaultSurfaceConfig,
    atmosphere: defaultAtmosphereConfig,
    procedural: defaultProceduralConfig
  },
  metadata: {
    created: new Date(),
    author: 'system',
    tags: ['basic', 'indoor']
  }
}

// Simple presets
const whiteboxPreset: EnvironmentPreset = {
  id: 'whitebox',
  name: 'White Box',
  description: 'Clean white indoor environment',
  config: {
    ...defaultEnvironmentConfig,
    layers: {
      sky: whiteboxSkyConfig,
      lighting: whiteboxLightingConfig,
      surface: defaultSurfaceConfig,
      atmosphere: defaultAtmosphereConfig,
      procedural: defaultProceduralConfig
    }
  },
  thumbnail: '',
  tags: ['basic', 'indoor', 'white']
}

const darkboxPreset: EnvironmentPreset = {
  id: 'darkbox',
  name: 'Dark Box',
  description: 'Dark indoor environment',
  config: {
    ...defaultEnvironmentConfig,
    id: 'darkbox',
    name: 'Dark Box',
    layers: {
      sky: darkboxSkyConfig,
      lighting: darkboxLightingConfig,
      surface: defaultSurfaceConfig,
      atmosphere: defaultAtmosphereConfig,
      procedural: defaultProceduralConfig
    }
  },
  thumbnail: '',
  tags: ['basic', 'indoor', 'dark']
}

const hdriPreset: EnvironmentPreset = {
  id: 'hdri',
  name: 'HDRI Environment',
  description: 'Realistic lighting from HDRI environment map',
  config: {
    ...defaultEnvironmentConfig,
    id: 'hdri',
    name: 'HDRI Environment',
    layers: {
      sky: hdriSkyConfig,
      lighting: hdriLightingConfig,
      surface: defaultSurfaceConfig,
      atmosphere: defaultAtmosphereConfig,
      procedural: defaultProceduralConfig
    }
  },
  thumbnail: '',
  tags: ['realistic', 'outdoor', 'hdri']
}

// Action types
type EnvironmentBuilderAction =
  | { type: 'UPDATE_SKY'; payload: SkyConfig }
  | { type: 'UPDATE_LIGHTING'; payload: LightingConfig }
  | { type: 'UPDATE_SURFACE'; payload: SurfaceConfig }
  | { type: 'UPDATE_ATMOSPHERE'; payload: AtmosphereConfig }
  | { type: 'UPDATE_PROCEDURAL'; payload: ProceduralConfig }
  | { type: 'LOAD_CONFIG'; payload: EnvironmentConfig }
  | { type: 'LOAD_PRESET'; payload: string }
  | { type: 'SAVE_PRESET'; payload: { name: string; description?: string } }
  | { type: 'DELETE_PRESET'; payload: string }
  | { type: 'RESET_TO_DEFAULT' }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_PREVIEW_MODE'; payload: boolean }

// Reducer
function environmentBuilderReducer(
  state: EnvironmentBuilderState,
  action: EnvironmentBuilderAction
): EnvironmentBuilderState {
  switch (action.type) {
    case 'UPDATE_SKY':
      return {
        ...state,
        currentConfig: {
          ...state.currentConfig,
          layers: { ...state.currentConfig.layers, sky: action.payload }
        },
        isDirty: true
      }

    case 'UPDATE_LIGHTING':
      return {
        ...state,
        currentConfig: {
          ...state.currentConfig,
          layers: { ...state.currentConfig.layers, lighting: action.payload }
        },
        isDirty: true
      }

    case 'UPDATE_SURFACE':
      return {
        ...state,
        currentConfig: {
          ...state.currentConfig,
          layers: { ...state.currentConfig.layers, surface: action.payload }
        },
        isDirty: true
      }

    case 'UPDATE_ATMOSPHERE':
      return {
        ...state,
        currentConfig: {
          ...state.currentConfig,
          layers: { ...state.currentConfig.layers, atmosphere: action.payload }
        },
        isDirty: true
      }

    case 'UPDATE_PROCEDURAL':
      return {
        ...state,
        currentConfig: {
          ...state.currentConfig,
          layers: { ...state.currentConfig.layers, procedural: action.payload }
        },
        isDirty: true
      }

    case 'LOAD_CONFIG':
      return {
        ...state,
        currentConfig: action.payload,
        isDirty: false,
        selectedPreset: undefined
      }

    case 'LOAD_PRESET': {
      const preset = state.presets.find(p => p.id === action.payload)
      if (!preset) return state
      return {
        ...state,
        currentConfig: preset.config,
        selectedPreset: action.payload,
        isDirty: false
      }
    }

    case 'SAVE_PRESET': {
      const newPreset: EnvironmentPreset = {
        id: `preset_${Date.now()}`,
        name: action.payload.name,
        description: action.payload.description || '',
        config: state.currentConfig
      }
      const updatedPresets = PresetManager.addPreset(newPreset)
      return {
        ...state,
        presets: updatedPresets,
        selectedPreset: newPreset.id,
        isDirty: false
      }
    }

    case 'DELETE_PRESET': {
      const updatedPresets = PresetManager.deletePreset(action.payload)
      return {
        ...state,
        presets: updatedPresets,
        selectedPreset: state.selectedPreset === action.payload ? undefined : state.selectedPreset
      }
    }

    case 'RESET_TO_DEFAULT':
      return {
        ...state,
        currentConfig: defaultEnvironmentConfig,
        selectedPreset: undefined,
        isDirty: false
      }

    case 'SET_DIRTY':
      return { ...state, isDirty: action.payload }

    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.payload }

    default:
      return state
  }
}

// Initial state
const initialState: EnvironmentBuilderState = {
  currentConfig: defaultEnvironmentConfig,
  presets: [whiteboxPreset, darkboxPreset, hdriPreset, ...PresetManager.loadPresets()],
  isDirty: false,
  previewMode: false
}

// Context
interface EnvironmentBuilderContextType {
  state: EnvironmentBuilderState
  updateSky: (config: SkyConfig) => void
  updateLighting: (config: LightingConfig) => void
  updateSurface: (config: SurfaceConfig) => void
  updateAtmosphere: (config: AtmosphereConfig) => void
  updateProcedural: (config: ProceduralConfig) => void
  loadConfig: (config: EnvironmentConfig) => void
  loadPreset: (presetId: string) => void
  savePreset: (name: string, description?: string) => void
  deletePreset: (presetId: string) => void
  resetToDefault: () => void
  setPreviewMode: (enabled: boolean) => void
}

const EnvironmentBuilderContext = createContext<EnvironmentBuilderContextType | undefined>(undefined)

// Provider component
interface EnvironmentBuilderProviderProps {
  children: ReactNode
}

export function EnvironmentBuilderProvider({ children }: EnvironmentBuilderProviderProps) {
  const [state, dispatch] = useReducer(environmentBuilderReducer, initialState)

  // No need for manual localStorage management - PresetManager handles it

  const contextValue: EnvironmentBuilderContextType = {
    state,
    updateSky: (config) => dispatch({ type: 'UPDATE_SKY', payload: config }),
    updateLighting: (config) => dispatch({ type: 'UPDATE_LIGHTING', payload: config }),
    updateSurface: (config) => dispatch({ type: 'UPDATE_SURFACE', payload: config }),
    updateAtmosphere: (config) => dispatch({ type: 'UPDATE_ATMOSPHERE', payload: config }),
    updateProcedural: (config) => dispatch({ type: 'UPDATE_PROCEDURAL', payload: config }),
    loadConfig: (config) => dispatch({ type: 'LOAD_CONFIG', payload: config }),
    loadPreset: (presetId) => dispatch({ type: 'LOAD_PRESET', payload: presetId }),
    savePreset: (name, description) => dispatch({ type: 'SAVE_PRESET', payload: { name, description } }),
    deletePreset: (presetId) => dispatch({ type: 'DELETE_PRESET', payload: presetId }),
    resetToDefault: () => dispatch({ type: 'RESET_TO_DEFAULT' }),
    setPreviewMode: (enabled) => dispatch({ type: 'SET_PREVIEW_MODE', payload: enabled })
  }

  return (
    <EnvironmentBuilderContext.Provider value={contextValue}>
      {children}
    </EnvironmentBuilderContext.Provider>
  )
}

// Hook to use the context
export function useEnvironmentBuilder(): EnvironmentBuilderContextType {
  const context = useContext(EnvironmentBuilderContext)
  if (!context) {
    throw new Error('useEnvironmentBuilder must be used within an EnvironmentBuilderProvider')
  }
  return context
}