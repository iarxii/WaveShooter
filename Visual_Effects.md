## **Visual Effects System Context Document**

### **Overview**

**Context document outline** for your coding assistant to implement the requested visual effects system in your React browser game. This will serve as a **technical blueprint** for integrating shaders, particle systems, and animations. The system will provide reusable, GPU-accelerated visual effects for gameplay events and hero abilities using **React + WebGL (via react-three-fiber)** and **custom GLSL shaders**. Effects should be lightweight, scalable, and optimized for browser performance.

***

### **Core Technologies**

*   **react-three-fiber**: React renderer for Three.js.
*   **Three.js**: For meshes, particle systems, and shaders.
*   **ShaderMaterial**: For custom GLSL-based effects.
*   **Post-processing**: Bloom and glow via `three/examples/jsm/postprocessing`.

***

### **Effects to Implement**

#### **1. Bullet Hit Effect**

*   **Trigger**: When a bullet collides with an enemy.
*   **Visual**: Small spark burst + radial glow.
*   **Implementation**:
    *   Particle system using `Points` with additive blending.
    *   Shader for quick fade-out and color shift.

***

#### **2. Scalable Bomb Explosion**

*   **Trigger**: Bomb detonation.
*   **Visual**: Expanding fiery sphere + smoke particles.
*   **Implementation**:
    *   Sphere mesh with animated emissive shader.
    *   Particle emitter for smoke trails.
    *   Scale dynamically based on bomb power.

***

#### **3. Boundary Glow with Chevron Arrows**

*   **Trigger**: Player launch zone activation.
*   **Visual**: Glowing boundary + animated chevrons moving upward.
*   **Implementation**:
    *   Plane geometry with scrolling texture for chevrons.
    *   Shader for pulsating glow effect.

***

#### **4. Sparks Shader for Mesh Outline**

*   **Trigger**: When highlighting a TD mesh shape.
*   **Visual**: Electric sparks along the border.
*   **Implementation**:
    *   Use `EdgesGeometry` + custom shader for animated sparks.
    *   Glow effect via bloom post-processing.

***

### **Hero Ability Effects**

#### **5. Green Shield Aura**

*   **Visual**: Semi-transparent sphere with crackling green energy edges.
*   **Implementation**:
    *   Sphere mesh + noise-based edge shader.
    *   Particle sparks around perimeter.

#### **6. Energy Rod (Golden/Yellow)**

*   **Visual**: Rod mesh emitting golden energy streaks.
*   **Implementation**:
    *   Emissive shader + particle trails.
    *   Animate intensity when swung.

#### **7. Purple Aura**

*   **Visual**: Swirling purple mist around hero.
*   **Implementation**:
    *   Particle system with alpha fade.
    *   Shader for vortex swirl.

#### **8. Fireball**

*   **Visual**: Flaming orb with dynamic flames.
*   **Implementation**:
    *   Sphere mesh + animated flame texture.
    *   Particle sparks trailing behind.

#### **9. Lightning Bolt**

*   **Visual**: Crackling electric bolt.
*   **Implementation**:
    *   Line geometry + animated noise shader.
    *   Random flicker effect for realism.

#### **10. Soap Stream with Bubbles**

*   **Visual**: Stream of bubbles that break into pools and fade.
*   **Implementation**:
    *   Particle emitter for bubbles.
    *   Pools as flat meshes with shrinking scale over time.

***

### **Performance Guidelines**

*   Use **instanced meshes** for particles.
*   Limit particle count (<500 per effect).
*   Preload textures and compress (WebP).
*   Use **GPU shaders** for heavy effects (fire, lightning, aura).

***

### **Integration Notes**

*   Create a **React context provider** for effects:
    ```jsx
    const EffectsContext = React.createContext();
    ```
*   Expose hooks like:
    ```jsx
    const { triggerEffect } = useEffects();
    triggerEffect('bulletHit', position);
    ```
*   Maintain **effect registry** for easy addition/removal.

***
