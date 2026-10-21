# Module 2 — Rendering Pipeline & Primitif 2D

Catatan kerja Lab 1 Modul 2. Semua angka di bawah diambil dari perintah yang benar-benar dijalankan pada mesin ini.

## Toolchain

Diperiksa: **2026-10-21** (Windows PowerShell 5.1).

| Komponen | Nilai | Perintah / bukti |
| --- | --- | --- |
| OS | Microsoft Windows 11 Home Single Language 10.0.26200 (64-bit) | `Get-CimInstance Win32_OperatingSystem` |
| Node.js | v24.13.0 | `node --version` |
| npm | 11.8.0 | `npm --version` |
| Three.js | 0.186.1 (pinned di `package.json`) | `npm ls three --depth=0` |
| Browser terdeteksi | Google Chrome 155.0.8059.85; Microsoft Edge 155.0.4283.62 | `(Get-Item <path>).VersionInfo` |
| Browser yang dipakai | Google Chrome 155.0.8059.85 / Edge 155.0.4283.62 | `(Get-Item <path>).VersionInfo` |
| Tanggal | 2026-10-21 | `Get-Date -Format 'yyyy-MM-dd'` |

Verified: Microsoft Windows 11 Home Single Language 10.0.26200, Node v24.13.0, 2026-10-21.
Clean clone test: `npm install` -> `npm test` (15/15 ok) -> `npx serve web` (HTTP 200).

## Denah (`myplan.json`)

- Nama bangunan: **TODO-USER**
- Sumber ukuran/foto/sketsa: **TODO-USER**
- Status: **belum dibuat** — menunggu ukuran asli; tidak ada angka yang ditebak.

Data minimum yang masih dibutuhkan:

1. Nama bangunan.
2. Ukuran luar (panjang × lebar, meter) atau sketsa/foto yang ada skalanya.
3. Letak dinding interior: dari dinding mana, berapa meter, dan arahnya.
4. Letak pintu masuk: di sisi mana, jarak dari sudut, dan lebar bukaan.
5. Kategori untuk tiap elemen (pilih dari: `dinding`, `cella`, `tangga`, `shrine`, `sumbu`).

Setelah data masuk, `myplan.json` dibuat dengan skema yang sama seperti `pusaka_plan.json` dan divalidasi:

- semua titik hasil `worldToScreen()` masuk ke canvas 800 × 600;
- polyline yang ditandai tertutup benar-benar kembali ke titik awal;
- tidak ada koordinat `NaN`;
- render dengan `node draw_plan.mjs --plan myplan.json --fill`.

## Pipeline untuk satu segmen dinding

**TODO-USER / menunggu `myplan.json`.** Tabel 7 tahap akan diisi dengan angka dari satu segmen nyata:

| Tahap | Nilai nyata |
| --- | --- |
| 1. Application (JSON, meter) | belum ada |
| 2. Vertex processing (`worldToScreen`) | belum ada |
| 3. Primitive assembly & clipping | belum ada |
| 4. Rasterisation (`lineBresenham`) | belum ada |
| 5. Fragment shading (warna kategori) | belum ada |
| 6. Per-fragment operations | belum ada |
| 7. Framebuffer → PPM | belum ada |

## Bacaan: satu perbedaan dari `raster.mjs`

Sumber yang dipilih: **OpenGL Wiki — Rasterization**
<https://wikis.khronos.org/opengl/Rasterization>

Ringkasan: rasterizer OpenGL memecah primitif menjadi **fragment** berdasarkan sample coverage, lalu menginterpolasi data per-vertex untuk tiap fragment; warna baru ditentukan oleh fragment shader dan diproses lagi oleh depth/stencil/blending. `raster.mjs` tidak punya objek fragment: `triangle()` menguji tiga edge function di pusat pixel lalu langsung menulis warna flat ke framebuffer.

Tiga poin untuk ditulis ulang dengan kata-katamu:

1. Di OpenGL, output rasterisasi adalah fragment (posisi + coverage + data terinterpolasi), bukan pixel berwarna.
2. Fragment shader menentukan warna; `raster.mjs` melewati tahap itu dan langsung memanggil `fb.set()`.
3. OpenGL mendukung coverage per-sample (multisampling) dan operasi per-fragment; `raster.mjs` memakai satu sampel per pixel tanpa depth/blending.

## Refleksi half-pixel: sumber dan outline

### Sumber resmi

- Microsoft Learn, **“Directly Mapping Texels to Pixels (Direct3D 9)”**
  <https://learn.microsoft.com/en-us/windows/win32/direct3d9/directly-mapping-texels-to-pixels>
  Metadata halaman: `ms.date: 2018-05-31`; `updated_at: 2025-03-11`.

### Sumber independen

- Aras Pranckevičius, **“Solving DX9 Half-Pixel Offset”**, 8 April 2016
  <https://aras-p.info/blog/2016/04/08/solving-dx9-half-pixel-offset/>

### Outline yang harus kamu jawab (jangan diisi asisten)

- **(a)** Nyatakan offset-nya dan di mana pusat pixel berada di Direct3D 9 versus Direct3D 10. **TODO-USER**
- **(b)** Tunjukkan baris persis di `raster.mjs` yang mengodekan konvensi pusat pixel, lalu jelaskan apa yang berubah jika sampel diambil di sudut pixel. **TODO-USER**
- **(c)** Jelaskan citra uji (blit checkerboard atau grid 1-pixel) yang membuat bug half-pixel terlihat, dan mengapa. **TODO-USER**
- **(d)** Sebutkan satu perubahan pada studi kasus modul ini yang akan menangkap bug tersebut. **TODO-USER**

Baris implementasi yang dimaksud:

```js
// raster.mjs:117
const px = x + 0.5, py = y + 0.5;                 // SAMPLE CENTRE
```

Baris 118–120 memakai `px, py` untuk mengevaluasi ketiga edge function. Tes E1 yang membandingkan aturan pusat (4 pixel) dengan aturan sudut (9 pixel) ada di `tests.mjs:75-82`.

## Prediksi forward vs backward (zoom 10×)

**TODO-USER** — tulis prediksimu di sini sebelum menjalankan `bench.mjs`. Jangan diisi oleh asisten.
