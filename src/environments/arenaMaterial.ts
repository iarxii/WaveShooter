import * as THREE from 'three'

import VeinsFrag from './sample_shaders/veins.frag?raw'
import InfectionFrag from './sample_shaders/infection.frag?raw'
import GridFrag from './sample_shaders/grid.frag?raw'
import BioelectricFrag from './sample_shaders/bioelectric.frag?raw'

export const MAX_PULSES = 8

export function colorToVec3(hexOrStr) {
  try { return new THREE.Color(hexOrStr).toArray().slice(0,3) } catch { return [0.08, 0.12, 0.16] }
}

export function createArenaMaterial(variant = 'default', initialColors = { base: '#0b222c', veins: '#11b5c9', telegraph: '#33f1ff' }) {
  const base = new THREE.Color(initialColors.base)
  const veins = new THREE.Color(initialColors.veins)
  const tele = new THREE.Color(initialColors.telegraph)
  const uPulses = new Array(MAX_PULSES).fill(0).map(() => new THREE.Vector3(0, 0, -9999))
  const uniforms: any = {
    uTime: { value: 0 },
    uNow: { value: 0 },
    uBaseColor: { value: new THREE.Vector3(base.r, base.g, base.b) },
    uVeinColor: { value: new THREE.Vector3(veins.r, veins.g, veins.b) },
    uTeleColor: { value: new THREE.Vector3(tele.r, tele.g, tele.b) },
    uPulseCount: { value: 0 },
    uPulses: { value: uPulses },
    uPulseSpeed: { value: 6.0 },
    uPulseWidth: { value: 1.6 },
  }

  const vertex = `varying vec2 vUv; varying vec3 vWorld;
  void main(){ vUv = uv; vec4 worldPos = modelMatrix * vec4(position,1.0); vWorld = worldPos.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`

  // choose fragment by variant
  const fragments: any = {
    default: `precision mediump float; varying vec2 vUv; varying vec3 vWorld;
  uniform float uTime; uniform float uNow;
  uniform vec3 uBaseColor; uniform vec3 uVeinColor; uniform vec3 uTeleColor;
  uniform int uPulseCount; uniform vec3 uPulses[${MAX_PULSES}];
  uniform float uPulseSpeed; uniform float uPulseWidth;

  float veinNoise(vec2 p){ float v = sin(p.x*3.5 + uTime*0.35) * 0.5 + 0.5; v += sin((p.x+p.y)*6.3 + uTime*0.2)*0.25; v *= smoothstep(-1.0, 1.0, sin(p.y*1.5 + uTime*0.7)); return clamp(v, 0.0, 1.0); }

  void main(){ vec2 pos = vWorld.xz * 0.08; float v = veinNoise(pos*4.0); vec3 base = uBaseColor; vec3 vein = uVeinColor * (0.6 + 0.6*v); vec3 col = mix(base, vein, v*0.9);
    float add = 0.0;
    for(int i=0;i<${MAX_PULSES};i++){ if(i >= uPulseCount) break; vec3 p = uPulses[i]; float start = p.z; if(start > 0.0){ float dt = uNow - start; if(dt >= 0.0){ float r = dt * uPulseSpeed; float d = distance(vWorld.xz, p.xy); float ring = 1.0 - smoothstep(r - uPulseWidth, r + uPulseWidth, d); ring *= exp(-dt*0.6); add = max(add, ring); } } }
    vec3 tele = uTeleColor * (1.0 + add*2.2) * add; vec3 outCol = col + tele; outCol = clamp(outCol, 0.0, 1.0); gl_FragColor = vec4(outCol, 1.0); }
  `,
    veins: VeinsFrag,
    infection: InfectionFrag,
    grid: GridFrag,
    bioelectric: BioelectricFrag
  }

  const fragment = fragments[variant] || fragments['default']

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
  })

  return mat
}

export function updateArenaMaterialWithEnv(mat: THREE.ShaderMaterial, env, pulses) {
  if (!mat || !mat.uniforms) return
  const u = mat.uniforms as any
  const now = performance.now() / 1000
  u.uTime.value = (u.uTime && u.uTime.value) ? (u.uTime.value + (1/60)) : (now)
  u.uNow.value = now
  if (env?.arenaColors) {
    const base = new THREE.Color(env.arenaColors.base)
    const veins = new THREE.Color(env.arenaColors.veins)
    const tele = new THREE.Color(env.arenaColors.telegraph)
    u.uBaseColor.value.set(base.r, base.g, base.b)
    u.uVeinColor.value.set(veins.r, veins.g, veins.b)
    u.uTeleColor.value.set(tele.r, tele.g, tele.b)
  }
  // update pulses array (up to MAX_PULSES)
  const arr = u.uPulses.value as THREE.Vector3[]
  const count = Math.min(pulses ? pulses.length : 0, MAX_PULSES)
  for (let i = 0; i < MAX_PULSES; i++) {
    if (i < count) {
      const p = pulses[i]
      // convert startTime milliseconds -> seconds
      const s = (p.startTime || 0) / 1000
      arr[i].set(p.x || 0, p.z || 0, s)
    } else {
      arr[i].set(0, 0, -9999)
    }
  }
  u.uPulseCount.value = count
}
