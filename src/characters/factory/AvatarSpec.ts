// src/characters/factory/AvatarSpec.ts
export type BaseShape = 'icosahedron' | 'sphere' | 'triPrism' | 'hexPrism' | 'cylinder' | 'capsule';

export type AvatarSpec = {
  /** stable ID matching your balancing table */
  id: string;
  /** deterministic variant control; same seed => same silhouette */
  seed: number;

  // Shape & surface
  baseShape?: BaseShape;        // default 'icosahedron'
  radius?: number;              // default 1.0
  detail?: 0|1|2;               // low-poly "faceted-ness"
  flatShading?: boolean;        // default true
  /** For elongated shapes (cylinder/capsule/prisms), total height in world units */
  height?: number;
  /** Non-uniform scale along X and Y for body; Z follows X (width). Default 1 */
  scaleX?: number;
  scaleY?: number;

  // Ornamentation
  spikeCount?: number;
  spikeLength?: number;         // world units (0.3 .. 0.6 typical)
  spikeRadius?: number;         // cone radius
  /** Spike geometry/style variant */
  spikeStyle?: 'cone'|'inverted'|'disk'|'block'|'tentacle';
  /** Base offset for spikes along surface normal, in world units (negative=inward, positive=outward) */
  spikeBaseShift?: number;

  // Spike animation (pulsing)
  spikePulse?: boolean;         // default true
  spikePulseIntensity?: number; // 0..1 scale (typical 0.1..0.4)
  nodeCount?: number;           // shiny “gold nuggets”
  arcCount?: number;            // animated arcs

  // Node strobe
  nodeStrobeMode?: 'off'|'unified'|'alternating';
  nodeStrobeColorA?: string;    // primary strobe color (defaults to nodeColor)
  nodeStrobeColorB?: string;    // secondary strobe color (defaults to arcColor)
  nodeStrobeSpeed?: number;     // oscillations per second (used in sin)

  // Palette
  baseColor?: string;           // '#RRGGBB'
  spikeColor?: string;
  nodeColor?: string;
  arcColor?: string;
  emissive?: string;
  /** Emissive intensity for the core (0..2 typical) */
  emissiveIntensityCore?: number;
  /** Optional emissive color for spikes; defaults to spikeColor when intensity > 0 */
  spikeEmissive?: string;
  /** Emissive intensity for spikes (0..2 typical, keep low for subtle effect) */
  emissiveIntensitySpikes?: number;

  // Material character
  metalnessCore?: number;       // 0..1
  roughnessCore?: number;       // 0..1
  /** Per-spike material shininess controls */
  metalnessSpikes?: number;     // 0..1
  roughnessSpikes?: number;     // 0..1
  metalnessNodes?: number;
  roughnessNodes?: number;

  // Animation
  spin?: number;                // radians/sec
  roll?: number;                // radians/sec (roll around Z)
  breathe?: number;             // 0..0.03 is subtle
  flickerSpeed?: number;        // node emissive flicker

  // Quality profile
  quality?: 'low'|'med'|'high'; // affects arc segment count

  // Dynamic hitbox (expands/contracts spike base)
  hitboxEnabled?: boolean;      // animate hitbox scale and apply to spike base
  hitboxVisible?: boolean;      // show debug hitbox mesh
  hitboxScaleMin?: number;      // 0.5..2.0 typical (multiplies radius)
  hitboxScaleMax?: number;      // >= hitboxScaleMin
  hitboxSpeed?: number;         // oscillations per second for sin motion
  /** Motion function used for hitbox scaling */
  hitboxMode?: 'sin'|'step'|'noise';

  // Optional LOD (auto-managed by factory if omitted)
  lod?: { near:number; far:number; minSpikeCount:number; minDetail:0|1|2 };

  // Optional attack tuning (for future gameplay wiring; exposed in tuner)
  attackSpeed?: number;
  attackRange?: number;
};
