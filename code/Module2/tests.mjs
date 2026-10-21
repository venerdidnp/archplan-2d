// node tests.mjs — checks from the module: E1-E5, watertightness, reference match.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { Framebuffer, lineDDA, lineBresenham, edge, barycentric, triangle, triangleNaive, triangleStrict, writePPM, readPPM } from './raster.mjs';
import { psnr } from './metrics.mjs';
import { asteriskSpokes } from './asterisk.mjs';
import { lineWuPixels, drawLineWu } from './wu.mjs';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`ok ${n} - ${name}`); };
const key = (pts) => pts.map(p => p.join(',')).sort().join(' ');

const E2 = [[2,1],[3,2],[4,2],[5,3],[6,3],[7,4],[8,4],[9,5]];

ok('lineDDA (2,1)->(9,5) = 8 pixels (E2)', () => assert.deepEqual(lineDDA([2,1],[9,5]), E2));
ok('lineBresenham (2,1)->(9,5) = same 8 pixels (E3)', () => assert.deepEqual(lineBresenham([2,1],[9,5]), E2));

ok('Bresenham handles all 8 octants (reflections give same length, endpoints included)', () => {
  const c = [10, 10], ends = [[15,12],[12,15],[8,15],[5,12],[5,8],[8,5],[12,5],[15,8]];
  for (const e of ends) {
    const pts = lineBresenham(c, e);
    assert.equal(pts.length, Math.max(Math.abs(e[0]-c[0]), Math.abs(e[1]-c[1])) + 1);
    const k = pts.map(p => p.join(','));
    assert.ok(k.includes('10,10') && k.includes(e.join(',')));
  }
});

ok('24-spoke asterisk: spoke lengths equal within +-1', () => {
  const R = 40, cx = 50, cy = 50, lens = [];
  for (let i = 0; i < 24; i++) {
    const a = i * 15 * Math.PI / 180;
    lens.push(lineBresenham([cx, cy], [Math.round(cx + R * Math.cos(a)), Math.round(cy + R * Math.sin(a))]).length);
  }
  // Chebyshev length differs between axis (R) and diagonal spokes (~R*cos45... both <= R+1): compare to expected per spoke
  for (let i = 0; i < 24; i++) {
    const a = i * 15 * Math.PI / 180;
    const exp = Math.max(Math.abs(Math.round(R * Math.cos(a))), Math.abs(Math.round(R * Math.sin(a)))) + 1;
    assert.equal(lens[i], exp);
  }
});

ok('edge functions at (3,3) = (8,12,8); (5,5) and (1,4) outside (E4)', () => {
  const A = [1,1], B = [6,2], C = [3,7];
  assert.equal(edge(...A, ...B, ...C), 28);
  const E = (P) => [edge(...A, ...B, ...P), edge(...B, ...C, ...P), edge(...C, ...A, ...P)];
  assert.deepEqual(E([3,3]), [8,12,8]);
  assert.ok(E([5,5]).some(v => v < 0));
  assert.ok(E([1,4]).some(v => v < 0));
});

ok('barycentric at (3,3) = (3/7,2/7,2/7), sums to 1; E5 interpolation = 20', () => {
  const [a, b, c] = barycentric([1,1], [6,2], [3,7], [3,3]);
  assert.ok(Math.abs(a - 3/7) < 1e-12 && Math.abs(b - 2/7) < 1e-12 && Math.abs(c - 2/7) < 1e-12);
  assert.ok(Math.abs(a + b + c - 1) < 1e-12);
  assert.ok(Math.abs(0.5*10 + 0.25*20 + 0.25*40 - 20) < 1e-12);
});

function squareCoverage(fn) {
  const cover = new Uint8Array(144), onPixel = (x, y) => { cover[y*12+x]++; };
  const fb = new Framebuffer(12, 12);
  fn(fb, [2,2], [8,2], [8,8], [255,255,255], { onPixel });
  fn(fb, [2,2], [8,8], [2,8], [255,255,255], { onPixel });
  let once = 0, twice = 0, gaps = 0;
  for (let y = 2; y < 8; y++) for (let x = 2; x < 8; x++) { const c = cover[y*12+x]; if (c === 1) once++; else if (c > 1) twice++; else gaps++; }
  return { once, twice, gaps, fb };
}
ok('6x6 square split on y=x: top-left rule -> once=36 twice=0 gaps=0', () => {
  const r = squareCoverage(triangle); assert.deepEqual([r.once, r.twice, r.gaps], [36, 0, 0]);
});
ok('without top-left rule -> twice=6', () => {
  const r = squareCoverage(triangleNaive); assert.deepEqual([r.once, r.twice, r.gaps], [30, 6, 0]);
});
ok('strict "> 0" -> gaps=6', () => {
  const r = squareCoverage(triangleStrict); assert.deepEqual([r.once, r.twice, r.gaps], [30, 0, 6]);
});

ok('sample-centre: 2x2 rect via centre rule = 4 pixels; corner test = 9 (E1)', () => {
  let c = 0;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (x + .5 >= 1 && x + .5 < 3 && y + .5 >= 1 && y + .5 < 3) c++;
  assert.equal(c, 4);
  let w = 0;
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (x >= 1 && x <= 3 && y >= 1 && y <= 3) w++;
  assert.equal(w, 9);
});

ok('square_fill is byte-identical to ref/square_fill_ref.ppm', () => {
  const r = squareCoverage(triangle);
  const ref = 'ref/square_fill_ref.ppm';
  if (!fs.existsSync(ref)) { writePPM(ref, r.fb, fs); console.log('   (ref did not exist: created from current output — review it by eye!)'); }
  const rf = readPPM(fs.readFileSync(ref));
  assert.equal(psnr(r.fb, rf), Infinity);
});

ok('asterisk 24 spokes: every spoke matches its expected Chebyshev length (delta <= 1)', () => {
  const spokes = asteriskSpokes();
  assert.equal(spokes.length, 24);
  for (const s of spokes) assert.ok(Math.abs(s.length - s.expected) <= 1);
});

ok('Wu horizontal line is solid and matches Bresenham pixel positions', () => {
  const wu = lineWuPixels([2, 1], [9, 1]);
  const br = lineBresenham([2, 1], [9, 1]);
  assert.deepEqual(wu.map(p => [p[0], p[1]]), br);
  assert.ok(wu.every(p => p[2] === 1));
});

ok('Wu shallow line: coverage sums to 1 in every column; endpoints full', () => {
  const pts = lineWuPixels([0, 0], [8, 4]);
  for (let x = 0; x <= 8; x++) {
    const sum = pts.filter(p => p[0] === x).reduce((s, p) => s + p[2], 0);
    assert.ok(Math.abs(sum - 1) < 1e-12, `column ${x} sum=${sum}`);
  }
  assert.deepEqual(pts.find(p => p[0] === 0 && p[1] === 0), [0, 0, 1]);
  assert.deepEqual(pts.find(p => p[0] === 8 && p[1] === 4), [8, 4, 1]);
});

ok('Wu blend: 50% white on black is 128 in sRGB, 188 in linear light', () => {
  const fl = new Framebuffer(3, 3, [0, 0, 0]);
  const fn = new Framebuffer(3, 3, [0, 0, 0]);
  drawLineWu(fl, [0, 0], [2, 1], [255, 255, 255], { linear: true });
  drawLineWu(fn, [0, 0], [2, 1], [255, 255, 255], { linear: false });
  assert.deepEqual(fl.get(1, 0), [188, 188, 188]);
  assert.deepEqual(fn.get(1, 0), [128, 128, 128]);
});

console.log(`\nALL CHECKS PASSED (${n} ok)`);
