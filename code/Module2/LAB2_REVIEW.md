# Lab 2 — Review, Verifikasi, dan Diagnosis

Catatan ini memakai `code/Module2` apa adanya. Semua output ditempel dari perintah yang dijalankan di mesin ini.

## 0. Cara menjalankan

```powershell
node tests.mjs
node triangle_gap_bug.mjs
node sample_centre_demo.mjs
node asterisk.mjs
node wu_demo.mjs
```

## 0.5 Berkas baru dan perubahannya

- `wu.mjs`: menghitung sampel coverage garis Wu dan mem-blend-nya ke framebuffer. `lineWuPixels()` memisahkan perhitungan coverage dari penulisan pixel agar bisa diuji; `drawLineWu()` menyediakan mode linear-light dan naive sRGB. Dipakai oleh `wu_demo.mjs` dan `tests.mjs`.
- `wu_demo.mjs`: merender satu garis dengan dua mode blend, mencetak pixel contoh, lalu membandingkan waktu Bresenham vs Wu. Tujuannya memberi bukti visual dan angka nyata untuk pitfall anti-aliasing.
- `sample_centre_demo.mjs`: membuat demo E1 pada grid 6×6, mencetak blok pusat vs blok sudut, dan menulis `out/sample_centre.ppm`. Tujuannya menunjukkan kolom/baris yang berlebih saat sampel diambil di sudut.
- `asterisk.mjs`: membuat 24 spoke 15°, mencetak panjang tiap spoke, dan menulis `out/asterisk.ppm`. Tujuannya menguji kesadaran oktan dan panjang pixel terhadap panjang Chebyshev yang diharapkan.
- `LAB2_REVIEW.md`: dokumen ini, berisi review baris demi baris, pertanyaan viva, output verifikasi, status referensi, dan temuan top-left. Tujuannya menjadi bahan belajar/viva, bukan menggantikan laporanmu.
- `tests.mjs` (diubah): menambahkan empat asersi untuk asterisk dan Wu. Tujuannya agar perilaku baru ikut terjaga saat kode diubah.

## 1. Diagnosis gap — hanya output, belum ada penjelasan

Perintah:

```powershell
node triangle_gap_bug.mjs
```

Output apa adanya:

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

### TODO-USER — diagnosis

Tulis diagnosismu di sini sebelum membaca bagian review `triangle`/`isTopLeft`:

- Penyebab pixel dobel pada `naive`: **TODO-USER**
- Penyebab celah pada `strict`: **TODO-USER**
- Mengapa `fixed` memberi 144/0/0: **TODO-USER**

> Setelah kamu menulis, aku akan memeriksa dan mengoreksi bila salah. Aku belum menjelaskan penyebabnya di dokumen ini.

## 2. Review `raster.mjs` baris demi baris

### `lineDDA(A, B)` — baris 35–46

```js
35 export function lineDDA(A, B) {
36   const [x0, y0] = A, [x1, y1] = B;
37   const dx = x1 - x0, dy = y1 - y0;
38   const steps = Math.max(Math.abs(dx), Math.abs(dy));
39   const pts = [];
40   if (steps === 0) return [[x0, y0]];
41   const ix = dx / steps, iy = dy / steps;
42   for (let k = 0; k <= steps; k++) {
43     pts.push([Math.round(x0 + k * ix), Math.round(y0 + k * iy)]);
44   }
45   return pts;
46 }
```

- 35: menerima dua endpoint `[x,y]`.
- 36: memecah endpoint menjadi `x0,y0` dan `x1,y1`.
- 37: menghitung selisih tiap sumbu.
- 38: jumlah langkah = sumbu terpanjang; ini yang menentukan jumlah pixel.
- 39: wadah hasil.
- 40: garis titik-titik (endpoint sama) mengembalikan satu pixel.
- 41: increment per langkah; sumbu cepat menjadi ±1, sumbu lambat menjadi slope.
- 42: loop inklusif dari `k=0` sampai `k=steps`, jadi ada `steps+1` sampel.
- 43: posisi pecahan `x0+k*ix`, `y0+k*iy` dibulatkan ke pixel terdekat.
- 44: menutup loop.
- 45: mengembalikan daftar pixel.
- 46: menutup fungsi.

Catatan: DDA memakai pembagian dan floating-point; hasilnya bergantung pada `Math.round`.

### `lineBresenham(A, B)` — baris 52–70

```js
52 export function lineBresenham(A, B) {
53   let [x0, y0] = A, [x1, y1] = B;
54   const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
55   if (steep) { [x0, y0] = [y0, x0]; [x1, y1] = [y1, x1]; }
56   if (x0 > x1) { [x0, x1] = [x1, x0]; [y0, y1] = [y1, y0]; }
57   const dx = x1 - x0;
58   let dy = y1 - y0;
59   const ystep = dy < 0 ? -1 : 1;
60   dy = Math.abs(dy);
61   let D = 2 * dy - dx;            // decision variable (integer)
62   let y = y0;
63   const pts = [];
64   for (let x = x0; x <= x1; x++) {
65     pts.push(steep ? [y, x] : [x, y]);
66     if (D > 0) { y += ystep; D += 2 * (dy - dx); }
67     else { D += 2 * dy; }
68   }
69   return pts;
70 }
```

- 52: menerima dua endpoint.
- 53: endpoint dibuat mutable karena nanti ditukar.
- 54: mendeteksi garis curam; sumbu y lebih panjang dari x.
- 55: untuk garis curam, x dan y ditukar agar algoritma selalu berjalan pada sumbu x.
- 56: memastikan `x0 <= x1`; jika tidak, kedua endpoint ditukar.
- 57: panjang horizontal setelah normalisasi.
- 58: selisih vertikal bertanda.
- 59: arah langkah y (+1 atau -1).
- 60: `dy` dibuat positif untuk decision variable.
- 61: nilai keputusan awal `D=2dy-dx`, semuanya integer.
- 62: posisi y berjalan.
- 63: wadah hasil.
- 64: loop per kolom x.
- 65: jika tadinya curam, koordinat dikembalikan ke orientasi asli.
- 66: jika `D>0`, garis sudah cukup miring untuk menaikkan/menurunkan y; D diperbarui dengan `2(dy-dx)`.
- 67: jika tidak, y tetap; D diperbarui dengan `2dy`.
- 68: menutup loop.
- 69: mengembalikan daftar pixel.
- 70: menutup fungsi.

Catatan: tidak ada pembagian atau floating-point di dalam loop; hanya tambah, kurang, dan banding.

### `edge(ax, ay, bx, by, px, py)` — baris 78–79

```js
78 export const edge = (ax, ay, bx, by, px, py) =>
79   (bx - ax) * (py - ay) - (by - ay) * (px - ax);
```

- 78: fungsi panah dengan enam argumen: edge `A→B` dan titik `P`.
- 79: komponen-z cross product `(B−A)×(P−A)`; hasilnya linear terhadap `P`.
- Tanda: positif/negatif menentukan sisi garis; nol berarti tepat di garis.
- Besarnya: dua kali luas segitiga `ABP`.

### `barycentric(A, B, C, P)` — baris 89–95

```js
89 export function barycentric(A, B, C, P) {
90   const total = edge(A[0], A[1], B[0], B[1], C[0], C[1]);
91   const lA = edge(B[0], B[1], C[0], C[1], P[0], P[1]) / total;
92   const lB = edge(C[0], C[1], A[0], A[1], P[0], P[1]) / total;
93   const lC = edge(A[0], A[1], B[0], B[1], P[0], P[1]) / total;
94   return [lA, lB, lC];
95 }
```

- 89: menerima tiga vertex dan titik `P`.
- 90: `total = E_AB(C)`, yaitu dua kali luas segitiga.
- 91: bobot `A` memakai edge di depannya, `E_BC(P)`, dibagi total.
- 92: bobot `B` memakai `E_CA(P)`.
- 93: bobot `C` memakai `E_AB(P)`.
- 94: mengembalikan triplet bobot.
- 95: menutup fungsi.
- Jumlah ketiganya = 1 (dalam floating-point bisa 0.9999999999999999).

### `triangle(fb, A, B, C, rgb, opts)` — baris 98–127

```js
 98 export function triangle(fb, A, B, C, rgb, opts = {}) {
 99   const { topLeft = true, strict = false, autoFlip = true, onPixel = null } = opts;
100   const total = edge(A[0], A[1], B[0], B[1], C[0], C[1]);
101   if (total === 0) return;
102   if (total < 0) {
103     if (!autoFlip) return;
104     [B, C] = [C, B];
105   }
106   const w = fb ? fb.w : opts.w, h = fb ? fb.h : opts.h;
107   const minX = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0])));
108   const maxX = Math.min(w - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
109   const minY = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1])));
110   const maxY = Math.min(h - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
111   const tlBC = isTopLeft(B[0], B[1], C[0], C[1]);
112   const tlCA = isTopLeft(C[0], C[1], A[0], A[1]);
113   const tlAB = isTopLeft(A[0], A[1], B[0], B[1]);
114   const ok = (e, tl) => (strict ? e > 0 : topLeft ? (e > 0 || (e === 0 && tl)) : e >= 0);
115   for (let y = minY; y <= maxY; y++) {
116     for (let x = minX; x <= maxX; x++) {
117       const px = x + 0.5, py = y + 0.5;                 // SAMPLE CENTRE
118       const eA = edge(B[0], B[1], C[0], C[1], px, py);  // ~ lambda_A
119       const eB = edge(C[0], C[1], A[0], A[1], px, py);  // ~ lambda_B
120       const eC = edge(A[0], A[1], B[0], B[1], px, py);  // ~ lambda_C
121       if (ok(eA, tlBC) && ok(eB, tlCA) && ok(eC, tlAB)) {
122         if (fb) fb.set(x, y, rgb);
123         if (onPixel) onPixel(x, y);
124       }
125     }
126   }
127 }
```

- 98: menerima framebuffer, tiga vertex, warna, dan opsi.
- 99: default `topLeft=true`, `strict=false`, `autoFlip=true`, tanpa callback.
- 100: menghitung total edge; harus positif menurut konvensi.
- 101: segitiga degenerate (luas 0) dilewati.
- 102–105: jika total negatif, `B` dan `C` ditukar agar total positif; bisa dimatikan dengan `autoFlip:false`.
- 106: ukuran framebuffer; jika `fb` null, ambil dari `opts`.
- 107–110: bounding box dibatasi ke segitiga dan ke framebuffer; ini mencegah loop seluruh layar.
- 111–113: mengecek apakah tiap edge adalah top/left menurut `isTopLeft`.
- 114: aturan penerimaan pixel:
  - `strict`: hanya `E>0`;
  - `topLeft`: `E>0`, atau `E==0` bila edge top/left;
  - tanpa topLeft: `E>=0`.
- 115–116: loop hanya di dalam bounding box.
- 117: **sample centre** `(x+0.5, y+0.5)`.
- 118–120: evaluasi tiga edge function di pusat pixel.
- 121: pixel diterima jika ketiga edge lolos aturan.
- 122: menulis warna bila framebuffer tersedia.
- 123: callback `onPixel` untuk menghitung coverage.
- 124–127: menutup loop dan fungsi.

### `isTopLeft(xx, xy, yx, yy)` — baris 84–87

```js
84 export const isTopLeft = (xx, xy, yx, yy) => {
85   const dx = yx - xx, dy = yy - xy;
86   return (dy === 0 && dx > 0) || dy < 0;
87 };
```

- 84: edge dari `(xx,xy)` ke `(yx,yy)`.
- 85: komponen arah edge.
- 86: top jika horizontal dan `dx>0`; left jika `dy<0`.
- 87: menutup fungsi.

## 3. Pertanyaan viva (3 per fungsi, belum dijawab)

### `lineDDA`

1. Mengapa jumlah langkah memakai `max(|dx|,|dy|)` dan bukan `|dx|+|dy|`?
2. Apa yang terjadi jika `Math.round` diganti `Math.floor`, dan mengapa itu bukan DDA yang sama?
3. Bagaimana DDA menangani garis vertikal murni dan garis dengan panjang nol?

### `lineBresenham`

1. Mengapa `D=2dy-dx` cukup disimpan sebagai integer, dan apa arti tanda `D`?
2. Mengapa garis curam menukar x/y, dan mengapa endpoint ditukar bila `x0>x1`?
3. Apakah Bresenham selalu menghasilkan pixel yang sama dengan DDA? Kapan bisa berbeda?

### `edge`

1. Apa arti tanda `E_AB(P)` pada layar y-down dengan total `E_AB(C)>0`?
2. Mengapa `|E_AB(P)|` sama dengan dua kali luas segitiga `ABP`?
3. Mengapa sifat linear `E` memungkinkan evaluasi inkremental per pixel?

### `triangle`

1. Mengapa sampel diambil di `(x+0.5, y+0.5)`, dan apa akibatnya bila diambil di `(x,y)`?
2. Bagaimana bias top-left membuat dua segitiga yang berbagi edge tidak menghasilkan double/gap?
3. Mengapa bounding box perlu di-clamp, dan apa risiko `ceil` tanpa clamp?

### `barycentric`

1. Mengapa setiap edge function dibagi `total`, dan berapa jumlah ketiga bobot?
2. Bobot mana yang berpasangan dengan vertex `A`, dan edge mana yang dipakai?
3. Bagaimana bobot ini dipakai untuk menginterpolasi warna atau depth, dan mengapa `total` tetap denominator-nya?

## 4. Verifikasi E2/E3/E4/E5 (output aktual)

```text
DDA      : [[2,1],[3,2],[4,2],[5,3],[6,3],[7,4],[8,4],[9,5]] count=8
Bresenham: [[2,1],[3,2],[4,2],[5,3],[6,3],[7,4],[8,4],[9,5]] count=8
equal    : true
total E(A,B,C) = 28
E at [3,3] = [8,12,8]
E at [5,5] = [16,-4,16]
E at [1,4] = [15,19,-6]
barycentric (3,3) = [0.42857142857142855,0.2857142857142857,0.2857142857142857] sum=0.9999999999999999
```

Barycentric `(3,3)` = `(3/7, 2/7, 2/7)`. E5 memakai bobot berbeda, `(0.5,0.25,0.25)`:

```text
E5 value    = 20
```

Jadi: 8 pixel untuk DDA dan Bresenham, edge `(8,12,8)`, `(5,5)` dan `(1,4)` di luar, barycentric `(3/7,2/7,2/7)`, dan E5 = 20.

## 5. Status referensi

- `ref/tri_ref.ppm` **tidak ada** di repo, di `Module2.zip`, maupun dalam pencarian `Get-ChildItem -Recurse -Filter tri_ref.ppm` di `Documents`, `Desktop`, dan `Downloads`. Tidak ada `[PATH]` referensi dari dosen yang diberikan.
- `ref/square_fill_ref.ppm` ada dan berasal dari arsip starter `Module2.zip`, bukan dari output yang kita jalankan.
- Karena `tri_ref.ppm` tidak ada, tidak ada uji “cocok referensi” untuk segitiga. Membuatnya dari output `triangle()` sendiri hanya akan menjadi **self-consistency**, bukan referensi eksternal. Aku tidak membuat file itu.
- Kalau dosen/modul memberi path `tri_ref.ppm`, kirim path-nya; baru bisa dicocokkan pixel-demi-pixel.

## 6. Sample-centre E1

Perintah: `node sample_centre_demo.mjs`

```text
centre rule: 4 pixels [[1,1],[2,1],[1,2],[2,2]]
corner rule: 9 pixels [[1,1],[2,1],[3,1],[1,2],[2,2],[3,2],[1,3],[2,3],[3,3]]
extra (corner-only): 5 pixels [[3,1],[3,2],[1,3],[2,3],[3,3]]
grid (C=centre, X=corner-only, .=none):
  ......
  .CCX..
  .CCX..
  .XXX..
  ......
  ......
wrote out/sample_centre.ppm (white=centre, red=extra corner-only)
```

Kolom yang berlebih: `x=3` (baris 1,2,3). Baris yang berlebih: `y=3` (kolom 1,2,3). Irisan `(3,3)` dihitung sekali, sehingga total tambahan = 3+3−1 = 5 pixel.

## 7. Top-left: kode vs dokumen §9

Kode `raster.mjs:84-87` memakai:

```js
const dx = yx - xx, dy = yy - xy;
return (dy === 0 && dx > 0) || dy < 0;
```

Dokumen §9 (dan Listing 2 di PDF) menulis top jika `dy===0 && dx<0`, left jika `dy>0`—kebalikannya.

Hitungan manual pada edge bersama diagonal dari `triangle_gap_bug.mjs`:

- `T1 = (1,1),(13,1),(13,13)`, edge bersama `C→A = (13,13)→(1,1)`, `dx=-12`, `dy=-12`.
- `T2 = (1,1),(13,13),(1,13)`, edge bersama `A→B = (1,1)→(13,13)`, `dx=12`, `dy=12`.
- Di `P=(1.5,1.5)`, kedua edge function bernilai `0` (tepat di edge).
- Kode: `T1` melihat `dy<0` → left → bias `0` → pixel diterima; `T2` melihat `dy>0` → bukan top/left → bias `-1` → pixel ditolak.
- Dokumen: `T1` → bias `-1` → ditolak; `T2` → bias `0` → diterima.

Hasil coverage kedua aturan:

```text
kode raster.mjs: {"once":144,"twice":0,"gaps":0}
  T1 edge C->A dx=-12 dy=-12 bias=0  T2 edge A->B dx=12 dy=12 bias=-1
rumus dokumen §9: {"once":144,"twice":0,"gaps":0}
  T1 edge C->A dx=-12 dy=-12 bias=-1  T2 edge A->B dx=12 dy=12 bias=0
```

Kesimpulan: definisi dokumen memang terbalik terhadap kode dan terhadap parentetiknya sendiri (“interiornya di bawahnya” untuk edge horizontal). Namun watertightness **tidak** rusak selama aturan yang sama dipakai konsisten untuk kedua segitiga: edge bersama punya arah berlawanan, jadi aturan mana pun yang memilih satu orientasi akan memberi pixel itu ke tepat satu segitiga. Yang berubah adalah segitiga mana yang memiliki pixel edge (penting bila warna kedua segitiga berbeda). Kode `raster.mjs` cocok dengan definisi top-left untuk y-down/total>0; teks §9 yang salah.

## 8. Asterisk 24 jari-jari

Perintah: `node asterisk.mjs`

```text
spokes: 24, centre (50,50), R=40, 15deg apart
lengths: 41, 40, 36, 29, 36, 40, 41, 40, 36, 29, 36, 40, 41, 40, 36, 29, 36, 40, 41, 40, 36, 29, 36, 40
min=29 max=41
per-spoke length == max(|dx|,|dy|)+1: true
wrote out/asterisk.ppm (101x101)
```

Catatan penting: jumlah pixel tiap spoke **tidak sama** (29–41) karena `lineBresenham` memakai metrik Chebyshev; spoke diagonal memiliki `max(|dx|,|dy|)` lebih kecil daripada spoke horizontal. Yang benar diuji adalah kesesuaian tiap spoke dengan panjang yang diharapkan untuk sudutnya, bukan kesamaan mutlak semua spoke. Tes 4 di `tests.mjs` sudah memakai pendekatan ini.

## 9. Pitfall: Wu anti-aliasing linear-light

Pilihan: **Wu linear-light**. Alasan: bounding box clamp (`raster.mjs:107-110`) dan auto-flip winding (`raster.mjs:102-105`) sudah ada di starter; Wu belum.

Berkas baru:

- `wu.mjs`: `lineWuPixels()` menghitung dua sampel coverage per kolom/baris di sekitar garis; `drawLineWu()` mem-blend warna ke framebuffer, default di linear light lewat konversi sRGB→linear→sRGB.
- `wu_demo.mjs`: merender satu garis dua kali (naive vs linear), mencetak pixel contoh, lalu membandingkan waktu Bresenham vs Wu pada 500 garis di framebuffer 800×600.
- `sample_centre_demo.mjs`: demo E1, mencetak grid 6×6 dan menulis `out/sample_centre.ppm`.
- `asterisk.mjs`: membuat 24 spoke 15°, mengecek panjang tiap spoke terhadap panjang Chebyshev yang diharapkan, dan menulis `out/asterisk.ppm`.

Output `node wu_demo.mjs`:

```text
sample pixel (9,8) coverage=0.500000
  naive sRGB blend : [128,128,128]
  linear-light     : [188,188,188]
wrote out/wu_naive.ppm and out/wu_linear.ppm (64x64)

benchmark: 500 lines, 800x600, median of 15 runs
  Bresenham          : 10.39 ms
  Wu linear-light    : 101.60 ms  (9.8x Bresenham)
  Wu naive sRGB      : 37.66 ms  (3.6x Bresenham)
```

Tes baru di `tests.mjs`:

```text
ok 13 - Wu horizontal line is solid and matches Bresenham pixel positions
ok 14 - Wu shallow line: coverage sums to 1 in every column; endpoints full
ok 15 - Wu blend: 50% white on black is 128 in sRGB, 188 in linear light
ALL CHECKS PASSED (15 ok)
```

Fuzz 2000 garis acak (koordinat −10..10): `fuzz bad = 0`—tidak ada NaN, coverage di luar [0,1], atau jumlah coverage per sumbu mayor yang menyimpang dari 1.

Catatan angka: timing bervariasi antar mesin/run; yang dilaporkan adalah median 15 run pada mesin ini. Wu linear-light ~9× lebih lambat dari Bresenham karena setiap pixel membaca framebuffer dan melakukan konversi warna; ini trade-off untuk edge yang tidak bergerigi.

Catatan implementasi: ini versi Wu-style untuk endpoint integer—endpoint diperlakukan sebagai pusat pixel dan tidak memakai `xgap` endpoint kanonik. Karena itu garis horizontal/vertikal tetap solid dan endpoint mendapat coverage penuh, konsisten dengan `lineBresenham`.
