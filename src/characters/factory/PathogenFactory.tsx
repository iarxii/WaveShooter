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
function getGeometry(desc: { kind:'core'|'spike'|'node', radius:number, detail?:number, spikeLength?:number, spikeRadius?:number, baseShape?:BaseShape }) {
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
      case 'triPrism': {
        const h = desc.radius * 1.6;
        geom = new THREE.CylinderGeometry(desc.radius, desc.radius, h, 3);
        break;
      }
      case 'hexPrism': {
        const h = desc.radius * 1.6;
        geom = new THREE.CylinderGeometry(desc.radius, desc.radius, h, 6);
        break;
      }
      case 'icosahedron':
      default:
        geom = new THREE.IcosahedronGeometry(desc.radius, desc.detail);
        break;
    }
  } else if (desc.kind === 'spike') {
    geom = new THREE.ConeGeometry(desc.spikeRadius ?? 0.1, desc.spikeLength ?? 0.45, 6);
  } else { // node
    geom = new THREE.SphereGeometry(0.12, 12, 12);
  }

  geometryPool.set(key, geom);
  return geom;
}

/** Build or fetch pooled material by descriptor */
function getMaterial(desc: { kind:'core'|'spike'|'node'|'arc',
  color:string, metalness?:number, roughness?:number, emissive?:string, flatShading?:boolean }) {
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
      emissiveIntensity: desc.emissive ? 0.35 : 0
    });
  }

  materialPool.set(key, mat);
  return mat;
}

/** Sensible defaults so most specs stay tiny */
const D = {
  radius: 1.0, detail: 1, flatShading: true, spikeCount: 42, spikeLength: 0.45, spikeRadius: 0.11,
  nodeCount: 6, arcCount: 5,
  baseColor: '#B5764C', spikeColor:'#B5764C', nodeColor:'#FFD24A', arcColor:'#FFE9A3', emissive:'#B0774F',
  metalnessCore: 0.25, roughnessCore: 0.85, metalnessNodes: 1.0, roughnessNodes: 0.25,
  spin: 0.25, breathe: 0.015, flickerSpeed: 8.0, quality:'high' as const
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
  const coreGeom = useMemo(() => getGeometry({ kind:'core', radius: lodAdjusted.radius, detail: lodAdjusted.detail, baseShape: lodAdjusted.baseShape }), [lodAdjusted.radius, lodAdjusted.detail, lodAdjusted.baseShape]);
  const spikeGeom = useMemo(() => getGeometry({ kind:'spike', radius: 0, spikeLength: lodAdjusted.spikeLength, spikeRadius: lodAdjusted.spikeRadius }), [lodAdjusted.spikeLength, lodAdjusted.spikeRadius]);
  const nodeGeom = useMemo(() => getGeometry({ kind:'node', radius: 1 }), []);

  const coreMat = useMemo(() => getMaterial({ kind:'core', color: lodAdjusted.baseColor, metalness: lodAdjusted.metalnessCore, roughness: lodAdjusted.roughnessCore, emissive: lodAdjusted.emissive, flatShading: lodAdjusted.flatShading }), [lodAdjusted.baseColor, lodAdjusted.metalnessCore, lodAdjusted.roughnessCore, lodAdjusted.emissive, lodAdjusted.flatShading]);
  const spikeMat = useMemo(() => getMaterial({ kind:'spike', color: lodAdjusted.spikeColor, flatShading: lodAdjusted.flatShading }), [lodAdjusted.spikeColor, lodAdjusted.flatShading]);
  const nodeMat = useMemo(() => getMaterial({ kind:'node', color: lodAdjusted.nodeColor, metalness: lodAdjusted.metalnessNodes, roughness: lodAdjusted.roughnessNodes }), [lodAdjusted.nodeColor, lodAdjusted.metalnessNodes, lodAdjusted.roughnessNodes]);
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
      breathe={lodAdjusted.breathe}
      flickerSpeed={lodAdjusted.flickerSpeed}
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
