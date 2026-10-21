// node draw_square.mjs --mode outline|fill [--no-top-left] [--strict-greater]
// Worked example: 6x6 square, corners (2,2)-(8,8), on a 12x12 framebuffer.
import fs from 'node:fs';
import { Framebuffer, writePPM, lineBresenham, triangle } from './raster.mjs';

const args = process.argv.slice(2);
const mode = args[args.indexOf('--mode') + 1] || 'fill';
const noTL = args.includes('--no-top-left'), strict = args.includes('--strict-greater');
const W = 12, H = 12, fb = new Framebuffer(W, H, [0, 0, 0]);
fs.mkdirSync('out', { recursive: true });

if (mode === 'outline') {
  const P = [[2, 2], [8, 2], [8, 8], [2, 8]];
  const lit = new Set();
  for (let i = 0; i < 4; i++) {
    for (const [x, y] of lineBresenham(P[i], P[(i + 1) % 4])) { fb.set(x, y, [255, 255, 255]); lit.add(x + ',' + y); }
  }
  console.log('4 segments (top, right, bottom, left) via lineBresenham()');
  console.log(`pixels lit: ${lit.size}`);
  writePPM('out/square_outline.ppm', fb, fs);
  console.log('wrote out/square_outline.ppm');
} else {
  const cover = new Uint8Array(W * H);
  const onPixel = (x, y) => { cover[y * W + x]++; };
  const o = { topLeft: !noTL, strict, onPixel };
  triangle(fb, [2, 2], [8, 2], [8, 8], [255, 255, 255], o);
  triangle(fb, [2, 2], [8, 8], [2, 8], [255, 255, 255], o);
  let once = 0, twice = 0, gaps = 0, lit = 0;
  for (let y = 2; y < 8; y++) for (let x = 2; x < 8; x++) {
    const c = cover[y * W + x];
    if (c === 1) once++; else if (c >= 2) twice++; else gaps++;
  }
  for (const c of cover) if (c > 0) lit++;
  console.log(`2 triangles, edge functions + ${noTL ? 'NO top-left rule' : strict ? 'strict > 0' : 'top-left rule'}`);
  console.log(`coverage: ${lit} pixels, once = ${once}, twice = ${twice}, gaps = ${gaps}`);
  writePPM('out/square_fill.ppm', fb, fs);
  console.log('wrote out/square_fill.ppm');
}
