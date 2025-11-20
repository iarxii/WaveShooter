The structure of the creatures (procedural meshes for Infection Vectors and Support Vectors) is defined through a combination of **schema definitions**, **spec data**, and **generation logic**. This allows for deterministic, tweakable meshes that match avatar images while maintaining performance. Below, I'll break down what's responsible, how it works, and the dependencies. If you want to refine the structure (e.g., add more anatomical details, improve realism, or support new creature types), I can guide you on modifications.

### 1. **What Defines the Creature Structure?**
The creature structure is primarily defined by:
- **Schema/Interface**: Outlines the "blueprint" for what properties a creature can have.
- **Spec Data**: Concrete values for each creature (e.g., body size, limb count).
- **Generation Logic**: Code that interprets the spec to build 3D geometry.

#### Key Files and Their Roles:
- **CreatureSpec.ts**:
  - Defines the `CreatureMeshSpec` interface, which is the core schema for creature structure.
  - Properties include:
    - `kind`: Type of creature ('insect', 'mammal', 'bird', etc.) – determines which generator to use.
    - `body`: Dimensions (length, width, height, segments) – shapes the main form.
    - `appendages`: Limbs, wings, antennae, tail – adds articulated parts.
    - `features`: Eyes, mouth, texture – adds details like sensory organs or surface types.
    - `colors`: Body, accent, eyes – for material coloring.
    - `detail`: LOD level (0-2) – controls complexity.
  - This is the "contract" – any creature spec must conform to this. It's extensible (e.g., you can add `scales` or `furDensity` here).

- **CreatureRoster.ts**:
  - Contains a `Record<string, CreatureMeshSpec>` object with actual specs for each creature (e.g., `cockroach_broodmother`, `rat_king`).
  - Each entry provides values like `body: { length: 2.0, width: 0.8, height: 0.6, segments: 3 }` or `appendages: { limbs: { count: 6, length: 1.0 } }`.
  - This is where you tweak individual creatures (e.g., make a rat's tail longer or add wings to an insect). It's loaded dynamically in AvatarTuner for presets.

- **CreatureMeshBuilder.ts**:
  - Orchestrates generation: Takes a `CreatureMeshSpec`, checks `spec.kind`, and calls the appropriate generator (e.g., `InsectBodyGenerator` for 'insect').
  - Merges the resulting geometries into a single mesh using `MeshCombinator`.
  - Responsible for high-level logic (e.g., if `kind` is unknown, fall back to a default).

- **Generator Classes** (in parts):
  - InsectBodyGenerator.ts, MammalBodyGenerator.ts, BirdBodyGenerator.ts: These build the 3D geometry based on the spec.
  - They use Three.js primitives (cylinders for limbs, planes for wings, spheres for eyes) and position/scale them deterministically using the spec values and seeded random.
  - For example, `InsectBodyGenerator.generate()` creates body segments, limbs, wings, etc., and merges them.
  - These are modular – you can add new generators for 'reptile' or 'fish' by extending the pattern.

- **CreatureFactory.tsx**:
  - React component (`CreatureFromSpec`) that renders the mesh in Three.js scenes (e.g., AvatarTuner preview).
  - Applies materials from `MaterialPool` and basic animation (spin + breathe).

#### How It Flows:
1. A creature spec is loaded (e.g., from `CreatureRoster` or user input in AvatarTuner).
2. `CreatureMeshBuilder` selects the generator based on `kind`.
3. The generator builds geometries for each part (body, appendages, features).
4. `MeshCombinator` merges them into one `BufferGeometry`.
5. `CreatureFromSpec` renders it with materials and animation.

This structure ensures creatures are **procedural** (generated from data), **deterministic** (same seed = same mesh), and **tweakable** (change spec values in AvatarTuner for real-time updates).

### 2. **Dependencies**
The system relies on external and internal libraries/tools:
- **Three.js**: Core for 3D rendering (`BufferGeometry`, `CylinderGeometry`, `mergeGeometries`, `MeshStandardMaterial`). Handles all geometry creation, merging, and rendering.
- **BufferGeometryUtils** (from Three.js): For merging multiple geometries into one (avoids multiple draw calls).
- **Seeded Random Utility**: Custom `seededRandom` function (in generators) for deterministic noise (e.g., slight variations in positions).
- **React & @react-three/fiber**: For integrating 3D rendering into the UI (AvatarTuner).
- **TypeScript**: For type safety (e.g., enforcing `CreatureMeshSpec` structure).
- **Vite/Node.js**: Build system; no runtime dependencies beyond browser Three.js.
- **Internal**: MaterialPool.ts for shared materials, MeshCombinator.ts for geometry merging.

No heavy external deps – it's lightweight for web use.

### 3. **How to Refine the Structure**
To improve realism, add variety, or fix issues (e.g., make creatures less "cylindrical"):
- **Modify the Schema** (CreatureSpec.ts):
  - Add properties like `joints` (for bendable limbs), `textureDetail` (for procedural patterns), or `symmetry` (for bilateral/asymmetrical creatures).
  - Example: Add `fur: { length: number; density: number }` for mammals.

- **Update Specs** (CreatureRoster.ts):
  - Tweak values (e.g., increase `body.segments` for more detailed insects, or add `tail` to birds).
  - Add new creatures by appending entries (e.g., a "spider" with 8 limbs).

- **Enhance Generators**:
  - Add more primitives: Use `TorusGeometry` for rings, `BoxGeometry` for blocks, or deform geometries for organic shapes.
  - Improve positioning: Use trigonometry for natural limb placement (e.g., legs splayed out).
  - Add LOD: In generators, reduce vertex count if `detail < 1`.
  - For realism: Blend shapes (morph targets) for animation, or procedural UV mapping for textures.

- **Test in AvatarTuner**:
  - Switch to "Creature" mode, load presets, and tweak sliders.
  - Check console for geometry counts (added logging should show appendages being added).

If you share specific refinements (e.g., "Add feathers to birds" or "Make limbs jointed"), I can implement them directly. What aspect do you want to focus on first?