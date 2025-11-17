import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r114/build/three.module.js';
import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r114/examples/jsm/controls/OrbitControls.js';

function init() {
  const canvas = document.querySelector('#c');
  const renderer = new THREE.WebGLRenderer({canvas});
  renderer.autoClearColor = false;
  // for shadow casting
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.set(-20, -70, -30);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(20, -40, -30);
  controls.enableZoom = true;
  controls.minDistance = 5;
  controls.maxDistance = 1250;
  controls.update();

  const scene = new THREE.Scene();

  var key = new THREE.PointLight(0xffffff, 3, 0);
  key.position.set(20, -40, -30);
  key.castShadow = true;
  scene.add(key);
  
  var fill = new THREE.AmbientLight(0xffffff);
  scene.add(fill);
  
  const spheretexture = new THREE.TextureLoader().load('https://res.cloudinary.com/dgtfrqnum/image/upload/v1604284170/Week9/Mars_q4uge5.jpg');
  const spheregeometry = new THREE.SphereGeometry(1,100,100);
  const spherematerial = new THREE.MeshLambertMaterial({
    map: spheretexture,
    color: 0xecebec, 
    specular: 0x000000,
    shininess: 10
  });
  
  const sphere2texture = new THREE.TextureLoader().load('https://res.cloudinary.com/dgtfrqnum/image/upload/v1604285354/Week9/Earth_c3lblh.png');
  const sphere2geometry = new THREE.SphereGeometry(1.5,100,100);
  const sphere2material = new THREE.MeshLambertMaterial({
    map: sphere2texture,
    color: 0xecebec,
    specular: 0x000000,
    shininess: 10
  });
  
  const sphere3texture = new THREE.TextureLoader().load('https://res.cloudinary.com/dgtfrqnum/image/upload/v1604285966/Week9/sun_sbgwbv.jpg');
  const sphere3geometry = new THREE.SphereGeometry(10,100,100);
  const sphere3material = new THREE.MeshToonMaterial({
    map: sphere3texture,
    color: 0xecebec,
    specular: 0x000000,
    shininess: 10
  });
  
  const sphere4texture = new THREE.TextureLoader().load('https://res.cloudinary.com/dgtfrqnum/image/upload/v1604280450/Week9/Moon_jbom5s.webp');
  const sphere4geometry = new THREE.SphereGeometry(.5,100,100);
  const sphere4material = new THREE.MeshLambertMaterial({
    map: sphere4texture,
    color: 0xecebec,
    specular: 0x000000,
    shininess: 10
  });
  
  let materialArray = [];
  let texture_f = new THREE.TextureLoader().load("https://res.cloudinary.com/dgtfrqnum/image/upload/v1604281288/Week9/zpos_jfxmwy.png");
  let texture_b = new THREE.TextureLoader().load("https://res.cloudinary.com/dgtfrqnum/image/upload/v1604281288/Week9/zneg_xlre9j.png");
  let texture_u = new THREE.TextureLoader().load("https://res.cloudinary.com/dgtfrqnum/image/upload/v1604281288/Week9/ypos_zrjt56.png");
  let texture_d = new THREE.TextureLoader().load("https://res.cloudinary.com/dgtfrqnum/image/upload/v1604281288/Week9/yneg_jgvajl.png");
  let texture_r = new THREE.TextureLoader().load("https://res.cloudinary.com/dgtfrqnum/image/upload/v1604281288/Week9/xpos_kmm7sk.png");
  let texture_l = new THREE.TextureLoader().load("https://res.cloudinary.com/dgtfrqnum/image/upload/v1604281288/Week9/xneg_ygh42t.png");
  
  materialArray.push(new THREE.MeshBasicMaterial({map: texture_r}));
  materialArray.push(new THREE.MeshBasicMaterial({map: texture_l}));
  materialArray.push(new THREE.MeshBasicMaterial({map: texture_u}));
  materialArray.push(new THREE.MeshBasicMaterial({map: texture_d}));
  materialArray.push(new THREE.MeshBasicMaterial({map: texture_f}));
  materialArray.push(new THREE.MeshBasicMaterial({map: texture_b}));
  
  for (let i=0; i<6; i++)
    materialArray[i].side = THREE.BackSide;
  
  const mars = new THREE.Mesh(spheregeometry, spherematerial);
  mars.castShadow = true;
  mars.receiveShadow = true;
  scene.add(mars);
  mars.position.x = -20;
  
  const earth = new THREE.Mesh(sphere2geometry, sphere2material);
  earth.castShadow = true;
  earth.receiveShadow = true;
  scene.add(earth);
  earth.position.y = 20;
  earth.position.z = -45;
  
  const moon = new THREE.Mesh(sphere4geometry, sphere4material);
  const moon2 = new THREE.Mesh(sphere4geometry, sphere4material);
  const moon3 = new THREE.Mesh(sphere4geometry, sphere4material);
  const moon4 = new THREE.Mesh(sphere4geometry, sphere4material);
  moon.castShadow = true;
  moon.receiveShadow = true;
  scene.add(moon);
  scene.add(moon2);
  scene.add(moon3);
  scene.add(moon4);
  moon.position.y = -30;
  moon.position.z = 50;
  moon.position.x = 0;
  moon2.position.y = -30;
  moon2.position.z = -50;
  moon2.position.x = 45;
  moon3.position.y = -30;
  moon3.position.z = 50;
  moon3.position.x = 100;
  moon4.position.y = -60;
  moon4.position.z = -50;
  moon4.position.x = -100;
  
  const sun = new THREE.Mesh(sphere3geometry, sphere3material);
  sun.castShadow = true;
  sun.receiveShadow = false;
  scene.add(sun);
  sun.position.y = -40;
  sun.position.z = -30;
  sun.position.x = 20;
  
  var skyGeo = new THREE.BoxGeometry(10000, 10000, 10000);
  var skybox = new THREE.Mesh(skyGeo, materialArray);
  scene.add(skybox);

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  var count = 0;
  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    
	  mars.rotation.y -= 0.0002;
    mars.rotation.z -= 0.0003;
    earth.rotation.y += 0.0005;
    earth.rotation.x -= 0.0003;
    sun.rotation.y -= 0.0003;
    sun.rotation.x -= 0.0002;
    moon.rotation.y += 0.0004;
    moon.rotation.x -= 0.0002;
    moon2.rotation.y -= 0.0007;
    moon2.rotation.z -= 0.0002;
    moon3.rotation.y += 0.0003;
    moon3.rotation.x += 0.0002;
    moon4.rotation.z -= 0.0005;
    moon4.rotation.x += 0.0002;
    count += .005;
    
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}
init();