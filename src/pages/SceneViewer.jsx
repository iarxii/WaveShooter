import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Stats, Text, AdaptiveDpr, Html } from "@react-three/drei";


import { ExampleSelector } from './examples/ExampleSelector'
import { CurrentExample } from './examples/CurrentExample'
import { EnvironmentSelector } from './examples/EnvironmentSelector'
import { EnvironmentRenderer } from './examples/EnvironmentRenderer'
import { useInstancing } from '../contexts/InstancingContext'
import { getEnvById } from '../environments/environments'

export default function SceneViewer() {
  const [currentExample, setCurrentExample] = useState('none')
  const [currentEnvironment, setCurrentEnvironment] = useState('instance_dynamic')
  const { instancingColors, setInstancingColors, animationSpeed, setAnimationSpeed, animationType, setAnimationType, shape, setShape, gap, setGap } = useInstancing()
  const [particleCount, setParticleCount] = useState(1000)
  const [birdCount, setBirdCount] = useState(50)
  const [morphSpeed, setMorphSpeed] = useState(1)
  const [oceanElevation, setOceanElevation] = useState(2)
  const [oceanAzimuth, setOceanAzimuth] = useState(180)
  const [oceanDistortion, setOceanDistortion] = useState(3.7)

  const currentEnv = getEnvById(currentEnvironment)

  return (
    <div style={{width:'100%',height:'calc(100vh - 80px)',position:'relative'}}>
      {currentEnv.type !== 'dynamic' && <ExampleSelector onExampleChange={setCurrentExample} />}
      <EnvironmentSelector onEnvironmentChange={setCurrentEnvironment} />
      {(currentExample === 'instancing' || currentEnvironment === 'instance_dynamic') && (
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
      {currentExample === 'particles' && (
        <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          <div style={{ color: 'white', marginBottom: '5px' }}>Particle Count: {particleCount}</div>
          <input
            type="range"
            min="100"
            max="5000"
            step="100"
            value={particleCount}
            onChange={(e) => setParticleCount(parseInt(e.target.value))}
            style={{ width: '200px' }}
          />
        </div>
      )}
      {currentExample === 'flocking' && (
        <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          <div style={{ color: 'white', marginBottom: '5px' }}>Bird Count: {birdCount}</div>
          <input
            type="range"
            min="10"
            max="200"
            step="10"
            value={birdCount}
            onChange={(e) => setBirdCount(parseInt(e.target.value))}
            style={{ width: '200px' }}
          />
        </div>
      )}
      {currentExample === 'morphsphere' && (
        <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          <div style={{ color: 'white', marginBottom: '5px' }}>Morph Speed: {morphSpeed.toFixed(1)}</div>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={morphSpeed}
            onChange={(e) => setMorphSpeed(parseFloat(e.target.value))}
            style={{ width: '200px' }}
          />
        </div>
      )}
      {(currentExample === 'ocean' || currentEnvironment === 'ocean') && (
        <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px' }}>
          <div style={{ color: 'white', marginBottom: '5px' }}>Sky Controls:</div>
          <div style={{ marginBottom: '5px' }}>
            <label style={{ color: 'white', fontSize: '12px' }}>Elevation: {oceanElevation}</label>
            <input
              type="range"
              min="0"
              max="90"
              value={oceanElevation}
              onChange={(e) => setOceanElevation(parseInt(e.target.value))}
              style={{ width: '150px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: 'white', fontSize: '12px' }}>Azimuth: {oceanAzimuth}</label>
            <input
              type="range"
              min="-180"
              max="180"
              value={oceanAzimuth}
              onChange={(e) => setOceanAzimuth(parseInt(e.target.value))}
              style={{ width: '150px' }}
            />
          </div>
          <div style={{ color: 'white', marginBottom: '5px' }}>Water Controls:</div>
          <div>
            <label style={{ color: 'white', fontSize: '12px' }}>Distortion: {oceanDistortion.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="8"
              step="0.1"
              value={oceanDistortion}
              onChange={(e) => setOceanDistortion(parseFloat(e.target.value))}
              style={{ width: '150px' }}
            />
          </div>
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
        <EnvironmentRenderer environmentId={currentEnvironment} instancingColors={instancingColors} animationSpeed={animationSpeed} animationType={animationType} shape={shape} gap={gap} oceanElevation={oceanElevation} oceanAzimuth={oceanAzimuth} oceanDistortion={oceanDistortion} />
        <CurrentExample example={currentExample} instancingColors={instancingColors} animationSpeed={animationSpeed} animationType={animationType} shape={shape} gap={gap} particleCount={particleCount} birdCount={birdCount} morphSpeed={morphSpeed} oceanElevation={oceanElevation} oceanAzimuth={oceanAzimuth} oceanDistortion={oceanDistortion} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.07} />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={["#FF3653", "#8ADB00", "#2C8FFF"]} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  )
}
