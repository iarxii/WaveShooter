# Environment Layers Building System - Design Plan

## Overview
The current environment system with modes A, B, C is confusing and limited. This plan proposes a modular, layer-based environment builder that allows intuitive world creation through composable layers and extensive controls.

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

### 3. Surface Layer
**Purpose**: Arena ground and surrounding geometry
**Options**:
- Shader variants (veins, infection, grid, bioelectric)
- Material properties (metalness, roughness)
- Geometry modifiers (displacement, normal maps)
- Vertex effects (animation, deformation)
**Controls**:
- Shader dropdown
- Material sliders (metalness 0-1, roughness 0-1)
- Displacement toggle/slider
- Animation speed controls

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
│ ┌─ Sky Layer ──────────┐ ┌─ Lighting ──┐ │
│ │ HDRI: hospital.hdr   │ │ Preset:     │ │
│ │ Exposure: [---|-----]│ │ Hospital    │ │
│ │ Rotation: [-----|---]│ │ Fog: [x]    │ │
│ └──────────────────────┘ │ Near: [--|-]│ │
│                          └─────────────┘ │
│ ┌─ Surface ─────────────┐ ┌─ Atmosphere─┐ │
│ │ Shader: veins         │ │ Particles:  │ │
│ │ Metalness: [-----|---]│ │ Dust [x]    │ │
│ │ Displacement: [x]     │ │ Spores [ ]  │ │
│ └───────────────────────┘ └─────────────┘ │
│ ┌─ Procedural ──────────┐                 │
│ │ Hazards: pillars      │                 │
│ │ Frequency: [---|-----]│                 │
│ │ Intensity: [-----|---]│                 │
│ └───────────────────────┘                 │
│ [Save Preset] [Load Preset] [Reset]       │
└───────────────────────────────────────────┘
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

### Phase 2: UI Controls Integration ✅ COMPLETED
1. ✅ Build collapsible layer control panels (done in Phase 1)
2. ✅ Implement sliders, dropdowns, color pickers (done in Phase 1)
3. ✅ Add preset save/load functionality (done in Phase 1)
4. ✅ Integrate with SceneViewer:
   - Added EnvironmentBuilderProvider to AppRouter
   - Replaced old SceneViewer controls with EnvironmentBuilder component
   - Created EnvironmentRenderer component to apply configs to Three.js scene
   - Connected surface layer to ground rendering modes (A, B, C)
   - Removed old shaderKey/shader management in favor of environment builder state

### Phase 3: Layer Implementation
1. Sky layer (HDRI + procedural)
2. Lighting layer (fog, lights)
3. Surface layer (shaders, materials)
4. Atmosphere layer (particles, effects)
5. Procedural layer (hazards, factors)

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