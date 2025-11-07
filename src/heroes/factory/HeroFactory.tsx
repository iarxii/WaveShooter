// src/heroes/factory/HeroFactory.tsx
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { HeroSpec } from './HeroSpec';

// Pooled resources to minimize allocations
const geometryPool = new Map<string, THREE.BufferGeometry>();
const materialPool = new Map<string, THREE.Material>();

function keyOf(obj: unknown) {
  return typeof obj === 'string' ? obj : JSON.stringify(obj);
}

function getGeometry(desc: { kind: string; args?: any[] }) {
  const key = keyOf(desc);
  if (geometryPool.has(key)) return geometryPool.get(key)!;
  let geom: THREE.BufferGeometry;
  switch (desc.kind) {
    case 'sphere': geom = new THREE.SphereGeometry(...(desc.args || [0.1, 16, 16])); break;
    case 'box': geom = new THREE.BoxGeometry(...(desc.args || [1,1,1])); break;
    case 'capsule': {
      // @ts-ignore
      geom = (THREE as any).CapsuleGeometry ? new (THREE as any).CapsuleGeometry(...(desc.args || [0.1, 0.4, 4, 12])) : new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
      break;
    }
    default: geom = new THREE.BoxGeometry(1,1,1); break;
  }
  geometryPool.set(key, geom);
  return geom;
}

function getMaterial(desc: { color?: string; emissive?: string; emissiveIntensity?: number; metalness?: number; roughness?: number; transparent?: boolean; opacity?: number }) {
  const key = keyOf({ kind: 'std', ...desc });
  if (materialPool.has(key)) return materialPool.get(key)!;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(desc.color ?? '#4C9AFF'),
    emissive: desc.emissive ? new THREE.Color(desc.emissive) : new THREE.Color('#000000'),
    emissiveIntensity: desc.emissive ? (desc.emissiveIntensity ?? 0.25) : 0,
    metalness: desc.metalness ?? 0.2,
    roughness: desc.roughness ?? 0.6,
    transparent: desc.transparent ?? false,
    opacity: desc.opacity ?? 1,
  });
  materialPool.set(key, mat);
  return mat;
}

const D = {
  bodyType: 'humanoid' as const,
  scale: 1.0,
  height: 1.7,
  headSize: 0.18,
  shoulderWidth: 0.42,
  torsoLength: 0.45,
  pelvisWidth: 0.34,
  armLength: 0.45,
  forearmRatio: 0.48,
  legLength: 0.52,
  calfRatio: 0.48,
  thickness: 1.0,
  primaryColor: '#4C9AFF',
  secondaryColor: '#1E88E5',
  accentColor: '#FFD54F',
  skinColor: '#FFDFC4',
  emissive: '#66A3FF',
  emissiveIntensity: 0.25,
  metalness: 0.25,
  roughness: 0.6,
  visor: true,
  cape: false,
  shoulderPads: false,
  kneePads: true,
  backpack: false,
  fxRing: true,
  fxRingRadius: 1.2,
  fxRingIntensity: 0.5,
  idleSway: 0.01,
  breathe: 0.01,
  walkCycle: 0,
  quality: 'high' as const,
};

export type HeroControllerExternal = { moveIntentX?: number; moveIntentZ?: number; aimYawDeg?: number }

export function HeroFromSpec({ spec, controller }: { spec: HeroSpec, controller?: HeroControllerExternal }) {
  const s = { ...D, ...spec };
  const H = s.height * s.scale;
  const headR = (s.headSize ?? D.headSize) * H;
  const torsoY = (s.torsoLength ?? D.torsoLength) * H;
  const shoulderW = (s.shoulderWidth ?? D.shoulderWidth) * H;
  const pelvisW = (s.pelvisWidth ?? D.pelvisWidth) * H;
  const armL = (s.armLength ?? D.armLength) * H;
  const forearmL = armL * (s.forearmRatio ?? D.forearmRatio);
  const upperArmL = armL - forearmL;
  const legL = (s.legLength ?? D.legLength) * H;
  const calfL = legL * (s.calfRatio ?? D.calfRatio);
  const thighL = legL - calfL;
  const thick = (s.thickness ?? D.thickness);

  // Materials
  const matPrimary = useMemo(() => getMaterial({ color: s.primaryColor, emissive: s.emissive, emissiveIntensity: s.emissiveIntensity, metalness: s.metalness, roughness: s.roughness }), [s.primaryColor, s.emissive, s.emissiveIntensity, s.metalness, s.roughness]);
  const matSecondary = useMemo(() => getMaterial({ color: s.secondaryColor, emissive: s.emissive, emissiveIntensity: (s.emissiveIntensity ?? 0.25) * 0.7 }), [s.secondaryColor, s.emissive, s.emissiveIntensity]);
  const matAccent = useMemo(() => getMaterial({ color: s.accentColor, emissive: s.accentColor, emissiveIntensity: (s.emissiveIntensity ?? 0.25) * 0.8 }), [s.accentColor, s.emissiveIntensity]);
  const matSkin = useMemo(() => getMaterial({ color: s.skinColor, metalness: 0.0, roughness: 1.0 }), [s.skinColor]);
  const matVisor = useMemo(() => getMaterial({ color: '#88BBFF', emissive: '#88BBFF', emissiveIntensity: 0.35, transparent: true, opacity: 0.35 }), []);

  // Geoms
  const qual: 'low'|'med'|'high' = (s.quality ?? 'high');
  const segCap = qual === 'low' ? 2 : qual === 'med' ? 3 : 4;
  const segRad = qual === 'low' ? 8 : qual === 'med' ? 10 : 12;
  const segHead = qual === 'low' ? 12 : qual === 'med' ? 16 : 20;
  const gHead = useMemo(() => getGeometry({ kind: 'sphere', args: [headR, segHead, segHead] }), [headR, segHead]);
  const gTorso = useMemo(() => getGeometry({ kind: 'box', args: [shoulderW * 0.9, torsoY, shoulderW * 0.45] }), [shoulderW, torsoY]);
  const gPelvis = useMemo(() => getGeometry({ kind: 'box', args: [pelvisW, H * 0.14, pelvisW * 0.5] }), [pelvisW, H]);
  const gArm = useMemo(() => getGeometry({ kind: 'capsule', args: [ (0.06*H*thick), upperArmL, segCap, segRad ] }), [H, upperArmL, thick, segCap, segRad]);
  const gForearm = useMemo(() => getGeometry({ kind: 'capsule', args: [ (0.055*H*thick), forearmL, segCap, segRad ] }), [H, forearmL, thick, segCap, segRad]);
  const gThigh = useMemo(() => getGeometry({ kind: 'capsule', args: [ (0.07*H*thick), thighL, segCap, segRad ] }), [H, thighL, thick, segCap, segRad]);
  const gCalf = useMemo(() => getGeometry({ kind: 'capsule', args: [ (0.065*H*thick), calfL, segCap, segRad ] }), [H, calfL, thick, segCap, segRad]);
  const gBoot = useMemo(() => getGeometry({ kind: 'box', args: [ (0.11*H*thick), (0.07*H), (0.22*H) ] }), [H, thick]);
  const gShoulder = useMemo(() => getGeometry({ kind: 'capsule', args: [ (0.075*H*thick), (0.06*H), 4, 10 ] }), [H, thick]);
  const gPad = useMemo(() => getGeometry({ kind: 'box', args: [ (0.12*H), (0.06*H), (0.18*H) ] }), [H]);
  const gBack = useMemo(() => getGeometry({ kind: 'box', args: [ (0.18*H), (0.24*H), (0.08*H) ] }), [H]);

  // Layout helpers
  const torsoTopY = H * 0.5 - headR * 1.1;
  const torsoCenterY = torsoTopY - torsoY * 0.5;
  const pelvisY = torsoCenterY - torsoY * 0.5 - (H * 0.07);
  const headBaseY = torsoTopY + headR * 0.9;

  const fxCount = qual === 'low' ? 8 : qual === 'med' ? 10 : 12;
  const fxSeg = qual === 'low' ? 8 : 10;

  // Animation refs
  const rootRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null)
  // Limb hierarchy groups for proper joint motion
  const lShoulderRef = useRef<THREE.Group>(null)
  const rShoulderRef = useRef<THREE.Group>(null)
  const lElbowRef = useRef<THREE.Group>(null)
  const rElbowRef = useRef<THREE.Group>(null)
  const lHipRef = useRef<THREE.Group>(null)
  const rHipRef = useRef<THREE.Group>(null)
  const lKneeRef = useRef<THREE.Group>(null)
  const rKneeRef = useRef<THREE.Group>(null)
  const fxRingRef = useRef<THREE.Group>(null)
  const orbRefs = useRef<Array<THREE.Mesh | null>>([])
  // Debug label DOM refs
  const lbl = useRef<{[k:string]: HTMLDivElement | null}>({})

  function setLbl(id: string) {
    return (el: HTMLDivElement | null) => { lbl.current[id] = el }
  }

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime()
    const sway = (s.idleSway ?? 0.01)
    const breathe = (s.breathe ?? 0.01)
    const walk = Math.max(0, s.walkCycle ?? 0)
    // Movement intent and torso lean (override from controller if provided)
    const intentX = Math.max(-1, Math.min(1, (controller?.moveIntentX ?? s.moveIntentX ?? 0)))
    const intentZ = Math.max(-1, Math.min(1, (controller?.moveIntentZ ?? s.moveIntentZ ?? 0)))
    const intentMag = Math.max(0, Math.min(1, Math.hypot(intentX, intentZ)))
    const leanMax = ((s.leanMaxDeg ?? 12) * Math.PI) / 180
    // subtle whole-body sway
    if (rootRef.current) {
      rootRef.current.rotation.y = Math.sin(t * 0.6) * sway
    }
    // chest breathing and head bob
    if (torsoRef.current) {
      const b = 1 + Math.sin(t * 1.6) * breathe
      torsoRef.current.scale.set(1, b, 1)
      // Lean toward movement intent: +X strafe leans right (negative Z-rot), forward (-Z) leans forward (+X-rot)
      const forwardLean = leanMax * intentMag * Math.max(-intentZ, 0) // forward when intentZ negative
      const backLean = -leanMax * intentMag * Math.max(intentZ, 0)    // backward when intentZ positive
      const lateralLean = -leanMax * 0.6 * intentMag * intentX        // tilt around Z for strafing
      const baseTilt = ((s.bodyTiltDeg ?? 0) * Math.PI) / 180
      torsoRef.current.rotation.x = baseTilt + forwardLean + backLean
      torsoRef.current.rotation.z = lateralLean
    }
    if (headRef.current) {
      headRef.current.position.y = headBaseY + Math.sin(t * 1.6) * breathe * 0.02 * H
      headRef.current.rotation.x = Math.sin(t * 0.9) * sway * 0.5
    }
    // Arm/leg motion via joint groups
    const phase = t * (walk > 0 ? 5.0 * walk : 1.2)
    const armScale = s.armBendScale ?? 1.0
    const legScale = s.legBendScale ?? 1.0
    const ampA = (walk > 0 ? 0.45 : 0.06) * armScale
    const ampL = (walk > 0 ? 0.42 : 0.05) * legScale
    const ampK = (walk > 0 ? 0.6 : 0.08) * legScale
    // Shoulder swing and raw/clamped computation
    const shBase = ((s.joint?.shoulderBaseXDeg ?? -8) * Math.PI) / 180
    const elBase = ((s.joint?.elbowBaseXDeg ?? 10) * Math.PI) / 180
    const hipBase = ((s.joint?.hipBaseXDeg ?? 4) * Math.PI) / 180
    const kneeBase = ((s.joint?.kneeBaseXDeg ?? 6) * Math.PI) / 180
    // Raw
    const lShoulderRaw = shBase + Math.sin(phase + Math.PI) * ampA
    const rShoulderRaw = shBase + Math.sin(phase) * ampA
    const elbowDir = (s.armBendDirection ?? 'backward') === 'forward' ? 1 : -1
    // Elbow should bend forward (toward -Z) for a human arm; ensure contributions never drive it backward
    const lElbowRaw = elBase
      + Math.max(0, -(lShoulderRaw - shBase) * 0.8) // shoulder forward increases elbow bend; backward doesn't reduce it
      + Math.max(0, elbowDir * Math.sin(phase + Math.PI)) * (ampA * 0.6)
    const rElbowRaw = elBase
      + Math.max(0, -(rShoulderRaw - shBase) * 0.8)
      + Math.max(0, elbowDir * Math.sin(phase)) * (ampA * 0.6)
    const lHipRaw = hipBase + Math.sin(phase + Math.PI) * ampL
    const rHipRaw = hipBase + Math.sin(phase) * ampL
    const lKneeRaw = kneeBase + Math.max(0, -Math.sin(phase + Math.PI)) * ampK
    const rKneeRaw = kneeBase + Math.max(0, -Math.sin(phase)) * ampK

    // Outward shoulder splay (rest) plus dynamic
    const splay = ((s.shoulderSplayDeg ?? 10) * Math.PI) / 180
    if (lShoulderRef.current) lShoulderRef.current.rotation.z = splay
    if (rShoulderRef.current) rShoulderRef.current.rotation.z = -splay

    // Action pose overlay (blend)
    const poseI = Math.max(0, Math.min(1, s.actionPose ? (s.actionPoseIntensity ?? 1) : 0))
    if (poseI > 0) {
      const torsoPitch = 0.2 * poseI
      const torsoRoll = 0.1 * poseI
      const raise = 0.6 * poseI
      const retract = -0.4 * poseI
      if (torsoRef.current) {
        // Remove yaw spin; use pitch and a touch of roll for a dynamic lean
        torsoRef.current.rotation.x += torsoPitch
        torsoRef.current.rotation.z += torsoRoll
      }
      if (rShoulderRef.current) rShoulderRef.current.rotation.x += raise
      if (lShoulderRef.current) lShoulderRef.current.rotation.x += retract
      if (lHipRef.current) lHipRef.current.rotation.x += 0.1 * poseI
      if (rHipRef.current) rHipRef.current.rotation.x -= 0.1 * poseI
      if (lKneeRef.current) lKneeRef.current.rotation.x += 0.2 * poseI
      if (rKneeRef.current) rKneeRef.current.rotation.x += 0.2 * poseI
    }
    // Clamp joint ranges if configured
    function clamp(v: number, a?: number, b?: number) { return a === undefined || b === undefined ? v : Math.max(a, Math.min(b, v)) }
    const d2r = (d:number)=> (d*Math.PI)/180
  const shMin = d2r(s.joint?.shoulderXMinDeg ?? -60), shMax = d2r(s.joint?.shoulderXMaxDeg ?? 60)
  // Default elbow min at 0deg to avoid backward-bending forearms
  const elMin = d2r(s.joint?.elbowXMinDeg ?? 0), elMax = d2r(s.joint?.elbowXMaxDeg ?? 135)
  const hipMin = d2r(s.joint?.hipXMinDeg ?? -50), hipMax = d2r(s.joint?.hipXMaxDeg ?? 50)
  const knMin = d2r(s.joint?.kneeXMinDeg ?? 0), knMax = d2r(s.joint?.kneeXMaxDeg ?? 140)
  // Clamped
  const lShoulderClamp = clamp(lShoulderRaw, shMin, shMax)
  const rShoulderClamp = clamp(rShoulderRaw, shMin, shMax)
  let lElbowClamp = clamp(lElbowRaw, elMin, elMax)
  let rElbowClamp = clamp(rElbowRaw, elMin, elMax)
  // Ensure a small forward bend so the fore-end stays ahead of the upper-end (forward = -Z)
  const epsElbow = d2r(2) // ~2 degrees minimal bend
  lElbowClamp = Math.max(lElbowClamp, epsElbow)
  rElbowClamp = Math.max(rElbowClamp, epsElbow)
  const lHipClamp = clamp(lHipRaw, hipMin, hipMax)
  const rHipClamp = clamp(rHipRaw, hipMin, hipMax)
  const lKneeClamp = clamp(lKneeRaw, knMin, knMax)
  const rKneeClamp = clamp(rKneeRaw, knMin, knMax)
  // Apply
  if (lShoulderRef.current) lShoulderRef.current.rotation.x = lShoulderClamp
  if (rShoulderRef.current) rShoulderRef.current.rotation.x = rShoulderClamp
  if (lElbowRef.current) lElbowRef.current.rotation.x = lElbowClamp
  if (rElbowRef.current) rElbowRef.current.rotation.x = rElbowClamp
  if (lHipRef.current) lHipRef.current.rotation.x = lHipClamp
  if (rHipRef.current) rHipRef.current.rotation.x = rHipClamp
  if (lKneeRef.current) lKneeRef.current.rotation.x = lKneeClamp
  if (rKneeRef.current) rKneeRef.current.rotation.x = rKneeClamp
  // Update forearm forward shift using shoulder raw
  // Forward in our scene is -Z; when shoulders swing forward (below base), shift elbow group slightly forward
  const elbowShift = (shoulderRaw:number)=> Math.max(0, shBase - shoulderRaw) * (0.12 * H)
  if (lElbowRef.current) lElbowRef.current.position.z = -elbowShift(lShoulderRaw)
  if (rElbowRef.current) rElbowRef.current.position.z = -elbowShift(rShoulderRaw)

    // Root bob synced to steps
    if (rootRef.current) {
      const bobAmp = (s.rootBobAmp ?? 0.04) * H
      const bob = Math.sin(phase * 2) * bobAmp * (walk > 0 ? 1 : 0)
      rootRef.current.position.y = bob
    }

    // Update debug label text with current values
    if (s.showJointLabels && lbl.current) {
      const toDeg = (rad:number)=> (rad * 180) / Math.PI
      const setText = (key:string, text:string) => { const el = lbl.current[key]; if (el) el.textContent = text }
      if ((s.labelMode ?? 'deg') === 'deg') {
        setText('lShoulderStart', `L-Shoulder raw ${toDeg(lShoulderRaw).toFixed(1)}° | clamp ${toDeg(lShoulderClamp).toFixed(1)}°`)
        setText('lShoulderEnd', `L-Upper End raw ${toDeg(lShoulderRaw).toFixed(1)}° | clamp ${toDeg(lShoulderClamp).toFixed(1)}°`)
        setText('rShoulderStart', `R-Shoulder raw ${toDeg(rShoulderRaw).toFixed(1)}° | clamp ${toDeg(rShoulderClamp).toFixed(1)}°`)
        setText('rShoulderEnd', `R-Upper End raw ${toDeg(rShoulderRaw).toFixed(1)}° | clamp ${toDeg(rShoulderClamp).toFixed(1)}°`)
        setText('lElbowStart', `L-Elbow raw ${toDeg(lElbowRaw).toFixed(1)}° | clamp ${toDeg(lElbowClamp).toFixed(1)}°`)
        setText('lElbowEnd', `L-Fore End raw ${toDeg(lElbowRaw).toFixed(1)}° | clamp ${toDeg(lElbowClamp).toFixed(1)}°`)
        setText('rElbowStart', `R-Elbow raw ${toDeg(rElbowRaw).toFixed(1)}° | clamp ${toDeg(rElbowClamp).toFixed(1)}°`)
        setText('rElbowEnd', `R-Fore End raw ${toDeg(rElbowRaw).toFixed(1)}° | clamp ${toDeg(rElbowClamp).toFixed(1)}°`)
        setText('lHipStart', `L-Hip raw ${toDeg(lHipRaw).toFixed(1)}° | clamp ${toDeg(lHipClamp).toFixed(1)}°`)
        setText('lHipEnd', `L-Thigh End raw ${toDeg(lHipRaw).toFixed(1)}° | clamp ${toDeg(lHipClamp).toFixed(1)}°`)
        setText('rHipStart', `R-Hip raw ${toDeg(rHipRaw).toFixed(1)}° | clamp ${toDeg(rHipClamp).toFixed(1)}°`)
        setText('rHipEnd', `R-Thigh End raw ${toDeg(rHipRaw).toFixed(1)}° | clamp ${toDeg(rHipClamp).toFixed(1)}°`)
        setText('lKneeStart', `L-Knee raw ${toDeg(lKneeRaw).toFixed(1)}° | clamp ${toDeg(lKneeClamp).toFixed(1)}°`)
        setText('lKneeEnd', `L-Calf End raw ${toDeg(lKneeRaw).toFixed(1)}° | clamp ${toDeg(lKneeClamp).toFixed(1)}°`)
        setText('rKneeStart', `R-Knee raw ${toDeg(rKneeRaw).toFixed(1)}° | clamp ${toDeg(rKneeClamp).toFixed(1)}°`)
        setText('rKneeEnd', `R-Calf End raw ${toDeg(rKneeRaw).toFixed(1)}° | clamp ${toDeg(rKneeClamp).toFixed(1)}°`)
      } else {
        // xyz world coordinates
        const wp = new THREE.Vector3()
        const fmt = (v:THREE.Vector3)=> `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`
        if (lShoulderRef.current) {
          setText('lShoulderStart', `L-Shoulder xyz ${fmt(lShoulderRef.current.getWorldPosition(wp.clone()))}`)
          setText('lShoulderEnd', `L-Upper End xyz ${fmt(lShoulderRef.current.localToWorld(wp.set(0, -upperArmL, 0)))}`)
        }
        if (rShoulderRef.current) {
          setText('rShoulderStart', `R-Shoulder xyz ${fmt(rShoulderRef.current.getWorldPosition(wp.clone()))}`)
          setText('rShoulderEnd', `R-Upper End xyz ${fmt(rShoulderRef.current.localToWorld(wp.set(0, -upperArmL, 0)))}`)
        }
        if (lElbowRef.current) {
          setText('lElbowStart', `L-Elbow xyz ${fmt(lElbowRef.current.getWorldPosition(wp.clone()))}`)
          setText('lElbowEnd', `L-Fore End xyz ${fmt(lElbowRef.current.localToWorld(wp.set(0, -forearmL, 0)))}`)
        }
        if (rElbowRef.current) {
          setText('rElbowStart', `R-Elbow xyz ${fmt(rElbowRef.current.getWorldPosition(wp.clone()))}`)
          setText('rElbowEnd', `R-Fore End xyz ${fmt(rElbowRef.current.localToWorld(wp.set(0, -forearmL, 0)))}`)
        }
        if (lHipRef.current) {
          setText('lHipStart', `L-Hip xyz ${fmt(lHipRef.current.getWorldPosition(wp.clone()))}`)
          setText('lHipEnd', `L-Thigh End xyz ${fmt(lHipRef.current.localToWorld(wp.set(0, -thighL, 0)))}`)
        }
        if (rHipRef.current) {
          setText('rHipStart', `R-Hip xyz ${fmt(rHipRef.current.getWorldPosition(wp.clone()))}`)
          setText('rHipEnd', `R-Thigh End xyz ${fmt(rHipRef.current.localToWorld(wp.set(0, -thighL, 0)))}`)
        }
        if (lKneeRef.current) {
          setText('lKneeStart', `L-Knee xyz ${fmt(lKneeRef.current.getWorldPosition(wp.clone()))}`)
          setText('lKneeEnd', `L-Calf End xyz ${fmt(lKneeRef.current.localToWorld(wp.set(0, -calfL, 0)))}`)
        }
        if (rKneeRef.current) {
          setText('rKneeStart', `R-Knee xyz ${fmt(rKneeRef.current.getWorldPosition(wp.clone()))}`)
          setText('rKneeEnd', `R-Calf End xyz ${fmt(rKneeRef.current.localToWorld(wp.set(0, -calfL, 0)))}`)
        }
      }
    }

    // FX orbs animation (only if enabled and group mounted)
    if (fxRingRef.current && (s.fxRing && qual !== 'low')) {
      const count = Math.max(1, Math.min(s.fxCount ?? fxCount, 48))
      const mode = s.fxMode ?? 'wave'
      const speed = s.fxSpeed ?? 1.0
      const amp = (s.fxAmplitude ?? 0.4) * H
      const radius = (s.fxRingRadius ?? D.fxRingRadius) * H
      const yawDeg = controller?.aimYawDeg ?? s.fxDirectionDeg ?? 0
      const yaw = (yawDeg * Math.PI) / 180
      // 0 deg faces -Z forward in our scene
      const dir = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw)).normalize()
      const up = new THREE.Vector3(0,1,0)
      const right = new THREE.Vector3().crossVectors(dir, up).normalize()
      // ensure array sized
      if (orbRefs.current.length !== count) {
        orbRefs.current.length = count
      }
      for (let i=0;i<count;i++) {
        const m = orbRefs.current[i]
        if (!m) continue
        const phase = (i / count) * Math.PI * 2
        if (mode === 'atom') {
          // three perpendicular planes
          const plane = i % 3
          const a = t * 1.2 * speed + phase
          if (plane === 0) {
            m.position.set(Math.cos(a) * radius, Math.sin(a) * radius * 0.6, 0)
          } else if (plane === 1) {
            m.position.set(0, Math.cos(a) * radius * 0.6, Math.sin(a) * radius)
          } else {
            m.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius)
          }
        } else if (mode === 'wave') {
          const a = phase
          const y = Math.sin(t * 2.0 * speed + phase) * (amp * 0.35)
          m.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius)
        } else if (mode === 'push') {
          const a = phase
          const baseX = Math.cos(a) * radius
          const baseZ = Math.sin(a) * radius
          const sPush = Math.sin(t * 3.0 * speed + phase)
          const disp = sPush >= 0 ? sPush : sPush * 0.25
          const offX = dir.x * amp * disp
          const offZ = dir.z * amp * disp
          m.position.set(baseX + offX, Math.sin(phase) * 0.05 * H, baseZ + offZ)
        } else if (mode === 'shield') {
          // Arrange orbs in front of the player (centered forward of hero)
          // Adjust sign so 0deg (forward = -Z) places the shield in front, not behind
          const center = dir.clone().multiplyScalar(-(radius + amp * 0.2))
          const shape = s.fxShieldShape ?? 'circle'
          if (shape === 'circle') {
            // Small circle in the plane spanned by right/up, centered in front
            const rC = Math.max(0.2 * H, radius * 0.35)
            const a = (i / count) * Math.PI * 2
            const p = new THREE.Vector3()
              .addScaledVector(center, 1)
              .addScaledVector(right, Math.cos(a) * rC)
              .addScaledVector(up, Math.sin(a) * rC)
            p.y += Math.sin(t * 1.8 + phase) * 0.02 * H
            m.position.copy(p)
          } else if (shape === 'diamond') {
            // Diamond on the shield plane boundary
            const R = Math.max(0.25 * H, radius * 0.4)
            const u = i / count // 0..1
            const seg = Math.floor(u * 4)
            const local = (u * 4) - seg // 0..1 within segment
            let x = 0, y = 0
            if (seg === 0) { x = local * R; y = (1 - local) * R }
            else if (seg === 1) { x = (1 - local) * R; y = -local * R }
            else if (seg === 2) { x = -local * R; y = -(1 - local) * R }
            else { x = -(1 - local) * R; y = local * R }
            const p = new THREE.Vector3()
              .addScaledVector(center, 1)
              .addScaledVector(right, x)
              .addScaledVector(up, y)
            p.y += Math.sin(t * 1.8 + phase) * 0.02 * H
            m.position.copy(p)
          } else /* pyramid */ {
            // Rows of orbs forming a wedge pointing forward
            const maxRows = 8
            const rows = Math.max(2, Math.min(maxRows, Math.round(Math.sqrt(count))))
            // compute how many in each row (1,3,5,...) until we reach count
            const perRow: number[] = []
            let total = 0, rIdx = 0
            while (total < count && perRow.length < rows) {
              const want = 1 + 2 * rIdx
              const add = Math.min(want, count - total)
              perRow.push(add)
              total += add
              rIdx++
            }
            // map i to (row, col) indices
            let acc = 0, row = 0
            for (; row < perRow.length; row++) {
              if (i < acc + perRow[row]) break
              acc += perRow[row]
            }
            const idxInRow = i - acc
            const inRow = perRow[row]
            const tipForward = center.length() + amp * 0.6
            const step = Math.max(0.08 * H, radius * 0.15)
            const dist = tipForward - (perRow.length - 1 - row) * step
            const rowWidth = (inRow - 1) * (Math.max(0.08 * H, radius * 0.12))
            const x = (idxInRow - (inRow - 1) * 0.5) * (rowWidth / Math.max(1, inRow - 1))
            const y = (perRow.length - 1 - row) * (0.06 * H)
            const p = new THREE.Vector3()
              .addScaledVector(dir, -dist) // negative to ensure forward of hero
              .addScaledVector(right, x)
              .addScaledVector(up, y)
            m.position.copy(p)
          }
        }
      }
    }
  })

  return (
    <group ref={rootRef}>
      {/* Torso */}
      <mesh ref={torsoRef} geometry={gTorso} material={matPrimary} position={[0, torsoCenterY, 0]} />
      {/* Pelvis */}
      <mesh geometry={gPelvis} material={matSecondary} position={[0, pelvisY, 0]} />
  {/* Head */}
  <mesh ref={headRef} geometry={gHead} material={matSkin} position={[0, headBaseY, 0]} />
      {/* Visor */}
      {s.visor && (
        <mesh geometry={getGeometry({ kind:'box', args:[headR*1.2, headR*0.5, headR*1.1] })} material={matVisor} position={[0, torsoTopY + headR * 0.95, headR*0.3]} />
      )}

      {/* Arms - hierarchical joints (shoulder->elbow) */}
      {/* Left arm */}
      <group ref={lShoulderRef} position={[-shoulderW*0.5, torsoCenterY+torsoY*0.25, 0]}>
        <mesh geometry={gArm} material={matPrimary} position={[0, -upperArmL*0.5, 0]} />
        {/* Joint labels */}
        {s.showJointLabels && (
          <>
            <Html center distanceFactor={20}><div ref={setLbl('lShoulderStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Shoulder</div></Html>
            <group position={[0, -upperArmL, 0]}>
              <Html center distanceFactor={20}><div ref={setLbl('lShoulderEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Upper End</div></Html>
            </group>
          </>
        )}
        <group ref={lElbowRef} position={[0, -upperArmL, 0]}>
          <mesh geometry={gForearm} material={matPrimary} position={[0, -forearmL*0.5, 0]} />
          {s.showJointLabels && (
            <>
              <Html center distanceFactor={20}><div ref={setLbl('lElbowStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Elbow</div></Html>
              <group position={[0, -forearmL, 0]}>
                <Html center distanceFactor={20}><div ref={setLbl('lElbowEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Fore End</div></Html>
              </group>
            </>
          )}
        </group>
      </group>
      {/* Right arm */}
      <group ref={rShoulderRef} position={[shoulderW*0.5, torsoCenterY+torsoY*0.25, 0]}>
        <mesh geometry={gArm} material={matPrimary} position={[0, -upperArmL*0.5, 0]} />
        {s.showJointLabels && (
          <>
            <Html center distanceFactor={20}><div ref={setLbl('rShoulderStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Shoulder</div></Html>
            <group position={[0, -upperArmL, 0]}>
              <Html center distanceFactor={20}><div ref={setLbl('rShoulderEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Upper End</div></Html>
            </group>
          </>
        )}
        <group ref={rElbowRef} position={[0, -upperArmL, 0]}>
          <mesh geometry={gForearm} material={matPrimary} position={[0, -forearmL*0.5, 0]} />
          {s.showJointLabels && (
            <>
              <Html center distanceFactor={20}><div ref={setLbl('rElbowStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Elbow</div></Html>
              <group position={[0, -forearmL, 0]}>
                <Html center distanceFactor={20}><div ref={setLbl('rElbowEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Fore End</div></Html>
              </group>
            </>
          )}
        </group>
      </group>

      {/* Legs - hierarchical joints (hip->knee) */}
      {/* Left leg */}
      <group ref={lHipRef} position={[-pelvisW*0.28, pelvisY, 0]}>
        <mesh geometry={gThigh} material={matPrimary} position={[0, -thighL*0.5, 0]} />
        {s.showJointLabels && (
          <>
            <Html center distanceFactor={22}><div ref={setLbl('lHipStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Hip</div></Html>
            <group position={[0, -thighL, 0]}>
              <Html center distanceFactor={22}><div ref={setLbl('lHipEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Thigh End</div></Html>
            </group>
          </>
        )}
        <group ref={lKneeRef} position={[0, -thighL, 0]}>
          <mesh geometry={gCalf} material={matPrimary} position={[0, -calfL*0.5, 0]} />
          <mesh geometry={gBoot} material={matSecondary} position={[0, -(calfL + (0.035*H)), (0.03*H)]} />
          {s.showJointLabels && (
            <>
              <Html center distanceFactor={22}><div ref={setLbl('lKneeStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Knee</div></Html>
              <group position={[0, -calfL, 0]}>
                    <Html center distanceFactor={22}><div ref={setLbl('lKneeEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>L-Calf End</div></Html>
              </group>
            </>
          )}
        </group>
      </group>
      {/* Right leg */}
      <group ref={rHipRef} position={[pelvisW*0.28, pelvisY, 0]}>
        <mesh geometry={gThigh} material={matPrimary} position={[0, -thighL*0.5, 0]} />
        {s.showJointLabels && (
          <>
            <Html center distanceFactor={22}><div ref={setLbl('rHipStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Hip</div></Html>
            <group position={[0, -thighL, 0]}>
              <Html center distanceFactor={22}><div ref={setLbl('rHipEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Thigh End</div></Html>
            </group>
          </>
        )}
        <group ref={rKneeRef} position={[0, -thighL, 0]}>
          <mesh geometry={gCalf} material={matPrimary} position={[0, -calfL*0.5, 0]} />
          <mesh geometry={gBoot} material={matSecondary} position={[0, -(calfL + (0.035*H)), (0.03*H)]} />
          {s.showJointLabels && (
            <>
              <Html center distanceFactor={22}><div ref={setLbl('rKneeStart')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Knee</div></Html>
              <group position={[0, -calfL, 0]}>
                    <Html center distanceFactor={22}><div ref={setLbl('rKneeEnd')} style={{background:'rgba(0,0,0,0.5)',padding:'2px 4px',borderRadius:3,fontSize:2,color:'#fff'}}>R-Calf End</div></Html>
              </group>
            </>
          )}
        </group>
      </group>

      {/* Shoulder pads */}
      {s.shoulderPads && (
        <>
          <mesh geometry={gShoulder} material={matSecondary} position={[-shoulderW*0.55, torsoCenterY+torsoY*0.35, 0]} rotation={[0,0,Math.PI/2]} />
          <mesh geometry={gShoulder} material={matSecondary} position={[shoulderW*0.55, torsoCenterY+torsoY*0.35, 0]} rotation={[0,0,-Math.PI/2]} />
        </>
      )}

      {/* Knee pads */}
      {s.kneePads && (
        <>
          <mesh geometry={gPad} material={matAccent} position={[-pelvisW*0.28, pelvisY - thighL, 0.06*H]} />
          <mesh geometry={gPad} material={matAccent} position={[pelvisW*0.28, pelvisY - thighL, 0.06*H]} />
        </>
      )}

      {/* Backpack */}
      {s.backpack && (
        <mesh geometry={gBack} material={matSecondary} position={[0, torsoCenterY+0.1*H, -0.12*H]} />
      )}

      {/* FX ring (optional cosmetic) */}
      {(s.fxRing && qual !== 'low') && (
        <group ref={fxRingRef} position={[0, torsoCenterY - torsoY*0.5 + 0.15*H, 0]}>
          {Array.from({ length: Math.max(1, Math.min(s.fxCount ?? fxCount, 48)) }).map((_, i) => (
            <mesh key={i} ref={(m)=> (orbRefs.current[i]=m)}>
              <sphereGeometry args={[0.06 * s.scale, fxSeg, fxSeg]} />
              <meshStandardMaterial color={s.accentColor ?? '#FFD54F'} emissive={s.accentColor ?? '#FFD54F'} emissiveIntensity={s.fxRingIntensity ?? 0.5} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export function defaultHeroSpec(id = 'hero_generic'): HeroSpec {
  return {
    id,
    seed: Math.floor(Math.random() * 1e9),
    bodyType: 'humanoid',
    scale: 1.0,
    height: 1.7,
    headSize: 0.18,
    shoulderWidth: 0.42,
    torsoLength: 0.45,
    pelvisWidth: 0.34,
    armLength: 0.45,
    forearmRatio: 0.48,
    legLength: 0.52,
    calfRatio: 0.48,
    thickness: 1.0,
    primaryColor: '#4C9AFF',
    secondaryColor: '#1E88E5',
    accentColor: '#FFD54F',
    skinColor: '#FFDFC4',
    emissive: '#66A3FF',
    emissiveIntensity: 0.25,
    metalness: 0.25,
    roughness: 0.6,
    visor: true,
    cape: false,
    shoulderPads: false,
    kneePads: true,
    backpack: false,
    fxRing: true,
    fxRingRadius: 1.2,
    fxRingIntensity: 0.5,
  fxMode: 'wave',
  fxSpeed: 1.0,
  fxAmplitude: 0.4,
  fxCount: 12,
  fxDirectionDeg: 0,
  fxShieldShape: 'circle',
    idleSway: 0.01,
    breathe: 0.01,
    walkCycle: 0,
    moveIntentX: 0,
    moveIntentZ: 0,
    leanMaxDeg: 12,
    shoulderSplayDeg: 10,
    armBendScale: 1.1,
    legBendScale: 0.9,
    actionPose: false,
    actionPoseIntensity: 0.8,
    armBendDirection: 'backward',
    bodyTiltDeg: 0,
    showJointLabels: false,
    rootBobAmp: 0.04,
  labelMode: 'deg',
    joint: {
      shoulderBaseXDeg: -8,
      elbowBaseXDeg: 10,
      hipBaseXDeg: 4,
      kneeBaseXDeg: 6,
      shoulderXMinDeg: -60, shoulderXMaxDeg: 60,
      elbowXMinDeg: -5, elbowXMaxDeg: 135,
      hipXMinDeg: -50, hipXMaxDeg: 50,
      kneeXMinDeg: 0, kneeXMaxDeg: 140,
    },
    quality: 'high',
  };
}
