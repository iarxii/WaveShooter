# Revised Creature Procedural Factory System

## Overview
This document consolidates and expands the design for a **Creature Procedural Factory** system, integrating procedural mesh generation with the AvatarTuner workflow. It enables designers to create Infection Vectors (bosses) and Support Vectors (allies) procedurally, matching avatar images while maintaining performance.

## Goals
- Procedurally generate complex creature meshes with anatomical accuracy.
- Integrate with AvatarTuner for real-time tweaking and export.
- Ensure deterministic generation using seeds.
- Optimize for low memory usage and minimal draw calls (<5 per creature).
- Support instancing for swarms and LOD for performance.

## Architecture
### Core Components
- **CreatureMeshBuilder**: Orchestrates mesh generation.
- **BodyPartGenerators**: Modular kits (Insect, Mammal, Bird).
- **MeshCombinator**: Merges geometries into one mesh.
- **MaterialPool**: Shared materials for efficiency.
- **LODManager**: Handles detail reduction.

### File Structure
- `src/characters/factory/CreatureMeshBuilder.ts`
- `src/characters/factory/parts/` (kits)
- `src/characters/factory/MeshCombinator.ts`
- `src/characters/factory/MaterialPool.ts`
- `src/pages/AvatarTuner.tsx` (extended with creature sliders)
- `src/characters/factory/CreatureRoster.ts`

## Workflow Integration with AvatarTuner
- Add **Creature Mode** in AvatarTuner.
- Image-driven auto-suggest for morphology (detect wings, legs).
- Sliders for body segments, wing span, limb count.
- Real-time preview using Three.js.
- Export JSON specs to `assets/creatures/<id>.json`.

## Spec Schema
```typescript
interface CreatureMeshSpec {
  id: string;
  seed: number;
  kind: 'insect' | 'mammal' | 'bird' | 'other';
  body: { length: number; width: number; height: number; segments: number };
  appendages: { limbs: { count: number; length: number }; wings?: { span: number; length: number; flapHz: number }; antennae?: { count: number; length: number }; tail?: { length: number } };
  features: { eyes: { size: number; count: number }; mouth: { type: string }; texture: string };
  colors: { body: string; accent: string; eyes: string };
  detail: number;
}
```

## Mesh Generation Techniques
- **Base Geometry**: Procedural vertices via BufferGeometry.
- **Part Generators**: Kits for insects, mammals, birds.
- **Mesh Combination**: Merge geometries for single draw call.
- **Texturing**: Procedural patterns using noise.
- **Animation**: Morph targets or vertex shaders for wings/limbs.

## Performance Considerations
- Use instancing for swarms.
- Apply LOD at distance or low FPS.
- Merge meshes to reduce draw calls.
- Compress specs (<1KB JSON).

## Implementation Plan
### Completed Phases
1. ✅ **Phase 1**: Built InsectBodyGenerator, MeshCombinator, CreatureMeshBuilder, MaterialPool, CreatureSpec schema.
2. ✅ **Phase 2 (Partial)**: Integrated with CreatureFactory, added CreatureRoster with insect specs, basic CreatureFromSpec component.
3. ✅ **Phase 3**: Extended AvatarTuner with creature mode, presets, conditional sliders, and export functionality.
4. ✅ **Phase 2 Extension**: Added MammalBodyGenerator and BirdBodyGenerator kits; updated CreatureMeshBuilder to handle mammal/bird kinds; added corresponding specs to CreatureRoster (rat_king, vulture_harbinger, swallow_sweep, therapy_dog).
5. ✅ **Phase 4 (Partial)**: Added basic animation (spin and breathe) to CreatureFromSpec; LODManager pending.
6. ✅ **Model Viewer**: Added GLB model loading support; updated CreatureSpec with modelUrl, CreatureFromSpec to conditionally load GLB or procedural.

### Pending Phases
7. **Phase 4 (LOD)**: Implement LODManager for detail reduction.
8. **Testing**: Validate silhouettes against avatar images, run performance tests for FPS and draw calls.

## Integration Checklist
- ✅ Add Infection Vectors and Support Vectors to roster (specs added to CreatureRoster).
- ✅ Map `specId` to procedural specs in `CreatureRoster.ts`.
- ✅ Hook up `CreatureFromSpec` in renderer (fixed AvatarTuner render to switch based on mode).
- ✅ Implement MammalBodyGenerator and BirdBodyGenerator kits.
- ✅ Unify spec state in AvatarTuner (removed separate creatureSpec, now uses union type).
- ✅ Add Model Viewer: Support GLB loading with modelUrl field in specs.
- ⏳ Verify performance and visual fidelity (pending mesh generation testing for non-insect creatures).

---

## Original Context and Details
Based on the provided code and design document, I'll contextualize how the current `AvatarTuner.tsx` works for building procedural enemies (specifically pathogens). This will serve as a solid base for implementing the new complex procedural mesh builder for creatures (Infection Vectors and Support Vectors). I'll break it down step-by-step, highlighting the workflow, key components, and how to adapt it for creature generation.

### 1. **Overall Workflow of AvatarTuner**
AvatarTuner is a React-based tool for designers to create procedural 3D models for pathogens (e.g., viruses, bacteria) by tweaking parameters in real-time. It doesn't use external 3D software—instead, it generates meshes procedurally using Three.js and custom specs. The process is:

- **Input**: Upload an image (e.g., a pathogen avatar) or pick from a gallery.
- **Auto-Generation**: Extracts dominant colors and shape hints (e.g., detail level, spike count) from the image using computer vision-like techniques (k-means for colors, contrast analysis for complexity).
- **Spec Creation**: Builds an `AvatarSpec` object with parameters like shape, colors, spikes, animations, etc.
- **Tweaking**: UI sliders and controls let you adjust the spec in real-time.
- **Preview**: Renders the 3D model in a Three.js canvas for instant feedback.
- **Export**: Saves the spec as JSON for use in the game.

This is efficient for pathogens because they are abstract shapes (spheres, icosahedrons) with add-ons (spikes, nodes). For creatures, we'll extend this to full meshes with anatomical parts.

### 2. **Key Components and How They Work**
Here's a breakdown of the main parts, with code references:

#### **Image Processing and Spec Initialization**
- **Dominant Colors Extraction** (`dominantColors` function):
  - Uses k-means clustering (k=3) on image pixels to find 3 main colors.
  - Samples every 4th pixel for speed; outputs hex strings (e.g., `#B5764C`).
  - Why? Pathogens often have 2-3 color palettes (core, spikes, accents). For creatures, we can adapt this to extract body, accent, and eye colors.

- **Shape Hints Estimation** (`estimateShapeHints` function):
  - Analyzes image contrast/variance to suggest complexity (e.g., high contrast = more spikes/details).
  - Outputs: `detail` (0-2 for LOD), `spikeCount` (24-60), `spikeLength`, `nodeCount`, `arcCount`.
  - Why? Automates starting points. For creatures, we could add silhouette analysis (e.g., detect wings, legs) using edge detection or bounding boxes.

- **Spec Building** (in `onDrop` or `onPickImage`):
  - Creates an `AvatarSpec` with defaults + image-derived values.
  - Example: For a high-contrast image, sets `detail: 2`, `spikeCount: 50`.
  - Presets (e.g., `makeInfluenzaSpec`) hardcode specs for specific bosses, overriding auto-suggest.

#### **UI and Controls**
- **File Upload/Gallery**: Drop an image or pick from `enemyImageUrls` (Vite glob for assets).
- **Sliders and Inputs**: For each spec property (e.g., radius, spikeCount, colors). Updates the spec state on change.
- **Presets**: Buttons for boss types (e.g., Influenza) that apply pre-made specs.
- **Export**: Downloads the spec as JSON.

#### **3D Rendering and Preview**
- **Canvas Setup**: Uses `@react-three/fiber` with OrbitControls for 3D interaction.
- **Model Rendering**: Conditionally renders based on `previewEntityMesh`:
  - If false: Uses `<Pathogen spec={spec} />` (procedural pathogen mesh).
  - If true: Placeholder for entity mesh (currently a cone or something).
- **Lighting**: Switches between dark/light modes for better visibility.
- **Real-Time Updates**: Spec changes re-render the model instantly.

#### **Spec Schema (AvatarSpec.ts)**
- Defines parameters like `baseShape` (e.g., 'icosahedron'), `spikeCount`, colors, animations.
- For pathogens: Focuses on geometric primitives + ornaments.
- Adaptable: We can extend this for creatures (e.g., add `bodySegments`, `wingSpan`).

### 3. **Strengths as a Base for Creature Builder**
- **Modular and Extensible**: The spec-driven approach (image → auto-suggest → tweak → export) is perfect for creatures. We can add a "Creature" tab with new sliders (e.g., leg count, wing span).
- **Real-Time Feedback**: Canvas preview ensures designers see changes instantly, crucial for matching avatars.
- **Performance**: Generates meshes on-the-fly without heavy assets.
- **Integration**: Already exports JSON to `assets/avatars/`, which we can mirror for `assets/creatures/`.

### 4. **How to Adapt for Complex Creature Meshes**
Using the design doc, here's how to build on AvatarTuner:

- **Add a "Creature" Mode/Tab**:
  - New state: `mode: 'pathogen' | 'creature'`.
  - Switch UI: Pathogen sliders vs. creature sliders (body length, appendages).

- **Extend Spec**:
  - Create `CreatureMeshSpec` (as in the doc) or extend `AvatarSpec`.
  - For image input: Analyze silhouette (e.g., detect if it has wings via aspect ratio or edge detection) to suggest `kind: 'insect'`.

- **Mesh Generation**:
  - Replace `<Pathogen />` with `<CreatureMesh spec={spec} />` using the new `CreatureMeshBuilder`.
  - Kits: InsectBodyGenerator for segmented bodies, etc.

- **UI Sliders**:
  - Add controls for `body.segments`, `appendages.wings.span`, colors, etc.
  - Presets: For each creature type (e.g., "Cockroach Broodmother").

- **Export/Import**:
  - Save to `assets/creatures/<id>.json`.
  - Load existing specs for editing.

This setup provides a proven workflow: image-driven auto-suggest, tweakable parameters, and live 3D preview. We can start with insect kits (e.g., for bees/cockroaches) and expand.

If you'd like, I can start implementing the creature tab or a basic InsectBodyGenerator based on this! Let me know what to tackle first.

# Procedural Mesh Generation for Complex Creatures

## Overview
This design document outlines a system for procedurally generating full 3D meshes for complex creatures (Infection Vectors and Support Vectors) in the Healthcare Heroes game. Unlike the existing pathogen system that uses grouped primitives, this approach will create unified, low-poly meshes that resemble real creatures with bodies, appendages, and features. The system will integrate with the AvatarTuner page for designer control and ensure performance through instancing, pooling, and LOD.

## Goals
- Generate visually distinct, creature-like meshes that match provided avatar images or roster specs.
- Support complex morphologies: multi-segmented bodies, limbs, wings, antennae, tails, etc.
- Maintain determinism using seeds for stable silhouettes.
- Keep memory usage low: share geometries/materials, use instancing for swarms.
- Integrate seamlessly with existing factories (CreatureFactory) and AvatarTuner UI.
- Allow real-time tweaking in AvatarTuner for rapid iteration.

## Challenges
- Creatures have more anatomical complexity than pathogens (e.g., articulated limbs, wings, fur/scales).
- Need full mesh generation instead of primitive grouping to avoid seams and improve performance.
- Balance detail with draw calls: aim for <5 draw calls per creature.
- Ensure procedural generation is fast enough for runtime use.

## Architecture

### Core Components
1. **CreatureMeshBuilder**: Main class that orchestrates mesh generation based on spec.
2. **BodyPartGenerators**: Modular generators for specific parts (e.g., InsectBody, MammalLimbs, BirdWings).
3. **MeshCombinator**: Combines individual part geometries into a single BufferGeometry.
4. **MaterialPool**: Shared materials with instanced properties for colors/textures.
5. **LODManager**: Reduces detail at distance or low FPS.

### File Structure
- `src/characters/factory/CreatureMeshBuilder.ts` – Core builder class.
- `src/characters/factory/parts/` – Subfolders for each kit (insect/, mammal/, bird/, etc.).
  - `InsectBodyGenerator.ts`
  - `MammalFurGenerator.ts`
  - etc.
- `src/characters/factory/MeshCombinator.ts` – Merges geometries.
- `src/characters/factory/MaterialPool.ts` – Pooled materials.
- `src/pages/AvatarTuner.tsx` – Extend with creature tabs, sliders for morphology (e.g., wingspan, leg count).
- `src/characters/factory/CreatureRoster.ts` – Updated with mesh specs.

### Spec Schema (Extension)
Extend `CreatureSpec.ts` to include mesh parameters:
```typescript
interface CreatureMeshSpec {
  id: string;
  seed: number;
  kind: 'insect' | 'mammal' | 'bird' | 'reptile' | 'other';
  body: {
    length: number;
    width: number;
    height: number;
    segments: number; // For multi-segmented bodies
  };
  appendages: {
    limbs: { count: number; length: number; thickness: number };
    wings?: { span: number; length: number; flapHz: number };
    antennae?: { count: number; length: number };
    tail?: { length: number; type: 'straight' | 'curved' };
  };
  features: {
    eyes: { size: number; count: number };
    mouth: { type: 'beak' | 'mandibles' | 'snout' };
    texture: 'smooth' | 'fur' | 'scales' | 'feathers';
  };
  colors: {
    body: string;
    accent: string;
    eyes: string;
  };
  detail: number; // 0-2 for LOD
}
```

## Mesh Generation Techniques

### 1. Base Geometry Creation
- Use Three.js `BufferGeometry` to build custom vertex/indices.
- For each part, generate vertices, normals, UVs procedurally.
- Example: For a segmented insect body, create cylinders or ellipsoids connected smoothly.

### 2. Part-Specific Generators
- **Insect Kit**:
  - Body: Multi-segmented ellipsoid chain.
  - Limbs: Thin cylinders with joints.
  - Wings: Thin planes with deformation for flapping.
  - Antennae: Curved lines or thin cones.
- **Mammal Kit**:
  - Body: Rounded ellipsoid.
  - Limbs: Cylinders with paws/feet.
  - Tail: Curved spline.
  - Fur: Use vertex displacement or normal maps (procedural).
- **Bird Kit**:
  - Body: Streamlined ellipsoid.
  - Wings: Large planes with feather details (subdivided quads).
  - Beak: Cone or pyramid.
  - Feathers: Procedural texture overlay.
- **Reptile Kit** (for rats, etc.):
  - Body: Scaled ellipsoid.
  - Limbs: Short cylinders.
  - Tail: Long cylinder.
  - Scales: Bump mapping.

### 3. Mesh Combination
- Use `BufferGeometryUtils.mergeBufferGeometries()` to combine parts into one mesh.
- Apply transformations (position, rotation, scale) per part before merging.
- Ensure smooth normals at joints to avoid seams.

### 4. Texturing and Materials
- Procedural textures: Generate patterns (stripes, spots) using noise functions (e.g., Simplex noise).
- Materials: Use `MeshStandardMaterial` with shared instances.
- For fur/feathers: Use alpha maps or vertex colors for detail without extra geometry.

### 5. Animation Support
- Pre-compute deformation for wings/limbs.
- Use morph targets or vertex shaders for runtime animation (e.g., flapping).
- Keep low-poly: <1000 vertices per creature.

## Integration with AvatarTuner
- Add a "Creature" tab in AvatarTuner.
- Sliders for key parameters: body segments, wing span, limb count, etc.
- Real-time preview: Generate mesh on slider change.
- Export: Save spec as JSON to `assets/creatures/<id>.json`.
- Import: Load spec and apply to preview.

## Performance Considerations
- **Pooling**: Reuse geometries for similar creatures (e.g., all bees share base mesh, vary colors).
- **Instancing**: For swarms (bees, ladybugs), use `InstancedMesh`.
- **LOD**: At detail=0, reduce segments/vertices by 50%; hide wings if far.
- **Draw Calls**: Merge into single geometry; use texture atlases.
- **Memory**: Limit unique meshes; compress specs to <1KB JSON.
- **Runtime**: Generate meshes asynchronously or pre-bake for common ones.

## Implementation Plan
1. **Phase 1**: Implement basic InsectBodyGenerator and MeshCombinator.
2. **Phase 2**: Add kits for other types; integrate with CreatureFactory.
3. **Phase 3**: Extend AvatarTuner with creature controls.
4. **Phase 4**: Add animation, LOD, and performance tuning.
5. **Testing**: Verify against roster entries; run wave tests for FPS.

## Acceptance Criteria
- Creatures render with <5 draw calls.
- Meshes look creature-like, match silhouettes to avatars.
- Deterministic generation.
- AvatarTuner allows tweaking and export.
- No performance regression; FPS >45 in waves.

## Risks and Mitigations
- Complexity: Start with simple kits (insect), expand iteratively.
- Performance: Profile early; use WebGL debug tools.
- Art Matching: Iterate with designer feedback on specs.

This doc can be refined based on your input. Let's discuss specific kits or parameters next!

# Creature Factory Context

## Goal
Add infection-vector bosses (Tier-4) and support allies procedurally, matching designer-provided avatar images, with low memory and draw calls.

## Files
- `src/characters/factory/CreatureSpec.ts` – schema
- `src/characters/factory/CreatureFactory.tsx` – dispatch to kits
- `src/characters/kits/*Model.tsx` – Insect, Worm, Mammal, Bird parametric builders
- `src/characters/factory/CreatureRoster.ts` – id → spec mapping
- `src/pages/AvatarTuner.tsx` – reuse; extend with creature sliders (wingspan, leg pairs, etc.)

## Rules
- Use **seed** derived from filename hash if not provided to keep silhouettes stable.
- Reuse pooled geometries/materials where possible.
- Bosses (T4) must keep `Max Concurrent = 1`; supports are timed and capped at 1.
- Respect existing portal-based wave pacing and boss cadence; do not backlog spawns during pause.
- Apply ally/effect caps to preserve FPS.

## Tasks
1. **Add/Update Spec from Image**
   - Open `AvatarTuner`, import image, tweak morphology/colors to match.
   - Export JSON → `assets/creatures/<id>.json`.
   - Import in `CreatureRoster.ts` or load dynamically; set `unlockLevel`, tier in balancing table.

2. **Performance**
   - For instanced swarms (bees, ladybugs): `instanced=true`; cap count in gameplay.
   - LOD: if camera far or FPS < 45, reduce `detail` and hide wings’ transparency.

3. **Verification**
   - Compare preview to avatar; check silhouette and palette.
   - Run 2-minute wave test; confirm no stutter, draw calls per creature ≤ 5.

---
## Example Guide
Perfect—here’s a clean, **copy‑paste ready** list you can drop into your project to extend the **roster** with:

*   **5 Infection‑Vector Tier‑4 bosses** (cockroach, fly, mosquito, rat, vulture)
*   **5 Support vectors** (bees, ladybugs, dragonflies, swallows, therapy dog)

I’ve matched the field style you’re already using in `roster.js`—`name`, `type`, `gameplayEffect`, `tier`, `unlock`, `stats`, `maxConcurrent`, and `vfx`—so this plugs in without breaking your existing UIs and filters. I also added an optional `specId` so your **CreatureFactory** can pick the correct procedural model per entry. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)

***

## 1) Infection‑Vector bosses (append these to `ENEMIES`)

> Paste **inside** the exported `ENEMIES` array, preferably after your “Viruses / Major Bosses” section.

```js
// --- Infection Vectors (Tier-4 Bosses) ---
{
  name: 'Broodmother Cockroach',
  type: 'Vector (Boss)',
  scientificName: 'Periplaneta americana (colony)',
  realWorldEffect: 'Household pest; linked to allergen/asthma triggers and pathogen carriage',
  gameplayEffect: 'Ootheca Burst — spawns 8–12 roachlings in a forward cone; leaves slow trail for 3s',
  shape: 'Model',
  color: '#B36A2E',
  tier: 4,
  unlock: 22,
  stats: { health: 18, speed: 2.0, damage: 7 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#B36A2E' },
    onSpecial: { type: 'spawnCone', color: '#B36A2E' },
    onAura: { type: 'slowTrail', color: '#8C4F1E' }
  },
  specId: 'cockroach_broodmother'
},
{
  name: 'Plague Fly Colossus',
  type: 'Vector (Boss)',
  scientificName: 'Musca domestica (oversized)',
  realWorldEffect: 'Mechanical transmission of pathogens; contaminates food and surfaces',
  gameplayEffect: 'Carrion Buzz — AoE slow + aim shake; spawns 6 maggots on hit',
  shape: 'Model',
  color: '#2F2F2F',
  tier: 4,
  unlock: 23,
  stats: { health: 16, speed: 2.4, damage: 6 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#8FE1E9' },
    onAura: { type: 'buzzField', color: '#8FE1E9', pulse: true },
    onSpecial: { type: 'maggotSpawn', color: '#8FE1E9' }
  },
  specId: 'fly_colossus'
},
{
  name: 'Mosquito Matriarch',
  type: 'Vector (Boss)',
  scientificName: 'Anopheles spp (queen)',
  realWorldEffect: 'Vector for malaria and arboviruses; hematophagic behavior',
  gameplayEffect: 'Proboscis Drain — life‑steal tether; gains temporary shield',
  shape: 'Model',
  color: '#3D3A38',
  tier: 4,
  unlock: 24,
  stats: { health: 15, speed: 2.6, damage: 6 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#E7B466' },
    onSpecial: { type: 'lifeDrainTether', color: '#E7B466' },
    onAura: { type: 'shieldGain', color: '#E7B466' }
  },
  specId: 'mosquito_matriarch'
},
{
  name: 'Sewer Rat King',
  type: 'Vector (Boss)',
  scientificName: 'Rattus norvegicus (alpha)',
  realWorldEffect: 'Reservoir/vector for multiple pathogens; urban infestation risks',
  gameplayEffect: 'Filth Charge — dash + toxin splash; summons 4 runners briefly',
  shape: 'Model',
  color: '#6B5D52',
  tier: 4,
  unlock: 25,
  stats: { health: 17, speed: 2.2, damage: 7 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#6B5D52' },
    onSpecial: { type: 'toxinSplash', color: '#7A6A5E' },
    onAura: { type: 'runnerSummon', color: '#6B5D52' }
  },
  specId: 'rat_king'
},
{
  name: 'Carrion Vulture',
  type: 'Vector (Boss)',
  scientificName: 'Gyps spp (carrion scout)',
  realWorldEffect: 'Scavenger; carcass contact and long-range movement',
  gameplayEffect: 'Swoop & Drop — high‑arc dive; drops carcass hazard (DoT zone)',
  shape: 'Model',
  color: '#2B2F3A',
  tier: 4,
  unlock: 26,
  stats: { health: 19, speed: 2.1, damage: 8 },
  maxConcurrent: 1,
  vfx: {
    onHit: { type: 'bulletHit', color: '#E5B65D' },
    onSpecial: { type: 'swoopTelegraph', color: '#E5B65D' },
    onAura: { type: 'carcassZone', color: '#8A6B33' }
  },
  specId: 'vulture_harbinger'
},
```

> These follow your roster’s structure (field names, vfx blocks, tier/unlock model). You can tune numbers later with your existing balancing knobs and boss cadence. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)

***

## 2) Support vectors (add a new `ALLIES` list)

Your file doesn’t currently expose allies, so add this new export **below** `HEROES`. The fields mirror your style and remain small; `duration` gives your game logic an easy way to despawn them. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)

```js
// Support vectors (Allies) – timed & capped to preserve FPS
export const ALLIES = [
  {
    name: 'Honeybee Medics',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Healing Pollen Aura — +4 HP/s regen; cleans slow debuffs',
    shape: 'Model',
    color: '#FFC93B',
    stats: { health: 8, speed: 3.0, damage: 0 },
    duration: 15,           // seconds
    maxConcurrent: 1,
    vfx: {
      onAura: { type: 'healingPollen', color: '#FFC93B', pulse: true }
    },
    specId: 'bee_medics'
  },
  {
    name: 'Ladybug Sterilizers',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Debride Clouds — clears toxin/spore hazards on contact; tiny stun',
    shape: 'Model',
    color: '#CE2A2A',
    stats: { health: 6, speed: 3.2, damage: 0 },
    duration: 15,
    maxConcurrent: 1,
    vfx: {
      onAura: { type: 'hazardClear', color: '#CE2A2A' }
    },
    specId: 'ladybug_sterilizers'
  },
  {
    name: 'Dragonfly Sentinels',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Vector Hunt — prioritizes aerial enemies; +50% damage vs flies/mosquitoes',
    shape: 'Model',
    color: '#2C566E',
    stats: { health: 7, speed: 3.5, damage: 3 },
    duration: 15,
    maxConcurrent: 1,
    vfx: {
      onTrail: { type: 'wingStreak', color: '#9FE8FF' }
    },
    specId: 'dragonfly_sentinels'
  },
  {
    name: 'Therapy Dog',
    type: 'Ally',
    role: 'Support Vector',
    gameplayEffect: 'Morale Aura — +10% damage resist, +2 HP/s; cleans fear on life loss',
    shape: 'Model',
    color: '#7A5D43',
    stats: { health: 12, speed: 3.0, damage: 0 },
    duration: 20,
    maxConcurrent: 1,
    vfx: {
      onAura: { type: 'moraleGlow', color: '#E9D6C0' }
    },
    specId: 'therapy_dog'
  }
];
```

> If your UI needs filtering like enemies, you can optionally add:

```js
export function filterAllies() {
  return ALLIES.slice(); // trivial now; extend later if needed
}
```

***

## 3) Visual hookup (CreatureFactory / specs)

Each new roster item carries a `specId` that should map to a **procedural spec** your factory can render (as we discussed). If you’re using `CreatureRoster.ts`, add these entries so the game can instantiate models by `specId`:

```ts
// src/characters/factory/CreatureRoster.ts (excerpt)
export const CreatureRoster = {
  cockroach_broodmother: { id:'cockroach_broodmother', seed:91021, kind:'cockroach', bodyColor:'#5C3A23', accentColor:'#C4A074', bodySegments:3, legPairs:3, antennae:2, hasWings:false, detail:1 },
  fly_colossus:          { id:'fly_colossus', seed:44112, kind:'fly', bodyColor:'#2F2F2F', accentColor:'#8FE1E9', hasWings:true, wingSpan:1.2, wingLength:1.0, eyeSize:0.16, flapHz:11, detail:1 },
  mosquito_matriarch:    { id:'mosquito_matriarch', seed:66331, kind:'mosquito', bodyColor:'#3D3A38', accentColor:'#E7B466', hasWings:true, wingSpan:1.0, wingLength:1.1, stinger:true, flapHz:18, detail:1 },
  rat_king:              { id:'rat_king', seed:77005, kind:'rat', bodyColor:'#6B5D52', tailLen:0.7, detail:1 },
  vulture_harbinger:     { id:'vulture_harbinger', seed:55090, kind:'vulture', bodyColor:'#2B2F3A', accentColor:'#E5B65D', beakLen:0.22, flapHz:6, detail:1 },

  bee_medics:            { id:'bee_medics', seed:31415, kind:'bee', bodyColor:'#2F2B2B', accentColor:'#FFC93B', hasWings:true, wingSpan:0.9, wingLength:0.8, flapHz:16, detail:0, instanced:true },
  ladybug_sterilizers:   { id:'ladybug_sterilizers', seed:27182, kind:'ladybug', bodyColor:'#CE2A2A', accentColor:'#1E1E1E', hasWings:true, wingSpan:0.6, wingLength:0.4, flapHz:10, detail:0, instanced:true },
  dragonfly_sentinels:   { id:'dragonfly_sentinels', seed:16180, kind:'dragonfly', bodyColor:'#2C566E', accentColor:'#9FE8FF', hasWings:true, wingSpan:1.4, wingLength:1.2, flapHz:12, detail:1 },
  swallow_sweep:         { id:'swallow_sweep', seed:14142, kind:'swallow', bodyColor:'#22324A', accentColor:'#EAD088', beakLen:0.18, flapHz:7, detail:1 },
  therapy_dog:           { id:'therapy_dog', seed:42424, kind:'dog', bodyColor:'#7A5D43', accentColor:'#E9D6C0', tailLen:0.5, detail:1 }
};
```

Then your visual renderer can do:

```tsx
// wherever you render entities
import { CreatureFromSpec } from 'src/characters/factory/CreatureFactory';
import { CreatureRoster } from 'src/characters/factory/CreatureRoster';

function EntityVisual({ specId }) {
  const spec = CreatureRoster[specId];
  return <CreatureFromSpec spec={spec} />;
}
```

***

## 4) Quick checklist to integrate

1.  **Paste** the Infection‑Vector objects into `ENEMIES`. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)
2.  **Add** the new `ALLIES` export and (optionally) a simple `filterAllies()` helper. [\[gpgonline-...epoint.com\]](https://gpgonline-my.sharepoint.com/personal/thabang_mposula_gauteng_gov_za/Documents/datapile/Microsoft%20Copilot%20Chat%20Files/roster.js)
3.  **Map** each `specId` in your Creature roster (or JSON specs if you prefer file‑based).
4.  **Spawn logic**:
    *   Bosses: keep **Max Concurrent = 1**, use your existing **portal telegraphs** and **boss cadence**.
    *   Allies: spawn via **pickup/call‑in**, apply **duration** and **cap** in your game loop.

If you drop **two of the actual avatar images** for (say) **Cockroach** and **Bee**, I’ll return tuned specs (colors, wing spans, antennae lengths, seeds) so they match your art precisely, then push a ready `characters/factory` folder to slot in.


