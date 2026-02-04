const container = document.getElementById("three-container");
const statusEl = document.getElementById("three-status");
const setStatus = (m) => (statusEl.textContent = m);

const MODEL_DIR = "assets/";
const MODEL_URL = MODEL_DIR + "headset4.gltf?v=9999";

setStatus("Loading…");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(3, 4, 5);
scene.add(key);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

let model = null; // ✅ we store it so we can re-frame on resize

function resizeRendererToContainer() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (!w || !h) return;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function frameObject(obj) {
  // Reset transform so reframing stays consistent
  obj.position.set(0, 0, 0);
  obj.rotation.set(0, 0, 0);
  obj.scale.set(1, 1, 1);

  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  obj.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (!isFinite(maxDim) || maxDim === 0) return;

  const fov = (camera.fov * Math.PI) / 180;
  let dist = (maxDim / 2) / Math.tan(fov / 2);
  dist *= 1.7;

  camera.position.set(0, maxDim * 0.22, dist);
  camera.near = dist / 100;
  camera.far = dist * 100;
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.update();
}

// ✅ this is the “move with the box” part
function onContainerResize() {
  resizeRendererToContainer();
  if (model) frameObject(model); // re-center + re-distance when box changes
}
new ResizeObserver(onContainerResize).observe(container);
window.addEventListener("resize", onContainerResize);
onContainerResize();

// Force all referenced files to load from /assets/
const manager = new THREE.LoadingManager();
manager.setURLModifier((url) => {
  if (url.startsWith("data:")) return url;
  const clean = url.split("?")[0];
  const file = clean.split("/").pop();
  return MODEL_DIR + file + "?v=9999";
});

manager.onError = (url) => {
  console.error("Missing:", url);
  setStatus("❌ Missing file: " + url);
};

const loader = new THREE.GLTFLoader(manager);

loader.load(
  MODEL_URL,
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    // Make sure materials update
    model.traverse((o) => {
      if (o.isMesh && o.material) o.material.needsUpdate = true;
    });

    onContainerResize(); // ✅ frame immediately after load
    setStatus("✅ Loaded. Drag to rotate • Scroll to zoom.");
  },
  undefined,
  (err) => {
    console.error(err);
    setStatus("❌ GLTF load error. Check console.");
  }
);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
