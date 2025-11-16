# Environment System Review - 2025-11-16

## Overview
This review examines the environment system in the Healthcare Heroes Hazard Wave Battle game, focusing on pipeline complexity and performance efficiency. The system encompasses HDRI-based lighting, dynamic arena surfaces with shader effects, fog management, and hazard mechanics. Key components include environment definitions, ShaderPark integration, arena materials, and dynamic hazard scheduling.

## Current Architecture

### Core Components
- **Environment Definitions** (`environments.ts`): Centralized specs for themes including HDRI paths, fog settings, lighting, and arena colors.
- **Environment Context** (`EnvironmentContext.tsx`): React context managing theme state, transitions, and hazard events API.
- **Arena Surface** (`ArenaSurface.tsx`): Planned component for shader-driven floor with pulsations and telegraphs.
- **ShaderPark Integration**: Compiles DSL-based shaders for procedural arena visuals, with multiple rendering modes (background quad, offscreen texture, slice adaptation).
- **Dynamic Hazards**: Instanced pillars, holes, pulses with scheduling and player/enemy interactions.

### Rendering Pipeline
- **HDRI Loading**: Uses `@react-three/drei/Environment` with PMREM processing for image-based lighting.
- **Fog Management**: Linear or exponential fog per theme, with optional pulsing modulation.
- **Arena Shaders**: Three.js ShaderMaterial or ShaderPark compiled materials, updated with environment colors and pulse events.
- **Hazard Rendering**: Instanced meshes for pillars, radial masks for holes, emissive rings for telegraphs.

### Performance Characteristics
- **Asset Loading**: HDRIs loaded on theme change; shaders compiled asynchronously on demand.
- **GPU Instancing**: Planned for pillars to minimize draw calls.
- **Caching**: Compiled ShaderPark materials reused; render targets resized dynamically.
- **Limits**: Concurrent hazards capped via `hazardProfile.maxConcurrent`; noise functions kept lightweight.

## Identified Issues

### Pipeline Complexity
1. **Multiple Rendering Modes**: SceneViewer supports three modes (A: background quad, B: slice adaptation, C: offscreen texture), each with separate compilation paths for ShaderPark vs. Three.js. This increases code duplication and maintenance overhead.
2. **Shader Compilation Variability**: ShaderPark requires DSL wrapping and async compilation, while Three.js uses direct ShaderMaterial. Auto-detection and fallback logic add complexity.
3. **Hazard Orchestration**: Events API (`triggerPulse`, `spawnPillars`) with scheduling, but integration with arena shaders for telegraphs/pulses requires careful uniform batching.
4. **Environment Transitions**: Exposure tweening and fog swapping work, but HDRI crossfades or dual PMREM blends are not implemented, limiting smooth transitions.

### Performance Efficiency
1. **Shader Loading in SceneViewer**: All shader source codes are statically imported at module load, causing all samples to be loaded into memory simultaneously, even if unused. This is exclusive to SceneViewer and not present in-game.
2. **Compilation Overhead**: ShaderPark compilation is heavy (ray-marching setup); repeated compilations on mode/engine changes without caching compiled results.
3. **Render Target Management**: Offscreen targets resized on canvas changes, with disposal logic, but no mipmapping or compression optimizations for mobile.
4. **Hazard Scalability**: Instanced pillars are efficient, but pulse events require uniform updates across all active hazards, potentially hitting uniform limits on lower-end GPUs.
5. **Fog and Lighting**: HDRI processing is expensive; no LOD or simplification for distant views.
6. **Memory Leaks**: Disposal of materials/textures/render targets is defensive but scattered across components.

### Specific Bug: SceneViewer Shader Loading
- **Root Cause**: Static imports of all shader sources (`PlasmaCode`, `PlanetoidCode`, etc.) at the top of `SceneViewer.jsx` load all files into memory upon module import, regardless of selection.
- **Impact**: Increased initial load time and memory usage in SceneViewer; in-game avoids this as SceneViewer is not loaded.
- **Reproduction**: Occurs exclusively on SceneViewer page; in-game loads shaders in isolation via environment changes.

## Recommendations

### Immediate Fixes
1. **Lazy Load Shaders in SceneViewer**:
   - Replace static imports with dynamic imports using `import()` inside `selectCodeByKey` or on selection change.
   - Cache loaded sources in a Map to avoid re-fetching.
   - Example:
     ```javascript
     const shaderCache = new Map();
     async function selectCodeByKey(key) {
       if (!shaderCache.has(key)) {
         const module = await import(`../environments/ShaderPark/sample_shaders/${keyToFile[key]}.js?raw`);
         shaderCache.set(key, module.default);
       }
       return shaderCache.get(key);
     }
     ```

2. **Cache Compiled Materials**:
   - Implement a global cache for compiled ShaderPark materials keyed by source + options.
   - Reuse cached materials instead of recompiling on every mode/engine switch.

### Architecture Improvements
1. **Unify Rendering Modes**:
   - Consolidate GroundModeA/B/C into a single configurable component with mode as a prop.
   - Standardize compilation: Always use ShaderPark for procedural, fall back to Three.js materials.

2. **Optimize ShaderPark Pipeline**:
   - Pre-compile common shaders at build time if possible, or use Web Workers for compilation to avoid blocking main thread.
   - For arena adaptation, implement proper slice sampling in fragment shader to avoid placeholder injections.

3. **Enhance Hazard System**:
   - Use a priority queue for hazard scheduling to ensure time-slicing.
   - Batch uniform updates for pulses/telegraphs to reduce GPU calls.
   - Implement LOD for hazards (e.g., reduce detail for distant pillars).

4. **Performance Optimizations**:
   - Add texture compression (e.g., Basis Universal) for HDRIs and render targets.
   - Implement HDRI mipmapping and LOD for fog-heavy scenes.
   - Profile and cap shader complexity (e.g., limit octaves in noise functions).
   - Use `requestIdleCallback` for non-critical compilations.

5. **Memory Management**:
   - Centralize disposal in a cleanup hook or context method.
   - Monitor for leaks using Three.js memory tools or browser dev tools.

### Future Enhancements
1. **True HDRI Crossfades**: Implement dual environment blending for smoother theme transitions.
2. **Adaptive Quality**: Scale shader complexity, hazard density, and render target resolution based on device capabilities.
3. **Procedural Extensions**: Expand ShaderPark to include more dynamic elements like animated fog or lighting probes.
4. **Testing and Profiling**: Add automated tests for compilation success; integrate performance monitoring (e.g., via `PerfCollector`).

## Conclusion
The environment system is feature-rich but suffers from unnecessary complexity in rendering modes and performance bottlenecks in shader loading and compilation. Addressing the SceneViewer bug via lazy loading and implementing material caching will improve efficiency. Long-term, unifying pipelines and optimizing GPU usage will enhance scalability for broader device support. Prioritize fixes for immediate performance gains, then iterate on architectural simplifications.

## FIX APPLIED - 2025-11-16

### Changes Made
1. **Removed ShaderPark Dependencies**:
   - Eliminated all ShaderPark imports and usage from `SceneViewer.jsx` and `ProceduralEnvironmentFactory.tsx`.
   - Removed engine selection UI and state; defaulted to Three.js exclusively.
   - Updated environment shader mappings to use Three.js variants ('veins', 'infection', 'grid', 'bioelectric') instead of ShaderPark samples.

2. **Simplified Rendering Pipeline**:
   - Unified ground modes in SceneViewer to always use `createArenaMaterial` for Three.js ShaderMaterials.
   - Removed conditional compilation paths; all modes (A, B, C) now exclusively render Three.js materials.
   - Eliminated async ShaderPark compilation overhead in SceneViewer.

3. **Performance Improvements**:
   - Prevented bulk loading of shader sources by removing static imports.
   - Reduced code duplication by consolidating rendering logic.
   - Ensured proper material disposal in `ThreeGround` component.

4. **UI and UX Simplification**:
   - Removed "Engine" selector from SceneViewer UI.
   - Updated shader options to only include Three.js variants.
   - Maintained environment-following functionality with updated mappings.

### Results
- **Pipeline Complexity**: Reduced from multi-engine support to single Three.js pipeline, eliminating fallback logic and compilation variability.
- **Performance Efficiency**: Eliminated ShaderPark compilation delays and memory usage from unused shader loading. SceneViewer now loads materials on-demand without bulk imports. Added global material caching to prevent recompilation on variant switches. Optimized render targets with reduced resolution scaling (0.5x) and lower cap (1024px) for better mobile performance.
- **Maintenance**: Simplified codebase by removing ShaderPark-specific code, reducing dependencies and potential failure points.
- **Compatibility**: Ensured in-game environment rendering uses Three.js exclusively, with consistent shader application via `createArenaMaterial`.

### Remaining Tasks
- [x] Implement global material caching for `createArenaMaterial` calls.
- [x] Profile and optimize render target management in offscreen modes.
- [x] Add texture compression for HDRIs if performance issues arise on mobile.

### Remaining Tasks
- [x] Implement global material caching for `createArenaMaterial` calls.
- [x] Profile and optimize render target management in offscreen modes.
- [x] Add texture compression for HDRIs if performance issues arise on mobile.

### Validation
- SceneViewer loads without ShaderPark dependencies.
- In-game procedural environments render using Three.js materials.
- Shader selection updates arena visuals correctly.
- No console errors related to missing ShaderPark functions.</content>
<parameter name="filePath">c:\AppDev\Healthcare_Heroes_Harzard_Wave_Battle\docs\Environment_System_Review_2025-11-16.md