// src/pages/PathogenDemo.jsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Pathogen } from '../characters/Pathogen';

export default function PathogenDemo() {
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#07111E' }}>
      <Canvas camera={{ position: [0, 1.8, 3.5], fov: 45 }}>
        <color attach="background" args={['#07111E']} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 6, 3]} intensity={1.1} />
        <hemisphereLight intensity={0.35} groundColor={'#0A0A0F'} />

        <group position={[0, 0.15, 0]}>
          <Pathogen
            radius={1.0}
            detail={1}
            spikeCount={46}
            spikeLength={0.48}
            spikeRadius={0.12}
            nodeCount={7}
            arcCount={6}
            seed={1234}
            baseColor={'#B5764C'}
            spikeColor={'#B5764C'}
            nodeColor={'#FFD24A'}
            arcColor={'#FFE9A3'}
            emissive={'#B0774F'}
            quality="high"
          />
        </group>

        <Grid args={[20, 20]} position={[0, 0, 0]} cellColor="#0F233E" sectionColor="#133458" />
        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}