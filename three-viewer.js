const container = document.getElementById("three-container");
const statusEl = document.getElementById("three-status");
const setStatus = (m) => (statusEl.textContent = m || "");

const MODEL_DIR = "assets/";
const MODELS = [
  { id: "self-portrait2.glb", label: "Self portrait 2" },
  { id: "headset0.glb", label: "Headset 0" },
];

setStatus("Loading…");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0); // transparent background
// fallback for older three builds
if (THREE.SRGBColorSpace !== undefined) renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// Default lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(3, 4, 5);
scene.add(key);

// Add a subtle rim light for faces
const rim = new THREE.DirectionalLight(0xffffff, 0.4);
rim.position.set(-3, -2, -3);
scene.add(rim);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

// safe defaults so the scene is visible even before a model loads
camera.position.set(0, 0.6, 2.5);
camera.near = 0.01;
camera.far = 1000;
camera.updateProjectionMatrix();
controls.target.set(0, 0.25, 0);
controls.update();

let model = null; // we keep a reference so we can remove/clean it
let placeholder = null; // simple fallback object to show the viewer is working

// debug helpers (visual boxes, axes, and debug materials)
let debugHelpers = [];
function clearDebugHelpers() {
  debugHelpers.forEach((h) => scene.remove(h));
  debugHelpers = [];
}

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

// move with the box when resize
function onContainerResize() {
  resizeRendererToContainer();
  if (model) frameObject(model);
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
  // encode file names (handles spaces like 'self portrait2')
  return MODEL_DIR + encodeURIComponent(file) + "?v=9999";
});

manager.onError = (url) => {
  console.error("Missing:", url);
  setStatus("❌ Missing file: " + url);
};

const loader = new THREE.GLTFLoader(manager);

// Enable DRACO if available (helps if models use Draco compression)
if (THREE.DRACOLoader) {
  try {
    const dracoLoader = new THREE.DRACOLoader();
    // Use the decoder hosted by three's unpkg examples
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.158.0/examples/js/libs/draco/');
    loader.setDRACOLoader(dracoLoader);
    console.info('DRACOLoader enabled.');
  } catch (e) {
    console.warn('DRACO setup failed:', e);
  }
}

function autoScaleModel(obj) {
  // compute bounding box and scale to fit into a ~1 unit box
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!isFinite(maxDim) || maxDim === 0) return;

  const target = 1.0; // target size in scene units
  const scale = target / maxDim;
  obj.scale.setScalar(scale);

  // re-center after scaling
  const newBox = new THREE.Box3().setFromObject(obj);
  const newCenter = newBox.getCenter(new THREE.Vector3());
  obj.position.sub(newCenter);

  console.info('Auto-scaled model by', scale.toFixed(3), 'original maxDim', maxDim.toFixed(3));
}


function disposeObject(obj) {
  obj.traverse((n) => {
    if (n.isMesh) {
      if (n.geometry) n.geometry.dispose();
      if (n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach((m) => {
          // dispose textures
          for (const key in m) {
            const val = m[key];
            if (val && val.isTexture) val.dispose();
          }
          m.dispose();
        });
      }
    }
  });
}

function showPlaceholder() {
  // remove previous placeholder if any
  if (placeholder) {
    scene.remove(placeholder);
    disposeObject(placeholder);
    placeholder = null;
  }

  const geom = new THREE.TorusKnotGeometry(0.35, 0.12, 120, 20);
  const mat = new THREE.MeshStandardMaterial({ color: 0x9aa8ff, metalness: 0.2, roughness: 0.4 });
  placeholder = new THREE.Mesh(geom, mat);
  placeholder.position.set(0, 0.12, 0);
  scene.add(placeholder);

  // small rotation animation so it's obvious something is running
  placeholder.userData.spin = 0.01;
}

function removePlaceholder() {
  if (!placeholder) return;
  scene.remove(placeholder);
  disposeObject(placeholder);
  placeholder = null;
}

async function loadModel(fileName) {
  setStatus("Loading " + fileName + "…");

  // remove previous
  if (model) {
    scene.remove(model);
    clearDebugHelpers();
    disposeObject(model);
    model = null;
  }

  // internal loader with optional fallback
  const attemptLoad = (name, triedFallback = false) => {
    const url = MODEL_DIR + name + "?v=9999";
    console.info("Attempting to load model:", url);

    // show a placeholder while the model downloads
    showPlaceholder();

    loader.load(
      url,
      (gltf) => {
        console.info('Loaded glTF:', name, 'nodes:', gltf.parser.json.nodes?.length || 0);
        console.info('extensionsUsed:', gltf.parser.json.extensionsUsed || [], 'extensionsRequired:', gltf.parser.json.extensionsRequired || []);
        removePlaceholder();
        model = gltf.scene;

        // Auto-scale and center model to make sure it's visible
        try { autoScaleModel(model); } catch (e) { console.warn('Auto-scale failed', e); }

        scene.add(model);

        // Add a visual bounding helper + axes so we can see where the model is
        try {
          const box = new THREE.Box3().setFromObject(model);
          const boxHelper = new THREE.Box3Helper(box, 0xffaa00);
          scene.add(boxHelper);
          debugHelpers.push(boxHelper);

          const size = box.getSize(new THREE.Vector3());
          const axes = new THREE.AxesHelper(Math.max(size.length() * 0.6, 0.5));
          scene.add(axes);
          debugHelpers.push(axes);

          console.info('Model bounding box:', box.min, box.max, 'size:', size);
        } catch (e) {
          console.warn('Helper creation failed', e);
        }

        // Override materials temporarily for visibility (use MeshNormalMaterial)
        let meshCount = 0;
        model.traverse((o) => {
          if (o.isMesh) {
            meshCount++;
            try {
              o.userData.__prevMaterial = o.material;
              o.material = new THREE.MeshNormalMaterial();
            } catch (e) {
              console.warn('Material override failed', e);
            }
          }
          if (o.isMesh && o.material) o.material.needsUpdate = true;
        });
        console.info('Model added with', meshCount, 'meshes (materials overridden for debug)');

        // dump parser json if suspicious
        try {
          console.groupCollapsed('glTF parser json (first-level keys)');
          console.log(Object.keys(gltf.parser.json || {}).slice(0, 20));
          console.groupEnd();
        } catch (e) {}

        onContainerResize(); // frame
        setStatus("✅ Loaded: " + name + " — Drag to rotate • Scroll to zoom.");
      },
      undefined,
      (err) => {
        console.warn("Failed to load", url, err);
        if (!triedFallback && name.toLowerCase().endsWith('.glb')) {
          // try .gltf as a fallback (some exports exist as .gltf + .bin)
          const alt = name.replace(/\.glb$/i, '.gltf');
          console.info("Retrying with fallback:", alt);
          attemptLoad(alt, true);
          return;
        }
        console.error(err);
        setStatus("❌ Model load error. Showing placeholder.");
        showPlaceholder();
      }
    );
  };

  try {
    attemptLoad(fileName);
  } catch (e) {
    console.error(e);
    setStatus("❌ Error loading model");
  }
}

// helper: test asset reachable before trying to load
async function testAsset(name) {
  try {
    const url = MODEL_DIR + encodeURIComponent(name) + "?v=9999";
    const res = await fetch(url, { method: 'HEAD' });
    return res && res.ok;
  } catch (e) {
    return false;
  }
}

// wire up buttons
const buttons = document.querySelectorAll(".model-btn");
buttons.forEach((btn) => {
  btn.addEventListener("click", async (ev) => {
    const target = ev.currentTarget;
    const file = target.dataset.model;
    buttons.forEach((b) => b.classList.remove("active"));
    target.classList.add("active");

    // prefer embedded model-viewer elements when available — no HEAD request needed
    if ((file === 'headset0.glb' && mvHeadset) || (file === 'self-portrait2.glb' && mvSelf)) {
      const success = await setModelViewerSrc(file);
      if (success) {
        // mark preview active on success
        const preview = document.querySelector('.model-preview[data-model="' + file + '"]');
        if (preview) {
          document.querySelectorAll('.model-preview').forEach(p => p.classList.remove('active'));
          preview.classList.add('active');
        }
        return;
      }
      // if model-viewer fails, fall back to Three.js loader
      setStatus('❌ model-viewer failed; attempting Three.js loader');
      loadModel(file);
      return;
    }

    // No embedded model-viewer; check asset reachability then load with Three.js
    setStatus('Checking asset…');
    const ok = await testAsset(file);
    if (!ok) {
      setStatus('❌ Asset unreachable: ' + file + '. Showing placeholder.');
      showPlaceholder();
      return;
    }

    loadModel(file);
  });
});

// wire up small preview boxes to set model-viewer src
const previewEls = document.querySelectorAll('.model-preview');
previewEls.forEach((el) => {
  el.addEventListener('click', async (ev) => {
    const file = el.dataset.model;
    document.querySelectorAll('.model-preview').forEach(p => p.classList.remove('active'));
    el.classList.add('active');

    // prefer embedded model-viewer elements when available — no HEAD request needed
    if ((file === 'headset0.glb' && mvHeadset) || (file === 'self-portrait2.glb' && mvSelf)) {
      const success = await setModelViewerSrc(file);
      if (!success) {
        setStatus('❌ model-viewer failed; attempting Three.js loader');
        loadModel(file);
      }
    } else {
      // No embedded model-viewer; check asset reachability first
      setStatus('Checking asset…');
      const ok = await testAsset(file);
      if (!ok) { setStatus('❌ Asset unreachable: ' + file); showPlaceholder(); return; }
      loadModel(file);
    }
  });
});





// model-viewer elements
const mvHeadset = document.getElementById('mv-headset');
const mvSelf = document.getElementById('mv-self');

function showModelViewerFor(file) {
  // map file -> element
  const map = {
    'headset0.glb': mvHeadset,
    'self-portrait2.glb': mvSelf,
  };
  const el = map[file];
  if (!el) return;
  // hide both
  [mvHeadset, mvSelf].forEach(m => { if (m) m.classList.add('mv-hidden'); });
  // show target
  el.classList.remove('mv-hidden');
  // update status
  setStatus('Loading ' + file + ' (model-viewer)…');
}

if (mvHeadset) {
  mvHeadset.addEventListener('load', () => {
    console.info('mv-headset: load');
    setStatus('✅ Headset loaded (model-viewer)');
  });
  mvHeadset.addEventListener('error', (e) => { console.error('mv-headset error', e); setStatus('❌ Headset model-viewer error'); });
}
if (mvSelf) {
  mvSelf.addEventListener('load', () => {
    console.info('mv-self: load');
    setStatus('✅ Self portrait loaded (model-viewer)');
  });
  mvSelf.addEventListener('error', (e) => { console.error('mv-self error', e); setStatus('❌ Self portrait model-viewer error'); });
}

// helper to set src with timeout + debug (targets the correct model-viewer element)
async function setModelViewerSrc(file) {
  // map file -> element
  const map = {
    'headset0.glb': mvHeadset,
    'self-portrait2.glb': mvSelf,
  };
  const mv = map[file];
  if (!mv) {
    console.warn('No model-viewer element for', file);
    return false;
  }

  // ensure element visible
  showModelViewerFor(file);

  // Always force a fresh fetch when switching to an embedded model-viewer (use cache-buster)
  // This avoids timing problems when the target element was hidden and didn't load previously.
  // We'll set the src below with a cache-buster and wait for the load event.

  console.info('setModelViewerSrc:', file);
  let loaded = false;

  const onLoad = () => { loaded = true; cleanup(); };
  const onError = (e) => { console.error('model-viewer error during setSrc', e); cleanup(); };
  const cleanup = () => {
    mv.removeEventListener('load', onLoad);
    mv.removeEventListener('error', onError);
  };

  mv.addEventListener('load', onLoad);
  mv.addEventListener('error', onError);

  // set src (model-viewer will fetch it). Add cache-buster to force a fresh fetch each time we switch.
  const srcUrl = MODEL_DIR + file + '?v=1&cb=' + Date.now();
  mv.setAttribute('src', srcUrl);
  // make sure Three.js canvas hidden
  const container = document.getElementById('three-container'); if (container) container.style.display = 'none';
  setStatus('Loading ' + file + ' (model-viewer)…');

  // wait up to 12s
  const start = Date.now();
  while (!loaded && Date.now() - start < 12000) {
    // poll for load
    // eslint-disable-next-line no-await-in-loop
    await new Promise(r => setTimeout(r, 200));
  }

  if (!loaded) {
    console.warn('model-viewer load timed out for', file);
    setStatus('❌ model-viewer load timed out for ' + file + '. Check console.');
    return false;
  }
  return true;
}

// initial model: prefer model-viewer for simplicity
const initial = 'headset0.glb';
// show the static element and let it load on its own
showModelViewerFor(initial);
// also run the helper to get timeout/logging
setModelViewerSrc(initial).then(ok => {
  if (ok) document.querySelector('.model-preview[data-model="' + initial + '"]')?.classList.add('active');
});

// --- previews: small auto-rotating canvases that load each model ---
// reuse the existing `previewEls` NodeList declared above

function createPreview(el, file) {
  const w = el.clientWidth || 140;
  const h = el.clientHeight || 100;

  const sceneP = new THREE.Scene();
  const camP = new THREE.PerspectiveCamera(40, w / h, 0.01, 1000);
  camP.position.set(0, 0.6, 1.8);

  const rendP = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendP.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  rendP.setSize(w, h, false);
  el.appendChild(rendP.domElement);

  sceneP.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dl = new THREE.DirectionalLight(0xffffff, 0.6);
  dl.position.set(3, 4, 5);
  sceneP.add(dl);

  let obj = null;

  // fit camera to object
  function fitToObject(o) {
    const box = new THREE.Box3().setFromObject(o);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    o.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (isFinite(maxDim) && maxDim > 0) {
      const fov = (camP.fov * Math.PI) / 180;
      let dist = (maxDim / 2) / Math.tan(fov / 2);
      dist *= 1.3;
      camP.position.set(0, maxDim * 0.2, dist);
      camP.updateProjectionMatrix();
    }
  }

  // load model for preview
  loader.load(
    MODEL_DIR + file + '?v=9999',
    (g) => {
      obj = g.scene;
      sceneP.add(obj);
      obj.traverse((n) => { if (n.isMesh && n.material) n.material.needsUpdate = true; });
      fitToObject(obj);
    },
    undefined,
    (err) => {
      console.warn('Preview load failed:', file, err);
    }
  );

  // animate preview (simple auto-rotate)
  function anim() {
    requestAnimationFrame(anim);
    if (obj) obj.rotation.y += 0.0125;
    rendP.render(sceneP, camP);
  }
  anim();

  // handle click -> select main viewer model
  el.addEventListener('click', async () => {
    previewEls.forEach(pe => pe.classList.remove('active'));
    el.classList.add('active');

    // sync main model buttons
    buttons.forEach((b) => {
      if (b.dataset.model === file) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // ensure asset reachable before loading
    setStatus('Checking asset…');
    const ok = await testAsset(file);
    if (!ok) {
      setStatus('❌ Asset unreachable: ' + file + '. Showing placeholder.');
      showPlaceholder();
      return;
    }

    loadModel(file);
  });

  // keyboard accessibility (Enter / Space)
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      el.click();
    }
  });

  return { el, renderer: rendP };
}

previewEls.forEach((el) => createPreview(el, el.dataset.model));
// mark initial preview active
const initPreview = document.querySelector('.model-preview[data-model="' + initial + '"]');
if (initPreview) initPreview.classList.add('active');

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  if (placeholder) placeholder.rotation.y += placeholder.userData.spin || 0.01;
  renderer.render(scene, camera);
}
animate();
