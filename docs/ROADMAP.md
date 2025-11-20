# Project Roadmap

This document consolidates outstanding tasks and future plans from various design documents.

## 1. Refactoring & Architecture (Immediate Focus)

**Goal:** Break down `App.jsx` monolith and improve code maintainability.

-   [ ] **Extract Custom Hooks** (Phase 1 of Refactoring Plan)
    -   `useGameState.js`: Game logic state (wave, score, enemies).
    -   `useCameraEffects.js`: Camera shake & border effects.
    -   `useDebugControls.js`: Debug UI state.
    -   `useGameSettings.js`: Settings persistence.
-   [ ] **Extract Utility Functions** (Phase 3 of Refactoring Plan)
    -   `src/utils/gameLogic.js`: Wave calculations, enemy spawning.
    -   `src/utils/camera.js`: Camera positioning logic.
    -   `src/utils/effects.js`: Effect calculations.
-   [ ] **Data Migration**
    -   Migrate enemy/hero metadata to shared `src/data/roster.js`.

## 2. Performance Optimization (High Priority)

**Goal:** Stable 60 FPS and reduced garbage collection.

-   [ ] **Memoization & Stability**
    -   Stabilize props in `App.jsx` using `useMemo` and `useCallback`.
    -   Wrap entity components (`MinionEntity`, `FlyingDroneEntity`, etc.) with `React.memo`.
-   [ ] **Object Pooling**
    -   [x] Bullets (Implemented via `BulletPool.js`)
    -   [ ] Pickups
    -   [ ] Particle Effects
-   [ ] **Rendering Optimization**
    -   Implement `InstancedMesh` for high-count enemies (Minions, Drones).
    -   Consolidate particle effects into shader-driven systems.

## 3. Features & Content (Next Steps)

**Goal:** Expand gameplay variety and content pipeline.

-   [ ] **Creature Factory** (See `docs/features/Revised_Creature_Procedural_Factory.md`)
    -   Implement `CreatureMeshBuilder` and `BodyPartGenerators`.
    -   Integrate with `AvatarTuner` for designer workflow.
    -   Add new Infection Vector bosses and Support Vector allies.
-   [ ] **UI Improvements**
    -   Add History view to Landing page (best N recent runs).
    -   Improve Character Viewer with centralized roster data.

## 4. Long-Term Goals

-   **Web Workers**: Offload AI/physics to web workers.
-   **Spatial Partitioning**: Quadtree/Octree for collision detection optimization.
-   **Mobile Polish**: Touch controls refinement and specific mobile quality settings.
