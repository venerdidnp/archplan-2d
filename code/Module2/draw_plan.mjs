// node draw_plan.mjs --w 800 --h 600 [--fill] [--plan myplan.json]
import fs from 'node:fs';
import { Framebuffer, writePPM } from './raster.mjs';
import { loadPlan, renderPlan } from './plan.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const w = +opt('--w', 800), h = +opt('--h', 600);
const planPath = opt('--plan', 'pusaka_plan.json');
const fill = args.includes('--fill');

const plan = loadPlan(planPath);
const fb = new Framebuffer(w, h, [245, 245, 245]);
const nseg = renderPlan(fb, plan, { fill });
fs.mkdirSync('out', { recursive: true });
writePPM('out/plan_scratch.ppm', fb, fs);
console.log(`${planPath}: ${plan.polylines.length} polylines, ${nseg} segments`);
console.log(`wrote out/plan_scratch.ppm (${w}x${h})${fill ? ' with silhouette fill' : ''}`);
