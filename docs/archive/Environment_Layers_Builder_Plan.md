# Environment Layers Building System - Design Plan

## Overview
The current environment system with modes A, B, C is confusing and limited. This plan proposes a modular, layer-based environment builder that allows intuitive world creation through composable layers and extensive controls.

**Current Status**: Phase 2 completed with full terrain and arena geometry controls. Phase 3 (Atmosphere & Procedural layers) ready for implementation. The system now supports:
- Basic lighting presets (White Box, Dark Box, HDRI)
- Terrain geometry sculpting (mountains, buildings, pillars, craters, waves)
- Arena boundary customization with separate materials
- Real-time preview in SceneViewer
- Preset save/load system

## Core Philosophy
- **Modular Layers**: Environments built from independent layers (Sky, Lighting, Surface, Atmosphere, Procedural)
- **Preset + Custom**: Start with presets, then tweak parameters
- **Real-time Preview**: See changes immediately in SceneViewer
- **Extensible**: Easy to add new layer types and controls

## Layer Architecture

### 1. Sky Layer
**Purpose**: Defines the background and ambient lighting
**Options**:
- HDRI Skyboxes (from assets/hdri/)
- Procedural Skyboxes (gradient, noise-based, animated)
- Solid colors for testing
**Controls**:
- Skybox selector dropdown
- Exposure slider (0.1-2.0)
- Rotation slider (0-360°)
- Background toggle (show/hide sky in scene)

### 2. Lighting Layer
**Purpose**: Controls illumination and atmosphere
**Sub-layers**:
- **Directional Light**: Position, intensity, color
- **Hemisphere Light**: Sky/ground colors, intensity
- **Fog**: Type (linear/exp2), color, near/far/density
- **Ambient**: Base illumination level
**Controls**:
- Preset selector (e.g., "Bright Hospital", "Dim Lab", "Outdoor Sunny")
- Individual sliders for each property
- Color pickers for lights/fog

### 3. Surface Layer ✅ ENHANCED
**Purpose**: Arena ground, surrounding terrain geometry, and boundary materials
**Components**:
- **Ground Plane**: Main surface with shader variants and material properties
- **Terrain Geometry**: Procedural terrain generation around arena boundary
- **Arena Boundary**: Separate cylindrical boundary with independent materials
**Options**:
- Shader variants (veins, infection, grid, bioelectric)
- Material properties (metalness, roughness, color)
- Terrain types (flat, mountains, buildings, pillars, craters, waves)
- Geometry modifiers (height, frequency, octaves, boundary distance)
- Arena customization (shader, material, height, thickness)
**Controls**:
- Shader dropdown for ground and arena
- Material sliders (metalness 0-1, roughness 0-1, color picker)
- Terrain type selector with procedural parameters
- Arena boundary controls (height, thickness, material properties)

### 4. Atmosphere Layer
**Purpose**: Particles, effects, and environmental details
**Options**:
- Particle systems (dust, spores, floating elements)
- Screen-space effects (vignette, bloom)
- Volumetric effects (god rays, mist)
- Audio-reactive elements
**Controls**:
- Effect toggles
- Density/intensity sliders
- Color customization
- Animation controls

### 5. Procedural Layer
**Purpose**: Dynamic elements and hazards
**Options**:
- Hazard patterns (pillars, holes, pulses)
- Environmental factors (wind, temperature effects)
- Interactive elements (breakable objects, collectibles)
- Time-based changes (day/night cycles)
**Controls**:
- Factor selector
- Frequency/duration sliders
- Intensity controls
- Pattern customization

## UI Design

### Main Builder Interface
Located in SceneViewer sidebar, expandable sections:

```
┌─ Environment Builder ──────────────────┐
│ ┌─ Lighting Controls ──┐ ┌─ Terrain & Arena ──┐ │
│ │ Preset: Hospital     │ │ Terrain Type:      │ │
│ │ Fog: [x] Near: [--|-]│ │ Mountains          │ │
│ │ Ambient: [-----|---]│ │ Height: [---|-----]│ │
│ └──────────────────────┘ │ Frequency: [--|---]│ │
│                          │ Arena Shader: Grid │ │
│ ┌─ Sky Settings ────────┐ │ Height: [---|-----]│ │
│ │ HDRI: hospital.hdr    │ │ Color: [#444]     │ │
│ │ Exposure: [---|-----]│ └────────────────────┘ │
│ └───────────────────────┘                         │
│ [Save Preset] [Load Preset] [Reset]               │
└───────────────────────────────────────────────────┘
```

### Preset Management
- Save current configuration as named preset
- Load from preset library
- Share presets between scenes
- Environment-specific defaults

### Real-time Preview
- Changes apply immediately to SceneViewer
- Preview different camera angles
- Performance metrics display
- Error indicators for invalid combinations

## Technical Implementation

### Data Structures
```typescript
interface EnvironmentConfig {
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

interface SkyConfig {
  type: 'hdri' | 'procedural' | 'solid'
  hdriPath?: string
  proceduralType?: string
  solidColor?: string
  exposure: number
  rotation: number
  showBackground: boolean
}
```

### Component Architecture
- `EnvironmentBuilder`: Main UI component
- `LayerControls`: Generic controls for each layer type
- `PresetManager`: Handles saving/loading configurations
- `EnvironmentRenderer`: Applies config to Three.js scene
- `PreviewSystem`: Manages real-time updates

### Integration Points
- Replace current A/B/C modes with layer-based rendering
- Extend EnvironmentContext to support layered configs
- Update ProceduralEnvironmentFactory to use new system
- Maintain backward compatibility with existing environments

## Implementation Phases

### Phase 1: Core Infrastructure ✅ COMPLETED
1. ✅ Define TypeScript interfaces for all configs (`src/types/environmentBuilder.ts`)
2. ✅ Create EnvironmentBuilderContext (`src/contexts/EnvironmentBuilderContext.tsx`)
3. ✅ Implement basic layer rendering components:
   - SkyControls (`src/components/environmentBuilder/SkyControls.tsx`)
   - LightingControls (`src/components/environmentBuilder/LightingControls.tsx`)
   - SurfaceControls (`src/components/environmentBuilder/SurfaceControls.tsx`)
   - AtmosphereControls (`src/components/environmentBuilder/AtmosphereControls.tsx`)
   - ProceduralControls (`src/components/environmentBuilder/ProceduralControls.tsx`)
   - Main EnvironmentBuilder component (`src/components/environmentBuilder/EnvironmentBuilder.tsx`)
4. ✅ Add preset storage system (`src/utils/PresetManager.ts`)
5. ✅ Create comprehensive CSS styling (`src/components/environmentBuilder/EnvironmentBuilder.css`)
6. ✅ Add component exports and barrel file (`src/components/environmentBuilder/index.ts`)

**Key Features Implemented:**
- Modular layer-based configuration system
- Real-time state management with React Context
- Persistent preset storage with localStorage
- Comprehensive TypeScript typing
- Collapsible UI with intuitive controls
- Preset save/load/delete functionality
- Dirty state tracking

### Phase 2: Terrain & Arena Controls ✅ COMPLETED

**Status**: Fully implemented and tested
**Features Delivered**:
- Terrain geometry generation with procedural algorithms
- Multiple terrain types: Mountains, Buildings, Pillars, Craters, Waves
- Real-time height, frequency, and octaves controls
- Arena boundary rendering with separate material system
- Arena shader options: Grid, Veins, Solid
- Arena height and color customization
- Integration with Environment Builder UI
- Terrain generation in GroundModeA
- Arena boundaries rendered separately from terrain

**Files Modified**:
- `src/pages/SceneViewer.jsx`: Added terrain generation functions and arena boundary rendering
- `src/contexts/EnvironmentBuilderContext.tsx`: Extended with terrain/arena config types
- `src/components/EnvironmentBuilder/SurfaceControls.tsx`: Added terrain controls
- `src/components/EnvironmentBuilder/EnvironmentBuilder.tsx`: Added Terrain & Arena panel

### Phase 3: Atmosphere & Procedural Layers 🚧 PLANNED

**Status**: Ready for implementation
**Features Planned**:
- Atmosphere layer: Particle systems (dust, spores, medical particles)
- Screen effects: Vignette, chromatic aberration, bloom
- Procedural layer: Environmental hazards and dynamic elements
- Advanced lighting: Volumetric fog, god rays
- Performance optimization for particle systems

### Phase 4: Advanced Features
1. Procedural skybox generation
2. Advanced particle systems
3. Audio-reactive elements
4. Performance optimization
5. Mobile compatibility

### Phase 5: Polish & Testing
1. UI/UX refinements
2. Performance profiling
3. Cross-browser testing
4. Documentation updates
5. User testing

## Benefits
- **Intuitive**: Clear, purpose-driven controls
- **Flexible**: Mix and match any combination
- **Extensible**: Easy to add new layer types
- **Performant**: Only load what's needed
- **Creative**: Endless world-building possibilities

## Migration Strategy
- Keep existing environments working
- Gradually migrate to new system
- Provide conversion tools for old configs
- Maintain API compatibility where possible

## Success Metrics
- Reduced confusion about environment modes
- Increased environment variety in game
- Faster level design iteration
- Positive user feedback on controls