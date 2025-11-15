import * as THREE from 'three'
// ShaderPark compiler wrapper (copied). This copy lives under /environments/ShaderPark

// Emit compiler logs (info/warn) to an in-page registry so UI can display them.
function emitCompilerLog(type: 'info' | 'warn', msg: string, meta?: any) {
  try {
    if (typeof window !== 'undefined') {
      const w = window as any
      w.__SP_LOGS = w.__SP_LOGS || []
      const entry = { id: Date.now() + Math.random(), type, msg: String(msg), meta: meta || null, ts: new Date().toISOString() }
      w.__SP_LOGS.push(entry)
      try { window.dispatchEvent(new CustomEvent('shaderpark-log', { detail: entry })) } catch {}
    }
  } catch {}
}

export interface CompiledShader {
  material: THREE.ShaderMaterial
}

export async function compileShaderPark(code: string, uniforms?: Record<string, any>): Promise<CompiledShader> {
  const trimmed = code.trim()
  const needsWrapper = !/^\(?\s*function/.test(trimmed) && !/^\(\s*\)=>/.test(trimmed) && !/^export\s+default/.test(trimmed)
  const wrapped = needsWrapper ? `()=>{\n${trimmed}\n}` : trimmed
  try {
    // Check for developer forced mode: 'fallback' will bypass shader-park attempts
    try { const forced = (window as any).__SP_FORCE_MODE; if (forced === 'fallback') { emitCompilerLog('info','ShaderParkCompiler forced to fallback mode (compileShaderPark)'); throw new Error('forced-fallback') } } catch {}
    // Import UMD build explicitly to ensure named functions exist
    const mod = await import('shader-park-core/dist/shader-park-core.umd.js') as any
    const isGLSL = /\b(surfaceDistance|shade)\s*\(/.test(trimmed)
    if (isGLSL) {
      const glslMaterialFn = mod.glslToThreeJSMaterial || (mod.default && mod.default.glslToThreeJSMaterial)
      const glslSourceFn = mod.glslToThreeJSShaderSource || (mod.default && mod.default.glslToThreeJSShaderSource)
      if (glslMaterialFn) {
        const mat = glslMaterialFn(trimmed)
        if (mat && mat instanceof THREE.ShaderMaterial) {
          ;(mat as any).uniforms.uTime = (mat as any).uniforms.uTime || { value: 0 }
          Object.assign((mat as any).uniforms, uniforms || {})
          mat.polygonOffset = true
          mat.polygonOffsetFactor = 1
          mat.polygonOffsetUnits = 1
          mat.side = THREE.DoubleSide
          emitCompilerLog('info', 'compileShaderPark: used glslToThreeJSMaterial (UMD)', { path: 'glslToThreeJSMaterial', mode: 'UMD' })
          return { material: mat }
        }
      } else if (glslSourceFn) {
        const src = glslSourceFn(trimmed)
        if (src && typeof src.frag === 'string' && typeof src.vert === 'string') {
          const material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, ...(uniforms || {}) },
            vertexShader: src.vert,
            fragmentShader: src.frag,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
          })
          emitCompilerLog('info', 'compileShaderPark: used glslToThreeJSShaderSource (UMD)', { path: 'glslToThreeJSShaderSource', mode: 'UMD' })
          return { material }
        }
      }
    } else {
      const sculptFn = mod.sculptToThreeJSShaderSource || (mod.default && mod.default.sculptToThreeJSShaderSource)
      if (sculptFn) {
        const src = sculptFn(wrapped)
        if (src && typeof src.frag === 'string' && typeof src.vert === 'string') {
          const baseUniforms = src.uniforms || []
          const spUniforms: Record<string, any> = {}
          baseUniforms.forEach((u: any) => {
            if (u.type === 'float') spUniforms[u.name] = { value: u.value }
            else if (u.type === 'vec2') spUniforms[u.name] = { value: new THREE.Vector2(u.value.x, u.value.y) }
            else if (u.type === 'vec3') spUniforms[u.name] = { value: new THREE.Vector3(u.value.x, u.value.y, u.value.z) }
            else if (u.type === 'vec4') spUniforms[u.name] = { value: new THREE.Vector4(u.value.x, u.value.y, u.value.z, u.value.w) }
          })
          const mergedUniforms = { ...spUniforms, uTime: { value: 0 }, ...(uniforms || {}) }
          const material = new THREE.ShaderMaterial({
            uniforms: mergedUniforms,
            vertexShader: src.vert,
            fragmentShader: src.frag,
            transparent: true,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            depthTest: true,
            depthWrite: true,
          })
          emitCompilerLog('info', 'compileShaderPark: used sculptToThreeJSShaderSource (UMD)', { path: 'sculptToThreeJSShaderSource', mode: 'UMD' })
          return { material }
        }
      }
      const matFn = mod.sculptToThreeJSMaterial || (mod.default && mod.default.sculptToThreeJSMaterial)
      if (matFn) {
        const mat = matFn(wrapped)
        if (mat && mat instanceof THREE.ShaderMaterial) {
          ;(mat as any).uniforms.uTime = (mat as any).uniforms.uTime || { value: 0 }
          Object.assign((mat as any).uniforms, uniforms || {})
          mat.polygonOffset = true
          mat.polygonOffsetFactor = 1
          mat.polygonOffsetUnits = 1
          mat.side = THREE.DoubleSide
          emitCompilerLog('info', 'compileShaderPark: used sculptToThreeJSMaterial (UMD)', { path: 'sculptToThreeJSMaterial', mode: 'UMD' })
          return { material: mat }
        }
      }
    }
    console.warn('[ShaderParkCompiler] sculpt conversion unavailable; using fallback')
    emitCompilerLog('warn', '[ShaderParkCompiler] sculpt conversion unavailable; using fallback')
  } catch (e) {
    if (e && e.message === 'forced-fallback') {
      // continue to fallback
    } else {
      const m = '[ShaderParkCompiler] converter failed, using fallback: ' + (e && e.toString ? e.toString() : String(e))
      console.warn(m, e)
      emitCompilerLog('warn', m, { error: (e && e.stack) || (e && e.toString && e.toString()) })
    }
  }
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  const hue = (hash % 360) / 360
  const u: Record<string, any> = { uTime: { value: 0 }, uHue: { value: hue }, ...(uniforms || {}) }
  const vertex = `uniform float uTime; varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
  const fragment = `uniform float uTime; uniform float uHue; varying vec3 vPos; vec3 h2rgb(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); } void main(){ float pulse = 0.6 + 0.4*sin(uTime*2.5); vec3 col = h2rgb(uHue) * pulse; gl_FragColor = vec4(col,1.0); }`
  const material = new THREE.ShaderMaterial({ uniforms: u as any, vertexShader: vertex, fragmentShader: fragment, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide })
  return { material }
}

export async function compileSculptCode(code: string, uniforms?: Record<string, any>): Promise<THREE.ShaderMaterial> {
  const trimmed = code.trim()
  const cleaned = trimmed.replace(/^export\s+default\s+/, '')
  const isGLSL = /\b(surfaceDistance|shade)\s*\(/.test(cleaned)
  try {
    // Check forced mode: allow dev to force fallback-only path
    try { const forced = (window as any).__SP_FORCE_MODE; if (forced === 'fallback') { emitCompilerLog('info','ShaderParkCompiler forced to fallback mode (compileSculptCode)'); throw new Error('forced-fallback') } } catch {}
    // Try ESM/CJS default import first, then fall back to explicit UMD path
    let mod: any
    try {
      mod = await import('shader-park-core') as any
    } catch {
      mod = await import('shader-park-core/dist/shader-park-core.umd.js') as any
    }
    if (isGLSL) {
      const glslMaterialFn = mod.glslToThreeJSMaterial || (mod.default && mod.default.glslToThreeJSMaterial)
      if (glslMaterialFn) {
        const mat = glslMaterialFn(cleaned)
        if (mat && mat instanceof THREE.ShaderMaterial) {
          const u = (mat as any).uniforms || ((mat as any).uniforms = {})
          u.uTime = u.uTime || { value: 0 }
          u.time = u.time || { value: 0 }
          Object.assign((mat as any).uniforms, uniforms || {})
          mat.side = THREE.DoubleSide
          mat.polygonOffset = true
          mat.polygonOffsetFactor = 1
          mat.polygonOffsetUnits = 1
          mat.depthTest = true
          mat.depthWrite = true
          emitCompilerLog('info', 'compileSculptCode: used glslToThreeJSMaterial', { path: 'glslToThreeJSMaterial' })
          return mat
        }
      }
      const glslSourceFn = mod.glslToThreeJSShaderSource || (mod.default && mod.default.glslToThreeJSShaderSource)
      if (glslSourceFn) {
        const src = glslSourceFn(cleaned)
        if (src && typeof src.frag === 'string' && typeof src.vert === 'string') {
          const u: any = { uTime: { value: 0 }, time: { value: 0 }, ...(uniforms || {}) }
          emitCompilerLog('info', 'compileSculptCode: used glslToThreeJSShaderSource', { path: 'glslToThreeJSShaderSource' })
          return new THREE.ShaderMaterial({
            uniforms: u,
            vertexShader: src.vert,
            fragmentShader: src.frag,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            depthTest: true,
            depthWrite: true,
          })
        }
      }
    } else {
      const needsWrapper = !/^\(?\s*function/.test(cleaned) && !/^\(\s*\)=>/.test(cleaned)
      const wrapped = needsWrapper ? `()=>{\n${cleaned}\n}` : cleaned
      let sculptureFn: any
      try {
        sculptureFn = new Function(`return (${wrapped});`)()
      } catch (e) {
        sculptureFn = (0, eval)(wrapped)
      }
      const matFn = mod.sculptToThreeJSMaterial || (mod.default && mod.default.sculptToThreeJSMaterial)
      if (matFn && sculptureFn) {
        const mat = matFn(sculptureFn)
        if (mat && mat instanceof THREE.ShaderMaterial) {
          const u = (mat as any).uniforms || ((mat as any).uniforms = {})
          u.uTime = u.uTime || { value: 0 }
          u.time = u.time || { value: 0 }
          Object.assign((mat as any).uniforms, uniforms || {})
          mat.side = THREE.DoubleSide
          mat.polygonOffset = true
          mat.polygonOffsetFactor = 1
          mat.polygonOffsetUnits = 1
          mat.depthTest = true
          mat.depthWrite = true
          emitCompilerLog('info', 'compileSculptCode: used sculptToThreeJSMaterial', { path: 'sculptToThreeJSMaterial' })
          return mat
        }
      }
      const sculptSrcFn = mod.sculptToThreeJSShaderSource || (mod.default && mod.default.sculptToThreeJSShaderSource)
      if (sculptSrcFn && sculptureFn) {
        const src = sculptSrcFn(sculptureFn)
        if (src && typeof src.frag === 'string' && typeof src.vert === 'string') {
          const baseUniforms = src.uniforms || []
          const spUniforms: Record<string, any> = {}
          baseUniforms.forEach((u: any) => {
            if (u.type === 'float') spUniforms[u.name] = { value: u.value }
            else if (u.type === 'vec2') spUniforms[u.name] = { value: new THREE.Vector2(u.value.x, u.value.y) }
            else if (u.type === 'vec3') spUniforms[u.name] = { value: new THREE.Vector3(u.value.x, u.value.y, u.value.z) }
            else if (u.type === 'vec4') spUniforms[u.name] = { value: new THREE.Vector4(u.value.x, u.value.y, u.value.z, u.value.w) }
          })
          const mergedUniforms = { ...spUniforms, uTime: { value: 0 }, time: { value: 0 }, ...(uniforms || {}) }
          emitCompilerLog('info', 'compileSculptCode: used sculptToThreeJSShaderSource', { path: 'sculptToThreeJSShaderSource' })
          return new THREE.ShaderMaterial({
            uniforms: mergedUniforms,
            vertexShader: src.vert,
            fragmentShader: src.frag,
            transparent: false,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            depthTest: true,
            depthWrite: true,
          })
        }
      }
    }
  } catch (e) {
    if (e && e.message === 'forced-fallback') {
      // continue to fallback material below
    } else {
      const m = '[ShaderParkCompiler] compileSculptCode fallback: ' + (e && e.toString ? e.toString() : String(e))
      console.warn(m, e)
      emitCompilerLog('warn', m, { error: (e && e.stack) || (e && e.toString && e.toString()) })
    }
  }
  const u: Record<string, any> = { uTime: { value: 0 }, ...(uniforms || {}) }
  const vertex = `uniform float uTime; varying vec3 vPos; varying vec2 vUv; void main(){ vPos = position; vUv=uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
  const fragment = `uniform float uTime; varying vec3 vPos; varying vec2 vUv; void main(){ float g = 0.5 + 0.5*sin(uTime*1.7 + vUv.x*8.0); vec3 col = mix(vec3(0.07,0.1,0.15), vec3(0.18,0.8,0.6), g); gl_FragColor = vec4(col,1.0); }`
  return new THREE.ShaderMaterial({ uniforms: u as any, vertexShader: vertex, fragmentShader: fragment, side: THREE.DoubleSide })
}
