// plan.mjs — load the floor-plan JSON, convert world (metres, y UP) -> screen (pixels, y DOWN),
// and render it with raster.mjs. The y-flip happens ONLY in worldToScreen().
import fs from 'node:fs';
import { lineBresenham, triangle } from './raster.mjs';
import { CATEGORY_RGB, worldToScreen, screenSegments } from './web/plan-core.mjs';

export const loadPlan = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
export { CATEGORY_RGB, worldToScreen, screenSegments };

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
