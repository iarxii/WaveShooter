import * as THREE from "https://esm.sh/three@0.178.0";
import { EffectComposer } from "https://esm.sh/three@0.178.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://esm.sh/three@0.178.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://esm.sh/three@0.178.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "https://esm.sh/three@0.178.0/examples/jsm/postprocessing/ShaderPass.js";

// Global variables
const effects = [];
const mousePosition = new THREE.Vector2(0.5, 0.5);
let lastMouseMoveTime = Date.now();
let isMouseMoving = false;
let isMouseInWindow = true;
let isMobile = false;
let pixelRatio = 1;

// Device detection and performance settings
function detectDevice() {
  isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    window.innerWidth < 768 ||
    "ontouchstart" in window;

  // Adjust pixel ratio for performance on mobile
  pixelRatio = isMobile
    ? Math.min(window.devicePixelRatio, 2)
    : window.devicePixelRatio;

  return {
    isMobile,
    pixelRatio,
    // Performance scaling factors
    trailMultiplier: isMobile ? 0.6 : 1.0,
    bloomMultiplier: isMobile ? 0.7 : 1.0,
    grainMultiplier: isMobile ? 0.5 : 1.0
  };
}

const deviceInfo = detectDevice();

// Base shaders
const baseVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shaderPrologue = `
  uniform float iTime;
  uniform vec3 iResolution;
  uniform vec2 iMouse;
  uniform vec2 iPrevMouse[MAX_TRAIL_LENGTH];
  uniform float iOpacity;
  uniform float iScale;
  varying vec2 vUv;
  
  #define PI 3.14159265359
  
  vec3 hash3( vec2 p ) { return fract(sin(vec3(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)),dot(p,vec2(419.2,371.9))))*43758.5453); }
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123); }
  float hash1(float n) { return fract(sin(n) * 43758.5453); }
  
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); 
    f *= f*(3.-2.*f);
    return mix(mix(hash(i + vec2(0.,0.)), hash(i + vec2(1.,0.)), f.x),
               mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
  }
  
  float fbm(in vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  #define WBCOL  (vec3(0.5, 0.7,  1.7))
  #define WBCOL2 (vec3(0.15, 0.8, 1.7))
`;

// Effect shaders with responsive scaling
const effectShaders = {
  molten: `
    vec3 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
      vec2 warp = vec2(fbm(p * 2.0 * iScale + iTime * 0.2), fbm(p * 2.0 * iScale + iTime * 0.2 + 5.0)) * 0.08;
      vec2 p_warped = p + warp;
      vec2 distToMouse = p_warped - mousePos;
      float d = length(distToMouse);
      
      float surfaceNoise = fbm(p * 15.0 * iScale - iTime * 2.0);
      float baseRadius = 0.02 + 0.03 * (1.0 / iScale);
      float maxRadius = 0.075 + 0.025 * (1.0 / iScale);
      float baseShape = 1.0 - smoothstep(baseRadius * activity, maxRadius * activity, d - surfaceNoise * 0.02);
      
      vec3 crustColor = vec3(0.2, 0.05, 0.02);
      vec3 moltenColor = vec3(1.0, 0.3, 0.0);
      vec3 coreColor = vec3(1.0, 0.9, 0.2);
      
      vec3 color = mix(crustColor, moltenColor, smoothstep(0.0, 0.4, baseShape));
      color = mix(color, coreColor, smoothstep(0.8, 1.0, baseShape));
      
      return color * baseShape * intensity;
    }
  `,
  inkBloom: `
    vec3 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
      vec2 distToMouse = p - mousePos;
      float d = length(distToMouse);
      
      vec2 q = vec2(fbm(p * 3.0 * iScale), fbm(p * 3.0 * iScale + vec2(1.8, 3.4)));
      vec2 r = vec2(fbm(p * 3.0 * iScale + q * 1.5 + iTime * 0.05), fbm(p * iScale + q * 1.5 + vec2(5.5, 7.3) + iTime * 0.05));
      
      float inkNoise = fbm(p * iScale + r * 0.5);
      float baseRadius = 0.02 + 0.03 * (1.0 / iScale);
      float maxRadius = 0.0625 + 0.0375 * (1.0 / iScale);
      float inkShape = 1.0 - smoothstep(baseRadius * activity, maxRadius * activity, d - inkNoise * 0.1);
      float core = 1.0 - smoothstep(0.0, 0.01 * activity * (1.0 / iScale), d);
      
      float finalShape = max(core, inkShape);
      vec3 color = vec3(0.05, 0.0, 0.15); 
      
      return color * finalShape * intensity;
    }
  `,
  ghostly: `
    vec3 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
      vec2 q = vec2(fbm(p * iScale + iTime * 0.1), fbm(p * iScale + vec2(5.2,1.3) + iTime * 0.1));
      vec2 r = vec2(fbm(p * iScale + q * 1.5 + iTime * 0.15), fbm(p * iScale + q * 1.5 + vec2(8.3,2.8) + iTime * 0.15));
      
      float smoke = fbm(p * iScale + r * 0.8);
      float radius = 0.5 + 0.3 * (1.0 / iScale);
      float distFactor = 1.0 - smoothstep(0.0, radius * activity, length(p - mousePos));
      float alpha = pow(smoke, 2.5) * distFactor;
      
      vec3 color1 = vec3(0.7, 0.9, 1.0);
      vec3 color2 = vec3(0.6, 1.0, 0.8);
      vec3 color = mix(color1, color2, sin(iTime * 0.5) * 0.5 + 0.5);
      
      return color * alpha * intensity;
    }
  `,
  nebula: `
    vec3 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
      vec2 q = vec2(fbm(p * iScale + iTime * 0.05), fbm(p * iScale + vec2(1.2,2.8) + iTime * 0.05));
      vec2 r = vec2(fbm(p * iScale + q * 0.8 - iTime * 0.1), fbm(p * iScale + q * 0.8 + vec2(4.1,6.3) - iTime * 0.1));
      
      float nebula = fbm(p * iScale + r);
      float minRadius = 0.1 + 0.05 * (1.0 / iScale);
      float maxRadius = 0.5 + 0.3 * (1.0 / iScale);
      float distFactor = 1.0 - smoothstep(minRadius * activity, maxRadius * activity, length(p - mousePos));
      float nebulaAlpha = pow(nebula, 2.0) * distFactor * intensity;
      
      vec3 nebulaColor1 = vec3(0.1, 0.2, 0.5);
      vec3 nebulaColor2 = vec3(0.8, 0.2, 0.7);
      vec3 color = mix(nebulaColor1, nebulaColor2, nebula);
      
      return color * nebulaAlpha;
    }
  `,
  digital: `
    float blob_channel(vec2 p, vec2 mousePos, float intensity, float activity, float timeOffset) {
      vec2 grid_p = floor(p * vec2(50.0, 25.0) * iScale);
      float col_hash = hash(vec2(grid_p.x, 0.0));
      float time_component = (iTime + timeOffset) * (0.5 + col_hash * 0.5) * 2.0;
      time_component += col_hash * 100.0;
      float scroll_p = fract(grid_p.y * 0.1 + time_component);
      float leader = smoothstep(0.99, 1.0, scroll_p);
      float tail = smoothstep(0.0, 0.9, scroll_p) * (1.0 - leader);
      float glyph = leader * 2.0 + tail * 0.8;
      glyph *= hash1(floor(grid_p.y * 0.1 + time_component) + grid_p.x);
      float radius = 0.25 + 0.15 * (1.0 / iScale);
      float dist_mask = pow(1.0 - smoothstep(0.0, radius * activity, length(p - mousePos)), 3.0);
      return glyph * dist_mask * intensity;
    }
    vec3 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
        float r = blob_channel(p + vec2(0.005, 0.0), mousePos, intensity, activity, 0.0);
        float g = blob_channel(p, mousePos, intensity, activity, 1.0);
        float b = blob_channel(p - vec2(0.005, 0.0), mousePos, intensity, activity, 2.0);
        return vec3(r, g, b) * vec3(0.3, 1.0, 0.4);
    }
  `,
  dataField: `
    float map1(vec2 p, float scale) {
      p = fract(p) - 0.5;
      return length(max(abs(p) - scale, 0.0));
    }
    vec3 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
      vec2 R = p - mousePos;
      float dist = length(R);
      float radius = 0.25 + 0.15 * (1.0 / iScale);
      float mask = pow(1.0 - smoothstep(0.0, radius * activity, dist), 2.0);
      if (mask < 0.01) return vec3(0.0);
      vec2 p1 = R * (10.0 * iScale / activity); p1.x += iTime * 0.2;
      float grid1 = 1.0 - smoothstep(0.01, 0.05, map1(p1, 0.4));
      vec2 p2 = R * (20.0 * iScale / activity); p2.y += iTime * 0.3;
      float grid2 = 1.0 - smoothstep(0.01, 0.05, map1(p2, 0.3));
      vec3 col = vec3(0.0);
      col += grid1 * WBCOL; col += grid2 * WBCOL2;
      return col * mask * intensity * 0.5;
    }
  `
};

const shaderEpilogue = `
  void main() {
    vec2 uv = (gl_FragCoord.xy / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    vec2 mouse = (iMouse * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    
    vec3 color = vec3(0.0);
    color += blob(uv, mouse, 1.0, iOpacity);
    
    for (int i = 0; i < MAX_TRAIL_LENGTH; i++) {
      vec2 prevMouse = (iPrevMouse[i] * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
      float trailIntensity = 1.0 - float(i) / float(MAX_TRAIL_LENGTH);
      trailIntensity = pow(trailIntensity, 2.0);
      if (trailIntensity > 0.01) {
        color += blob(uv, prevMouse, trailIntensity * 0.8, iOpacity);
      }
    }
    
    gl_FragColor = vec4(color * iOpacity, 1.0);
  }
`;

// Film grain shader
const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    iTime: { value: 0 },
    intensity: { value: 0.075 }
  },
  vertexShader: baseVertexShader,
  fragmentShader: `
    uniform sampler2D tDiffuse; 
    uniform float iTime; 
    uniform float intensity; 
    varying vec2 vUv;
    float hash1(float n) { return fract(sin(n)*43758.5453); }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = hash1(vUv.x*1000.0 + vUv.y*2000.0 + iTime) * 2.0 - 1.0;
      color.rgb += noise * intensity * color.rgb;
      gl_FragColor = color;
    }
  `
};

// Calculate responsive scale based on container size
function calculateScale(container) {
  const rect = container.getBoundingClientRect();
  const baseSize = 600; // Reference size
  const currentSize = Math.min(rect.width, rect.height);
  return Math.max(0.5, Math.min(2.0, currentSize / baseSize));
}

function createCursorEffect(container, options) {
  const renderer = new THREE.WebGLRenderer({
    antialias: !deviceInfo.isMobile,
    alpha: false,
    powerPreference: deviceInfo.isMobile ? "low-power" : "high-performance"
  });

  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(deviceInfo.pixelRatio);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Adjust trail length based on device performance
  const adjustedTrailLength = Math.floor(
    options.trailLength * deviceInfo.trailMultiplier
  );
  const prevMousePositions = Array(adjustedTrailLength)
    .fill(0)
    .map(() => new THREE.Vector2(0.5, 0.5));

  const fluidMaterial = new THREE.ShaderMaterial({
    defines: {
      MAX_TRAIL_LENGTH: adjustedTrailLength
    },
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3() },
      iMouse: { value: new THREE.Vector2(0.5, 0.5) },
      iPrevMouse: { value: prevMousePositions.map((p) => p.clone()) },
      iOpacity: { value: 1.0 },
      iScale: { value: 1.0 }
    },
    vertexShader: baseVertexShader,
    fragmentShader: shaderPrologue + options.shader + shaderEpilogue
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fluidMaterial));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Adjust bloom settings for mobile
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(),
    options.bloom.strength * deviceInfo.bloomMultiplier,
    options.bloom.radius,
    options.bloom.threshold
  );
  composer.addPass(bloomPass);

  const filmGrainPass = new ShaderPass(FilmGrainShader);
  filmGrainPass.uniforms.intensity.value =
    options.grainIntensity * deviceInfo.grainMultiplier;
  composer.addPass(filmGrainPass);

  function resize() {
    const rect = container.getBoundingClientRect();
    const { width: w, height: h } = rect;

    // Ensure minimum size
    const actualWidth = Math.max(w, 1);
    const actualHeight = Math.max(h, 1);

    renderer.setSize(actualWidth, actualHeight);
    composer.setSize(actualWidth, actualHeight);
    fluidMaterial.uniforms.iResolution.value.set(actualWidth, actualHeight, 1);

    // Update responsive scale
    const scale = calculateScale(container);
    fluidMaterial.uniforms.iScale.value = scale;

    // Update bloom size
    bloomPass.resolution.set(actualWidth, actualHeight);
  }

  // Initial resize
  resize();

  return {
    renderer,
    composer,
    fluidMaterial,
    prevMousePositions,
    options: { ...options, trailLength: adjustedTrailLength },
    resize,
    mouseVelocity: new THREE.Vector2(0, 0),
    currentMouse: new THREE.Vector2(0.5, 0.5),
    fadeOpacity: 1.0,
    container
  };
}

function init() {
  const effectConfigs = [
    {
      id: "#effect1",
      shader: effectShaders.molten,
      trailLength: 25,
      inertia: 0.98,
      bloom: { strength: 0.8, radius: 0.6, threshold: 0.2 },
      grainIntensity: 0.02
    },
    {
      id: "#effect2",
      shader: effectShaders.inkBloom,
      trailLength: 35,
      inertia: 0.97,
      bloom: { strength: 0.8, radius: 0.7, threshold: 0.1 },
      grainIntensity: 0.02
    },
    {
      id: "#effect3",
      shader: effectShaders.ghostly,
      trailLength: 40,
      inertia: 0.97,
      bloom: { strength: 0.6, radius: 1.0, threshold: 0.05 },
      grainIntensity: 0.01
    },
    {
      id: "#effect4",
      shader: effectShaders.nebula,
      trailLength: 30,
      inertia: 0.985,
      bloom: { strength: 1.0, radius: 0.8, threshold: 0.3 },
      grainIntensity: 0.01
    },
    {
      id: "#effect5",
      shader: effectShaders.digital,
      trailLength: 20,
      inertia: 0.9,
      bloom: { strength: 1.2, radius: 0.3, threshold: 0.7 },
      grainIntensity: 0.12
    },
    {
      id: "#effect6",
      shader: effectShaders.dataField,
      trailLength: 20,
      inertia: 0.96,
      bloom: { strength: 1.0, radius: 0.6, threshold: 0.4 },
      grainIntensity: 0.04
    }
  ];

  effectConfigs.forEach((config) => {
    const container = document.querySelector(config.id);
    if (container) {
      effects.push(createCursorEffect(container, config));
    }
  });

  // Event listeners
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("orientationchange", onWindowResize);

  // Mouse events
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseenter", onMouseEnter);
  window.addEventListener("mouseleave", onMouseLeave);
  document.addEventListener("mouseleave", onMouseLeave);

  // Touch events for mobile
  window.addEventListener("touchstart", onTouchStart, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: false });

  // Prevent context menu on long press
  window.addEventListener("contextmenu", (e) => {
    if (deviceInfo.isMobile) {
      e.preventDefault();
    }
  });
}

function onWindowResize() {
  // Debounce resize events
  clearTimeout(onWindowResize.timeout);
  onWindowResize.timeout = setTimeout(() => {
    effects.forEach((effect) => {
      if (effect && effect.resize) {
        effect.resize();
      }
    });
  }, 100);
}

function onMouseMove(event) {
  updateMousePosition(event.clientX, event.clientY);
}

function onMouseEnter(event) {
  isMouseInWindow = true;
}

function onMouseLeave(event) {
  isMouseInWindow = false;
  lastMouseMoveTime = Date.now();
}

// Touch event handlers
function onTouchStart(event) {
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    updateMousePosition(touch.clientX, touch.clientY);
    isMouseInWindow = true;
  }
}

function onTouchMove(event) {
  event.preventDefault(); // Prevent scrolling
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    updateMousePosition(touch.clientX, touch.clientY);
    isMouseInWindow = true;
  }
}

function onTouchEnd(event) {
  isMouseInWindow = false;
  lastMouseMoveTime = Date.now();
}

function updateMousePosition(clientX, clientY) {
  mousePosition.x = clientX / window.innerWidth;
  mousePosition.y = 1.0 - clientY / window.innerHeight;
  isMouseMoving = true;
  isMouseInWindow = true;
  lastMouseMoveTime = Date.now();
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const elapsedTime = now / 1000;
  const timeSinceLastMove = now - lastMouseMoveTime;

  // Adjust timing for mobile
  const FADE_DELAY = isMouseInWindow ? (deviceInfo.isMobile ? 500 : 1000) : 0;
  const FADE_DURATION = deviceInfo.isMobile ? 1000 : 1500;

  const currentlyMoving = isMouseMoving && isMouseInWindow;

  effects.forEach((effect) => {
    if (!effect || !effect.composer) return;

    const { composer, fluidMaterial, prevMousePositions, options } = effect;

    if (currentlyMoving) {
      effect.mouseVelocity.set(
        mousePosition.x - effect.currentMouse.x,
        mousePosition.y - effect.currentMouse.y
      );
      effect.currentMouse.copy(mousePosition);
      effect.fadeOpacity = 1.0;
    } else {
      // Apply inertia only if mouse/touch is active
      if (isMouseInWindow) {
        effect.mouseVelocity.multiplyScalar(options.inertia);
        if (effect.mouseVelocity.lengthSq() > 0.000001) {
          effect.currentMouse.add(effect.mouseVelocity);
        }
      }

      // Fade out logic
      if (timeSinceLastMove > FADE_DELAY) {
        const fadeProgress = Math.min(
          1.0,
          (timeSinceLastMove - FADE_DELAY) / FADE_DURATION
        );
        effect.fadeOpacity = Math.max(0.0, 1.0 - fadeProgress);
      }
    }

    // Update trail positions
    prevMousePositions.pop();
    prevMousePositions.unshift(effect.currentMouse.clone());

    // Update shader uniforms
    for (let i = 0; i < options.trailLength; i++) {
      if (fluidMaterial.uniforms.iPrevMouse.value[i]) {
        fluidMaterial.uniforms.iPrevMouse.value[i].copy(prevMousePositions[i]);
      }
    }

    fluidMaterial.uniforms.iMouse.value.copy(effect.currentMouse);
    fluidMaterial.uniforms.iOpacity.value = effect.fadeOpacity;
    fluidMaterial.uniforms.iTime.value = elapsedTime;

    // Update time uniform for post-processing passes
    composer.passes.forEach((pass) => {
      if (pass.uniforms && pass.uniforms.iTime) {
        pass.uniforms.iTime.value = elapsedTime;
      }
    });

    // Render
    try {
      composer.render();
    } catch (error) {
      console.warn("Render error:", error);
    }
  });

  // Reset mouse moving flag
  isMouseMoving = false;
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Start animation loop
animate();
