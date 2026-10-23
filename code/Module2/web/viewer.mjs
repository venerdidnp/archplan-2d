import * as THREE from './vendor/three.module.js';
import { CATEGORY_RGB, worldToScreen, screenSegments } from './plan-core.mjs';

const W = 800;
const H = 600;
const VIEW = { w: W, h: H, zoom: 1 };
const FALLBACK = 'pusaka_plan.json';

const canvas = document.querySelector('#plan-canvas');
const status = document.querySelector('#plan-status');
const cvdToggle = document.querySelector('#cvd-toggle');
const exportButton = document.querySelector('#export-button');
const viz = document.querySelector('#viz');
const params = new URLSearchParams(location.search);
const exportMode = params.has('export');

if (exportMode) {
  document.documentElement.classList.add('export-mode');
  document.body.classList.add('export-mode');
  cvdToggle.checked = false;
  viz.classList.remove('cvd');
}

THREE.ColorManagement.enabled = false;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0xf5f5f5, 1);
} catch (error) {
  status.textContent = `WebGL tidak tersedia: ${error.message}`;
  throw error;
}

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, W, 0, H, 0.1, 100);
camera.position.set(0, 0, 10);
camera.updateProjectionMatrix();

let content = new THREE.Group();
scene.add(content);

function colorFromRGB([r, g, b]) {
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

// raster.mjs lights pixel (x, y) by sampling its centre (x + 0.5, y + 0.5).
// WebGL rasterises against pixel boundaries, so a vertex left at (x, y) sits
// exactly between two pixel centres and the 1 px line spills into both rows
// or columns. Shift every screen point by half a pixel to share the sample
// convention used by raster.mjs.
const toPixelCentre = ([x, y]) => [x + 0.5, y + 0.5];

function clearContent() {
  scene.remove(content);
  content.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) object.material.dispose();
  });
  content = new THREE.Group();
  scene.add(content);
}

function makeOutline(points, rgb) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
  );
  const material = new THREE.LineBasicMaterial({
    color: colorFromRGB(rgb),
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 1;
  return line;
}

function makeSilhouette(points) {
  if (points.length < 3) return null;
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color: colorFromRGB([60, 60, 70]),
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 0;
  return mesh;
}

function drawPlan(plan) {
  clearContent();

  for (const polyline of plan.polylines) {
    if (!polyline.fill) continue;
    const points = polyline.points
      .slice(0, -1)
      .map(([x, y]) => worldToScreen(plan, x, y, VIEW))
      .map(toPixelCentre);
    const mesh = makeSilhouette(points);
    if (mesh) content.add(mesh);
  }

  for (const polyline of plan.polylines) {
    if (polyline.points.length < 2) continue;
    const points = polyline.points
      .map(([x, y]) => worldToScreen(plan, x, y, VIEW))
      .map(toPixelCentre);
    const rgb = CATEGORY_RGB[polyline.category] || [255, 255, 255];
    content.add(makeOutline(points, rgb));
  }

  renderer.render(scene, camera);
}

async function loadPlanData() {
  const requested = params.get('plan');
  const allowed = requested === 'myplan.json' || requested === FALLBACK
    ? requested
    : 'myplan.json';
  const candidates = allowed === FALLBACK ? [FALLBACK] : [allowed, FALLBACK];

  for (const name of candidates) {
    try {
      const response = await fetch(`./${name}`, { cache: 'no-store' });
      if (!response.ok) continue;
      return { name, plan: await response.json() };
    } catch (error) {
      console.warn(`Gagal memuat ${name}:`, error);
    }
  }

  throw new Error('Tidak ada denah yang bisa dimuat. Tambahkan web/myplan.json atau web/pusaka_plan.json.');
}

function updateStatus(source, plan) {
  const segments = screenSegments(plan, VIEW).length;
  const fallback = source === FALLBACK;
  status.textContent = `Sumber: ${source}${fallback ? ' (fallback)' : ''} · ${plan.polylines.length} polylines · ${segments} segmen`;
  status.dataset.source = source;
  canvas.setAttribute(
    'aria-label',
    `Denah lantai Pusaka3D dari ${source}: ${plan.polylines.length} polylines, ${segments} segmen`,
  );
}

function exportPNG() {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.download = 'plan_three.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
}

cvdToggle.addEventListener('change', () => {
  viz.classList.toggle('cvd', cvdToggle.checked);
});

exportButton.addEventListener('click', exportPNG);

loadPlanData()
  .then(({ name, plan }) => {
    updateStatus(name, plan);
    drawPlan(plan);
    window.__planViewer = { renderer, scene, camera, plan, source: name };
    window.__planReady = true;
  })
  .catch((error) => {
    status.textContent = error.message;
    console.error(error);
  });
