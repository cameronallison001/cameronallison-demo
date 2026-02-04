import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js";

const container = document.getElementById("three-container");
const statusEl = document.getElementById("three-status");

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
  console.log(msg);
}

if (!container) {
  throw new Error("Missing #three-container");
}

setStatus("Loading 3D…");

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);
camera.position.set(0, 0.6, 2.5);

// Renderer
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.9));

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0x88aaff, 0.45);
fill.position.set(-4, 2, -3);
scene.add(fill);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;

// Fallback cube (shows Three is running even if GLB fails)
const fallback = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
);
scene.add(fallback);

// Resize
function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (!w || !h) return;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);
requestAnimationFrame(resize);

// Auto-frame
function frameObject(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // move model so center is at origin
  obj.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (!isFinite(maxDim) || maxDim === 0) return;

  const fov = (camera.fov * Math.PI) / 180;
  let distance = (maxDim / 2) / Math.tan(fov / 2);
  distance *= 1.6;

  camera.position.set(0, maxDim * 0.25, distance);
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.minDistance = distance / 4;
  controls.maxDistance = distance * 4;
  controls.update();
}

// Load model (PATH MUST MATCH FOLDER + CASE)
const MODEL_URL = "./models/headset4.glb";
const loader = new GLTFLoader();

loader.load(
  MODEL_URL,
  (gltf) => {
    scene.remove(fallback);

    const model = gltf.scene;
    scene.add(model);

    frameObject(model);

    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    setStatus("✅ 3D loaded. Drag to rotate • Scroll to zoom.");
  },
  undefined,
  (err) => {
    console.error("GLB load failed:", err);
    setStatus("❌ Failed to load ./models/headset4.glb (check path + run local server).");
  }
);

// Render loop
function animate() {
  requestAnimationFrame(animate);

  if (fallback.parent) fallback.rotation.y += 0.01;

  controls.update();
  renderer.render(scene, camera);
}
animate();
