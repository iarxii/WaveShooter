import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export default function WorldSky({ sunY = 0.5, infectionInfluence = 0.0, infectionColor = '#ffcc00' }: { sunY?: number; infectionInfluence?: number; infectionColor?: string }) {
  const matRef = useRef<THREE.ShaderMaterial | null>(null)
  const meshRef = useRef<THREE.Mesh | null>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSunDirY: { value: sunY },
    uInfectionInfluence: { value: infectionInfluence },
    uInfectionColor: { value: new THREE.Vector3(1, 0.9, 0.4) },
    uSkyTintDay: { value: new THREE.Vector3(0.5, 0.75, 0.98) },
    uSkyTintNight: { value: new THREE.Vector3(0.02, 0.03, 0.06) },
    uCloudSpeed: { value: 0.06 },
  }), [])

  useEffect(() => {
    try { const c = new THREE.Color(infectionColor); uniforms.uInfectionColor.value.set(c.r, c.g, c.b) } catch (e) {}
  }, [infectionColor, uniforms])

  useEffect(() => {
    if (!meshRef.current) return
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `varying vec2 vUv; varying vec3 vWorld; void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `precision mediump float; varying vec2 vUv; varying vec3 vWorld; uniform float uTime; uniform float uSunDirY; uniform float uInfectionInfluence; uniform vec3 uInfectionColor; uniform vec3 uSkyTintDay; uniform vec3 uSkyTintNight; uniform float uCloudSpeed;

      // cheap hash/noise
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0)); vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y; }
      float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<3;i++){ v += a*noise(p); p *= 2.0; a *= 0.5; } return v; }

      vec3 skyScattering(float sunY, vec3 skyDay, vec3 skyNight){ float t = smoothstep(-0.2, 0.9, sunY); return mix(skyNight, skyDay, t); }
      vec3 cloudLayer(vec2 uv, float time){ float n = fbm(uv*0.6 + vec2(time*uCloudSpeed, time*uCloudSpeed*0.5)); return vec3(n); }

      void main(){
        vec3 scatter = skyScattering(uSunDirY, uSkyTintDay, uSkyTintNight);
        vec3 clouds = cloudLayer(vUv.xy*2.0, uTime);
        vec3 color = mix(scatter, scatter * (0.8 + clouds*0.6), 0.45);
        color = mix(color, uInfectionColor, clamp(uInfectionInfluence*0.35,0.0,1.0));
        // vignette near horizon
        float horizon = smoothstep(-0.2, 0.6, vUv.y);
        color *= mix(0.85, 1.0, horizon);
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }`,
      side: THREE.BackSide,
      depthWrite: false,
    })
    matRef.current = mat
    meshRef.current!.material = mat
    return () => { try { mat.dispose() } catch (e) {} }
  }, [uniforms])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (matRef.current && matRef.current.uniforms) {
      try { if(matRef.current.uniforms.uTime) matRef.current.uniforms.uTime.value = t } catch(e){}
      try { if(matRef.current.uniforms.uSunDirY) matRef.current.uniforms.uSunDirY.value = sunY } catch(e){}
      try { if(matRef.current.uniforms.uInfectionInfluence) matRef.current.uniforms.uInfectionInfluence.value = infectionInfluence } catch(e){}
    }
  })

  return (
    <mesh ref={meshRef} position={[0,0,0]} scale={[1,1,1]}>
      <sphereGeometry args={[800, 32, 24]} />
      {/* material is assigned in effect so it can be cleaned up */}
    </mesh>
  )
}
