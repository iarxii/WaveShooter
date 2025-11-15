precision mediump float;
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uVeinColor;
uniform vec3 uTeleColor;
uniform int uPulseCount;
uniform vec3 uPulses[8];

void main(){
  vec3 base = uBaseColor;
  float scale = 0.12;
  vec2 gv = fract(vWorld.xz * scale) - 0.5;
  float line = 1.0 - smoothstep(0.0, 0.03, length(gv));
  float gridIntensity = 0.6;

  float pulseAccum = 0.0;
  for(int i=0;i<8;i++){
    if(i >= uPulseCount) break;
    vec3 p = uPulses[i]; float start = p.z;
    if(start > 0.0){ float dt = uTime - start; if(dt>=0.0){ float r = dt*1.8; float d = length(vWorld.xz - p.xy); float ring = 1.0 - smoothstep(r - 0.8, r + 0.8, d); pulseAccum += ring*exp(-dt*0.8); } }
  }

  vec3 col = base;
  col = mix(col, vec3(0.05,0.9,1.0), line * gridIntensity);
  col += vec3(0.0, 0.25, 0.5) * pulseAccum * 0.8;
  gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
