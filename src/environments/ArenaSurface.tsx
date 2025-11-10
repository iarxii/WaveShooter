import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useEnvironment } from '../contexts/EnvironmentContext'

/*
  Prototype ArenaSurface
  --------------------------------------
  A shader-driven ground plane with:
    - base color from theme / fallback
    - subtle breathing (vertex displacement)
    - ripple pulses (up to MAX_PULSES) expanding over time
    - emissive vein pattern (simple fbm noise)

  This is an initial prototype: CPU creates a list of active pulses via props.
  Future iteration will integrate with a hazard scheduler & events API.
*/

export interface PulseEvent {
  x: number
  z: number
  startTime: number // ms
}

interface ArenaSurfaceProps {
  size?: number
  segments?: number
  pulses?: PulseEvent[] // externally provided pulses (<= MAX_PULSES)
  veinIntensity?: number // 0..1 scaling for emissive veins
  pulseSpeed?: number // expansion speed scalar
  pulseRadius?: number // base radius
  mode?: 'plasma' | 'planetoid' | 'void' | 'turbulence'
}

const MAX_PULSES = 8

export const ArenaSurface: React.FC<ArenaSurfaceProps> = ({
  size = 180,
  segments = 256,
  pulses = [],
  veinIntensity = 0.55,
  pulseSpeed = 24,
  pulseRadius = 6,
  mode = 'planetoid',
}) => {
  const { env } = useEnvironment()
  const meshRef = useRef<THREE.Mesh>(null)

  // Geometry reused; high segment count grants nicer displacement
  const geom = useMemo(() => new THREE.PlaneGeometry(size, size, segments, segments), [size, segments])

  // Theme-derived colors with arenaColors support
  const baseColor = useMemo(() => new THREE.Color(env.arenaColors?.base ?? (
    env.id === 'proc_blue_sky' ? '#d8ecfa' : env.id === 'proc_hazard_lab' ? '#092536' : env.id === 'proc_hazard_hospital' ? '#0b222c' : '#101a20'
  )), [env])

  const veinColor = useMemo(() => new THREE.Color(env.arenaColors?.veins ?? (
    env.id === 'proc_blue_sky' ? '#5fb3ff' : env.id === 'proc_hazard_lab' ? '#ff3e7d' : env.id === 'proc_hazard_hospital' ? '#11b5c9' : '#14d5ff'
  )), [env])

  const pulseColor = useMemo(() => new THREE.Color(env.arenaColors?.telegraph ?? '#33f1ff'), [env])

  // Re-implement using a dedicated ShaderMaterial to avoid patch errors
  const material = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uBaseColor: { value: baseColor },
      uVeinColor: { value: veinColor },
      uPulseColor: { value: pulseColor },
      uVeinIntensity: { value: veinIntensity },
      uPulseOrigin: { value: Array.from({ length: MAX_PULSES }, () => new THREE.Vector2(9999, 9999)) },
      uPulseStart: { value: new Float32Array(MAX_PULSES).fill(-9999) },
      uPulseSpeed: { value: pulseSpeed },
      uPulseRadius: { value: pulseRadius },
      uMode: { value: 0 },
    }
    const vertex = `
      uniform float uTime;
      varying vec2 vXZ;
      void main(){
        vec3 pos = position;
        float b = sin(pos.x * 0.08 + uTime * 0.6) * 0.3 + sin(pos.y * 0.05 + uTime * 0.4) * 0.25;
        pos.z += b; // breathing displacement
        vXZ = pos.xz; // use x,z after displacement
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
      }
    `
    const fragment = `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uVeinColor;
      uniform vec3 uPulseColor;
      uniform float uVeinIntensity;
      uniform vec2 uPulseOrigin[${MAX_PULSES}];
      uniform float uPulseStart[${MAX_PULSES}];
      uniform float uPulseSpeed;
      uniform float uPulseRadius;
      uniform int uMode; // 0 planetoid, 1 plasma, 2 void, 3 turbulence
      varying vec2 vXZ;
      float noise(vec2 p){return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453);} 
      float fbm(vec2 p){float v=0.0; float a=0.5; for(int i=0;i<3;i++){v+=a*noise(p); p*=2.0; a*=0.5;} return v;} 
      void main(){
        vec3 col = uBaseColor;
        float vein = fbm(vXZ * (uMode==2 ? 0.02 : 0.08) + uTime * 0.02);
        float veinMask = (uMode==2) ? smoothstep(0.7, 0.95, vein) : smoothstep(0.45, 0.85, vein);
        vec3 veinGlow = uVeinColor * veinMask * uVeinIntensity * (uMode==1 ? 1.4 : 1.0);
        float pulseGlow = 0.0;
        for(int i=0;i<${MAX_PULSES}; i++){
          float st = uPulseStart[i];
          if(st < 0.0) continue;
          float t = (uTime - st);
          if(t < 0.0) continue;
          float radius = uPulseRadius + t * uPulseSpeed * (uMode==3 ? 1.6 : 1.0);
          vec2 o = uPulseOrigin[i];
          float d = length(vXZ - o);
          float ring = 1.0 - smoothstep(radius - (uMode==1? 2.2:1.5), radius + (uMode==1? 2.2:1.5), d);
          ring *= smoothstep(0.0, 2.5, t) * (1.0 - smoothstep(0.0, 30.0, t));
          pulseGlow += ring;
        }
        vec3 pulseCol = mix(vec3(0.0), uPulseColor, clamp(pulseGlow, 0.0, 1.0));
        if(uMode==2){ // void
          col *= 0.5;
          col += veinGlow * 0.4;
        } else if(uMode==1){ // plasma
          col += veinGlow * 0.9 + pulseCol * 1.2;
        } else if(uMode==3){ // turbulence
          col += veinGlow * 0.7 + pulseCol * 0.8;
        } else { // planetoid
          col += veinGlow * 0.6 + pulseCol;
        }
        col = mix(col, vec3(dot(col, vec3(0.299,0.587,0.114))), (uMode==2? 0.2:0.08));
        gl_FragColor = vec4(col, 1.0);
      }
    `
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.DoubleSide
    })
    return mat
  }, [baseColor, veinColor, pulseColor, veinIntensity, pulseSpeed, pulseRadius])

  // Update uniforms every frame
  useFrame(({ clock }) => {
    // Update uniforms
    material.uniforms.uTime.value = clock.getElapsedTime()
    material.uniforms.uMode.value = (mode === 'planetoid' ? 0 : mode === 'plasma' ? 1 : mode === 'void' ? 2 : 3)
    const origins = material.uniforms.uPulseOrigin.value as THREE.Vector2[]
    const starts = material.uniforms.uPulseStart.value as Float32Array
    for (let i = 0; i < MAX_PULSES; i++) {
      const p = pulses[i]
      if (p) {
        origins[i].set(p.x, p.z)
        // convert ms to seconds for uTime baseline
        starts[i] = (p.startTime) / 1000.0
      } else {
        origins[i].set(9999, 9999)
        starts[i] = -9999
      }
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} geometry={geom} material={material} />
  )
}

/*
  Usage Example (temporary manual wiring):

  const [pulses, setPulses] = useState<PulseEvent[]>([])
  // trigger
  const firePulse = () => setPulses(p => [{ x: 0, z: 0, startTime: performance.now() }, ...p].slice(0, 8))

  <ArenaSurface pulses={pulses} />
*/
