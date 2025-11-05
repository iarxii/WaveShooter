// src/characters/factory/PathogenFactory.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Pathogen } from '../Pathogen';
import { EnemyRoster } from './EnemyRoster';
import type { AvatarSpec, BaseShape } from './AvatarSpec';

/** global pools so multiple enemies share meshes/materials */
const geometryPool = new Map<string, THREE.BufferGeometry>();
const materialPool = new Map<string, THREE.Material>();

function keyOf(obj: unknown) {
  return typeof obj === 'string' ? obj : JSON.stringify(obj);
}

/** Build or fetch pooled geometry by descriptor */
function getGeometry(desc: { kind:'core'|'spike'|'node', radius:number, detail?:number, spikeLength?:number, spikeRadius?:number, baseShape?:BaseShape, height?:number, spikeStyle?:AvatarSpec['spikeStyle'], scaleX?:number, scaleY?:number }) {
  const key = keyOf(desc);
  if (geometryPool.has(key)) return geometryPool.get(key)!;

  let geom: THREE.BufferGeometry;
  if (desc.kind === 'core') {
    if (desc.detail === undefined) desc.detail = 1;
    // Choose core primitive by baseShape; default to icosahedron for faceted look
    switch (desc.baseShape ?? 'icosahedron') {
      case 'sphere':
        geom = new THREE.SphereGeometry(desc.radius, 8 + (desc.detail ?? 1) * 4, 8 + (desc.detail ?? 1) * 4);
        break;
      case 'cylinder': {
        const h = desc.height ?? desc.radius * 2;
        // Restrict to hard-edged minimum radial segments for a faceted look
        const radial = 6; // minimal hard-edged cylinder
        geom = new THREE.CylinderGeometry(desc.radius, desc.radius, h, radial);
        break;
      }
      case 'capsule': {
        const h = (desc.height ?? desc.radius * 2) - desc.radius * 2;
        const shaft = Math.max(0, h);
        // CapsuleGeometry(radius, length, capSegments, radialSegments)
        // length is the distance between the end of the hemispheres (shaft length)
        // If not available in this three version, fall back to a cylinder+hemispheres approximated by CylinderGeometry
        // @ts-ignore
        geom = (THREE as any).CapsuleGeometry
          ? new (THREE as any).CapsuleGeometry(desc.radius, shaft, 2, 6) // minimal caps & radial segments for hard edges
          : new THREE.CylinderGeometry(desc.radius, desc.radius, shaft + desc.radius * 2, 6);
        break;
      }
      case 'triPrism': {
        const h = desc.radius * 1.6;
        // Already minimal (3-sided prism)
        geom = new THREE.CylinderGeometry(desc.radius, desc.radius, h, 3);
        break;
      }
      case 'hexPrism': {
        const h = desc.radius * 1.6;
        // Already minimal (6-sided prism)
        geom = new THREE.CylinderGeometry(desc.radius, desc.radius, h, 6);
        break;
      }
      case 'icosahedron':
      default:
        geom = new THREE.IcosahedronGeometry(desc.radius, desc.detail);
        break;
    }
    // Apply anisotropic scaling: width on X/Z, height on Y
    const sx = desc.scaleX ?? 1;
    const sy = desc.scaleY ?? 1;
    if (sx !== 1 || sy !== 1) {
      geom.scale(sx, sy, sx);
    }
  } else if (desc.kind === 'spike') {
    const r = desc.spikeRadius ?? 0.1;
    const L = desc.spikeLength ?? 0.45;
    switch (desc.spikeStyle ?? 'cone') {
      case 'disk':
        geom = new THREE.CylinderGeometry(r, r, Math.max(0.02, L * 0.2), 12);
        break;
      case 'block':
        geom = new THREE.BoxGeometry(r * 2, L, r * 2);
        break;
      case 'tentacle':
        geom = new THREE.CylinderGeometry(r * 0.6, r * 0.25, L * 1.8, 8);
        break;
      case 'inverted': // same geometry as cone; orientation handled in renderer
      case 'cone':
      default:
        geom = new THREE.ConeGeometry(r, L, 6);
        break;
    }
  } else { // node
    geom = new THREE.SphereGeometry(0.12, 12, 12);
  }

  geometryPool.set(key, geom);
  return geom;
}

/** Build or fetch pooled material by descriptor */
function getMaterial(desc: { kind:'core'|'spike'|'node'|'arc',
  color:string, metalness?:number, roughness?:number, emissive?:string, emissiveIntensity?:number, flatShading?:boolean, vertexColors?:boolean }) {
  const key = keyOf(desc);
  if (materialPool.has(key)) return materialPool.get(key)!;

  let mat: THREE.Material;
  if (desc.kind === 'arc') {
    mat = new THREE.LineBasicMaterial({ color: new THREE.Color(desc.color), transparent:true, opacity:0.85, depthWrite:false });
  } else {
    mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(desc.color),
      metalness: desc.metalness ?? 0.25,
      roughness: desc.roughness ?? 0.85,
      flatShading: desc.flatShading ?? true,
      emissive: desc.emissive ? new THREE.Color(desc.emissive) : undefined,
      emissiveIntensity: desc.emissive ? (desc.emissiveIntensity ?? 0.35) : 0,
      vertexColors: desc.vertexColors ?? false
    });
  }

  materialPool.set(key, mat);
  return mat;
}

/** Sensible defaults so most specs stay tiny */
const D = {
  radius: 1.0, height: 2.0, scaleX: 1.0, scaleY: 1.0, detail: 1, flatShading: true, spikeCount: 42, spikeLength: 0.45, spikeRadius: 0.11, spikeStyle: 'cone' as AvatarSpec['spikeStyle'], spikeBaseShift: 0.0,
  spikePulse: true, spikePulseIntensity: 0.25,
  nodeCount: 6, arcCount: 5,
  baseColor: '#B5764C', spikeColor:'#B5764C', nodeColor:'#FFD24A', arcColor:'#FFE9A3', emissive:'#B0774F',
  emissiveIntensityCore: 0.35, spikeEmissive: '#B5764C', emissiveIntensitySpikes: 0.12,
  metalnessCore: 0.25, roughnessCore: 0.85,
  metalnessSpikes: 0.15, roughnessSpikes: 0.9,
  metalnessNodes: 1.0, roughnessNodes: 0.25,
  // Node strobe defaults
  nodeStrobeMode: 'off' as 'off'|'unified'|'alternating',
  nodeStrobeColorA: '#FFD24A',
  nodeStrobeColorB: '#FFE9A3',
  nodeStrobeSpeed: 8.0,
  // Hitbox motion (off by default)
  hitboxEnabled: false,
  hitboxVisible: false,
  hitboxScaleMin: 1.0,
  hitboxScaleMax: 1.0,
  hitboxSpeed: 1.0,
  hitboxMode: 'sin' as 'sin'|'step'|'noise',
  spin: 0.25, roll: 0.0, breathe: 0.015, flickerSpeed: 8.0, quality:'high' as const
};

/** Turns an AvatarSpec into a live Pathogen instance with pooled assets */
export function PathogenFromSpec({ spec }: { spec: AvatarSpec }) {
  const s = { ...D, ...spec };

  // Core & materials pulled from pools (but Pathogen currently builds its own).
  // We pass s down and let Pathogen use the numbers; pooling matters most for many entities,
  // and we can later refactor Pathogen to accept prebuilt geometries/materials if needed.

  // LOD policy (cheap): scale down spikes/arcs for lower quality or min caps
  const lodAdjusted = useMemo(() => {
    let spikeCount = s.spikeCount;
    let arcCount = s.arcCount;
    let detail = s.detail;

    if (s.quality === 'low') {
      spikeCount = Math.max(8, Math.floor(spikeCount * 0.7));
      arcCount = 0;
      detail = Math.min(detail, 1);
    } else if (s.quality === 'med') {
      spikeCount = Math.max(8, Math.floor(spikeCount * 0.85));
      arcCount = Math.max(0, Math.floor(arcCount * 0.5));
    }

    if (s.lod) {
      spikeCount = Math.max(spikeCount, s.lod.minSpikeCount);
      detail = Math.max(detail, s.lod.minDetail);
    }

    return { ...s, spikeCount, arcCount, detail } as typeof s;
  }, [s]);

  // Build pooled resources from adjusted spec
  const coreGeom = useMemo(() => getGeometry({ kind:'core', radius: lodAdjusted.radius, detail: lodAdjusted.detail, baseShape: lodAdjusted.baseShape, height: lodAdjusted.height, scaleX: lodAdjusted.scaleX, scaleY: lodAdjusted.scaleY }), [lodAdjusted.radius, lodAdjusted.detail, lodAdjusted.baseShape, lodAdjusted.height, lodAdjusted.scaleX, lodAdjusted.scaleY]);
  const spikeGeom = useMemo(() => getGeometry({ kind:'spike', radius: 0, spikeLength: lodAdjusted.spikeLength, spikeRadius: lodAdjusted.spikeRadius, spikeStyle: lodAdjusted.spikeStyle }), [lodAdjusted.spikeLength, lodAdjusted.spikeRadius, lodAdjusted.spikeStyle]);
  const nodeGeom = useMemo(() => getGeometry({ kind:'node', radius: 1 }), []);

  const coreMat = useMemo(() => getMaterial({ kind:'core', color: lodAdjusted.baseColor, metalness: lodAdjusted.metalnessCore, roughness: lodAdjusted.roughnessCore, emissive: lodAdjusted.emissive, emissiveIntensity: lodAdjusted.emissiveIntensityCore, flatShading: lodAdjusted.flatShading }), [lodAdjusted.baseColor, lodAdjusted.metalnessCore, lodAdjusted.roughnessCore, lodAdjusted.emissive, lodAdjusted.emissiveIntensityCore, lodAdjusted.flatShading]);
  const spikeMat = useMemo(() => getMaterial({ kind:'spike', color: lodAdjusted.spikeColor, metalness: lodAdjusted.metalnessSpikes, roughness: lodAdjusted.roughnessSpikes, emissive: (lodAdjusted.emissiveIntensitySpikes ?? 0) > 0 ? (lodAdjusted.spikeEmissive ?? lodAdjusted.spikeColor) : undefined, emissiveIntensity: lodAdjusted.emissiveIntensitySpikes, flatShading: lodAdjusted.flatShading }), [lodAdjusted.spikeColor, lodAdjusted.metalnessSpikes, lodAdjusted.roughnessSpikes, lodAdjusted.spikeEmissive, lodAdjusted.emissiveIntensitySpikes, lodAdjusted.flatShading]);
  const nodeMat = useMemo(() => getMaterial({ kind:'node', color: lodAdjusted.nodeColor, metalness: lodAdjusted.metalnessNodes, roughness: lodAdjusted.roughnessNodes, vertexColors: true }), [lodAdjusted.nodeColor, lodAdjusted.metalnessNodes, lodAdjusted.roughnessNodes]);
  const arcMat = useMemo(() => getMaterial({ kind:'arc', color: lodAdjusted.arcColor }), [lodAdjusted.arcColor]);

  return (
    <Pathogen
      seed={lodAdjusted.seed}
      radius={lodAdjusted.radius}
      detail={lodAdjusted.detail}
      flatShading={lodAdjusted.flatShading}
      spikeCount={lodAdjusted.spikeCount}
      spikeLength={lodAdjusted.spikeLength}
      spikeRadius={lodAdjusted.spikeRadius}
  spikeStyle={lodAdjusted.spikeStyle}
    spikeBaseShift={lodAdjusted.spikeBaseShift}
    spikePulse={lodAdjusted.spikePulse}
    spikePulseIntensity={lodAdjusted.spikePulseIntensity}
      nodeCount={lodAdjusted.nodeCount}
      arcCount={lodAdjusted.arcCount}
      baseColor={lodAdjusted.baseColor}
      spikeColor={lodAdjusted.spikeColor}
      nodeColor={lodAdjusted.nodeColor}
      arcColor={lodAdjusted.arcColor}
      emissive={lodAdjusted.emissive}
      metalnessCore={lodAdjusted.metalnessCore}
      roughnessCore={lodAdjusted.roughnessCore}
      metalnessNodes={lodAdjusted.metalnessNodes}
      roughnessNodes={lodAdjusted.roughnessNodes}
      spin={lodAdjusted.spin}
  roll={lodAdjusted.roll}
      breathe={lodAdjusted.breathe}
      flickerSpeed={lodAdjusted.flickerSpeed}
  nodeStrobeMode={lodAdjusted.nodeStrobeMode}
  nodeStrobeColorA={lodAdjusted.nodeStrobeColorA}
  nodeStrobeColorB={lodAdjusted.nodeStrobeColorB}
  nodeStrobeSpeed={lodAdjusted.nodeStrobeSpeed}
  hitboxEnabled={lodAdjusted.hitboxEnabled}
  hitboxVisible={lodAdjusted.hitboxVisible}
  hitboxScaleMin={lodAdjusted.hitboxScaleMin}
  hitboxScaleMax={lodAdjusted.hitboxScaleMax}
  hitboxSpeed={lodAdjusted.hitboxSpeed}
  hitboxMode={lodAdjusted.hitboxMode}
      quality={lodAdjusted.quality}
      coreGeometry={coreGeom}
      coreMaterial={coreMat as any}
      spikeGeometry={spikeGeom}
      spikeMaterial={spikeMat as any}
      nodeGeometry={nodeGeom}
      nodeMaterial={nodeMat as any}
      arcMaterial={arcMat as any}
    />
  );
}

/** Convenience: render by enemy id using the in-memory roster */
export function PathogenFromId({ id }: { id: string }) {
  const spec = EnemyRoster[id];
  if (!spec) return null;
  return <PathogenFromSpec spec={spec} />;
}
