//var materialShader;
var clock = new THREE.Clock();
var mixers = [];

scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);
//scene.fog = new THREE.Fog(scene.background, 100, 999);

var camera = new THREE.PerspectiveCamera(45, 1, 1, 10500);
camera.position.set(-20, 5, 20);

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
var canvas = renderer.domElement;
document.body.appendChild(canvas);

controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.maxDistance = 500;
controls.enableZoom = true;
controls.enableRotate = true;
controls.enablePan = false;
controls.update();

// light --------------------------------------------
///*
light = new THREE.DirectionalLight(0xffffff);
light.position.set(70, 200, -100);
light.castShadow = true;
light.shadow.camera.top = 180;
light.shadow.camera.bottom = -100;
light.shadow.camera.left = -120;
light.shadow.camera.right = 120;
scene.add(light);
//*/
// key light
///*
var keylight = new THREE.DirectionalLight(0xffffff, .5); // color, intensity
keylight.position.set(2, 3, 3);
keylight.castShadow = true;
// shadow properties for the light
keylight.shadow.mapSize.width = 1024;
keylight.shadow.mapSize.height = 1024;
keylight.shadow.camera.near = 0.5;
keylight.shadow.camera.far = 500;
scene.add(keylight);

// fill light
var filllight = new THREE.DirectionalLight(0xffffff, .5); // color, intensity
filllight.position.set(-5, -1, -3);
scene.add(filllight);
//*/
// 6-sided skybox --------------------------------------------
var matArray = [];
var textureft = new THREE.TextureLoader().load(
  "https://res.cloudinary.com/jnoe/image/upload/v1659933401/snow_ft_bpuhux.jpg"
);
textureft.center = new THREE.Vector2(0.5, 0.5);
textureft.rotation = Math.PI;
var texturebk = new THREE.TextureLoader().load(
  "https://res.cloudinary.com/jnoe/image/upload/v1659933498/snow_bk_ne4xpa.jpg"
);
texturebk.center = new THREE.Vector2(0.5, 0.5);
texturebk.rotation = Math.PI;
var textureup = new THREE.TextureLoader().load(
  "https://res.cloudinary.com/jnoe/image/upload/v1659934474/snow_up_etkz7p.jpg"
);
var texturedn = new THREE.TextureLoader().load(
  "https://res.cloudinary.com/jnoe/image/upload/v1659934550/snow_dn_bghf7w.jpg"
);
var texturert = new THREE.TextureLoader().load(
  "https://res.cloudinary.com/jnoe/image/upload/v1659933586/snow_rt_fobfyy.jpg"
);
texturert.center = new THREE.Vector2(0.5, 0.5);
texturert.rotation = Math.PI;
var texturelf = new THREE.TextureLoader().load(
  "https://res.cloudinary.com/jnoe/image/upload/v1659934444/snow_lf_lakorp.jpg"
);
texturelf.center = new THREE.Vector2(0.5, 0.5);
texturelf.rotation = Math.PI;

matArray.push(new THREE.MeshBasicMaterial({ map: textureft }));
matArray.push(new THREE.MeshBasicMaterial({ map: texturebk }));
matArray.push(new THREE.MeshBasicMaterial({ map: textureup }));
matArray.push(new THREE.MeshBasicMaterial({ map: texturedn }));
matArray.push(new THREE.MeshBasicMaterial({ map: texturelf }));
matArray.push(new THREE.MeshBasicMaterial({ map: texturert }));

for (let i = 0; i < 6; i++) matArray[i].side = THREE.BackSide;

var skyboxgeo = new THREE.BoxGeometry(10000, 10000, 10000);
var skybox = new THREE.Mesh(skyboxgeo, matArray);
scene.add(skybox);

// models --------------------------------------------
///*
// illidan
var loader = new THREE.FBXLoader();
loader.load( "https://res.cloudinary.com/jnoe/raw/upload/v1659931147/penguin_ydfhyr.fbx",
  function (object) {
    
    // shadow and material properties
    // https://threejs.org/examples/?q=variations#webgl_materials_variations_lambert
    object.traverse(function (child) {
      if (child.isMesh) {
        // shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });    

    // set scale, position, and rotation
    object.scale.set(.1, .1, .1);
    object.position.set(0, 5, 0);
    object.rotation.set(0, -0.4, 0);

    // load object anims
    object.mixer = new THREE.AnimationMixer(object);
    mixers.push(object.mixer);

    // play object anims
    var action = object.mixer.clipAction(object.animations[0]);
    action.play();

    // add object to scene
    scene.add(object);
    console.log(object);
  }
);
//*/

// hack to try to turn off shininess for ALL objects in scene
scene.traverse(i => {if (i.isMesh) i.material.shininess = 0});

// ground --------------------------------------------

// ground grid (with shadow)
///*
const geometry = new THREE.PlaneGeometry( 100, 100 );
geometry.rotateX( - Math.PI / 2 );

const material = new THREE.ShadowMaterial();
material.opacity = 0.2;

const plane = new THREE.Mesh( geometry, material );
plane.position.y = 0;
plane.receiveShadow = true;
scene.add( plane );

// render --------------------------------------------
render();
var counter = 0;
function render() {
  if (resize(renderer)) {
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  if (mixers.length > 0) {
    for (var i = 0; i < mixers.length; i++) {
      mixers[i].update(clock.getDelta());
    }
  }

  //if (materialShader)
  //materialShader.uniforms.time.value = performance.now() / 1000;

 
  //light.position.set(Math.cos(counter + 1) * 100, 200, Math.sin(counter + 4) * 100); // roatate light
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

// adjust aspect ratio on canvas resize
function resize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}