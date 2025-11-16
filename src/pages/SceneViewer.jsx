import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { GizmoHelper, GizmoViewport, OrbitControls } from '@react-three/drei'
import { ExampleSelector } from './examples/ExampleSelector'
import { CurrentExample } from './examples/CurrentExample'
import { EnvironmentSelector } from './examples/EnvironmentSelector'
import { EnvironmentRenderer } from './examples/EnvironmentRenderer'
import { useInstancing } from '../contexts/InstancingContext'

export default function SceneViewer() {
  const [currentExample, setCurrentExample] = useState('instancing')
  const [currentEnvironment, setCurrentEnvironment] = useState('orchard')
  const { instancingColors, setInstancingColors, animationSpeed, setAnimationSpeed, animationType, setAnimationType, shape, setShape, gap, setGap } = useInstancing()

  return (
    <div style={{width:'100%',height:'calc(100vh - 80px)',position:'relative'}}>
      <ExampleSelector onExampleChange={setCurrentExample} />
      <EnvironmentSelector onEnvironmentChange={setCurrentEnvironment} />
      {currentExample === 'instancing' && (
        <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          <div style={{ color: 'white', marginBottom: '5px' }}>Color Theme:</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div>
              <label style={{ color: 'white', fontSize: '12px' }}>Color 1</label>
              <input
                type="color"
                value={instancingColors[0]}
                onChange={(e) => setInstancingColors([e.target.value, instancingColors[1], instancingColors[2]])}
              />
            </div>
            <div>
              <label style={{ color: 'white', fontSize: '12px' }}>Color 2</label>
              <input
                type="color"
                value={instancingColors[1]}
                onChange={(e) => setInstancingColors([instancingColors[0], e.target.value, instancingColors[2]])}
              />
            </div>
            <div>
              <label style={{ color: 'white', fontSize: '12px' }}>Color 3</label>
              <input
                type="color"
                value={instancingColors[2]}
                onChange={(e) => setInstancingColors([instancingColors[0], instancingColors[1], e.target.value])}
              />
            </div>
          </div>
          <div style={{ color: 'white', marginTop: '10px', marginBottom: '5px' }}>Animation Speed: {animationSpeed.toFixed(1)}</div>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            style={{ width: '200px' }}
          />
          <div style={{ color: 'white', marginTop: '10px', marginBottom: '5px' }}>Animation Type:</div>
          <select
            value={animationType}
            onChange={(e) => setAnimationType(e.target.value)}
            style={{ width: '200px', background: 'white', color: 'black' }}
          >
            <option value="bounce">Bounce</option>
            <option value="waveRadial">Wave Radial</option>
            <option value="waveHorizontal">Wave Horizontal</option>
            <option value="waveVertical">Wave Vertical</option>
            <option value="waveDiagonal">Wave Diagonal</option>
            <option value="mouseRaise">Mouse Raise</option>
            <option value="static">Static</option>
          </select>
          <div style={{ color: 'white', marginTop: '10px', marginBottom: '5px' }}>Shape:</div>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value)}
            style={{ width: '200px', background: 'white', color: 'black' }}
          >
            <option value="box">Rectangles</option>
            <option value="tetrahedron">Triangles</option>
            <option value="sphere">Orbs</option>
            <option value="cylinder">Cylinders</option>
            <option value="octahedron">Diamonds</option>
            <option value="mixed">Mixed Shapes</option>
          </select>
          <div style={{ color: 'white', marginTop: '10px', marginBottom: '5px' }}>Gap: {gap.toFixed(1)}</div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={gap}
            onChange={(e) => setGap(parseFloat(e.target.value))}
            style={{ width: '200px' }}
          />
        </div>
      )}
      <Canvas
        shadows
        camera={{ position:[0,10,20], fov:52 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false
        }}
        style={{ background: '#333', width: '100%', height: '100%' }}
      >
        <EnvironmentRenderer environmentId={currentEnvironment} />
        <CurrentExample example={currentExample} instancingColors={instancingColors} animationSpeed={animationSpeed} animationType={animationType} shape={shape} gap={gap} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.07} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={["#FF3653", "#8ADB00", "#2C8FFF"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  )
}
