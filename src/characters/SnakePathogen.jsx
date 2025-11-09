// src/characters/SnakePathogen.jsx
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Pathogen } from './Pathogen';

/** Segmented snake chain built from multiple mini Pathogen cores */
export function SnakePathogen({ spec }) {
  const {
    segmentCount = 8,
    segmentSpacing = 0.6,
    snakeCurvature = 0.3,
    snakeTwist = 0.2,
    segmentRadiusScaleStart = 1.0,
    segmentRadiusScaleEnd = 0.6,
    spikeCount = 42,
    spikeStyle = 'tentacle'
  } = spec;
  const groupRef = useRef();
  // Precompute per-segment scale taper
  const scales = useMemo(() => {
    const arr = [];
    for (let i=0;i<segmentCount;i++){
      const t = i/(segmentCount-1 || 1);
      const s = segmentRadiusScaleStart + (segmentRadiusScaleEnd - segmentRadiusScaleStart)*t;
      arr.push(s);
    }
    return arr;
  }, [segmentCount, segmentRadiusScaleStart, segmentRadiusScaleEnd]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Animate gentle undulation along Z using curvature and time
    const children = groupRef.current.children;
    for (let i=0;i<children.length;i++){
      const seg = children[i];
      const phase = (i/segmentCount)*Math.PI*2;
      const wave = Math.sin(t*1.2 + phase)*snakeCurvature;
      seg.position.z = wave;
      // Twist rotation along chain
      seg.rotation.y = (i/segmentCount)*snakeTwist*Math.PI*2;
    }
  });

  // Divide spike budget among segments (floor, ensure >=3 spikes per segment)
  const perSegmentSpikes = Math.max(3, Math.floor(spikeCount / segmentCount));

  return (
    <group ref={groupRef}>
      {Array.from({ length: segmentCount }).map((_, i) => {
        const t = i/(segmentCount-1 || 1);
        return (
          <group key={i} position={[i*segmentSpacing, 0, 0]}>
            <Pathogen
              baseShape='capsule'
              radius={(spec.radius ?? 1.0) * scales[i]}
              height={(spec.height ?? 2.0) * scales[i] * 0.6}
              detail={spec.detail}
              seed={(spec.seed + i*997) >>> 0}
              spikeCount={perSegmentSpikes}
              spikeLength={spec.spikeLength}
              spikeRadius={spec.spikeRadius}
              spikeStyle={spikeStyle}
              spikeBaseShift={spec.spikeBaseShift}
              spikePulse={spec.spikePulse}
              spikePulseIntensity={spec.spikePulseIntensity}
              nodeCount={Math.max(0, Math.floor((spec.nodeCount ?? 6)/segmentCount))}
              arcCount={0} // arcs disabled for snake segments for perf clarity
              baseColor={spec.baseColor}
              spikeColor={spec.spikeColor}
              nodeColor={spec.nodeColor}
              arcColor={spec.arcColor}
              emissive={spec.emissive}
              emissiveIntensityCore={spec.emissiveIntensityCore}
              spikeEmissive={spec.spikeEmissive}
              emissiveIntensitySpikes={spec.emissiveIntensitySpikes}
              metalnessCore={spec.metalnessCore}
              roughnessCore={spec.roughnessCore}
              metalnessSpikes={spec.metalnessSpikes}
              roughnessSpikes={spec.roughnessSpikes}
              metalnessNodes={spec.metalnessNodes}
              roughnessNodes={spec.roughnessNodes}
              spin={(spec.spin ?? 0.25) * (0.6 + 0.4*Math.sin(i*0.7))}
              roll={(spec.roll ?? 0.0) * (0.5 + 0.5*Math.cos(i*0.9))}
              breathe={spec.breathe}
              flickerSpeed={spec.flickerSpeed}
              quality={spec.quality}
            />
          </group>
        );
      })}
    </group>
  );
}
