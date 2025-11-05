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

  // Palette
  baseColor?: string;           // '#RRGGBB'
  spikeColor?: string;
  nodeColor?: string;
  arcColor?: string;
  emissive?: string;

  // Material character
  metalnessCore?: number;       // 0..1
  roughnessCore?: number;       // 0..1
  metalnessNodes?: number;
  roughnessNodes?: number;

  // Animation
  spin?: number;                // radians/sec
  breathe?: number;             // 0..0.03 is subtle
  flickerSpeed?: number;        // node emissive flicker

  // Quality profile
  quality?: 'low'|'med'|'high'; // affects arc segment count

  // Optional LOD (auto-managed by factory if omitted)
  lod?: { near:number; far:number; minSpikeCount:number; minDetail:0|1|2 };
};
