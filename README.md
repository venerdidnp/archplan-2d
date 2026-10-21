# archplan-2d

Eksperimen software rasterizer 2D sederhana dan penampil denah arsitektur (floor plan) menggunakan JavaScript dan WebGL (Three.js).

## Gambaran Proyek

Proyek ini bertujuan untuk mempelajari dasar-dasar rendering pipeline 2D:

1. **Software Rasterizer From-Scratch (`code/Module2/`):**
   - Menggambar garis manual menggunakan DDA dan Bresenham (`lineDDA`, `lineBresenham`).
   - Rasterisasi segitiga manual dengan pengujian edge function pusat pixel `(x+0.5, y+0.5)` dan aturan top-left watertight (`triangle`).
   - Interpolasi bobot barisentrik (`barycentric`).
   - Anti-aliasing garis Xiaolin Wu linear-light vs naive sRGB (`wu.mjs`).
   - Ekspor citra PPM (`raster.mjs`).

2. **Web Plan Viewer 2D (`web/`):**
   - Penampil denah arsitektur interaktif menggunakan Three.js (`viewer.mjs`, `index.html`).
   - Rendering outline polyline sebagai `THREE.Line` dan siluet tertutup sebagai `THREE.ShapeGeometry` (`THREE.Mesh`).
   - Legenda aksesibel 5-kategori dengan palet Viridis strictly monotonic dan bentuk marker unik SVG.
   - Simulasi deuteranopia realtime via filter SVG `feColorMatrix`.
   - Tombol ekspor PNG (`plan_three.png`).

## Quick Start & Menjalankan

```bash
# Pasang dependency (three dan serve)
npm install

# Jalankan rangkaian tes unit (15/15 lulus)
npm test

# Jalankan web server lokal untuk penampil denah
npx serve web
# Buka http://localhost:3000 (atau port yang ditampilkan)
```

## Status & Verifikasi

Verified: Microsoft Windows 11 Home Single Language 10.0.26200, Node v24.13.0, 2026-10-21.
- `git clone` -> `npm install` -> `npm test` -> `npx serve web` terverifikasi 100% lulus.
