# Project Vision: Healthcare Heroes Hazard Wave Battle

## Core Concept
A top-down 3D wave shooter where players control healthcare heroes fighting against waves of pathogen-themed enemies. The game emphasizes satisfying combat, dynamic environments, and a progression system with unlockable heroes and upgrades.

## Technical Pillars

### 1. Performance First
-   **Target**: 60 FPS on desktop, playable on mobile.
-   **Strategy**: Efficient rendering (InstancedMesh), object pooling, minimal garbage collection, and adaptive quality settings.

### 2. Modular Architecture
-   **Structure**: Component-based architecture using React and Three.js (@react-three/fiber).
-   **Goal**: Decoupled game logic, UI, and rendering to facilitate maintenance and feature expansion.

### 3. Procedural & Data-Driven
-   **Content**: Enemies and environments are heavily procedural or data-driven to allow for infinite variety and easy balancing.

## High-Level Goals

-   **Refactor Monolith**: Break down `App.jsx` into manageable, testable components.
-   **Optimize Rendering**: Implement instancing and efficient particle systems to handle large waves.
-   **Expand Content**: Add new heroes, enemies, and environments using the established modular systems.
-   **Polish UX**: Improve HUD, menus, and feedback systems (camera shake, haptics).
