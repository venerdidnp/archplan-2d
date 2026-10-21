export const CATEGORY_RGB = {
  dinding: [68, 1, 84],
  cella:   [59, 82, 139],
  tangga:  [33, 145, 140],
  shrine:  [94, 201, 98],
  sumbu:   [253, 231, 37],
};

export function worldToScreen(plan, x, y, view = { w: 800, h: 600, zoom: 1 }) {
  const bx = plan.origin[0] + x * plan.scale;
  const by = plan.origin[1] - y * plan.scale;
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
