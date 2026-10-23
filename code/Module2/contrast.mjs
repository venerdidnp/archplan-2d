// WCAG relative luminance and contrast for the five plan categories, before
// and after the deuteranopia simulation matrix used by web/index.html.
import { CATEGORY_RGB } from './web/plan-core.mjs';

const MATRIX = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.011820, 0.042940, 0.968881],
];

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (c) => Math.min(1, Math.max(0, c));
const round8 = (rgb) => rgb.map((c) => Math.round(clamp01(c) * 255));
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => srgbToLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const hex = (rgb) => '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
const contrast = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

const simulate = (rgb) => {
  const linear = rgb.map((c) => srgbToLinear(c / 255));
  const out = MATRIX.map((row) => row.reduce((sum, m, i) => sum + m * linear[i], 0));
  return round8(out.map(linearToSrgb));
};

const rows = Object.entries(CATEGORY_RGB).map(([name, rgb]) => {
  const sim = simulate(rgb);
  return { name, rgb, sim, y: luminance(rgb), ySim: luminance(sim) };
});

console.log('category   normal RGB   normal Y   simulated RGB   simulated Y');
for (const r of rows) {
  console.log(
    `${r.name.padEnd(9)} ${hex(r.rgb)} ${r.rgb.join(',').padEnd(11)} ${r.y.toFixed(4)}   ` +
    `${hex(r.sim)} ${r.sim.join(',').padEnd(11)} ${r.ySim.toFixed(4)}`,
  );
}

for (const [label, key] of [['normal', 'y'], ['deuteranopia', 'ySim']]) {
  let min = { ratio: Infinity };
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const ratio = contrast(rows[i][key], rows[j][key]);
      if (ratio < min.ratio) min = { ratio, a: rows[i].name, b: rows[j].name };
    }
  }
  console.log(`min contrast ${label}: ${min.ratio.toFixed(2)}:1 (${min.a} vs ${min.b})`);
}
