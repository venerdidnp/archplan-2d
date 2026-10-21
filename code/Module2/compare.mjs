// node compare.mjs a.(ppm|png) b.(ppm|png)  -> % identical, PSNR, SSIM, writes out/diff.ppm (x6)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Framebuffer, readPPM, writePPM } from './raster.mjs';
import { diffStats } from './metrics.mjs';

function readPNG(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((v, i) => buf[i] === v)) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, ct = 0, bd = 0, il = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); bd = body[8]; ct = body[9]; il = body[12]; }
    else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  if (bd !== 8 || (ct !== 2 && ct !== 6) || il !== 0) throw new Error('PNG decode: only 8-bit RGB/RGBA non-interlaced supported');
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      let r;
      if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + b;
      else if (f === 3) r = v + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      out[y * stride + x] = r & 255;
    }
  }
  const fb = new Framebuffer(w, h);
  for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) fb.data[3 * i + c] = out[i * bpp + c];
  return fb;
}

export function readImage(path) {
  const buf = fs.readFileSync(path);
  return path.toLowerCase().endsWith('.png') ? readPNG(buf) : readPPM(buf);
}

if (process.argv[1].endsWith('compare.mjs')) {
  const [pa, pb] = process.argv.slice(2);
  if (!pa || !pb) { console.log('usage: node compare.mjs a.(ppm|png) b.(ppm|png)'); process.exit(1); }
  const a = readImage(pa), b = readImage(pb);
  console.log(`same size ${a.w}x${a.h}`);
  const s = diffStats(a, b);
  console.log(`identical pixels: ${s.same}/${s.total} (${(100 * s.same / s.total).toFixed(2)}%)  PSNR: ${s.psnr === Infinity ? 'inf' : s.psnr.toFixed(2)} dB`);
  console.log(`SSIM: ${s.ssim.toFixed(3)}  max |diff|: ${s.maxDiff}`);
  const d = new Framebuffer(a.w, a.h);
  for (let i = 0; i < a.data.length; i++) d.data[i] = Math.min(255, Math.abs(a.data[i] - b.data[i]) * 6);
  fs.mkdirSync('out', { recursive: true });
  writePPM('out/diff.ppm', d, fs);
  console.log('wrote out/diff.ppm (diff x6)');
}
