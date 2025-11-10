// source: https://shaderpark.com/sculpture/-OcA_sIH63qDttjbR50r?hideeditor=true&hidepedestal=true
setMaxIterations(50)

function mapSliderToMinMax(sliderValue, value0, value1) {
  const range = value0 - value1;
  const mappedValue = value1 + sliderValue * range;
  return mappedValue;
}

let attract = input(0, 0, 1);
let speed = input(1, 0.1, 1.3);
let masterNormalized = input(1, 0, 1);

let relative = mapSliderToMinMax(masterNormalized, 0.37, 0.8);
let degree = mapSliderToMinMax(masterNormalized, 1.8, 3.2);

let nscale = input(3.1, 0, 10);
let nAmplitude = input(1.4, 0, 6);
let hueOffset = 0.3;
let rings = input(0, 0, 100);
let mixAmt = input(0.9, 0, 1);

let s = getSpace();
let samplePos = vec3(0, 0, -degree) * 0.2 + (degree * 0.1);
let n = noise(samplePos);
let n1 = nsin((noise(samplePos)) * rings);
let n2 = nsin((noise(samplePos + hueOffset)) * rings);
let n3 = nsin((noise(samplePos + hueOffset * 2.2)) * rings);
let col = pow(vec3(n1, n2, n3), vec3(7));

// Define a shape for the horizon with a twist
let horizon = shape(() => {
    rotateX(PI / 2);
    torus(1.5, 1.39);
    expand(n * nAmplitude);
    setGeometryQuality(80);
    sphere(0.1);
    blend(5);
    rotateY(time * 0.5); // Add rotation over time for a dynamic effect
});

// Define a shape for the fractal ball with a twist
let fractalBall = shape(() => {
    let s = getSpace();
    let position = vec3(mouse.x, mouse.y, s.z);
    let amplitude = 0.9;
    let k = fractalNoise(s * nscale + speed * time) * 0.3;
    sphere(0.3);
    expand(k);
    rotateZ(time * 0.3); // Add rotation over time for a dynamic effect
});

color(col);
horizon();
mixGeo(mixAmt);
fractalBall();