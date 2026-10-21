// PSNR + simple global SSIM on framebuffers of equal size.
export function psnr(a, b) {
  let se = 0;
  for (let i = 0; i < a.data.length; i++) { const d = a.data[i] - b.data[i]; se += d * d; }
  const mse = se / a.data.length;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

export function ssimGlobal(a, b) {
  const n = a.w * a.h;
  const lum = (fb, i) => 0.299 * fb.data[3 * i] + 0.587 * fb.data[3 * i + 1] + 0.114 * fb.data[3 * i + 2];
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += lum(a, i); mb += lum(b, i); }
  ma /= n; mb /= n;
  let va = 0, vb = 0, cov = 0;
  for (let i = 0; i < n; i++) {
    const x = lum(a, i) - ma, y = lum(b, i) - mb;
    va += x * x; vb += y * y; cov += x * y;
  }
  va /= n; vb /= n; cov /= n;
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  return ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
}

export function diffStats(a, b) {
  if (a.w !== b.w || a.h !== b.h) throw new Error(`size mismatch ${a.w}x${a.h} vs ${b.w}x${b.h}`);
  let same = 0, maxDiff = 0;
  for (let i = 0; i < a.w * a.h; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[3 * i + c] - b.data[3 * i + c]));
    if (d === 0) same++;
    if (d > maxDiff) maxDiff = d;
  }
  return { same, total: a.w * a.h, maxDiff, psnr: psnr(a, b), ssim: ssimGlobal(a, b) };
}
