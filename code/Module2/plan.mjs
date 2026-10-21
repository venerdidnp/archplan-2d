// plan.mjs — load the floor-plan JSON, convert world (metres, y UP) -> screen (pixels, y DOWN),
// and render it with raster.mjs. The y-flip happens ONLY in worldToScreen().
import fs from 'node:fs';
import { lineBresenham, triangle } from './raster.mjs';

export const loadPlan = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));

export const CATEGORY_RGB = {
  dinding: [68, 1, 84],     // viridis 5-step
  cella:   [59, 82, 139],
  tangga:  [33, 145, 140],
  shrine:  [94, 201, 98],
  sumbu:   [253, 231, 37],
};

// view = { w, h, zoom }. zoom is about the screen centre.
export function worldToScreen(plan, x, y, view = { w: 800, h: 600, zoom: 1 }) {
  const bx = plan.origin[0] + x * plan.scale;
  const by = plan.origin[1] - y * plan.scale;       // flip Y once, here
  const cx = view.w / 2, cy = view.h / 2;
  return [Math.round(cx + (bx - cx) * view.zoom), Math.round(cy + (by - cy) * view.zoom)];
}

export function screenSegments(plan, view) {
  const segs = [];
  for (const pl of plan.polylines) {
    const pts = pl.points.map(([x, y]) => worldToScreen(plan, x, y, view));
    for (let i = 0; i + 1 < pts.length; i++) segs.push({ a: pts[i], b: pts[i + 1], cat: pl.category });
  }
  return segs;
}

export function renderPlan(fb, plan, { fill = false, zoom = 1 } = {}) {
  const view = { w: fb.w, h: fb.h, zoom };
  if (fill) {
    for (const pl of plan.polylines) {
      if (!pl.fill) continue;
      const p = pl.points.slice(0, -1).map(([x, y]) => worldToScreen(plan, x, y, view));
      for (let i = 1; i + 1 < p.length; i++) triangle(fb, p[0], p[i], p[i + 1], [60, 60, 70]); // fan
    }
  }
  const segs = screenSegments(plan, view);
  for (const s of segs) {
    for (const [x, y] of lineBresenham(s.a, s.b)) fb.set(x, y, CATEGORY_RGB[s.cat] || [255, 255, 255]);
  }
  return segs.length;
}
