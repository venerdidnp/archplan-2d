import fs from 'node:fs';
import { Framebuffer, writePPM, lineBresenham } from './raster.mjs';

export function asteriskSpokes({ cx = 50, cy = 50, R = 40, count = 24 } = {}) {
  const spokes = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count;
    const end = [Math.round(cx + R * Math.cos(angle)), Math.round(cy + R * Math.sin(angle))];
    const pts = lineBresenham([cx, cy], end);
    spokes.push({
      i, angle, end, pts, length: pts.length,
      expected: Math.max(Math.abs(end[0] - cx), Math.abs(end[1] - cy)) + 1,
    });
  }
  return spokes;
}

export function drawSpokes(fb, spokes, rgb = [255, 255, 255]) {
  for (const s of spokes) for (const [x, y] of s.pts) fb.set(x, y, rgb);
}

if (process.argv[1]?.endsWith('asterisk.mjs')) {
  const W = 101, H = 101;
  const fb = new Framebuffer(W, H, [0, 0, 0]);
  const spokes = asteriskSpokes({ cx: 50, cy: 50, R: 40 });
  drawSpokes(fb, spokes);
  fs.mkdirSync('out', { recursive: true });
  writePPM('out/asterisk.ppm', fb, fs);
  const lens = spokes.map(s => s.length);
  console.log(`spokes: ${spokes.length}, centre (50,50), R=40, 15deg apart`);
  console.log(`lengths: ${lens.join(', ')}`);
  console.log(`min=${Math.min(...lens)} max=${Math.max(...lens)}`);
  console.log('per-spoke length == max(|dx|,|dy|)+1: ' +
    spokes.every(s => s.length === s.expected));
  console.log('wrote out/asterisk.ppm (101x101)');
}
