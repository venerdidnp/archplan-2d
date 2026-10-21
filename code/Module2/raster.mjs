// raster.mjs — rasteriser from scratch (plain JS, no framework, no <canvas>).
//
// CONVENTION (do not mix another in):
//   * y is DOWN (screen space). Pixel (x, y) is sampled at its CENTRE (x+0.5, y+0.5).
//   * Triangle vertices are given so that total = edge(A,B,C) > 0
//     (triangle() auto-flips B<->C if not).
//   * "inside" = all three edge functions > 0, or == 0 on a top/left edge
//     (the top-left rule decides the exactly-on-edge case).

export class Framebuffer {
  constructor(w, h, bg = [0, 0, 0]) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 3);
    this.clear(bg);
  }
  clear(bg) {
    for (let i = 0; i < this.w * this.h; i++) {
      this.data[3 * i] = bg[0]; this.data[3 * i + 1] = bg[1]; this.data[3 * i + 2] = bg[2];
    }
  }
  set(x, y, rgb) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = 3 * (y * this.w + x);
    this.data[i] = rgb[0]; this.data[i + 1] = rgb[1]; this.data[i + 2] = rgb[2];
  }
  get(x, y) {
    const i = 3 * (y * this.w + x);
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }
}

// ---------------------------------------------------------------- lines

// DDA: step along the longer axis by 1, the other by the slope, round.
export function lineDDA(A, B) {
  const [x0, y0] = A, [x1, y1] = B;
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const pts = [];
  if (steps === 0) return [[x0, y0]];
  const ix = dx / steps, iy = dy / steps;
  for (let k = 0; k <= steps; k++) {
    pts.push([Math.round(x0 + k * ix), Math.round(y0 + k * iy)]);
  }
  return pts;
}

// Bresenham, integer only, all 8 octants:
//  * steep line  -> swap x/y, run the shallow algorithm, swap back
//  * x0 > x1     -> swap endpoints (so the pixel ORDER may be reversed)
//  * dy < 0      -> y steps by -1
export function lineBresenham(A, B) {
  let [x0, y0] = A, [x1, y1] = B;
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  if (steep) { [x0, y0] = [y0, x0]; [x1, y1] = [y1, x1]; }
  if (x0 > x1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0]; }
  const dx = x1 - x0;
  let dy = y1 - y0;
  const ystep = dy < 0 ? -1 : 1;
  dy = Math.abs(dy);
  let D = 2 * dy - dx;            // decision variable (integer)
  let y = y0;
  const pts = [];
  for (let x = x0; x <= x1; x++) {
    pts.push(steep ? [y, x] : [x, y]);
    if (D > 0) { y += ystep; D += 2 * (dy - dx); }
    else { D += 2 * dy; }
  }
  return pts;
}

export function drawLine(fb, A, B, rgb, fn = lineBresenham) {
  for (const [x, y] of fn(A, B)) fb.set(x, y, rgb);
}

// ------------------------------------------------------------ triangles

export const edge = (ax, ay, bx, by, px, py) =>
  (bx - ax) * (py - ay) - (by - ay) * (px - ax);

// Top-left ownership for edge X->Y under y-down and total > 0.
// With this orientation the interior lies below a TOP edge (horizontal, dx > 0)
// and to the right of a LEFT edge (it runs UP the screen, dy < 0).
export const isTopLeft = (xx, xy, yx, yy) => {
  const dx = yx - xx, dy = yy - xy;
  return (dy === 0 && dx > 0) || dy < 0;
};

export function barycentric(A, B, C, P) {
  const total = edge(A[0], A[1], B[0], B[1], C[0], C[1]);
  const lA = edge(B[0], B[1], C[0], C[1], P[0], P[1]) / total;
  const lB = edge(C[0], C[1], A[0], A[1], P[0], P[1]) / total;
  const lC = edge(A[0], A[1], B[0], B[1], P[0], P[1]) / total;
  return [lA, lB, lC];
}

// options: topLeft (default true), strict (use > 0 only), autoFlip, onPixel(x,y)
export function triangle(fb, A, B, C, rgb, opts = {}) {
  const { topLeft = true, strict = false, autoFlip = true, onPixel = null } = opts;
  const total = edge(A[0], A[1], B[0], B[1], C[0], C[1]);
  if (total === 0) return;
  if (total < 0) {
    if (!autoFlip) return;
    [B, C] = [C, B];
  }
  const w = fb ? fb.w : opts.w, h = fb ? fb.h : opts.h;
  const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
  const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
  const tlBC = isTopLeft(B[0], B[1], C[0], C[1]);
  const tlCA = isTopLeft(C[0], C[1], A[0], A[1]);
  const tlAB = isTopLeft(A[0], A[1], B[0], B[1]);
  const ok = (e, tl) => (strict ? e > 0 : topLeft ? (e > 0 || (e === 0 && tl)) : e >= 0);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;                 // SAMPLE CENTRE
      const eA = edge(B[0], B[1], C[0], C[1], px, py);  // ~ lambda_A
      const eB = edge(C[0], C[1], A[0], A[1], px, py);  // ~ lambda_B
      const eC = edge(A[0], A[1], B[0], B[1], px, py);  // ~ lambda_C
      if (ok(eA, tlBC) && ok(eB, tlCA) && ok(eC, tlAB)) {
        if (fb) fb.set(x, y, rgb);
        if (onPixel) onPixel(x, y);
      }
    }
  }
}

// naive version: "inside if all E >= 0", no top-left rule -> double-drawn shared edges
export const triangleNaive = (fb, A, B, C, rgb, o = {}) =>
  triangle(fb, A, B, C, rgb, { ...o, topLeft: false });
// strict version: "inside if all E > 0" -> cracks on shared edges
export const triangleStrict = (fb, A, B, C, rgb, o = {}) =>
  triangle(fb, A, B, C, rgb, { ...o, strict: true });

// ------------------------------------------------------------ PPM I/O

export function writePPM(path, fb, fs) {
  const head = Buffer.from(`P6\n${fb.w} ${fb.h}\n255\n`);
  fs.writeFileSync(path, Buffer.concat([head, Buffer.from(fb.data.buffer, fb.data.byteOffset, fb.data.length)]));
}

export function readPPM(buf) {
  let pos = 0;
  const token = () => {
    while (buf[pos] === 0x20 || buf[pos] === 0x0a || buf[pos] === 0x0d || buf[pos] === 0x09) pos++;
    if (buf[pos] === 0x23) { while (buf[pos] !== 0x0a) pos++; return token(); }
    let s = '';
    while (pos < buf.length && ![0x20, 0x0a, 0x0d, 0x09].includes(buf[pos])) s += String.fromCharCode(buf[pos++]);
    return s;
  };
  if (token() !== 'P6') throw new Error('not a P6 PPM');
  const w = +token(), h = +token(); token();
  pos++;
  const fb = new Framebuffer(w, h);
  fb.data.set(buf.subarray(pos, pos + w * h * 3));
  return fb;
}
