# Arena Shaders — Designs, Implementation & Integration

This document describes a suite of arena shaders and implementation patterns designed for the Healthcare Heroes game. The goal: provide visually-rich, readable, and performant materials that communicate game state (infection, containment, alerts) and react to in-game pulse events (e.g., pathogen spawns, area scans, alarms).

Summary of shader categories
- Vein / Organic Surface: flowing veins and subtle noise that makes the ground feel "alive" and reactive to pulse events.
- Telegraph Rings / Pulses: radial rings that expand from pulse origins to mark events (hits, hazards, scans).
- Infection Spread Map: layered stains / organic splotches that grow and fade, driven by a texture or procedural noise and infection intensity.
- Containment Grid / Circuitry: procedural grid or hex patterns that crack and flicker when breached.
- Bioelectric/Glow Veins: high-contrast emissive veins that glow and pulse when infection intensity is high.
- Static & Motion Overlays: screen-space motion graphics like dust, floating spores, or faint particle glows for mood + depth.

Key integration decisions
- Use a Three.js `ShaderMaterial` with a fixed, typed uniform set. This keeps shader code explicit and integrates cleanly with `@react-three/fiber` and the existing `EnvironmentContext` pulses.
- Keep a small, fixed slot buffer for pulses (e.g., `MAX_PULSES = 8`) passed as vec3 array or vec4s with (x, z, startTime [, intensity]). New pulses push older ones out.
- Provide a `createArenaMaterial(variant, initialColors)` factory and `updateArenaMaterialWithEnv(material, env, pulses)` helper. These already exist as `arenaMaterial.ts` in the repo and should be extended with selectable variants.
- Provide fallback to `MeshStandardMaterial` or a low-cost ShaderMaterial when GPU constraints are detected (small devices, context-recovery issues).

Uniform schema (recommended)
- float uTime: global runtime seconds
- float uNow: high-resolution timestamp (ms) optional
- vec3 uBaseColor: base ground color
- vec3 uAccentColor: accent/emissive color used for veins/telegraph
- vec3 uWarnColor: color for alerts/telegraph rings
- int uPulseCount: number of active pulses
- vec4 uPulses[MAX_PULSES]: pulse entries (x, z, startTimeSeconds, intensity)
- float uPulseSpeed: scalar for ring expansion
- float uPulseWidth: thickness of ring
- vec2 uUvScale: uv scaling for noise / detail
- float uNoiseSeed: per-instance seed
- sampler2D uNoiseTex: optional signed noise texture (for lower-end platforms, bake noise)

How pulses are used in the shader
- For each pulse slot i in [0..uPulseCount-1]:
  - compute distance d = length(worldPos.xz - pulsePos.xz)
  - timeElapsed = uTime - pulseStart
  - ring = smoothstep(radius - width, radius, d) * falloff(timeElapsed)
  - accumulate ring * pulseIntensity into a modulation channel
- Use modulation to drive emissive, rim, and vertex displacement contributions.

Shader variants — concepts + GLSL snippets
Note: these snippets are illustrative; copy into `fragmentShader` strings in code with appropriate `varying` and `uniform` declarations and adapt `vertexShader` to pass `vWorld` / `vPos`.

1) Veins + Pulses (base variant)
- Purpose: organic base, veins that pulse when hit.
- Visuals: subtle noise base, thin darker veins, brighter accent at pulse radii.

Fragment (core) pseudo-GLSL:

```glsl
// uniforms: uTime, uBaseColor, uAccentColor, uPulseCount, uPulses[], uPulseSpeed, uPulseWidth
vec3 base = uBaseColor;
float n = fbm(vUv * 3.0 + uTime * 0.06);
float veins = smoothstep(0.5, 0.52, abs(sin((vPos.x*3.0 + n*4.0)) * 0.5 + 0.5));
vec3 col = mix(base * 0.8, base * 1.15, n * 0.6);
float pulseAccum = 0.0;
for (int i=0;i<uPulseCount;i++){
  vec2 p = uPulses[i].xy;
  float start = uPulses[i].z;
  float radius = (uTime - start) * uPulseSpeed;
  float d = length(vPos.xz - p);
  float ring = smoothstep(radius+uPulseWidth, radius-uPulseWidth, d);
  pulseAccum += ring * uPulses[i].w;
}
vec3 accent = mix(col, uAccentColor, clamp(pulseAccum, 0.0, 1.0));
vec3 final = mix(col, accent, pulseAccum*0.8) + veins*0.05;
```

2) Infection Spread Map (procedural stains)
- Purpose: show persistent infection areas that grow and fade.
- Implementation: maintain a low-res infection texture on CPU/GPU or encode infection as a dynamic noise map where pulses add local "stain".
- Shader: sample `uInfectTex` or procedural accumulation of pulses with longer decay.

Key idea: maintain a float map (e.g., 128x128) updated on the CPU when events occur, upload as `uInfectTex` and blend in shader.

3) Containment Grid / Circuitry
- Purpose: show containment outlines; when breached, lines break and sparks appear.
- Shader: generate grid by modulating `vPos.xz` with `fract` and `step`. Use a mask where infection intensity blends through.

GLSL for grid line:
```glsl
vec2 gv = fract(vUv * gridScale) - 0.5;
float line = 1.0 - smoothstep(0.0, 0.02, length(gv));
col = mix(col, vec3(0.05, 0.9, 1.0), line * gridIntensity);
```

4) Bioelectric Veins (emissive overlays)
- Purpose: high-priority visual feedback for active hazards.
- Implementation: produce thin, high-saturation emissive veins using ridge noise and pulse-driven glow.
- Use `gl_FragColor.rgb += emissive * toneMappingFactor` and ensure the renderer uses appropriate tone mapping or post-processing.

5) Motion Graphic Overlays (screen-space)
- Purpose: static ground plus subtle screen-space motion like spores or floating motes.
- Implementation options:
  - Render small alpha-blurred sprites in world space above the ground.
  - Add screen-space noise pass atop the final composite (cheap but may need offscreen pass).

Integration & wiring
- `EnvironmentContext` should be the authoritative source of pulses. Pulses contain { x, z, startTime, intensity } in world space.
- `updateArenaMaterialWithEnv(material, env, pulses)` should:
  - clamp pulses to `MAX_PULSES`, fill `uPulses[]` with (x,z,startTimeSeconds,intensity)
  - update `uBaseColor`, `uAccentColor` from `env.arenaColors` or a theme palette
  - set `uPulseCount` and any per-env parameters (gridScale, stainDecay)
- When compiling ShaderPark or other runtime shaders, ensure `material.dispose()` is called before replacing materials on meshes.

Art direction & palettes
- Neutral / Safe: base steel / clinical blue-gray: `#0e2a33` base, `#8fd3ff` accents
- Infection Active: sickly green/amber: base `#21321a`, accent `#e6ff7b`, warn `#ff704d`
- Containment / Alert: deep purple + neon cyan accents for containment tools: base `#0b0f1a`, accent `#7af0ff`, warn `#ffcc00`
- Victory / Cleansed: warm white + gold highlights: base `#f7fbff`, accent `#ffd77a`

Usage recipes (mapping to env ids)
- `proc_hazard_hospital`: Veins + InfectionSpread + soft grid hints; palette: sickly teal + pale orange.
- `proc_hazard_lab`: Bioelectric Veins + Containment Grid; palette: clinical blue + neon cyan.
- `proc_blue_sky`: Subtle veins + motion spores; palette: sky-blue, soft white.

Performance & fallback guidance
- Cap offscreen render target sizes (we applied a 2048 cap and default to 256 minimum). For low-end GPUs use 1024 or 512.
- Offer a `lowQuality` material path: replace `fbm` noise with a sampled noise texture and reduce loop iterations.
- Keep `MAX_PULSES` small (4-8). Each pulse is a loop cost; unrolling the loop or using a fixed-size loop is fine for GLSL when using constants.
- Dispose materials, textures, and RTs when not used. Use `material.dispose()` and `texture.dispose()`.
- If the host browser signals `contextlost`, reduce DPR and disable expensive passes.

Developer notes — adding a new variant
1. Add a new variant id (e.g., `infection_map`) to the shader factory `createArenaMaterial(variant)` in `src/environments/arenaMaterial.ts`.
2. Implement or import the fragment code and add any new uniforms.
3. Update `SceneViewer` UI to include the variant in the shader select list or expose per-environment defaults in `ENV_SHADER_MAP`.
4. Test on desktop with full DPR and then test on a laptop / integrated GPU with DPR forced to 1 and RT caps to ensure graceful degradation.

Testing checklist
- Verify pulses spawn and rings expand from correct world positions.
- Toggle engine (`three`/`shaderpark`) and confirm the Three.js material carries pulses identically.
- Monitor memory / texture allocation in browser DevTools. Ensure no leaking materials after swaps.
- Confirm HDRI and PMREM do not overload GPU; if so, use a smaller HDRI or lower sample counts.

Appendix — Example: full fragment shader (Vein + Pulse)
```glsl
precision highp float;
varying vec2 vUv;
varying vec3 vPos;
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform int uPulseCount;
uniform vec4 uPulses[8];
uniform float uPulseSpeed;
uniform float uPulseWidth;

// Simple fbm / noise can be inlined or sampled
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))) * 43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0)); vec2 u=f*f*(3.0-2.0*f); return mix(a,b,u.x)+ (c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y; }

void main(){
  vec3 base = uBaseColor;
  float n = noise(vUv * 3.0 + uTime * 0.06);
  float veins = smoothstep(0.45,0.52,abs(sin((vPos.x*3.0 + n*4.0))))*0.8;
  vec3 col = mix(base * 0.85, base * 1.15, n * 0.6);
  float pulseAccum = 0.0;
  for(int i=0;i<8;i++){
    if(i >= uPulseCount) break;
    vec2 p = uPulses[i].xy;
    float start = uPulses[i].z;
    float intensity = uPulses[i].w;
    float radius = max(0.0, (uTime - start) * uPulseSpeed);
    float d = length(vPos.xz - p);
    float ring = 1.0 - smoothstep(radius - uPulseWidth, radius + uPulseWidth, d);
    pulseAccum += ring * intensity;
  }
  vec3 accent = mix(col, uAccentColor, clamp(pulseAccum, 0.0, 1.0));
  vec3 final = mix(col, accent, clamp(pulseAccum*0.8, 0.0, 1.0));
  final += veins * 0.08;
  gl_FragColor = vec4(final, 1.0);
}
```

If you want, I can:
- Add a small set of GLSL files under `src/environments/sample_shaders/` matching these variants and wire them into the SceneViewer shader dropdown for quick iteration.
- Expand the infection map approach by adding a small GPU or CPU accumulation pass and a sample helper to `ProceduralEnvironmentFactory` for persistent stain textures.

Next actions I can take now
- Create the sample shader files and integrate them into the `createArenaMaterial` factory (adds runtime choices to `SceneViewer`).
- Implement the infection texture accumulation pass and upload helper.

Say which of the next actions you'd like me to implement and I'll follow through.


**World / Environment Shader**

Purpose
- Provide a cohesive world backdrop that complements arena shaders: sky, horizon, volumetric fog, distant terrain tinting, and global infection overlays. The world shader is primarily a sky/atmosphere shader plus compositing helpers that blend HDRI, sky scattering, and low-frequency infection/containment states.

Where to run it
- Attach to the scene background (via a fullscreen skydome or procedural sky shader) or combine with a `DreiEnvironment` HDRI. For mobile/low-end devices prefer a baked skybox texture.

Uniforms and Controls
- float uTime: global time in seconds
- vec3 uSkyTintDay: daytime sky tint
- vec3 uSkyTintNight: night/alert tint
- float uSunDirY: sun elevation factor (controls scattering)
- vec3 uHorizonColor: color at the horizon
- float uCloudSpeed: speed of procedural clouds
- sampler2D uHdri: optional HDRI texture for accurate reflection
- float uInfectionInfluence: 0..1 multiplicative factor to blend infection overlay into sky colors
- vec3 uInfectionColor: tint applied when infection level rises

Concepts and Implementation
- Atmospheric scattering: use a simple single-scatter approximation (Henyey–Greenstein or pre-baked Perez-like function) to approximate sky gradient based on `uSunDirY`. This is cheap and gives believable color gradients.
- Procedural clouds: render low-frequency billow noise in a layered fashion. Use FBM (few octaves) or sample a small noise texture. Clouds can be animated with `uCloudSpeed` and provide parallax when camera pitches up/down.
- HDRI blending: if an HDRI is available, blend sky scattering with the HDRI using a `mix(hdriColor, scatteringColor, blendFactor)` to add realism while preserving performance when HDRIs are present.
- Infection overlay: when `uInfectionInfluence` rises, slightly shift the sky tint toward `uInfectionColor`, increase haze near the horizon, and optionally pulse saturation to indicate alert state.
- Volumetric fog (cheap): use depth-based fog where fogColor is driven by `uInfectionColor` and density increases near the horizon. For stronger visuals, render a low-resolution depth-aware blur pass.

Practical GLSL sketch (fragment-like psuedo-code)

```glsl
vec3 skyScattering(float sunY, vec3 skyDay, vec3 skyNight) {
  float t = smoothstep(-0.2, 0.9, sunY);
  return mix(skyNight, skyDay, t);
}

vec3 cloudLayer(vec2 uv, float time) {
  float n = fbm(uv*0.3 + vec2(time*0.02, time*0.01));
  return vec3(n);
}

void main(){
  vec3 scatter = skyScattering(uSunDirY, uSkyTintDay, uSkyTintNight);
  vec3 clouds = cloudLayer(vUv, uTime);
  vec3 color = mix(scatter, scatter * (0.8 + clouds*0.6), 0.45);
  // infection tint blend
  color = mix(color, uInfectionColor, uInfectionInfluence*0.35);
  gl_FragColor = vec4(color, 1.0);
}
```

Integration notes
- Provide controls in `EnvironmentContext` (or `ProceduralEnvironmentFactory`) to update `uSunDirY`, `uInfectionInfluence`, and cloud params per environment.
- Offer a fallback: small pre-baked skybox textures (three.js `CubeTexture`) for low-end devices instead of the procedural shader.

Art direction
- For Hazard/Containment levels: skew sky toward green/amber and add thin, fast-moving cloud streaks.
- For Clinical/neutral levels: cooler blue gradient with soft white clouds and low fog.
- For Alert states: increase `uInfectionInfluence`, add quick pulsing of saturation, and lower contrast near the horizon to indicate danger.

Performance
- Keep cloud FBM octaves low (2–3) and prefer sampling a small noise texture instead of expensive FBM on low-end GPUs.
- Use `dithering` and maxi 2k sky textures if HDRIs are needed. Avoid high-res HDRIs unless the device can support large textures.

If you'd like I can implement a simple `WorldSky` shader in `src/environments/WorldSky.tsx` and wire it into `SceneEnvironment` as a toggle (procedural vs. HDRI). I can also add UI controls to the Navbar to adjust `uInfectionInfluence` live.