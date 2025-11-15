precision mediump float;
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uVeinColor;
uniform vec3 uTeleColor;
uniform int uPulseCount;
uniform vec3 uPulses[8];
uniform float uPulseSpeed;
uniform float uPulseWidth;

float veinNoise(vec2 p){
  float v = sin(p.x*3.2 + uTime*0.45) * 0.5 + 0.5;
  v += sin((p.x+p.y)*5.2 + uTime*0.2)*0.25;
  return clamp(v, 0.0, 1.0);
}

void main(){
  vec2 pos = vWorld.xz * 0.06;
  float n = veinNoise(pos*3.0);
  vec3 base = uBaseColor;
  vec3 vein = uVeinColor * (0.6 + 0.8*n);
  vec3 col = mix(base, vein, n*0.9);

  float pulseAccum = 0.0;
  for(int i=0;i<8;i++){
    if(i >= uPulseCount) break;
    vec3 p = uPulses[i];
    float start = p.z;
    float intensity = 1.0;
    if(start > 0.0){
      float dt = uTime - start;
      if(dt >= 0.0){
        float r = dt * uPulseSpeed;
        float d = distance(vWorld.xz, p.xy);
        float ring = 1.0 - smoothstep(r - uPulseWidth, r + uPulseWidth, d);
        ring *= exp(-dt*0.5);
        pulseAccum += ring * intensity;
      }
    }
  }

  vec3 accent = mix(col, uTeleColor, clamp(pulseAccum, 0.0, 1.0));
  vec3 outCol = mix(col, accent, pulseAccum*0.8);
  outCol += n * 0.03;
  gl_FragColor = vec4(clamp(outCol, 0.0, 1.0), 1.0);
}
