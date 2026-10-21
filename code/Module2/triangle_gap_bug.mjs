// Diagnose-and-fix: a quad drawn as two triangles. Count coverage per pixel.
import { Framebuffer, triangle, triangleNaive, triangleStrict } from './raster.mjs';

const W = 16, H = 16;
// a quad with a DIAGONAL shared edge (not axis-aligned, so pixel centres hit the edge exactly)
const Q = [[1, 1], [13, 1], [13, 13], [1, 13]];

function coverage(fn) {
  const cover = new Uint8Array(W * H);
  const onPixel = (x, y) => { cover[y * W + x]++; };
  const fb = new Framebuffer(W, H);
  fn(fb, Q[0], Q[1], Q[2], [255, 255, 255], { onPixel });
  fn(fb, Q[0], Q[2], Q[3], [255, 255, 255], { onPixel });
  let once = 0, twice = 0, gaps = 0;
  const doubles = [], holes = [];
  for (let y = 1; y < 13; y++) for (let x = 1; x < 13; x++) {
    const c = cover[y * W + x];
    if (c === 1) once++; else if (c > 1) { twice++; doubles.push([x, y]); } else { gaps++; holes.push([x, y]); }
  }
  return { once, twice, gaps, doubles, holes, cover };
}
const show = (name, r) => {
  console.log(`${name}: once=${r.once} twice=${r.twice} gaps=${r.gaps}`);
  if (r.doubles.length) console.log('  double-drawn:', JSON.stringify(r.doubles));
  if (r.holes.length) console.log('  gaps:', JSON.stringify(r.holes));
};
show('naive  (E >= 0, no rule)', coverage(triangleNaive));
show('strict (E >  0)         ', coverage(triangleStrict));
const fixed = coverage(triangle);
show('fixed  (top-left rule)  ', fixed);
console.log('coverage image (fixed):');
for (let y = 1; y < 13; y++) {
  let row = '';
  for (let x = 1; x < 13; x++) row += fixed.cover[y * W + x] === 1 ? '#' : fixed.cover[y * W + x] > 1 ? '2' : '.';
  console.log('  ' + row);
}
