// https://shaderpark.com/sculpture/-OcAqGQqkrzMpZP-lXRl?hideeditor=true&hidepedestal=true
let scale = input(1);
let offset = input(0.08, 0, 0.1);
let brightness = input(0.95)
function fbm(p) {
  return vec3(
    noise(p*0.1),
    noise(p+offset*0.3),
    noise(p+offset*2.9),
  )
}
let s = getRayDirection()
let n = sin(fbm(fbm(fbm(fbm(s*scale+(mouse.x*.2)+vec3(0.01, 0.3, time*.05)))))*2)*.5+brightness
n = pow(n, vec3(6));
let grain = noise(s*500+time)
n += grain * 1;
color(vec3(0, 0, n * n * 0.2));
sphere(2);
expand(1);