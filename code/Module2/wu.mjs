export function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(v) {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * (v ** (1 / 2.4)) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

export function lineWuPixels(A, B) {
  let [x0, y0] = A, [x1, y1] = B;
  if (x0 === x1 && y0 === y1) return [[x0, y0, 1]];
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (steep) { [x0, y0] = [y0, x0]; [x1, y1] = [y1, x1]; }
  if (x0 > x1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0]; }
  const dx = x1 - x0, dy = y1 - y0;
  const gradient = dx === 0 ? 0 : dy / dx;
  const out = [];
  const plot = (x, y, c) => {
    if (c <= 0) return;
    out.push(steep ? [y, x, c] : [x, y, c]);
  };
  for (let x = Math.round(x0); x <= Math.round(x1); x++) {
    const y = y0 + gradient * (x - x0);
    const iy = Math.floor(y);
    const f = y - iy;
    if (f === 0) plot(x, iy, 1);
    else { plot(x, iy, 1 - f); plot(x, iy + 1, f); }
  }
  return out;
}

export function drawLineWu(fb, A, B, rgb, { linear = true } = {}) {
  const src = [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])];
  for (const [x, y, c] of lineWuPixels(A, B)) {
    if (x < 0 || y < 0 || x >= fb.w || y >= fb.h) continue;
    const dst = fb.get(x, y);
    const out = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      out[i] = linear
        ? linearToSrgb(src[i] * c + srgbToLinear(dst[i]) * (1 - c))
        : Math.round(rgb[i] * c + dst[i] * (1 - c));
    }
    fb.set(x, y, out);
  }
}
