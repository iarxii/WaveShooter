precision mediump float;
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uVeinColor;
uniform vec3 uTeleColor;
uniform int uPulseCount;
uniform vec3 uPulses[8];

float ridgeNoise(vec2 p){
  float v = abs(sin(p.x*4.0 + uTime*1.2));
  v *= smoothstep(0.0,1.0,fract(p.y*0.5 + uTime*0.2));
  return clamp(v,0.0,1.0);
}

void main(){
  vec3 base = uBaseColor;
  float r = ridgeNoise(vWorld.xz*0.35);
  vec3 col = mix(base, uVeinColor * 1.4, r*0.8);

  float glow = 0.0;
  for(int i=0;i<8;i++){
    if(i >= uPulseCount) break;
    vec3 p = uPulses[i]; float start = p.z;
    if(start > 0.0){ float dt = uTime - start; if(dt>=0.0){ float d = length(vWorld.xz - p.xy); float radius = dt*2.2; float ring = 1.0 - smoothstep(radius - 0.6, radius + 0.6, d); glow += ring*exp(-dt*0.6); } }
  }
  col += uTeleColor * glow * 1.6;
  gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
