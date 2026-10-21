import fs from 'node:fs';
import { Framebuffer, writePPM, drawLine } from './raster.mjs';
import { lineWuPixels, drawLineWu } from './wu.mjs';

const A = [8, 8], B = [56, 32], C = [255, 255, 255];
const W = 64, H = 64;
const naive = new Framebuffer(W, H, [0, 0, 0]);
const linear = new Framebuffer(W, H, [0, 0, 0]);
drawLineWu(naive, A, B, C, { linear: false });
drawLineWu(linear, A, B, C, { linear: true });
fs.mkdirSync('out', { recursive: true });
writePPM('out/wu_naive.ppm', naive, fs);
writePPM('out/wu_linear.ppm', linear, fs);

const sample = lineWuPixels(A, B).find(([x, y, c]) => c > 0.2 && c < 0.8);
if (sample) {
  const [x, y, c] = sample;
  console.log(`sample pixel (${x},${y}) coverage=${c.toFixed(6)}`);
  console.log(`  naive sRGB blend : ${JSON.stringify(naive.get(x, y))}`);
  console.log(`  linear-light     : ${JSON.stringify(linear.get(x, y))}`);
}
console.log('wrote out/wu_naive.ppm and out/wu_linear.ppm (64x64)');

const BW = 800, BH = 600;
const benchFb = new Framebuffer(BW, BH, [0, 0, 0]);
const lines = [];
for (let i = 0; i < 500; i++) {
  const a = (i / 500) * Math.PI * 2;
  lines.push([[400, 300], [400 + Math.round(380 * Math.cos(a)), 300 + Math.round(280 * Math.sin(a))]]);
}

function medianMs(fn, reps = 15) {
  fn();
  const t = [];
  for (let r = 0; r < reps; r++) {
    const t0 = performance.now();
    fn();
    t.push(performance.now() - t0);
  }
  t.sort((a, b) => a - b);
  return t[Math.floor(t.length / 2)];
}

const bres = medianMs(() => { for (const [a, b] of lines) drawLine(benchFb, a, b, C); });
const wuLin = medianMs(() => { for (const [a, b] of lines) drawLineWu(benchFb, a, b, C, { linear: true }); });
const wuSrgb = medianMs(() => { for (const [a, b] of lines) drawLineWu(benchFb, a, b, C, { linear: false }); });
console.log(`\nbenchmark: ${lines.length} lines, ${BW}x${BH}, median of 15 runs`);
console.log(`  Bresenham          : ${bres.toFixed(2)} ms`);
console.log(`  Wu linear-light    : ${wuLin.toFixed(2)} ms  (${(wuLin / bres).toFixed(1)}x Bresenham)`);
console.log(`  Wu naive sRGB      : ${wuSrgb.toFixed(2)} ms  (${(wuSrgb / bres).toFixed(1)}x Bresenham)`);
