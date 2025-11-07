// src/heroes/factory/HeroSpec.ts
export type BodyType = 'humanoid' | 'capsule' | 'blocky' | 'android';

export type HeroSpec = {
  // Identity & determinism
  id: string;
  seed: number; // keep silhouette/cosmetics stable for the same seed

  // Body shape & proportions
  bodyType?: BodyType;        // default 'humanoid'
  scale?: number;             // uniform global scale (default 1.0)
  height?: number;            // overall height in world units (default 1.7)
  headSize?: number;          // relative head radius (default 0.18*height)
  shoulderWidth?: number;     // x-span across shoulders (default 0.42*height)
  torsoLength?: number;       // y-span torso (default 0.45*height)
  pelvisWidth?: number;       // x-span pelvis/hips (default 0.34*height)
  armLength?: number;         // each arm, shoulder to hand (default 0.45*height)
  forearmRatio?: number;      // forearm proportion of arm length (default 0.48)
  legLength?: number;         // hip to foot (default 0.52*height)
  calfRatio?: number;         // calf proportion of leg length (default 0.48)
  thickness?: number;         // limb & torso thickness scalar (default 1.0)

  // Cosmetic palette
  primaryColor?: string;      // suit/base
  secondaryColor?: string;    // accents
  accentColor?: string;       // smaller details
  skinColor?: string;         // face/hands (if visible)
  emissive?: string;          // emissive color for accents
  emissiveIntensity?: number; // 0..2 typical
  metalness?: number;         // 0..1
  roughness?: number;         // 0..1

  // Accessories and visibility
  visor?: boolean;            // helmet visor
  cape?: boolean;             // cape flag
  shoulderPads?: boolean;     // shoulder armor
  kneePads?: boolean;         // knee armor
  backpack?: boolean;         // small backpack/pack

  // FX around hero (procedural)
  fxRing?: boolean;           // enable orbiting sparkles ring
  fxRingRadius?: number;      // ring radius
  fxRingIntensity?: number;   // emissive intensity
  // FX orbs animation controller
  fxMode?: 'atom'|'wave'|'push'|'shield';
  fxSpeed?: number;           // general speed scalar for orb animation
  fxAmplitude?: number;       // general amplitude for movement (units)
  fxCount?: number;           // number of orbs to render (quality may clamp)
  fxDirectionDeg?: number;    // yaw angle in degrees for directional modes (0 = forward)
  fxShieldShape?: 'circle'|'diamond'|'pyramid'; // arrangement for shield mode

  // Animation
  idleSway?: number;          // torso/head sway amplitude (0..0.03)
  breathe?: number;           // subtle breathing scale
  walkCycle?: number;         // for future wiring (steps/sec)

  // Quality/LOD
  quality?: 'low'|'med'|'high';

  // Character motion controller (for tuner/gameplay driving)
  moveIntentX?: number;       // -1..1 strafe left/right
  moveIntentZ?: number;       // -1..1 forward/back (forward typically -Z in scene)
  leanMaxDeg?: number;        // max torso lean in degrees
  shoulderSplayDeg?: number;  // resting outward angle for arms
  armBendScale?: number;      // multiply arm bend amplitude
  legBendScale?: number;      // multiply leg bend amplitude
  actionPose?: boolean;       // enable attack/dynamic pose overlay
  actionPoseIntensity?: number; // 0..1 blend amount
  armBendDirection?: 'forward'|'backward'; // elbow flex timing preference
  bodyTiltDeg?: number;       // baseline torso tilt in degrees
  // Debug & helpers
  showJointLabels?: boolean;  // show joint degree labels at key joints
  rootBobAmp?: number;        // base root bob amplitude (units relative to height)
  labelMode?: 'deg' | 'xyz';  // what to display in joint labels
  // Joint base offsets and clamps (degrees). Applied to X-rotation gait.
  joint?: {
    shoulderBaseXDeg?: number;
    elbowBaseXDeg?: number;
    hipBaseXDeg?: number;
    kneeBaseXDeg?: number;
    shoulderXMinDeg?: number; shoulderXMaxDeg?: number;
    elbowXMinDeg?: number; elbowXMaxDeg?: number;
    hipXMinDeg?: number; hipXMaxDeg?: number;
    kneeXMinDeg?: number; kneeXMaxDeg?: number;
  };
};
