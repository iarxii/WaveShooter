precision mediump float;
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uVeinColor;
uniform vec3 uTeleColor;
uniform int uPulseCount;
uniform vec3 uPulses[8];

// simple procedural stain using pulses
float stain(vec2 uv){
  float s = 0.0;
  for(int i=0;i<8;i++){
    if(i >= uPulseCount) break;
    vec3 p = uPulses[i];
    float start = p.z;
    if(start <= 0.0) continue;
    float dt = uTime - start;
    if(dt < 0.0) continue;
    float radius = dt * 0.9 + 0.5;
    float d = length(vWorld.xz - p.xy);
    float k = smoothstep(radius, radius - 0.6, d);
    k *= exp(-dt*0.2);
    s += k * 0.6;
  }
  return clamp(s, 0.0, 1.0);
}

void main(){
  vec3 base = uBaseColor;
  float n = fract(sin(dot(vUv.xy ,vec2(12.9898,78.233))) * 43758.5453);
  vec3 col = mix(base * 0.9, base * 0.6, n*0.4);
  float st = stain(vUv);
  vec3 infectColor = vec3(0.8, 0.95, 0.45);
  col = mix(col, infectColor, st);
  gl_FragColor = vec4(col,1.0);
}
