import fs from 'node:fs';
import { Framebuffer, writePPM } from './raster.mjs';

const W = 6, H = 6;
const centre = [], corner = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const px = x + 0.5, py = y + 0.5;
  if (px >= 1 && px < 3 && py >= 1 && py < 3) centre.push([x, y]);
  if (x >= 1 && x <= 3 && y >= 1 && y <= 3) corner.push([x, y]);
}
const cset = new Set(centre.map(p => p.join(',')));
const xset = new Set(corner.map(p => p.join(',')));
const extra = corner.filter(p => !cset.has(p.join(',')));

console.log(`centre rule: ${centre.length} pixels ${JSON.stringify(centre)}`);
console.log(`corner rule: ${corner.length} pixels ${JSON.stringify(corner)}`);
console.log(`extra (corner-only): ${extra.length} pixels ${JSON.stringify(extra)}`);
console.log('grid (C=centre, X=corner-only, .=none):');
for (let y = 0; y < H; y++) {
  let row = '';
  for (let x = 0; x < W; x++) {
    const k = x + ',' + y;
    row += cset.has(k) ? 'C' : xset.has(k) ? 'X' : '.';
  }
  console.log('  ' + row);
}

const fb = new Framebuffer(W, H, [0, 0, 0]);
for (const [x, y] of centre) fb.set(x, y, [255, 255, 255]);
for (const [x, y] of extra) fb.set(x, y, [255, 0, 0]);
fs.mkdirSync('out', { recursive: true });
writePPM('out/sample_centre.ppm', fb, fs);
console.log('wrote out/sample_centre.ppm (white=centre, red=extra corner-only)');
