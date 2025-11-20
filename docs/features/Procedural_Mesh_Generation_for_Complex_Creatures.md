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