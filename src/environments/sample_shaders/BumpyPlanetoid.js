// source: https://shaderpark.com/sculpture/-Oc2s2lGqZiho5caMBAZ?hideeditor=true&hidepedestal=true
// Textured Rotating Sphere (Belson-inspired)
// Based on working ShaderPark patterns

// ROTATION
rotateY(time * 0.2);
rotateX(time * 0.1);

// GET POSITION
let s = getSpace();

// CREATE LAYERED NOISE
let n1 = noise(s * 3.0 + time * 0.3);
let n2 = noise(s * 6.0 - time * 0.2);
let n3 = noise(s * 12.0 + time * 0.1);
let surfaceNoise = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;

// COLOR GRADIENT (based on height)
let height = s.y;
let gradientPos = (height + 1.0) * 0.5; // Map -1..1 to 0..1

// Sunrise colors: purple -> magenta -> orange -> yellow
let purple = vec3(0.3, 0.1, 0.5);
let magenta = vec3(1.0, 0.2, 0.6);
let orange = vec3(1.0, 0.5, 0.1);
let yellow = vec3(1.0, 0.9, 0.4);

let col1 = mix(purple, magenta, smoothstep(0.0, 0.33, gradientPos));
let col2 = mix(magenta, orange, smoothstep(0.33, 0.66, gradientPos));
let col3 = mix(orange, yellow, smoothstep(0.66, 1.0, gradientPos));

let finalColor = mix(col1, col2, step(0.33, gradientPos));
finalColor = mix(finalColor, col3, step(0.66, gradientPos));

// Modulate color with noise
finalColor *= (0.8 + surfaceNoise * 0.4);

color(finalColor);

// MATERIAL
metal(0.2);
shine(0.4);

// THE SHAPE: Bumpy sphere
let bumpAmount = abs(surfaceNoise) * 0.15;
sphere(0.65 + bumpAmount);


// ============================================
// TEACHING NOTES - BELSON TECHNIQUES:
// ============================================
//
// 1. LAYERED NOISE (like clouds/atmosphere)
//    - Multiple scales create organic complexity
//    - Smaller multiplier = less influence
//
// 2. COLOR GRADIENTS (cosmic feeling)
//    - Based on position in space (height)
//    - Multiple color transitions
//    - smoothstep() creates smooth blending
//
// 3. SURFACE DISPLACEMENT
//    - Noise distorts the sphere surface
//    - Creates organic, living quality
//
// 4. ATMOSPHERIC LIGHTING
//    - Low metal value = more diffuse
//    - Moderate shine = soft highlights
//
// ============================================
// VIBECODING EXPERIMENTS:
// ============================================
//
// "Spin faster"
//   → Change: time * 0.2 to time * 0.5
//
// "More bumpy"
//   → Change: * 0.15 to * 0.3
//
// "Bigger"
//   → Change: sphere(0.65...) to sphere(1.0...)
//
// "Change colors to cool tones"
//   → purple = vec3(0.1, 0.2, 0.5);
//   → magenta = vec3(0.2, 0.5, 0.9);
//   → orange = vec3(0.3, 0.7, 1.0);
//   → yellow = vec3(0.6, 0.9, 1.0);
//
// "Smoother surface"
//   → Change: noise(s * 12.0) to noise(s * 3.0)
//
// "More frenetic"
//   → Change: time * 0.3 to time * 2.0
//
// ============================================