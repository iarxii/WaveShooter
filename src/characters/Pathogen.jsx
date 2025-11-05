// src/characters/Pathogen.jsx
import * as THREE from 'three';
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
// If you later want to merge extra meshes, you can import mergeGeometries:
// import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Tiny deterministic RNG so variations are reproducible per seed */
function makeRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) / 0xFFFFFFFF);
  };
}

/** Returns a unit vector uniformly distributed on the sphere */
function randomUnitVector(rnd) {
  const u = rnd() * 2 - 1;            // cos(theta) in [-1,1]
  const a = rnd() * Math.PI * 2;      // azimuth
  const f = Math.sqrt(1 - u * u);
  return new THREE.Vector3(Math.cos(a) * f, u, Math.sin(a) * f);
}

/** Jitter helper for 'electric' motion */
function noiseish(t, i, seed = 0) {
  // cheap hash-y trig mix
  return Math.sin(t * 1.7 + i * 2.123 + seed * 0.37) * 0.6 +
         Math.cos(t * 2.9 + i * 1.111 + seed * 1.91) * 0.4;
}

/**
 * Pathogen
 * - Low-poly faceted core (Icosahedron)
 * - Instanced spikes (cones) pointing outward along surface normals
 * - Instanced metallic nodes (small spheres)
 * - Animated electric arcs (lines with jitter)
 *
 * Props are tuned to match your reference image while staying light on GPU.
 */
export function Pathogen({
  radius = 1.0,
  detail = 1,            // 0..2 (higher = more triangles)
  spikeCount = 42,       // 24..64 is a good range
  spikeLength = 0.45,
  spikeRadius = 0.11,
  nodeCount = 6,         // gold nuggets
  arcCount = 5,          // animated lightning arcs
  seed = 7,              // change to get a new variant
  spikeStyle = 'cone',   // 'cone'|'inverted'|'disk'|'block'|'tentacle'
  spikeBaseShift = 0.0,  // world units; negative=inward, positive=outward
  spikePulse = true,
  spikePulseIntensity = 0.25,
  // Style
  baseColor = '#C4845C', // warm clay/organic
  spikeColor = '#C4845C',
  nodeColor = '#FFD24A', // metallic gold
  arcColor  = '#FFEC9C',
  emissive  = '#BD875B', // subtle warm core glow
  emissiveIntensityCore = 0.35,
  spikeEmissive = undefined,
  emissiveIntensitySpikes = 0.12,
  metalnessCore = 0.25,
  roughnessCore = 0.85,
  metalnessSpikes = 0.15,
  roughnessSpikes = 0.9,
  metalnessNodes = 1.0,
  roughnessNodes = 0.25,
  flatShading = true,
  // Animation
  spin = 0.25,           // radians/sec
  roll = 0.0,            // radians/sec (roll around Z)
  breathe = 0.015,       // scale pulsing
  flickerSpeed = 8.0,    // node emissive flicker speed
  quality = 'high',      // 'low'|'med'|'high' affects arc resolution
  // Node strobe
  nodeStrobeMode = 'off',
  nodeStrobeColorA,
  nodeStrobeColorB,
  nodeStrobeSpeed = 8.0,
  // Dynamic hitbox influence
  hitboxEnabled = false,
  hitboxVisible = false,
  hitboxScaleMin = 1.0,
  hitboxScaleMax = 1.0,
  hitboxSpeed = 1.0,
  hitboxMode = 'sin',
  // Optional pooled overrides (factory can inject to share resources)
  coreGeometry,
  coreMaterial,
  spikeGeometry,
  spikeMaterial,
  nodeGeometry,
  nodeMaterial,
  arcMaterial: arcMaterialOverride,
}) {
  const rng = useMemo(() => makeRng(seed), [seed]);

  // --- CORE (faceted sphere) ---
  const coreGeom = useMemo(
    () => coreGeometry ?? new THREE.IcosahedronGeometry(radius, detail),
    [coreGeometry, radius, detail]
  );

  const coreMat = useMemo(() => coreMaterial ?? new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor),
    metalness: metalnessCore,
    roughness: roughnessCore,
    flatShading,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: emissiveIntensityCore
  }), [coreMaterial, baseColor, metalnessCore, roughnessCore, emissive, emissiveIntensityCore, flatShading]);

  // --- SPIKES (instanced cones) ---
  const spikes = useRef();
  const spikeGeom = useMemo(
    () => spikeGeometry ?? new THREE.ConeGeometry(spikeRadius, spikeLength, 6),
    [spikeGeometry, spikeRadius, spikeLength]
  );
  const spikeMat = useMemo(() => spikeMaterial ?? new THREE.MeshStandardMaterial({
    color: new THREE.Color(spikeColor),
    metalness: metalnessSpikes,
    roughness: roughnessSpikes,
    flatShading,
    emissive: emissiveIntensitySpikes > 0 ? new THREE.Color(spikeEmissive ?? spikeColor) : undefined,
    emissiveIntensity: emissiveIntensitySpikes
  }), [spikeMaterial, spikeColor, metalnessSpikes, roughnessSpikes, spikeEmissive, emissiveIntensitySpikes, flatShading]);

  const spikeData = useMemo(() => {
    const positions = [];
    const dummy = new THREE.Object3D();
    const transforms = [];
    const scales = [];
    for (let i = 0; i < spikeCount; i++) {
      // Sample a random direction, then repel from previous few to reduce clumping
      let dir = randomUnitVector(rng);
      if (i > 4) {
        const nBack = Math.min(6, i);
        for (let j = 1; j <= nBack; j++) {
          const prev = positions[i - j];
          const d = dir.dot(prev);
          if (d > 0.85) { // too close, nudge
            dir.addScaledVector(prev, -0.4).normalize();
          }
        }
      }
      positions.push(dir.clone());
      // Compute orientation and placement per style
      const outward = dir.clone();
      const up = new THREE.Vector3(0, 1, 0);
      let forward = outward.clone();
      let dist = radius + spikeLength * 0.45;
      if (spikeStyle === 'inverted') {
        forward.multiplyScalar(-1);
        dist = Math.max(radius - spikeLength * 0.45, radius * 0.35);
      } else if (spikeStyle === 'disk') {
        dist = radius + Math.max(0.02, spikeLength * 0.1);
      } else if (spikeStyle === 'block') {
        dist = radius + spikeLength * 0.3;
      } else if (spikeStyle === 'tentacle') {
        dist = radius + spikeLength * 0.6;
      }
      // apply user shift and clamp to safe range
      dist += spikeBaseShift;
      const minDist = Math.max(0.2 * radius, radius - spikeLength * 1.2);
      const maxDist = radius + spikeLength * 2.0;
      dist = Math.max(minDist, Math.min(maxDist, dist));
      const base = outward.multiplyScalar(dist);
      dummy.position.copy(base);
      // orient +Y along forward direction
      dummy.quaternion.setFromUnitVectors(up, forward.normalize());
      // randomize length/width subtly
      const s = 0.85 + rng() * 0.3;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      transforms.push(dummy.matrix.clone());
      scales.push(s);
    }
    return { positions, transforms, scales };
  }, [spikeCount, radius, spikeLength, rng, spikeStyle]);

  // --- NODES (instanced gold spheres) ---
  const nodes = useRef();
  const nodeGeom = useMemo(() => nodeGeometry ?? new THREE.SphereGeometry(0.12, 12, 12), [nodeGeometry]);
  const nodeMat = useMemo(() => nodeMaterial ?? new THREE.MeshStandardMaterial({
    color: new THREE.Color(nodeColor),
    metalness: metalnessNodes,
    roughness: roughnessNodes,
    envMapIntensity: 1.0,
    vertexColors: true
  }), [nodeMaterial, nodeColor, metalnessNodes, roughnessNodes]);

  // Ensure vertexColors on provided material too
  if (nodeMat && nodeMat.vertexColors === false) nodeMat.vertexColors = true;

  const nodePositions = useMemo(() => {
    const pts = [];
    // bias nodes to sit on/near spike bases for that nugget-inset look
    for (let i = 0; i < nodeCount; i++) {
      const useSpikeBase = rng() < 0.7 && spikeData.positions.length > 0;
      let dir = useSpikeBase
        ? spikeData.positions[Math.floor(rng() * spikeData.positions.length)].clone()
        : randomUnitVector(rng);
      // slightly inset so they look embedded
      const p = dir.multiplyScalar(radius * (0.82 + rng() * 0.1));
      pts.push(p);
    }
    return pts;
  }, [nodeCount, radius, rng, spikeData.positions]);

  // --- ELECTRIC ARCS (animated lines with jitter) ---
  const arcsGroup = useRef();
  const arcSegments = quality === 'low' ? 10 : quality === 'med' ? 16 : 22;
  const arcRefs = useRef([]);
  arcRefs.current = []; // reset each render

  const arcMaterial = useMemo(() => arcMaterialOverride ?? new THREE.LineBasicMaterial({
    color: new THREE.Color(arcColor),
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  }), [arcMaterialOverride, arcColor]);

  const arcData = useMemo(() => {
    if (nodePositions.length < 2) return [];
    const data = [];
    for (let a = 0; a < arcCount; a++) {
      const aIdx = Math.floor(rng() * nodePositions.length);
      let bIdx = Math.floor(rng() * nodePositions.length);
      if (bIdx === aIdx) bIdx = (bIdx + 1) % nodePositions.length;
      const A = nodePositions[aIdx].clone();
      const B = nodePositions[bIdx].clone();
      // Midpoint arc lifted a bit off the surface
      const mid = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.15);
      const points = [];
      for (let i = 0; i <= arcSegments; i++) {
        const t = i / arcSegments;
        // Quadratic bezier: A -> mid -> B
        const p = new THREE.Vector3().set(0,0,0)
          .addScaledVector(A, (1 - t) * (1 - t))
          .addScaledVector(mid, 2 * (1 - t) * t)
          .addScaledVector(B, t * t);
        points.push(p);
      }
      data.push({ A, B, mid, points, seed: rng()*1000 });
    }
    return data;
  }, [arcCount, arcSegments, nodePositions, radius, rng]);

  // --- HITBOX (debug) ---
  const hitboxRef = useRef();
  const hitboxGeom = useMemo(() => new THREE.SphereGeometry(radius, 16, 16), [radius]);
  const hitboxMat = useMemo(() => new THREE.MeshBasicMaterial({ color:'#44ccff', wireframe:true, transparent:true, opacity:0.35, depthWrite:false }), []);
  const currentHitboxScale = useRef(1.0);

  // --- ROOT group animation ---
  const root = useRef();
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    // Animate hitbox scale between min and max using selected mode
    if (hitboxEnabled) {
      let f = 0.0;
      if (hitboxMode === 'sin') {
        f = 0.5 + 0.5 * Math.sin(t * hitboxSpeed * Math.PI * 2);
      } else if (hitboxMode === 'step') {
        const phase = Math.floor(t * hitboxSpeed) % 2;
        f = phase === 0 ? 0.0 : 1.0;
      } else { // 'noise'
        // Simple 1D value noise over time (seeded); smoothstep between hashed values
        const tau = t * Math.max(0.0001, hitboxSpeed);
        const k = Math.floor(tau);
        const a = k;
        const b = k + 1;
        const fract = tau - k;
        const h = (x) => {
          const s = Math.sin((x + seed * 0.1234) * 12.9898) * 43758.5453;
          return s - Math.floor(s);
        };
        const sCurve = fract * fract * (3 - 2 * fract); // smoothstep
        const v = h(a) * (1 - sCurve) + h(b) * sCurve; // 0..1
        f = v;
      }
      currentHitboxScale.current = THREE.MathUtils.lerp(hitboxScaleMin, hitboxScaleMax, f);
      if (hitboxRef.current) hitboxRef.current.scale.setScalar(currentHitboxScale.current);
    } else {
      currentHitboxScale.current = 1.0;
      if (hitboxRef.current) hitboxRef.current.scale.setScalar(1.0);
    }
    if (root.current) {
      root.current.rotation.y += spin * 0.016; // assuming ~60 FPS; use dt if you prefer
      root.current.rotation.z += roll * 0.016;
      const s = 1 + Math.sin(t * 2.0) * breathe;
      root.current.scale.setScalar(s);
    }
    // Nodes: subtle emissive flicker by modulating envMapIntensity via color additive
    if (nodes.current) {
      const e = 0.6 + Math.sin(t * flickerSpeed) * 0.4;
      nodes.current.traverseVisible(obj => {
        if (obj.isMesh) obj.material.emissive = new THREE.Color(arcColor).multiplyScalar(0.15 * e);
      });
    }
    // Node color strobe (instance colors)
    if (nodes.current && (nodeStrobeMode === 'unified' || nodeStrobeMode === 'alternating')) {
      const A = new THREE.Color(nodeStrobeColorA ?? nodeColor);
      const B = new THREE.Color(nodeStrobeColorB ?? arcColor);
      const temp = new THREE.Color();
      const n = nodeCount;
      for (let i = 0; i < n; i++) {
        const phase = nodeStrobeMode === 'alternating' ? (i % 2) * Math.PI : 0;
        const f = 0.5 + 0.5 * Math.sin(t * nodeStrobeSpeed + phase);
        temp.copy(A).lerp(B, f);
        if (nodes.current.setColorAt) nodes.current.setColorAt(i, temp);
      }
      if (nodes.current.instanceColor) nodes.current.instanceColor.needsUpdate = true;
    }
    // Arcs jitter: offset each intermediate point slightly each frame
    if (arcsGroup.current) {
      let idx = 0;
      arcsGroup.current.children.forEach((line) => {
        if (!line.geometry) return;
        const data = arcData[idx++];
        if (!data) return;
        const positions = line.geometry.attributes.position;
        for (let i = 0; i <= arcSegments; i++) {
          if (i === 0 || i === arcSegments) continue; // keep endpoints fixed to nodes
          const base = data.points[i];
          // perpendicular jitter away from radial direction so it looks like sizzling
          const n1 = base.clone().normalize();
          const n2 = new THREE.Vector3().crossVectors(n1, new THREE.Vector3(0,1,0)).normalize();
          const n3 = new THREE.Vector3().crossVectors(n1, n2).normalize();
          const wobble = 0.04 + (i % 3) * 0.01;
          const jx = noiseish(t * 3.0, i, data.seed) * wobble;
          const jy = noiseish(t * 2.0, i+17, data.seed) * wobble;
          const p = base.clone().addScaledVector(n2, jx).addScaledVector(n3, jy);
          positions.setXYZ(i, p.x, p.y, p.z);
        }
        positions.needsUpdate = true;
        // random opacity flicker
        line.material.opacity = 0.6 + Math.abs(Math.sin(t * 12.0 + idx)) * 0.35;
      });
    }

    // Spike pulsing and/or hitbox influence: move spike bases along normal
    if ((spikePulse || hitboxEnabled) && spikes.current) {
      const dummy = new THREE.Object3D();
      const up = new THREE.Vector3(0,1,0);
      const baseR = radius * currentHitboxScale.current;
      for (let i = 0; i < spikeCount; i++) {
        const dir = spikeData.positions[i];
        let forward = dir.clone();
        let dist = baseR + spikeLength * 0.45;
        if (spikeStyle === 'inverted') {
          forward.multiplyScalar(-1);
          dist = Math.max(baseR - spikeLength * 0.45, baseR * 0.35);
        } else if (spikeStyle === 'disk') {
          dist = baseR + Math.max(0.02, spikeLength * 0.1);
        } else if (spikeStyle === 'block') {
          dist = baseR + spikeLength * 0.3;
        } else if (spikeStyle === 'tentacle') {
          dist = baseR + spikeLength * 0.6;
        }
        const pulse = spikePulse ? Math.sin(t * 4.0 + spikePhases[i]) * (spikePulseIntensity * spikeLength) : 0;
        let d = dist + spikeBaseShift + pulse;
        const minDist = Math.max(0.2 * baseR, baseR - spikeLength * 1.2);
        const maxDist = baseR + spikeLength * 2.0;
        d = Math.max(minDist, Math.min(maxDist, d));
        dummy.position.copy(dir).multiplyScalar(d);
        dummy.quaternion.setFromUnitVectors(up, forward.normalize());
        const s0 = spikeData.scales ? (spikeData.scales[i] ?? 1) : 1;
        dummy.scale.setScalar(s0);
        dummy.updateMatrix();
        dummy.matrix.toArray(spikeMatrices, i * 16);
      }
      if (spikes.current.instanceMatrix) spikes.current.instanceMatrix.needsUpdate = true;
    }
  });

  // --- Build instanced transforms for spikes & nodes ---
  const spikeMatrices = useMemo(() => {
    const arr = new Float32Array(spikeCount * 16);
    for (let i = 0; i < spikeCount; i++) {
      spikeData.transforms[i].toArray(arr, i * 16);
    }
    return arr;
  }, [spikeCount, spikeData.transforms]);

  // Per-spike phase offsets for pulsing variety
  const spikePhases = useMemo(() => {
    const phases = new Float32Array(spikeCount);
    for (let i = 0; i < spikeCount; i++) phases[i] = rng() * Math.PI * 2;
    return phases;
  }, [spikeCount, rng]);

  const nodeMatrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const arr = new Float32Array(nodeCount * 16);
    for (let i = 0; i < nodeCount; i++) {
      dummy.position.copy(nodePositions[i]);
      // align node's "up" with surface normal for nicer shading
      const normal = nodePositions[i].clone().normalize();
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), normal);
      const s = 0.85 + rng() * 0.3;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      dummy.matrix.toArray(arr, i * 16);
    }
    return arr;
  }, [nodeCount, nodePositions, rng]);

  return (
    <group ref={root}>
      {/* HITBOX DEBUG */}
      {hitboxVisible && (
        <mesh ref={hitboxRef} geometry={hitboxGeom} material={hitboxMat} />
      )}
      {/* CORE */}
      <mesh geometry={coreGeom} material={coreMat} />

      {/* SPIKES */}
      <instancedMesh ref={spikes} args={[spikeGeom, spikeMat, spikeCount]}>
        <instancedBufferAttribute
          attach="instanceMatrix"
          args={[spikeMatrices, 16]}
        />
      </instancedMesh>

      {/* METALLIC NODES */}
      <instancedMesh ref={nodes} args={[nodeGeom, nodeMat, nodeCount]}>
        <instancedBufferAttribute
          attach="instanceMatrix"
          args={[nodeMatrices, 16]}
        />
      </instancedMesh>

      {/* ELECTRIC ARCS */}
      <group ref={arcsGroup}>
        {arcData.map((arc, i) => {
          const pos = new Float32Array((arcSegments + 1) * 3);
          for (let k = 0; k <= arcSegments; k++) {
            const p = arc.points[k];
            pos[k * 3 + 0] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          return (
            <line
              key={i}
              ref={ref => ref && (arcRefs.current[i] = ref)}
              geometry={g}
              material={arcMaterial}
            />
          );
        })}
      </group>
    </group>
  );
}