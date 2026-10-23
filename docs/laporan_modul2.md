# Laporan Tugas Analisis Modul 2: Rendering Pipeline & Primitif 2D

**Mata Kuliah:** Komputasi Visual / Grafika Komputer  
**Repositori:** [archplan-2d (GitHub)](https://github.com/venerdidnp/archplan-2d)  
**Lingkungan Eksekusi:** Windows 11 Home (Build 10.0.26200), Node.js v24.13.0, Three.js 0.186.1  
**Tanggal Verifikasi:** 22 Oktober 2026  

---

## Daftar Isi
1. [Input & Penempatan Pipeline](#1-input--penempatan-pipeline)
2. [Primitif From-Scratch & Kecocokan Referensi](#2-primitif-from-scratch--kecocokan-referensi)
3. [Diagnosis-dan-Perbaiki](#3-diagnosis-dan-perbaiki)
4. [Render Pustaka & Diff Pixel](#4-render-pustaka--diff-pixel)
5. [Keputusan Forward/Backward](#5-keputusan-forwardbackward)
6. [Aksesibilitas](#6-aksesibilitas)
7. [Keterbatasan](#7-keterbatasan)
8. [Reproducibility](#8-reproducibility)

---

## 1. Input & Penempatan Pipeline

### 1.1 Berkas Masukan Denah (`myplan.json`)

Berkas masukan denah arsitektur disimpan dalam format terstruktur JSON (`code/Module2/myplan.json` dan `web/myplan.json`) yang mendefinisikan geometri bangunan cagar budaya/arsitektur dalam koordinat dunia (satuan meter, sistem koordinat Kartesian dengan sumbu $y$ mengarah ke atas).

```json
{
  "name": "Candi Induk Pusaka",
  "units": "meter",
  "scale": 15,
  "origin": [100, 520],
  "polylines": [
    { "label": "dinding luar", "category": "dinding", "fill": true,
      "points": [[0,0],[40,0],[40,30],[0,30],[0,0]] },
    { "label": "cella dalam", "category": "cella",
      "points": [[12,8],[28,8],[28,22],[12,22],[12,8]] },
    { "label": "tangga masuk", "category": "tangga",
      "points": [[16,0],[16,-4],[24,-4],[24,0]] },
    { "label": "shrine barat-daya", "category": "shrine",
      "points": [[2,2],[6,2],[6,6],[2,6],[2,2]] },
    { "label": "shrine tenggara", "category": "shrine",
      "points": [[34,2],[38,2],[38,6],[34,6],[34,2]] },
    { "label": "shrine barat-laut", "category": "shrine",
      "points": [[2,24],[6,24],[6,28],[2,28],[2,24]] },
    { "label": "shrine timur-laut", "category": "shrine",
      "points": [[34,24],[38,24],[38,28],[34,28],[34,24]] },
    { "label": "sumbu utama", "category": "sumbu",
      "points": [[20,-4],[20,30]] }
  ]
}
```

> **Catatan Konfigurasi:**
> - `scale = 15`: Setiap 1 meter di dunia nyata dipetakan menjadi 15 pixel pada resolusi layar standar.
> - `origin = [100, 520]`: Posisi titik $(0,0)$ meter dipetakan ke koordinat dasar pixel $(100, 520)$ pada framebuffer $800 \times 600$.

---

### 1.2 Walk-Through Pipeline 7 Tahap untuk Satu Segmen Nyata

Sebagai studi kasus walk-through, dipilih **segmen pertama dari dinding luar**: garis dari titik $A(0, 0)$ meter ke titik $B(40, 0)$ meter dengan kategori `"dinding"`.

| Tahap Pipeline | Fungsi / Mekanisme | Input | Transformasi / Logika | Nilai Keluaran Nyata |
| :--- | :--- | :--- | :--- | :--- |
| **1. Application Stage** | Pembacaan model denah dari JSON (`plan.mjs`) | Berkas `myplan.json` | Parsing titik batas poligon dalam koordinat meter ($y$ UP). | Segmen garis $A(0, 0) \to B(40, 0)$ meter; kategori: `dinding`. |
| **2. Vertex Processing** | Transformasi ruang dunia ke layar (`worldToScreen`) | Koordinat dunia $(x, y)$, parameter denah & viewport | Proyeksi Kartesian ($y$ UP) ke raster ($y$ DOWN):<br>$b_x = \text{origin}_x + x \cdot \text{scale}$<br>$b_y = \text{origin}_y - y \cdot \text{scale}$<br>$p_x = \text{round}(c_x + (b_x - c_x) \cdot \text{zoom})$<br>$p_y = \text{round}(c_y + (b_y - c_y) \cdot \text{zoom})$ | Titik layar integer:<br>$A_{\text{screen}} = [100, 520]$<br>$B_{\text{screen}} = [700, 520]$ |
| **3. Primitive Assembly & Clipping** | Perakitan primitif garis & frustum culling (`screenSegments`) | Vertex terproyeksi $A_{\text{screen}}$ dan $B_{\text{screen}}$ | Perakitan segmen 2D; uji batas terhadap canvas $800 \times 600$ ($x \in [0, 799], y \in [0, 599]$). Bounding box segmen $[100, 520] \dots [700, 520]$. | *Trivial Accept* (lolos penuh); segmen utuh diteruskan ke rasterizer. |
| **4. Rasterisation** | Konversi garis vektor ke pixel diskrit (`lineBresenham`) | Endpoint integer $A[100, 520]$ dan $B[700, 520]$ | Algoritma Bresenham integer.<br>$\Delta x = 600, \Delta y = 0$. Garis horizontal murni (sumbu utama $x$, $\text{ystep}=1$). | Himpunan 601 koordinat pixel diskrit:<br>`[[100,520], [101,520], ..., [700,520]]`. |
| **5. Fragment Shading** | Penentuan warna fragmen (`CATEGORY_RGB`) | Kategori segmen `"dinding"` | Lookup palet Viridis terstandarisasi untuk kategori dinding arsitektur. | Warna fragmen RGB: `[68, 1, 84]` (`#440154`, ungu tua Viridis). |
| **6. Per-Fragment Operations** | Penulisan ke memori framebuffer (`fb.set`) | Koordinat $(x, y)$ dan warna RGB `[68, 1, 84]` | Boundary check terhadap dimensi framebuffer ($w=800, h=600$); *direct buffer write* tanpa blending alpha atau Z-buffer. | Offset memori byte $3 \times (520 \times 800 + x)$ diisi nilai RGB `[68, 1, 84]`. |
| **7. Framebuffer Output** | Serialisasi buffer ke citra biner (`writePPM`) | Instans `Framebuffer` (array $800 \times 600 \times 3$ byte) | Pembentukan header PPM Netpbm format biner `P6\n800 600\n255\n` diikuti dumping byte array mentah. | Berkas citra biner `out/plan_scratch.ppm` (ukuran 1.440.015 byte). |

---

### 1.3 Eksperimen Kegagalan Tahap Pipeline: Peniadaan Pembalikan Sumbu Y (*Skipping Flip-Y*)

Pada tahap **2. Vertex Processing**, fungsi `worldToScreen()` menerapkan pembalikan sumbu $y$:
```js
// web/plan-core.mjs baris 11
const by = plan.origin[1] - y * plan.scale; // tanda minus membalik sumbu Y
```

#### Penjelasan Mengapa Tahap Ini Krusial
Dalam dunia arsitektur dan CAD teknik, ruang dunia menggunakan koordinat Kartesian tangan-kanan di mana $+y$ mengarah ke **Utara/Atas**. Sebaliknya, framebuffer komputer dan standar tampilan web SVG/HTML5 Canvas menggunakan koordinat raster di mana $(0,0)$ berada di sudut kiri-atas dan $+y$ bertambah ke arah **Bawah**. Tanda minus pada $- y \cdot \text{scale}$ adalah satu-satunya mekanisme yang menjaga orientasi geometris bangunan tetap tegak.

#### Bukti Eksperimen Nyata
Jika pembalikan sumbu $y$ dilewati (diubah menjadi penjumlahan: `by = plan.origin[1] + y * plan.scale`), hasil transformasi koordinat untuk titik-titik kunci denah berubah secara drastis sebagaimana ditunjukkan pada pengujian nyata berikut:

```text
Point | World (x,y) | Normal Screen (with flip-Y) | Broken Screen (no flip-Y)
0,0   | [0,0]       | [100,520]                   | [100,520] 
40,0  | [40,0]      | [700,520]                   | [700,520] 
40,30 | [40,30]     | [700,70]                    | [700,970] (OUT OF BOUNDS!)
0,30  | [0,30]      | [100,70]                    | [100,970] (OUT OF BOUNDS!)
16,-4 | [16,-4]     | [340,580]                   | [340,460] 
```

**Dampak Kerusakan:**
1. **Pemotongan Bangunan (*Geometry Clipping & Out-of-Bounds*):** Tanpa flip-Y, rentang koordinat layar menjadi $y = 460$ sampai $y = 970$. Dinding utara pada dunia $y = 30$ m terlempar ke layar $y = 970$, cella ke $y = 640$–$850$, dan shrine utara ke $y = 880$–$940$. Dari 36 vertex denah, **22 vertex (61,11%) berada di luar batas bawah kanvas** ($y > 599$). Jadi yang hilang bukan hanya "paruh atas": seluruh bagian dengan $y$ dunia $\ge 6$ m berada di bawah kanvas, dan hanya strip bawah $y = 460$–$599$ (tangga, alas dinding, shrine selatan) yang masih terlihat.
2. **Inversi Fitur Ruang (*Spatial Inversion*):** Fitur tangga masuk yang berada di selatan bangunan ($y = -4$ meter) terproyeksi ke $y = 460$, sehingga digambar masuk menembus ke bagian dalam bangunan dan menghadap ke utara.
3. **Pembalikan Winding Order Poligon:** Orientasi loop poligon berbalik dari berlawanan arah jarum jam (CCW) menjadi searah jarum jam (CW), yang dapat merusak evaluasi luas dan normal orientasi poligon.

---

### 1.4 Refleksi & Catatan Pengguna (TODO-USER)

> [!NOTE]
> Bagian berikut berisi kerangka dan pertanyaan pemandu yang wajib diisi sendiri oleh mahasiswa.

#### (A) Identitas Bangunan & Sumber Denah
- **Nama Bangunan:** TODO-USER
  *(Panduan: Tuliskan nama candi/bangunan arsitektural yang kamu pilih sebagai referensi model denah ini, misalnya Candi Induk Prambanan, Candi Sambisari, atau denah studio arsitektur).*
- **Sumber Data / Sketsa / Foto Terukur:** TODO-USER
  *(Panduan: Cantumkan tautan literatur, buku referensi pemugaran purbakala, sketsa inventarisasi BPCB, atau dokumen terukur yang menjadi acuan dimensi panjang $\times$ lebar bangunan).*
- **Justifikasi Skala & Asal Koordinat:** TODO-USER
  *(Panduan: Jelaskan mengapa origin `[100, 520]` dan skala `15 px/meter` dipilih agar denah tertata seimbang di dalam kanvas $800 \times 600$).*

#### (B) Refleksi Bacaan: Perbedaan `raster.mjs` dengan Pipeline Standar OpenGL
- **Pertanyaan Pemandu 1:** Apa perbedaan mendasar antara *fragment* pada OpenGL dengan konsep penulisan pixel langsung pada `raster.mjs`?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 2:** Mengapa ketiadaan tahap *fragment shading* terpisah pada `raster.mjs` membatasi efek visual seperti pencahayaan dinamis, tekstur interpolasi, dan multi-pass blending?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 3:** Bagaimana OpenGL mengelola *multisampling* (MSAA) pada level fragment dibandingkan pengambilan sampel tunggal di pusat pixel `(x+0.5, y+0.5)`?  
  *Jawaban:* TODO-USER

#### (C) Refleksi Masalah Half-Pixel: Direct3D 9 vs Direct3D 10
- **Pertanyaan Pemandu 1 (Offset):** Di manakah lokasi titik koordinat pusat pixel pada Direct3D 9 dibandingkan dengan Direct3D 10 / OpenGL modern? Mengapa konvensi Direct3D 9 $(0, 0)$ menimbulkan offset $-0.5$ texel?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 2 (Kode Implementasi):** Tunjukkan baris kode persis di `raster.mjs` yang menetapkan konvensi pusat pixel. Apa yang terjadi jika sampel diambil di sudut integer $(x, y)$?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 3 (Citra Pengujian):** Mengapa citra uji berupa pola papan catur (*checkerboard 1-pixel*) atau blit tekstur 1:1 langsung memperlihatkan cacat buram (*blur/bleeding*) jika terjadi bug half-pixel offset?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 4 (Studi Kasus Modul):** Perubahan spesifik apa pada fungsi pengujian modul yang mampu mendeteksi keberadaan bug half-pixel ini secara otomatis?  
  *Jawaban:* TODO-USER

---

## 2. Primitif From-Scratch & Kecocokan Referensi

### 2.1 Evaluasi Primitif Garis: DDA vs Bresenham

Implementasi `raster.mjs` menyediakan dua algoritma rasterisasi garis:
1. **Digital Differential Analyzer (`lineDDA`):** Menggunakan aritmatika floating-point untuk menghitung pertambahan bertahap $\Delta x / \text{steps}$ dan $\Delta y / \text{steps}$, kemudian membulatkan koordinat ke integer terdekat melalui `Math.round`.
2. **Bresenham (`lineBresenham`):** Murni berbasis aritmatika integer dengan variabel keputusan $D = 2\Delta y - \Delta x$. Algoritma mendukung penuh seluruh 8 oktan melalui penukaran koordinat $x \leftrightarrow y$ untuk garis curam (*steep*) dan penukaran endpoint jika $x_0 > x_1$.

#### Hasil Pengujian Unit Aktual (`node tests.mjs`)
Eksekusi pengujian garis menghasilkan keluaran sebagai berikut:

```text
ok 1 - lineDDA (2,1)->(9,5) = 8 pixels (E2)
ok 2 - lineBresenham (2,1)->(9,5) = same 8 pixels (E3)
ok 3 - Bresenham handles all 8 octants (reflections give same length, endpoints included)
ok 4 - 24-spoke asterisk: spoke lengths equal within +-1
ok 12 - asterisk 24 spokes: every spoke matches its expected Chebyshev length (delta <= 1)
```

**Analisis Hasil Garis:**
- Pengujian E2 dan E3 pada garis dari $(2, 1)$ ke $(9, 5)$ membuktikan bahwa `lineDDA` dan `lineBresenham` menghasilkan 8 pixel diskrit yang identik:
  `[[2,1], [3,2], [4,2], [5,3], [6,3], [7,4], [8,4], [9,5]]`.
- Uji spoke asterisk 24-jari-jari (`asterisk.mjs`) membuktikan bahwa panjang piksel setiap spoke konsisten dengan panjang metrik Chebyshev $\max(|\Delta x|, |\Delta y|) + 1$ (berkisar antara 29 hingga 41 piksel tergantung orientasi kemiringan garis).

---

### 2.2 Evaluasi Primitif Segitiga & Koordinat Barisentrik

Rasterisasi segitiga diimplementasikan pada `triangle()` menggunakan formula fungsi sisi (*edge function*) Juan Pineda (1988):
$$E(A, B, P) = (x_B - x_A)(y_P - y_A) - (y_B - y_A)(x_P - x_A)$$

#### Hasil Pengujian Unit Aktual (`node tests.mjs`)
```text
ok 5 - edge functions at (3,3) = (8,12,8); (5,5) and (1,4) outside (E4)
ok 6 - barycentric at (3,3) = (3/7,2/7,2/7), sums to 1; E5 interpolation = 20
```

- **Uji E4:** Pada segitiga $A(1,1), B(6,2), C(3,7)$ dengan luas total $E(A, B, C) = 28$:
  - Titik dalam $P(3, 3)$ menghasilkan ketiga nilai fungsi sisi positif: $[8, 12, 8]$.
  - Titik luar $P(5, 5)$ menghasilkan $[16, -4, 16]$ (komponen kedua bernilai negatif, menandakan berada di luar sisi $B \to C$).
  - Titik luar $P(1, 4)$ menghasilkan $[15, 19, -6]$ (berada di luar sisi $C \to A$).
- **Uji E5:** Koordinat barisentrik dihitung sebagai normalisasi edge function terhadap luas total:
  $$\lambda_A = \frac{8}{28} = \frac{2}{7}, \quad \lambda_B = \frac{12}{28} = \frac{3}{7}, \quad \lambda_C = \frac{8}{28} = \frac{2}{7}$$
  Jumlah $\lambda_A + \lambda_B + \lambda_C = 1.0$. Interpolasi linier nilai atribut vertex $0.5(10) + 0.25(20) + 0.25(40) = 20.0$ terverifikasi presisi.

---

### 2.3 Perhitungan Manual Satu Pixel Dekat Edge yang Menyala

Untuk membuktikan kesesuaian formula matematis dengan kode program, dilakukan perhitungan manual langkah demi langkah untuk pixel $(2, 2)$ pada kasus uji bujur sangkar $6 \times 6$ dari berkas `draw_square.mjs`.

#### Deskripsi Geometri Bujur Sangkar
Bujur sangkar berukuran $6 \times 6$ membentang dari koordinat $(2, 2)$ hingga $(8, 8)$ pada framebuffer $12 \times 12$. Bujur sangkar didekomposisi menjadi dua segitiga yang saling bertetangga:
- **Segitiga $T_1$:** Vertex $A(2, 2)$, $B(8, 2)$, $C(8, 8)$. Orientasi total luas:
  $$E(A, B, C) = (8 - 2)(8 - 2) - (2 - 2)(8 - 2) = 36 > 0$$
- **Segitiga $T_2$:** Vertex $A(2, 2)$, $B(8, 8)$, $C(2, 8)$. Orientasi total luas:
  $$E(A, B, C) = (8 - 2)(8 - 2) - (8 - 2)(2 - 2) = 36 > 0$$
- **Sisi Bersama (*Shared Diagonal Edge*):** Garis diagonal dari $(2, 2)$ ke $(8, 8)$.

#### Pemilihan Pixel Uji
Dipilih pixel $(x=2, y=2)$.  
Sesuai konvensi `raster.mjs`, sampel diambil tepat pada **pusat pixel (*sample centre*)**:
$$P = (x + 0.5, y + 0.5) = (2.5, 2.5)$$

```
        x=2     x=3
     +-------+-------+
 y=2 |   *   |       |   * = Titik Sampel P(2.5, 2.5)
     | (2,2) |       |   Garis diagonal memotong tepat pada (2,2)
     +-------+-------+
```

#### Langkah 1: Evaluasi pada Segitiga $T_1$ ($A[2,2], B[8,2], C[8,8]$)
Fungsi sisi dievaluasi menggunakan formula $E(ax, ay, bx, by, px, py) = (bx - ax)(py - ay) - (by - ay)(px - ax)$:

1. **Sisi $B(8, 2) \to C(8, 8)$ (menghasilkan $e_A$):**
   $$e_A = (8 - 8)(2.5 - 2) - (8 - 2)(2.5 - 8) = 0 - 6(-5.5) = +33.0$$
2. **Sisi $C(8, 8) \to A(2, 2)$ (sisi diagonal bersama, menghasilkan $e_B$):**
   $$e_B = (2 - 8)(2.5 - 8) - (2 - 8)(2.5 - 8) = (-6)(-5.5) - (-6)(-5.5) = 33.0 - 33.0 = 0.0$$
3. **Sisi $A(2, 2) \to B(8, 2)$ (menghasilkan $e_C$):**
   $$e_C = (8 - 2)(2.5 - 2) - (2 - 2)(2.5 - 2) = 6(0.5) - 0 = +3.0$$

#### Langkah 2: Evaluasi Aturan Top-Left pada Sisi Diagonal $T_1$
Nilai $e_B = 0.0$ berada tepat di atas batas sisi. Penerimaan pixel bergantung pada fungsi `isTopLeft(xx, xy, yx, yy)`:
```js
// raster.mjs baris 84-87
export const isTopLeft = (xx, xy, yx, yy) => {
  const dx = yx - xx, dy = yy - xy;
  return (dy === 0 && dx > 0) || dy < 0;
};
```
Untuk sisi $C(8, 8) \to A(2, 2)$:
- $\Delta x = x_A - x_C = 2 - 8 = -6$
- $\Delta y = y_A - y_C = 2 - 8 = -6$
- Pengujian kondisi:
  1. Apakah sisi horizontal atas? $(\Delta y == 0 \land \Delta x > 0) \implies (-6 == 0 \land -6 > 0) \to \text{False}$.
  2. Apakah sisi kiri (*running upwards*)? $\Delta y < 0 \implies -6 < 0 \to \mathbf{True}$.
- Maka `isTopLeft(8, 8, 2, 2)` mengembalikan **$\mathbf{true}$** (diklasifikasikan sebagai *Left Edge*).

Kriteria kelolosan pixel:
$$\text{ok}(e_B, \text{tl}) = (e_B > 0 \lor (e_B == 0 \land \text{tl})) = (0 > 0 \lor (0 == 0 \land \text{true})) = \mathbf{True}$$
Karena $e_A > 0$ (33), $e_B$ lolos (0, top-left), dan $e_C > 0$ (3), **pixel $(2, 2)$ dinyalakan (LIT) oleh segitiga $T_1$**.

#### Langkah 3: Evaluasi pada Segitiga $T_2$ ($A[2,2], B[8,8], C[2,8]$)
1. **Sisi $B(8, 8) \to C(2, 8)$ (menghasilkan $e_A$):**
   $$e_A = (2 - 8)(2.5 - 8) - (8 - 8)(2.5 - 8) = (-6)(-5.5) - 0 = +33.0$$
2. **Sisi $C(2, 8) \to A(2, 2)$ (menghasilkan $e_B$):**
   $$e_B = (2 - 2)(2.5 - 8) - (2 - 8)(2.5 - 2) = 0 - (-6)(0.5) = +3.0$$
3. **Sisi $A(2, 2) \to B(8, 8)$ (sisi diagonal bersama, menghasilkan $e_C$):**
   $$e_C = (8 - 2)(2.5 - 2) - (8 - 2)(2.5 - 2) = 6(0.5) - 6(0.5) = 3.0 - 3.0 = 0.0$$

#### Langkah 4: Evaluasi Aturan Top-Left pada Sisi Diagonal $T_2$
Untuk sisi $A(2, 2) \to B(8, 8)$:
- $\Delta x = x_B - x_A = 8 - 2 = +6$
- $\Delta y = y_B - y_A = 8 - 2 = +6$
- Pengujian kondisi:
  1. Horizontal atas: $(\Delta y == 0 \land \Delta x > 0) \to \text{False}$.
  2. Sisi kiri: $\Delta y < 0 \implies +6 < 0 \to \mathbf{False}$.
- Maka `isTopLeft(2, 2, 8, 8)` mengembalikan **$\mathbf{false}$** (merupakan *Bottom/Right Edge*).

Kriteria kelolosan pixel:
$$\text{ok}(e_C, \text{tl}) = (e_C > 0 \lor (e_C == 0 \land \text{tl})) = (0 > 0 \lor (0 == 0 \land \text{false})) = \mathbf{False}$$
**Hasil untuk $T_2$:** Pixel $(2, 2)$ **ditolak** oleh $T_2$.

#### Kesimpulan Perhitungan Manual
Pixel $(2, 2)$ digambar oleh $T_1$ dan ditolak oleh $T_2$. Pixel dinyalakan tepat **1 kali**, membuktikan secara analitis bahwa kode berjalan konsisten dengan hitungan manual dan menjamin sifat *watertight*.

---

### 2.4 Status Kecocokan Referensi Eksternal

Pengujian pencocokan citra bujur sangkar dilakukan dengan membandingkan berkas hasil render `out/square_fill.ppm` terhadap berkas referensi `ref/square_fill_ref.ppm`:

```powershell
node draw_square.mjs --mode fill
node compare.mjs out/square_fill.ppm ref/square_fill_ref.ppm
```

**Keluaran Terminal Asli:**
```text
2 triangles, edge functions + top-left rule
coverage: 36 pixels, once = 36, twice = 0, gaps = 0
wrote out/square_fill.ppm
same size 12x12
identical pixels: 144/144 (100.00%)  PSNR: inf dB
SSIM: 1.000  max |diff|: 0
wrote out/diff.ppm (diff x6)
```

> **Transparansi Status Berkas Referensi:**
> - `ref/square_fill_ref.ppm` tersedia dalam arsip starter kit modul dan terbukti **100% cocok secara byte-identical** ($\text{PSNR} = \infty\text{ dB}$, $\text{SSIM} = 1.000$).
> - Berkas `ref/tri_ref.ppm` **tidak disediakan** di dalam paket starter kit modul maupun pada repositori resmi. Dokumen ini secara eksplisit mencatat ketiadaan berkas tersebut; laporan menolak membuat citra tiruan sendiri sebagai referensi (*self-consistency trap*), demi menjaga integritas akademik pengujian.

---

## 3. Diagnosis-dan-Perbaiki

### 3.1 Data Kasus Uji `triangle_gap_bug.mjs`

Eksperimen diagnosis celah dan duplikasi dilakukan pada sebuah segiempat (*quad*) dengan simpul $Q = [[1, 1], [13, 1], [13, 13], [1, 13]]$ yang dibagi secara diagonal menjadi dua segitiga pada framebuffer $16 \times 16$.

Perintah eksekusi:
```powershell
node triangle_gap_bug.mjs
```

**Keluaran Asli Terminal:**
```text
naive  (E >= 0, no rule): once=132 twice=12 gaps=0
  double-drawn: [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11],[12,12]]
strict (E >  0)         : once=132 twice=0 gaps=12
  gaps: [[1,1],[2,2],[3,3],[4,4],[5,5],[6,6],[7,7],[8,8],[9,9],[10,10],[11,11],[12,12]]
fixed  (top-left rule)  : once=144 twice=0 gaps=0
coverage image (fixed):
  ############
  ############
  ############
  ############
  ############
  ############
  ############
  ############
  ############
  ############
  ############
  ############
```

Ringkasan hasil komparasi 3 mode aturan rasterisasi pada area $12 \times 12$ (144 pixel target):

| Mode Rasterisasi | Kondisi Uji Sisi ($E$) | Coverage Sekali (`once`) | Gambar Dobel (`twice`) | Celah / Lubang (`gaps`) | Total Pixel Aktif |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Naive** | $E \ge 0$ (tanpa aturan sisi) | 132 | **12** | 0 | 144 |
| **Strict** | $E > 0$ (eksklusif ketat) | 132 | 0 | **12** | 132 |
| **Fixed (Top-Left)** | $E > 0 \lor (E == 0 \land \text{isTopLeft})$ | **144** | **0** | **0** | **144** |

---

### 3.2 Analisis Tie-Breaking Bias: Bias 0 vs Bias -1

Pada perangkat keras grafis dan pustaka rasterisasi berbasis bilangan bulat (seperti Direct3D 10/11/12 dan Vulkan), pengujian fungsi sisi dirumuskan sebagai:
$$\text{Inside}(P) \iff E_{AB}(P) + \text{bias} \ge 0$$
di mana nilai bias ditentukan oleh orientasi sisi:
- **$\text{Bias} = 0$:** Diterapkan untuk sisi **Top** atau sisi **Left**. Jika titik berada tepat pada garis batas ($E = 0$), maka $0 + 0 \ge 0$ bernilai benar, sehingga pixel **disertakan**.
- **$\text{Bias} = -1$:** Diterapkan untuk sisi **Bottom** atau sisi **Right**. Jika titik berada tepat pada garis batas ($E = 0$), maka $0 + (-1) = -1 < 0$ bernilai salah, sehingga pixel **dikeluarkan**.

#### Pemetaan Bias pada Sisi Diagonal Kasus Uji
Pada kasus `triangle_gap_bug.mjs`:
- Sisi diagonal bersama menghubungkan $(1, 1)$ dan $(13, 13)$.
- **Untuk Segitiga $T_1$:** Sisi berjalan dari simpul $(13, 13)$ menuju $(1, 1)$, sehingga $\Delta x = -12$ dan $\Delta y = -12$. Dalam sistem koordinat $y$-bawah, pergerakan ke atas ($\Delta y < 0$) menempatkan area dalam segitiga berada di sisi kanan garis (diklasifikasikan sebagai *Left Edge*). Oleh karena itu, sisi ini menerima **$\text{Bias} = \mathbf{0}$** (inklusif).
- **Untuk Segitiga $T_2$:** Sisi berjalan dari simpul $(1, 1)$ menuju $(13, 13)$, sehingga $\Delta x = +12$ dan $\Delta y = +12$. Pergerakan ke bawah ($\Delta y > 0$) menempatkan area dalam segitiga berada di sisi kiri garis (diklasifikasikan sebagai *Right/Bottom Edge*). Oleh karena itu, sisi ini menerima **$\text{Bias} = \mathbf{-1}$** (eksklusif).

Akibatnya, ke-12 pixel diagonal $[1,1]$ hingga $[12,12]$ diklaim secara unik oleh $T_1$ dan dilepas oleh $T_2$, menghasilkan cakupan tepat 144 pixel tanpa ada tumpang tindih (*zero double-draw*) dan tanpa celah bocor (*zero gaps*).

---

### 3.3 Koreksi Kritis: Definisi Top-Left Kode vs Teks Modul §9

Terdapat ketidaksinkronan konseptual antara teks materi modul dengan implementasi kode:

1. **Implementasi pada Kode (`raster.mjs` baris 84–87):**
   ```js
   export const isTopLeft = (xx, xy, yx, yy) => {
     const dx = yx - xx, dy = yy - xy;
     return (dy === 0 && dx > 0) || dy < 0;
   };
   ```
2. **Definisi pada Modul §9 / Listing 2 PDF:**
   Teks modul menuliskan aturan: sisi Top jika $\Delta y == 0 \land \Delta x < 0$, dan sisi Left jika $\Delta y > 0$.

#### Analisis Geometris & Pembuktian Kesalahan Teks Modul
Pada sistem koordinat layar komputer di mana sumbu **$y$ bertambah ke arah bawah** dan orientasi simpul diatur searah jarum jam (total luas $E > 0$):
- **Sisi Horizontal Atas (*Top Edge*):** Garis horizontal yang membatasi segitiga dari atas memiliki bagian dalam (*interior*) yang membentang ke arah bawah ($+y$). Vektor garis yang mengelilingi poligon searah jarum jam harus bergerak dari kiri ke kanan, yaitu $\Delta x > 0$ dan $\Delta y == 0$. Teks modul yang mensyaratkan $\Delta x < 0$ keliru karena vektor tersebut justru merupakan sisi bawah (*Bottom Edge*).
- **Sisi Kiri (*Left Edge*):** Garis miring atau vertikal yang membatasi segitiga dari sebelah kiri memiliki interior yang berada di sebelah kanannya ($+x$). Vektor sisi yang mengelilingi poligon searah jarum jam harus mengarah ke atas layar, yaitu $\Delta y < 0$. Teks modul yang menyatakan $\Delta y > 0$ terbalik karena vektor yang mengarah ke bawah layar merupakan sisi kanan (*Right Edge*).

```
Sistem Layar (Y DOWN):
        Top Edge: dx > 0, dy == 0 (bergerak ke kanan)
        +----------------------------------->
        |        Interior berada di bawahnya (+y)
        |
Left Edge: dy < 0 (bergerak ke atas layar)
        ^        Interior berada di kanannya (+x)
        |
```

> **Kesimpulan Koreksi:**  
> Definisi yang tertulis pada teks Modul §9 adalah keliru/terbalik akibat asumsi koordinat Kartesian biasa ($y$ UP). Sebaliknya, kode sumber `raster.mjs` adalah **implementasi yang benar** dan konsisten dengan spesifikasi resmi Microsoft Direct3D (*Top-Left Rasterization Rule*) serta Vulkan specification.

---

### 3.4 Refleksi & Pemahaman Pribadi (TODO-USER)

> [!NOTE]
> Tuliskan opini dan diagnosis pribadimu pada bagian ini.

- **Pertanyaan Pemandu 1 (Penyebab Naive Double-Drawn):** Mengapa pada pendekatan naive ($E \ge 0$), dua segitiga yang saling bersebelahan sama-sama mewarnai pixel yang pusatnya tepat berada di garis diagonal pembagi? Apa dampak visualnya bila warna kedua segitiga berbeda atau semi-transparan?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 2 (Penyebab Strict Gaps):** Mengapa pengetatan kriteria menjadi $E > 0$ justru menghasilkan garis putih/celah tembus pandang sepanjang diagonal?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 3 (Pentingnya Watertightness):** Dalam aplikasi visualisasi denah arsitektur 2D, mengapa sifat *watertight* (tidak ada celah dan tidak ada dobel) sangat penting bagi keakuratan estetika dan kalkulasi luas ruangan?  
  *Jawaban:* TODO-USER

---

## 4. Render Pustaka & Diff Pixel

### 4.1 Metodologi Perbandingan

Untuk menguji kesesuaian implementasi perangkat lunak mandiri (*software rasterizer from-scratch*), citra denah yang dihasilkan `draw_plan.mjs` (`out/plan_scratch.ppm`) dibandingkan secara langsung terhadap hasil render pustaka industri standar **Three.js** (`plan_three.png`) yang diekspor dari Web Viewer (`web/viewer.mjs`).

Renderer viewer dikonfigurasi dengan `renderer.setPixelRatio(1)`, `renderer.setSize(800, 600, false)`, `THREE.ColorManagement.enabled = false`, dan `renderer.outputColorSpace = THREE.LinearSRGBColorSpace`, sehingga nilai RGB dari material tidak mengalami konversi ruang warna tambahan. Seluruh titik outline dan siluet digeser $+0{,}5$ px pada $x$ dan $y$ agar pusat garis WebGL berimpit dengan pusat pixel $(x+0{,}5, y+0{,}5)$ yang dipakai `raster.mjs`. `plan_three.png` (800×600) diekspor dari canvas viewer melalui Chromium headless (Chrome 155.0.8059.85) dengan `canvas.toDataURL('image/png')`.

Perintah eksekusi:
```powershell
node draw_plan.mjs --w 800 --h 600 --fill --plan pusaka_plan.json
node compare.mjs out/plan_scratch.ppm plan_three.png
```

### 4.2 Tabel Hasil Komparasi Citra

Berikut adalah tabel hasil pengukuran metrik kuantitatif antara `out/plan_scratch.ppm` dan `plan_three.png`. Baris "sebelum" memakai citra viewer lama (tanpa $+0{,}5$); baris "sesudah" memakai citra yang diekspor ulang setelah perbaikan.

| Metrik Evaluasi | Sebelum Perbaikan (tanpa $+0{,}5$) | Sesudah Perbaikan (dengan $+0{,}5$) | Keterangan |
| :--- | :---: | :---: | :--- |
| **Dimensi Citra** | $800 \times 600$ | $800 \times 600$ | Resolusi identik (total 480.000 pixel). |
| **Pixel Identik Sempurna** | **470.638 / 480.000 (98,05%)** | **479.970 / 480.000 (99,99%)** | Nilai RGB yang persis sama. |
| **Pixel Berbeda** | 9.362 / 480.000 (1,95%) | **30 / 480.000 (0,00625%)** | Deviasi nilai warna. |
| **Peak Signal-to-Noise Ratio (PSNR)** | **28,72 dB** | **59,21 dB** | Semakin tinggi semakin baik. |
| **Structural Similarity Index (SSIM)** | **0,994** | **1,000** | Metrik struktur global. |
| **Perbedaan Maksimal Absolut Channel ($|\Delta|_{\max}$)** | **244** | **115** | Sebelum: garis gelap vs latar $245-1$; sesudah: endpoint garis sumbu. |
| **Berkas Difference Map** | `out/diff_before.ppm` | `out/diff_after.ppm` | Selisih absolut diamplifikasi $6\times$. |

Keluaran asli `compare.mjs` sesudah perbaikan:

```text
same size 800x600
identical pixels: 479970/480000 (99.99%)  PSNR: 59.21 dB
SSIM: 1.000  max |diff|: 115
wrote out/diff.ppm (diff x6)
```

---

### 4.3 Analisis Difference Image (`out/diff.ppm`)

Skrip `compare.mjs` menghasilkan citra selisih byte yang diamplifikasi sebesar 6 kali lipat:
$$D(x, y) = \min(255, |I_{\text{scratch}}(x, y) - I_{\text{three}}(x, y)| \times 6)$$

#### Bukti offset setengah pixel (sebelum perbaikan)

Penyebab utama selisih 9.362 pixel **bukan** anti-aliasing dan **bukan** perbedaan triangulasi. Penyebabnya adalah offset setengah pixel yang sama dengan insiden Direct3D 9: `worldToScreen()` mengembalikan koordinat integer, lalu viewer lama menaruh vertex WebGL tepat di $(x, y)$. Koordinat itu adalah **batas** antar-pixel, sedangkan `raster.mjs` menyalakan pixel yang pusatnya $(x+0{,}5, y+0{,}5)$. Akibatnya garis 1 px WebGL terbelah ke dua baris/kolom pixel.

Bukti langsung dari pixel di `out/plan_scratch.ppm` versus `plan_three.png` lama:

| Lokasi | `plan_scratch.ppm` (pusat pixel) | `plan_three.png` lama (batas pixel) |
| :--- | :--- | :--- |
| Dinding kiri, $x=99$ | `245,245,245` (latar) | `112,62,124` = 75% dinding di atas latar |
| Dinding kiri, $x=100$ | `68,1,84` (dinding penuh) | `66,16,80` = 75% dinding di atas fill |
| Dinding bawah, $y=519$ | `60,60,70` (fill) | `66,16,80` = 75% dinding di atas fill |
| Dinding bawah, $y=520$ | `68,1,84` (dinding penuh) | `112,62,124` = 75% dinding di atas latar |

Jadi garis WebGL berpusat di $x=100$ atau $y=520$ (batas pixel), bukan di $x=100{,}5$ atau $y=520{,}5$ (pusat pixel). Inilah offset $0{,}5$ px, bukan pergeseran 1 px penuh.

Hitungan pixel garis sebelum perbaikan:

```text
scratch line pixels (warna kategori):                 4705
plan_three line-ish pixels (bukan BG, bukan FILL):    9374
scratch line tanpa line-ish di posisi sama:              7
line-ish plan_three tanpa line di posisi sama:        4676
```

Kedua angka 7 dan 4.676 **tidak** kira-kira sama, dan ini bukan kontradiksi: garis anti-aliased selebar 1 px yang berpusat di batas pixel menutupi **dua** baris/kolom (masing-masing 75% pada citra lama), sehingga jumlah pixel line-ish viewer hampir dua kali lipat ($9.374 \approx 2 \times 4.705$). Satu baris/kolom kebetulan berimpit dengan pixel scratch; baris/kolom satunya adalah tumpahan ke sisi latar. Yang simetris adalah **pergeseran pusat garis**, bukan jumlah pixel mentah.

#### Sesudah perbaikan $+0{,}5$ px

Dengan menambahkan $+0{,}5$ pada $x$ dan $y$ untuk outline dan siluet, kedua himpunan pixel garis menjadi identik:

```text
scratch line pixels:                                  4705
plan_three line-ish pixels:                           4705
scratch line tanpa line-ish di posisi sama:              0
line-ish plan_three tanpa line di posisi sama:            0
```

Dari 480.000 pixel, tersisa **30 pixel berbeda (0,00625%)**. Semuanya berada di vertex polyline atau endpoint garis; tidak ada satu pun pixel interior fill yang berbeda (diverifikasi oleh tes `tests.mjs`). Daftar lengkapnya:

| Kelompok lokasi | Koordinat $(x,y)$ | Jumlah | RGB scratch | RGB Three.js | $\lvert\Delta\rvert_{\max}$ |
| :--- | :--- | :---: | :--- | :--- | :---: |
| Sudut dinding luar | (100,70), (700,70), (100,520), (700,520) | 4 | `68,1,84` | `113,62,125` | 61 |
| Sudut cella | (280,190), (520,190), (280,400), (520,400) | 4 | `59,82,139` | `60,77,122` | 17 |
| Sudut 4 shrine | (130,100), (190,100), (610,100), (670,100), (130,160), (190,160), (610,160), (670,160), (130,430), (190,430), (610,430), (670,430), (130,490), (190,490), (610,490), (670,490) | 16 | `94,201,98` | `86,166,91` | 35 |
| Sudut tangga di dinding | (340,520), (460,520) | 2 | `33,145,140` | `51,73,112` | 72 |
| Ujung tangga | (340,580), (460,580) | 2 | `33,145,140` | `86,170,167` | 53 |
| Endpoint sumbu (atas, T-junction) | (400,70) | 1 | `253,231,37` | `161,116,61` | 115 |
| Endpoint sumbu (bawah) | (400,580) | 1 | `253,231,37` | `143,188,89` | 110 |

Sisa selisih itu adalah perilaku **join/cap** garis WebGL: pada titik sudut, dua segmen bertemu dan rasterizer GPU membagi coverage anti-alias ke pixel tetangga (75% atau 50%), sedangkan `lineBresenham` menulis pixel endpoint dengan warna penuh. Endpoint sumbu di (400,70) menimpa dinding dan hanya mendapat 50% coverage sumbu, sehingga selisihnya terbesar (115). Tidak ada indikasi perbedaan triangulasi *fan* vs Earcut atau pembulatan `Math.round` vs float GPU yang tersisa: setelah hanya offset $+0{,}5$ yang diubah, seluruh area fill dan latar cocok persis, 4.675 dari 4.705 pixel garis juga cocok persis, dan 30 selisih terisolasi itu semuanya dapat dijelaskan oleh join/cap di vertex/endpoint.

---

## 5. Keputusan Forward/Backward

### 5.1 Hasil Pengujian Benchmark Kinerja

Uji perbandingan efisiensi komputasi antara pemetaan maju (*forward mapping / rasterization*) dan pemetaan mundur (*backward mapping / ray-casting image space*) dijalankan menggunakan `bench.mjs`:

```powershell
node bench.mjs pusaka_plan.json
```

**Keluaran Asli Terminal:**
```text
segments: 28, framebuffer 800x600
zoom | forward ms | backward ms | backward/forward
  1x |       2.23 |       212.1 | 95x
 10x |       4.58 |       198.5 | 43x
```

Tabel komparasi waktu eksekusi (median dari 15 kali run untuk forward, 3 kali untuk backward):

| Tingkat Zoom | Waktu Forward (Bresenham) | Waktu Backward (Distance Test) | Rasio Efisiensi (Backward / Forward) |
| :---: | :---: | :---: | :---: |
| **$1\times$** | **2,23 ms** | **212,1 ms** | **$95\times$ lebih lambat** |
| **$10\times$** | **4,58 ms** | **198,5 ms** | **$43\times$ lebih lambat** |

---

### 5.2 Analisis Kompleksitas Algoritmik

```
Perbandingan Paradigma Rendering:

FORWARD MAPPING (Primitif -> Pixel):
[Segmen 1] ---> Rasterize (Bresenham) ---> Hanya kunjungi pixel yang dilalui
[Segmen 2] ---> Rasterize (Bresenham) ---> Beban kerja proporsional terhadap
   ...                                     panjang garis total: O(N * L)

BACKWARD MAPPING (Pixel -> Primitif):
Untuk setiap pixel (x, y) dari 480.000 pixel:
  +---> Uji jarak ke Segmen 1
  +---> Uji jarak ke Segmen 2 ---> Beban kerja masif konstan:
  +---> ...                        O(W * H * N) = 13,44 juta iterasi!
```

1. **Forward Mapping (Rasterisasi Segmen):**
   - Kompleksitas waktu: $\mathcal{O}(N_{\text{segments}} \times L_{\text{avg}})$, di mana $N_{\text{segments}} = 28$ dan $L_{\text{avg}}$ adalah panjang rata-rata segmen dalam piksel.
   - Algoritma hanya menyentuh pixel yang benar-benar dilintasi garis denah. Pada zoom $1\times$, jumlah pixel garis yang diproses hanya sekitar $4.000$ pixel, sehingga selesai dalam **2,23 ms**. Saat zoom $10\times$, panjang garis membesar sehingga waktu bertambah menjadi **4,58 ms**.
2. **Backward Mapping (Pengujian Jarak Pixel ke Segmen):**
   - Kompleksitas waktu: $\mathcal{O}(W \times H \times N_{\text{segments}})$.
   - Algoritma menjalankan dua loop tersarang untuk memindai seluruh $800 \times 600 = 480.000$ pixel layar, lalu untuk setiap pixel menguji jarak proyeksi ortogonal ke 28 segmen garis denah. Total komputasi mencapai $480.000 \times 28 = \mathbf{13.440.000}$ kali evaluasi jarak kuadratik! Akibatnya, waktu rendering melonjak hingga **212,1 ms** ($95\times$ lipat).

---

### 5.3 Kondisi Keterbatasan di Mana Pilihan Forward/Backward Berbalik

Meskipun forward mapping unggul telak pada adegan denah 2D sederhana ini, terdapat kondisi keterbatasan mendasar di mana backward mapping justru jauh lebih efisien atau bahkan menjadi satu-satunya pilihan yang memungkinkan. Data benchmark yang dipakai: $N = 28$ segmen, $W \times H = 800 \times 600 = 480.000$ pixel, total panjang garis $N \times L_{\text{avg}} = 4.738$ pixel pada zoom $1\times$ (rata-rata $169{,}21$ pixel/segmen) dan $47.128$ pixel pada zoom $10\times$ (rata-rata $1.683{,}14$ pixel/segmen). Backward mapping tanpa akselerasi menguji $480.000 \times 28 = 13.440.000$ jarak per frame.

| No | Kondisi Keterbatasan di Mana Pilihan Berbalik | Hubungan dengan Data Benchmark | Alasan Keunggulan Backward Mapping Dibandingkan Forward |
| :---: | :--- | :--- | :--- |
| **1** | **Kepadatan Geometri Sangat Tinggi ($N_{\text{segments}} \gg W \times H$) dengan Struktur Akselerasi Spasial (BVH / Grid)** | Data ini masih jauh dari kondisi tersebut: $N/(W \times H) = 28/480.000 = 5{,}83 \times 10^{-5}$. Kondisi baru relevan bila $N$ naik sekitar $17.000\times$ menjadi $>480.000$ segmen pada layar yang sama (atau $>10$ juta segmen pada layar $512 \times 512$). | Forward rasterizer mengalami *overdraw* masif dan beban transformasi vertex yang melumpuhkan memori bus; backward mapping dengan BVH hanya menembus sel yang terlihat dengan kompleksitas $\mathcal{O}(W \cdot H \cdot \log N)$. |
| **2** | **Sampling Titik / Resolusi Sangat Rendah ($W \times H \ll N_{\text{primitif}}$)** | Data ini adalah kebalikannya: $W \times H = 480.000$ dan $N = 28$, sehingga $W \times H \gg N$. Kondisi ini baru muncul pada sensor $4 \times 4$ ($16$ pixel) dengan $N=28$, atau resolusi mini lain yang $W \times H$-nya jauh di bawah $28$. | Backward mapping hanya mengevaluasi sedikit tembakan sinar (*rays*); lebih hemat daripada memproyeksikan puluhan/ratusan primitif ke seluruh pipa grafis. |
| **3** | **Geometri Permukaan Prosedural Implisit (SDF) & Distorsi Layar Non-Linear (Lensa Fisheye / VR)** | Denah benchmark adalah 28 segmen eksplisit, bukan field SDF; tidak ada evaluasi fungsi per pixel. Jika setiap pixel yang tertutup garis membutuhkan evaluasi SDF, forward harus mengevaluasi $4.738$ kali pada zoom $1\times$ dan $47.128$ kali pada zoom $10\times$, sedangkan backward mengevaluasi $480.000$ pixel. Rasio $480.000/4.738 = 101{,}3\times$ dan $480.000/47.128 = 10{,}2\times$ masih menguntungkan forward secara jumlah evaluasi, tetapi keunggulan itu hilang bila distorsi menuntut ribuan segmen mikro atau bila konstantanya di GPU berubah. | Forward mapping kesulitan memproyeksikan garis lurus yang melengkung tanpa memecah geometri menjadi jutaan segmen mikro; backward mapping dengan mudah membelokkan sinar secara matematis per pixel (*ray marching*). |

**Kondisi yang bisa dihitung.** Untuk rasterisasi garis tanpa struktur akselerasi, forward mengunjungi kira-kira $N \times L_{\text{avg}}$ sampel, sedangkan backward menguji jarak ke semua segmen untuk setiap pixel, yaitu $W \times H \times N$. Forward unggul selama

$$N \times L_{\text{avg}} \ll W \times H \times N \quad \Longleftrightarrow \quad L_{\text{avg}} \ll W \times H.$$

Pada data ini $L_{\text{avg}} = 169{,}21$ dan $W \times H = 480.000$, sehingga rasio biaya operasi garis adalah $4.738/13.440.000 = 0{,}035\%$ pada zoom $1\times$ dan $47.128/13.440.000 = 0{,}351\%$ pada zoom $10\times$. Rasio waktu terukur lebih kecil, yaitu $95\times$ dan $43\times$ (bukan $2.837\times$ dan $285\times$), karena backward juga punya overhead loop per pixel yang relatif kecil dibanding operasi jarak, sedangkan forward punya overhead per segmen.

Jika ada **efek per-pixel** dengan biaya $K$ operasi per pixel, biaya forward menjadi sekitar $K \cdot N \cdot L_{\text{avg}}$, sedangkan backward sekitar $c \cdot W \cdot H \cdot N$. Setelah dibagi $N$, forward tetap unggul bila $K \cdot L_{\text{avg}} \ll c \cdot W \cdot H$; dengan $L_{\text{avg}} = 169{,}21$ dan $c=1$, forward baru kalah dalam hitungan operasi bila $K > 480.000/169{,}21 \approx 2.837$ operasi per pixel. Untuk **target GPU**, konstanta $c$ berubah drastis: backward dapat dijalankan sebagai compute shader dengan $480.000$ thread paralel, sedangkan forward dengan 28 segmen hanya menghasilkan $4.738$ sampel garis dan tidak mampu memenuhi GPU. Karena itu pada GPU backward bisa menang meskipun jumlah operasi mentahnya lebih besar; angka benchmark CPU di atas tidak boleh dipakai langsung untuk memprediksi GPU.

---

### 5.4 Refleksi & Keputusan Desain (TODO-USER)

> [!NOTE]
> Tuliskan prediksi dan keputusan arsitekturmu pada bagian ini.

- **Prediksi Sebelum Pengujian:** Bagaimana prediksimu sebelum menjalankan `bench.mjs`? Apakah kamu memperkirakan perbedaan waktu akan mencapai puluhan kali lipat?  
  *Jawaban:* TODO-USER
- **Keputusan Arsitektur:** Jika kamu diminta merancang sistem penampil denah interaktif skala besar (misalnya peta kampus dengan $50.000$ segmen dinding dan fitur zoom real-time), arsitektur apa yang akan kamu pilih (forward dengan spatial culling vs backward compute shader) dan apa alasan teknisnya?  
  *Jawaban:* TODO-USER

---

## 6. Aksesibilitas

### 6.1 Desain Legenda & Representasi Multi-Modal

Aplikasi web viewer (`web/index.html`) mengimplementasikan visualisasi denah arsitektur dengan prinsip aksesibilitas universal. Untuk memastikan seluruh informasi denah dapat dipahami oleh pengguna dengan keterbatasan penglihatan warna (khususnya **deuteranopia / buta warna merah-hijau**), diterapkan prinsip *redundant encoding* (pengkodean ganda).

Kategori denah direpresentasikan oleh 3 modalitas visual independen:
1. **Hue & Luminansi Monotonik:** Menggunakan palet standar ilmiah **Viridis**.
2. **Bentuk Marker Geometri SVG Unik:** Bentuk geometris yang berbeda untuk setiap kategori.
3. **Label Tekstual Eksplisit:** Penamaan kategori yang jelas pada elemen legenda semantik.

```
Visualisasi Legenda Multi-Modal (Tampilan Antarmuka):
+-------------------------------------------------------------+
| LEGENDA DENAH ARSITEKTUR                                    |
| [Palet Ramp Viridis: Monotonik Rendah -> Tinggi Luminansi]  |
|                                                             |
|   Marker SVG        Warna sRGB    Luminansi    Kategori     |
|   -------------------------------------------------------   |
|   [ ====== ]        #440154       0.0189       Dinding      |
|   [ [    ] ]        #3B528B       0.0883       Cella        |
|   [  /\    ]        #21918C       0.2247       Tangga       |
|   [  ()    ]        #5EC962       0.4503       Shrine       |
|   [  <>    ]        #FDE725       0.7817       Sumbu        |
+-------------------------------------------------------------+
```

---

### 6.2 Aturan Aksesibilitas yang Diterapkan

1. **WCAG 2.1 Success Criterion 1.4.1 (Use of Color - Level A):**
   *Aturan:* Warna tidak boleh digunakan sebagai satu-satunya cara visual untuk menyampaikan informasi, mengindikasikan tindakan, mendorong respons, atau membedakan elemen visual.
   *Implementasi:* Garis dan siluet pada kanvas didukung oleh legenda dengan ikon marker SVG khusus: Dinding menggunakan garis horizontal (`<line>`), Cella menggunakan bujur sangkar (`<rect>`), Tangga menggunakan segitiga sama kaki (`<polygon>`), Shrine menggunakan lingkaran (`<circle>`), dan Sumbu menggunakan belah ketupat (`<polygon>`).
2. **Perceptual Uniformity (Uniformitas Perseptual):**
   Palet Viridis dirancang sedemikian rupa sehingga gradasi persepsi warna manusia sebanding secara linier dengan perubahan nilai data numerik, tanpa ada lompatan ilusi visual (*perceptual artifacts*).
3. **Simulasi Deuteranopia Real-Time Terintegrasi:**
   Pada dokumen `web/index.html` dan `web/cvd.css`, disediakan filter SVG `feColorMatrix` dengan matriks **Machado et al. 2009 untuk deuteranopia, severity 1.0** pada ruang Linear-RGB:
   ```html
   <filter id="deuteranopia" color-interpolation-filters="linearRGB">
     <feColorMatrix type="matrix" values="
       0.367322  0.860646 -0.227968 0 0
       0.280085  0.672501  0.047413 0 0
      -0.011820  0.042940  0.968881 0 0
       0         0         0        1 0">
     </feColorMatrix>
   </filter>
   ```

---

### 6.3 Bukti Monotonisitas Relatif Luminansi ($Y$)

Relatif luminansi ($Y$) dihitung sesuai standar CIE 1931 dan WCAG dari komponen sRGB yang telah di-linearisasi (meniadakan gamma $2.4$):
$$C_{\text{linear}} = \begin{cases} \frac{C_{\text{sRGB}}}{12.92}, & \text{bila } C_{\text{sRGB}} \le 0.04045 \\ \left(\frac{C_{\text{sRGB}} + 0.055}{1.055}\right)^{2.4}, & \text{bila } C_{\text{sRGB}} > 0.04045 \end{cases}$$
$$Y = 0.2126 R_{\text{linear}} + 0.7152 G_{\text{linear}} + 0.0722 B_{\text{linear}}$$

Tabel perbandingan nilai asli versus hasil simulasi filter deuteranopia:

| Kategori | Bentuk Marker | Nilai Hex Asli | RGB Asli | Relatif Luminansi Asli ($Y$) | Hex Sim. Deuteranopia | RGB Sim. Deuteranopia | Relatif Luminansi Deuteranopia ($Y$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dinding** | Garis (`line`) | `#440154` | `[68, 1, 84]` | **0,0189** | `#042752` | `[4, 39, 82]` | **0,0209** |
| **Cella** | Kotak (`rect`) | `#3b528b` | `[59, 82, 139]` | **0,0883** | `#30508a` | `[48, 80, 138]` | **0,0820** |
| **Tangga** | Segitiga (`polygon`) | `#21918c` | `[33, 145, 140]` | **0,2247** | `#787e8d` | `[120, 126, 141]` | **0,2084** |
| **Shrine** | Lingkaran (`circle`) | `#5ec962` | `[94, 201, 98]` | **0,4503** | `#beaf69` | `[190, 175, 105]` | **0,4263** |
| **Sumbu** | Diamond (`polygon`) | `#fde725` | `[253, 231, 37]` | **0,7817** | `#ffe939` | `[255, 233, 57]` | **0,7983** |

Perhitungan rasio kontras dijalankan dengan `node contrast.mjs` di `code/Module2`:

```text
min contrast normal: 1.66:1 (shrine vs sumbu)
min contrast deuteranopia: 1.78:1 (shrine vs sumbu)
```

#### Pembuktian Matematis Keterbacaan Monotonik
Dari tabel di atas, dapat dibuktikan secara matematis:
$$Y_{\text{dinding}} < Y_{\text{cella}} < Y_{\text{tangga}} < Y_{\text{shrine}} < Y_{\text{sumbu}}$$
$$0,0189 < 0,0883 < 0,2247 < 0,4503 < 0,7817 \quad (\text{Kondisi Normal})$$
$$0,0209 < 0,0820 < 0,2084 < 0,4263 < 0,7983 \quad (\text{Simulasi Deuteranopia})$$

**Kesimpulan Bukti:**  
Kurva luminansi relatif terbukti **meningkat secara monotonik murni (*strictly monotonic increasing*)** baik pada penglihatan normal trikromatik maupun pada penglihatan dikromatik deuteranopia. Namun klaim "tidak akan pernah tertukar" tidak dapat dipertahankan tanpa angka. Dari skrip `contrast.mjs` yang dijalankan pada lima warna kategori, **rasio kontras luminansi terkecil antar pasangan kategori adalah 1,66:1 (shrine vs sumbu) pada kondisi normal dan 1,78:1 (shrine vs sumbu) saat deuteranopia**. Kedua nilai berada di bawah ambang 3:1 WCAG 2.1 SC 1.4.11 untuk non-teks, sehingga warna saja tidak cukup: pembeda utama tetap bentuk marker SVG dan label teks, sedangkan warna berfungsi sebagai kanal tambahan yang urutannya tetap monotonik.

---

### 6.4 Refleksi & Keputusan Desain Aksesibilitas (TODO-USER)

> [!NOTE]
> Tuliskan pertimbangan desain dan analisismu pada bagian ini.

- **Pertanyaan Pemandu 1 (Kritik Terhadap Palet Tradisional):** Mengapa palet konvensional seperti "Rainbow" atau "Jet" (merah-kuning-hijau-biru) sangat berbahaya bila digunakan pada visualisasi dokumen teknik dan cagar budaya?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 2 (Dilema Estetika vs Aksesibilitas):** Bagaimana kamu menyeimbangkan antara tuntutan estetika arsitektur tradisional (yang kerap menggunakan warna tanah atau monokrom batu candi) dengan kebutuhan pembedaan kategori fungsional yang aksesibel?  
  *Jawaban:* TODO-USER

---

## 7. Keterbatasan

### 7.1 Keterbatasan Teknis Software Rasterizer

Meskipun perangkat lunak rasterizer mandiri pada repositori ini berhasil memenuhi kriteria akurasi fungsional E1–E5, terdapat sejumlah keterbatasan teknis intrinsik:

1. **Ketiadaan Subpixel Anti-Aliasing pada Primitif Standar:**  
   Implementasi garis standar (`lineBresenham`) dan rasterisasi segitiga Pineda (`triangle`) hanya mengevaluasi satu sampel di pusat pixel $(x+0.5, y+0.5)$ dengan hasil biner (0 atau 1). Hal ini memunculkan efek tangga (*jaggies*) pada garis miring denah. Meskipun algoritma anti-aliasing Xiaolin Wu linear-light telah diimplementasikan pada `wu.mjs`, metode ini baru terbatas pada garis terisolasi dan belum diintegrasikan ke dalam rasterisasi segitiga maupun antarmuka canvas WebGL.
2. **Dukungan Poligon Terbatas pada Kipas Segitiga Konveks (*Convex Triangle Fan*):**  
   Fungsi `renderPlan()` pada `plan.mjs` melakukan triangulasi poligon tertutup menggunakan *triangle fan* sederhana dari simpul awal ($v_0, v_i, v_{i+1}$). Pendekatan ini hanya valid untuk poligon cembung (*convex*). Jika denah bangunan memiliki ruangan cekung (*concave*), koridor berbentuk L/U, atau memiliki lubang interior (*inner holes* seperti kolam/taman terbuka), poligon akan mengalami kesalahan overlap dan menggambar area di luar batas dinding. Penanganan poligon kompleks membutuhkan algoritma partisi poligon eksternal seperti *Ear Clipping (Earcut)* atau *Constrained Delaunay Triangulation*.
3. **Eksekusi CPU Single-Threaded Tanpa Akselerasi Perangkat Keras:**  
   Framebuffer dialokasikan sebagai array mentah `Uint8ClampedArray` pada memori utama (RAM) dan dimanipulasi satu per satu oleh satu inti CPU. Ketiadaan instruksi vektor SIMD atau paralelisasi GPU compute membatasi throughput penggambaran ketika resolusi ditingkatkan ke skala tinggi (seperti 4K $3840 \times 2160$ atau 8K).
4. **Ketiadaan Buffer Kedalaman (*Depth / Z-Buffer*) dan Pengomposisian Transparansi:**  
   Sistem penulisan pixel menggunakan paradigma penimpaan langsung (*direct overwrite / painter's algorithm*). Jika terdapat beberapa elemen poligon yang saling tumpang tindih pada urutan gambar yang tidak terurut secara topologis, objek yang berada di bawah dapat secara tidak sengaja menimpa objek di atasnya.

---

### 7.2 Refleksi & Arah Pengembangan Lanjutan (TODO-USER)

> [!NOTE]
> Tuliskan evaluasi kritis dan refleksi pribadimu pada bagian ini.

- **Pertanyaan Pemandu 1 (Kelayakan Produksi):** Apakah arsitektur software rasterizer murni pada JavaScript layak dipakai pada aplikasi CAD komersial modern, ataukah perannya murni edukasional? Mengapa?  
  *Jawaban:* TODO-USER
- **Pertanyaan Pemandu 2 (Prioritas Fitur Selanjutnya):** Jika kamu memiliki waktu satu minggu tambahan untuk mengembangkan proyek ini, fitur optimasi apa yang akan kamu prioritaskan (misal: akselerasi WebGPU, anti-aliasing MSAA pada segitiga, atau triangulasi Earcut untuk ruangan berbentuk L)?  
  *Jawaban:* TODO-USER

---

## 8. Reproducibility

### 8.1 Lingkungan Toolchain Aktual

Pengujian dan verifikasi seluruh kode dalam laporan ini dilakukan pada lingkungan mesin berikut:

```powershell
# Verifikasi Sistem Operasi
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture
# Verifikasi Node & NPM
node --version
npm --version
# Verifikasi Pustaka Three.js
npm ls three --depth=0
```

| Komponen Lingkungan | Versi / Nilai Aktual | Keterangan Verifikasi |
| :--- | :--- | :--- |
| **Sistem Operasi** | Microsoft Windows 11 Home Single Language (Build 10.0.26200, 64-bit) | Windows PowerShell 5.1 |
| **Runtime Engine** | Node.js **v24.13.0** | Engine eksekusi JavaScript |
| **Package Manager** | npm **11.8.0** | Manajemen dependensi proyek |
| **Pustaka WebGL 3D** | Three.js **0.186.1** | Terkunci (*pinned*) pada `package.json` |
| **Browser Pengujian** | Google Chrome 155.0.8059.85 / Microsoft Edge 155.0.4283.62 | Pengujian Canvas Web Viewer |
| **Status Repositori Git** | Commit `8af131f` (Cabang `main`, *working tree clean*) | Repositori GitHub publik |

---

### 8.2 Transkrip Alur Kloning Bersih (*Clean Clone Workflow*)

Seluruh pengujian dapat direproduksi secara mandiri dari keadaan awal menggunakan langkah-langkah terminal berikut:

```bash
# 1. Kloning repositori publik
git clone https://github.com/venerdidnp/archplan-2d.git
cd archplan-2d

# 2. Pasang dependensi proyek
npm install

# 3. Jalankan rangkaian pengujian otomatis (16/16 lulus)
npm test

# 4. Jalankan pengujian mandiri Modul 2
cd code/Module2
node tests.mjs
node draw_square.mjs --mode outline
node draw_square.mjs --mode fill
node triangle_gap_bug.mjs
node draw_plan.mjs --w 800 --h 600 --fill --plan pusaka_plan.json
node compare.mjs out/plan_scratch.ppm plan_three.png
node bench.mjs pusaka_plan.json
node sample_centre_demo.mjs
node asterisk.mjs
node wu_demo.mjs

# 5. Jalankan web server lokal untuk melihat Web Viewer
cd ../..
npx serve web
# Buka peramban pada alamat http://localhost:3000
```

---

### 8.3 Transkrip Keluaran Uji Otomatis (`npm test`)

Keluaran asli eksekusi rangkaian tes unit lengkap:

```text
ok 1 - lineDDA (2,1)->(9,5) = 8 pixels (E2)
ok 2 - lineBresenham (2,1)->(9,5) = same 8 pixels (E3)
ok 3 - Bresenham handles all 8 octants (reflections give same length, endpoints included)
ok 4 - 24-spoke asterisk: spoke lengths equal within +-1
ok 5 - edge functions at (3,3) = (8,12,8); (5,5) and (1,4) outside (E4)
ok 6 - barycentric at (3,3) = (3/7,2/7,2/7), sums to 1; E5 interpolation = 20
ok 7 - 6x6 square split on y=x: top-left rule -> once=36 twice=0 gaps=0
ok 8 - without top-left rule -> twice=6
ok 9 - strict "> 0" -> gaps=6
ok 10 - sample-centre: 2x2 rect via centre rule = 4 pixels; corner test = 9 (E1)
ok 11 - square_fill is byte-identical to ref/square_fill_ref.ppm
ok 12 - asterisk 24 spokes: every spoke matches its expected Chebyshev length (delta <= 1)
ok 13 - Wu horizontal line is solid and matches Bresenham pixel positions
ok 14 - Wu shallow line: coverage sums to 1 in every column; endpoints full
ok 15 - Wu blend: 50% white on black is 128 in sRGB, 188 in linear light
ok 16 - plan_three.png matches out/plan_scratch.ppm: <0.1% different, no interior pixel differs

ALL CHECKS PASSED (16 ok)
```

---

### 8.4 Tautan Repositori & Live Deployment GitHub Pages

- **URL Repositori GitHub:**  
  [https://github.com/venerdidnp/archplan-2d](https://github.com/venerdidnp/archplan-2d)
- **URL Live Deployment GitHub Pages:**  
  [https://venerdidnp.github.io/archplan-2d/web/](https://venerdidnp.github.io/archplan-2d/web/)  
  *(Atau dapat diakses pada root [https://venerdidnp.github.io/archplan-2d/](https://venerdidnp.github.io/archplan-2d/))*
