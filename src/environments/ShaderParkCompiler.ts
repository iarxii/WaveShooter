import * as THREE from 'three'
// ShaderPark compiler wrapper.
// Tries to use sculptToThreeJSShaderSource from the UMD build for true DSL rendering.
// If that fails (missing globals, syntax), falls back to a simple animated color shader.

export interface CompiledShader {
  material: THREE.ShaderMaterial
}

export async function compileShaderPark(code: string, uniforms?: Record<string, any>): Promise<CompiledShader> {
  // Prepare code: if no explicit function wrapper, wrap it so ShaderPark parser can treat DSL as a sculpture function
  const trimmed = code.trim()
  const needsWrapper = !/^\(?\s*function/.test(trimmed) && !/^\(\s*\)=>/.test(trimmed) && !/^export\s+default/.test(trimmed)
  const wrapped = needsWrapper ? `()=>{\n${trimmed}\n}` : trimmed
  try {
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
          return { material }
        }
      }
    } else {
      const sculptFn = mod.sculptToThreeJSShaderSource || (mod.default && mod.default.sculptToThreeJSShaderSource)
      if (sculptFn) {
        const src = sculptFn(wrapped)
        if (src && typeof src.frag === 'string' && typeof src.vert === 'string') {
          const baseUniforms = src.uniforms || []
          // Convert uniform descriptions into actual uniforms
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
          return { material }
        }
      }
      // Attempt direct material creation if exposed
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
          return { material: mat }
        }
      }
    }
    console.warn('[ShaderParkCompiler] sculpt conversion unavailable; using fallback')
  } catch (e) {
    console.warn('[ShaderParkCompiler] converter failed, using fallback:', e)
  }
  // Fallback minimal animated shader
  let hash = 0
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  const hue = (hash % 360) / 360
  const u: Record<string, any> = { uTime: { value: 0 }, uHue: { value: hue }, ...(uniforms || {}) }
  const vertex = `uniform float uTime; varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
  const fragment = `uniform float uTime; uniform float uHue; varying vec3 vPos; vec3 h2rgb(float h){ return clamp(abs(mod(h*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0); } void main(){ float pulse = 0.6 + 0.4*sin(uTime*2.5); vec3 col = h2rgb(uHue) * pulse; gl_FragColor = vec4(col,1.0); }`
  const material = new THREE.ShaderMaterial({ uniforms: u as any, vertexShader: vertex, fragmentShader: fragment, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide })
  return { material }
}

// Compile Shader Park code that may be either DSL sculpture or GLSL SDF into a THREE.ShaderMaterial.
// This provides a more resilient path by constructing a sculpture function for DSL text when needed.
export async function compileSculptCode(code: string, uniforms?: Record<string, any>): Promise<THREE.ShaderMaterial> {
  const trimmed = code.trim()
  const cleaned = trimmed.replace(/^export\s+default\s+/, '')
  const isGLSL = /\b(surfaceDistance|shade)\s*\(/.test(cleaned)
  try {
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
          // Ensure time uniform exists (either 'uTime' or 'time')
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
          return mat
        }
      }
      // Fallback through shader source path
      const glslSourceFn = mod.glslToThreeJSShaderSource || (mod.default && mod.default.glslToThreeJSShaderSource)
      if (glslSourceFn) {
        const src = glslSourceFn(cleaned)
        if (src && typeof src.frag === 'string' && typeof src.vert === 'string') {
          const u: any = { uTime: { value: 0 }, time: { value: 0 }, ...(uniforms || {}) }
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
      // DSL sculpture path: ensure we provide a function to SP APIs
      const needsWrapper = !/^\(?\s*function/.test(cleaned) && !/^\(\s*\)=>/.test(cleaned)
      const wrapped = needsWrapper ? `()=>{\n${cleaned}\n}` : cleaned
      let sculptureFn: any
      try {
        // Construct a function without polluting scope
        // eslint-disable-next-line no-new-func
        sculptureFn = new Function(`return (${wrapped});`)()
      } catch (e) {
        // As a last resort, try eval
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
          return mat
        }
      }
      const sculptSrcFn = mod.sculptToThreeJSShaderSource || (mod.default && mod.default.sculptToThreeJSShaderSource)
      if (sculptSrcFn && sculptureFn) {
        const src = sculptSrcFn(sculptureFn)
        if (src && typeof src.frag === 'string' && typeof src.vert === 'string') {
          // Convert SP uniform descriptions if any
          const baseUniforms = src.uniforms || []
          const spUniforms: Record<string, any> = {}
          baseUniforms.forEach((u: any) => {
            if (u.type === 'float') spUniforms[u.name] = { value: u.value }
            else if (u.type === 'vec2') spUniforms[u.name] = { value: new THREE.Vector2(u.value.x, u.value.y) }
            else if (u.type === 'vec3') spUniforms[u.name] = { value: new THREE.Vector3(u.value.x, u.value.y, u.value.z) }
            else if (u.type === 'vec4') spUniforms[u.name] = { value: new THREE.Vector4(u.value.x, u.value.y, u.value.z, u.value.w) }
          })
          const mergedUniforms = { ...spUniforms, uTime: { value: 0 }, time: { value: 0 }, ...(uniforms || {}) }
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
    console.warn('[ShaderParkCompiler] compileSculptCode fallback:', e)
  }

  // Fallback minimal animated material
  const u: Record<string, any> = { uTime: { value: 0 }, ...(uniforms || {}) }
  const vertex = `uniform float uTime; varying vec3 vPos; varying vec2 vUv; void main(){ vPos = position; vUv=uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
  const fragment = `uniform float uTime; varying vec3 vPos; varying vec2 vUv; void main(){ float g = 0.5 + 0.5*sin(uTime*1.7 + vUv.x*8.0); vec3 col = mix(vec3(0.07,0.1,0.15), vec3(0.18,0.8,0.6), g); gl_FragColor = vec4(col,1.0); }`
  return new THREE.ShaderMaterial({ uniforms: u as any, vertexShader: vertex, fragmentShader: fragment, side: THREE.DoubleSide })
}
