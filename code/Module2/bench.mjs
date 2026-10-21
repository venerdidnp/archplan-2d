// Forward (rasterise the polylines) vs backward (for each pixel, distance-test every segment).
import { Framebuffer, lineBresenham } from './raster.mjs';
import { loadPlan, screenSegments, CATEGORY_RGB } from './plan.mjs';

const plan = loadPlan(process.argv[2] || 'pusaka_plan.json');
const W = 800, H = 600;

function forward(zoom) {
  const fb = new Framebuffer(W, H, [245, 245, 245]);
  for (const s of screenSegments(plan, { w: W, h: H, zoom }))
    for (const [x, y] of lineBresenham(s.a, s.b)) fb.set(x, y, CATEGORY_RGB[s.cat]);
  return fb;
}

function backward(zoom) {
  const fb = new Framebuffer(W, H, [245, 245, 245]);
  const segs = screenSegments(plan, { w: W, h: H, zoom });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5, py = y + 0.5;
    for (const s of segs) {
      const [ax, ay] = s.a, [bx, by] = s.b;
      const vx = bx - ax, vy = by - ay, len2 = vx * vx + vy * vy;
      let t = len2 === 0 ? 0 : ((px - ax) * vx + (py - ay) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
      if (dx * dx + dy * dy <= 0.5 * 0.5 + 0.25) { fb.set(x, y, CATEGORY_RGB[s.cat]); break; }
    }
  }
  return fb;
}

function time(fn, zoom, reps) {
  fn(zoom); // warm-up
  const t = [];
  for (let i = 0; i < reps; i++) { const t0 = performance.now(); fn(zoom); t.push(performance.now() - t0); }
  t.sort((a, b) => a - b);
  return t[Math.floor(t.length / 2)];
}

console.log(`segments: ${screenSegments(plan, { w: W, h: H, zoom: 1 }).length}, framebuffer ${W}x${H}`);
console.log('zoom | forward ms | backward ms | backward/forward');
for (const z of [1, 10]) {
  const f = time(forward, z, 15), b = time(backward, z, 3);
  console.log(`${String(z).padStart(3)}x | ${f.toFixed(2).padStart(10)} | ${b.toFixed(1).padStart(11)} | ${(b / f).toFixed(0)}x`);
}
