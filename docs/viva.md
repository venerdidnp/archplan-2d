# Panduan Ujian Viva: Modul 2 — Rendering Pipeline & Primitif 2D

Dokumen ini disusun sebagai persiapan ujian lisan (*viva voce*) untuk tugas analisis Modul 2 pada repositori [archplan-2d](https://github.com/venerdidnp/archplan-2d). Dokumen ini memuat **15 pertanyaan viva strategis** dengan petunjuk jawaban padat satu kalimat, serta **3 commit terpenting** di repositori yang paling layak dipresentasikan kepada dosen penguji.

---

## Bagian I: 15 Pertanyaan Viva & Petunjuk Jawaban Satu Kalimat

### Kelompok A: "Mengapa Ini dan Bukan Itu?" (Konsep Inti Primitif & Pipeline)

1. **Mengapa memilih algoritma Bresenham berbasis integer dan bukan DDA berbasis floating-point?**  
   *Petunjuk Jawaban:* Bresenham mengeliminasi operasi pembagian dan pembulatan floating-point pada loop inti dengan menggantinya menjadi penambahan dan pergeseran bilangan bulat murni ($D = 2\Delta y - \Delta x$), sehingga jauh lebih cepat dan deterministik tanpa akumulasi galat presisi (*floating-point drift*).

2. **Mengapa titik sampel pixel wajib diambil di pusat $(x+0.5, y+0.5)$ dan bukan di sudut integer $(x, y)$?**  
   *Petunjuk Jawaban:* Pengambilan sampel di pusat pixel $(x+0.5, y+0.5)$ merepresentasikan rata-rata area integrasi domain kontinu pixel secara simetris, mencegah pergeseran half-pixel offset, dan menghindari penambahan satu baris/kolom semu yang terjadi jika batas poligon tepat berimpit dengan grid integer sudut.

3. **Mengapa aturan Top-Left (*Top-Left fill convention*) mutlak diperlukan saat dua segitiga berbagi sisi diagonal?**  
   *Petunjuk Jawaban:* Aturan Top-Left memecahkan ambiguitas kepemilikan pixel pada garis batas bersama dengan memberikan *bias 0* secara unik pada sisi atas/kiri dan *bias -1* pada sisi bawah/kanan, menjamin sifat *watertight* (tidak ada pixel yang digambar dobel dan tidak ada celah bocor).

4. **Mengapa blending anti-aliasing Xiaolin Wu wajib dihitung pada ruang Linear-Light dan bukan langsung pada nilai sRGB?**  
   *Petunjuk Jawaban:* Nilai sRGB non-linier terkompresi oleh fungsi transfer gamma ($\approx 2,2$), sehingga pencampuran cakupan coverage secara naif pada sRGB akan menghasilkan garis yang tampak terlalu tipis dan kehilangan energi foton pada latar belakang gelap (menghasilkan nilai 128 alih-alih 188 pada coverage 50%).

5. **Mengapa pembalikan sumbu $y$ ($- y \cdot \text{scale}$) harus dilakukan pada tahap Vertex Processing denah?**  
   *Petunjuk Jawaban:* Pembalikan sumbu diperlukan untuk menjembatani perbedaan sistem koordinat Kartesian tangan-kanan pada CAD arsitektur ($+y$ ke atas/utara) dengan sistem koordinat raster layar komputer ($+y$ bertambah ke bawah/selatan) agar denah tidak terbalik atau keluar batas kanvas.

6. **Mengapa palet Viridis dipilih sebagai standar warna visualisasi denah dan bukan palet Rainbow/Jet?**  
   *Petunjuk Jawaban:* Viridis dirancang secara perseptual seragam (*perceptually uniform*) dengan kurva luminansi relatif yang meningkat secara monotonik murni, sehingga tidak menciptakan kontur batas semu dan tetap terbaca jelas oleh individu buta warna maupun saat dicetak monokrom hitam-putih.

7. **Mengapa prinsip pengkodean ganda (*redundant encoding*) dengan bentuk marker SVG unik wajib diterapkan di samping warna?**  
   *Petunjuk Jawaban:* Sesuai panduan aksesibilitas WCAG 2.1 Kriteria Sukses 1.4.1, informasi kategori visual tidak boleh hanya bergantung pada persepsi warna, sehingga bentuk geometris marker (garis, kotak, segitiga, lingkaran, belah ketupat) memberikan jalur pembedaan independen bagi pengguna dengan gangguan penglihatan warna total.

8. **Mengapa fungsi sisi (*edge function*) Juan Pineda dapat langsung dinormalisasi menjadi koordinat barisentrik?**  
   *Petunjuk Jawaban:* Nilai fungsi sisi $E(A, B, P)$ sebanding secara linier dengan dua kali luas segitiga bertanda sub-daerah $ABP$, sehingga pembagian nilai sisi terhadap luas total segitiga $E(A, B, C)$ secara alami menghasilkan bobot koordinat barisentrik $\lambda_A, \lambda_B, \lambda_C$ yang berjumlah tepat 1,0.

9. **Mengapa forward rasterization $95\times$ lebih cepat daripada backward ray-distance testing pada denah dengan 28 segmen?**  
   *Petunjuk Jawaban:* Forward rasterization hanya memproses piksel yang benar-benar dilalui oleh segmen garis ($\mathcal{O}(N \cdot L)$), sedangkan backward testing memindai seluruh $480.000$ piksel kanvas dan menguji jarak proyeksi kuadratik terhadap setiap segmen secara berulang ($\mathcal{O}(W \cdot H \cdot N) = 13,44\text{ juta iterasi}$).

---

### Kelompok B: "Bagaimana Jika Target-nya WebGPU / Canvas 4K?" (Skalabilitas & Arsitektur Modern)

10. **Bagaimana jika target resolusi rendering ditingkatkan ke Canvas 4K ($3840 \times 2160$): di mana letak *bottleneck* utama software rasterizer CPU kita?**  
    *Petunjuk Jawaban:* Pada resolusi 4K dengan $\approx 8,3$ juta pixel (payload memori buffer $\approx 25\text{ MB}$ per frame), *bottleneck* utama berpindah dari kalkulasi matematika ke *memory bandwidth* dan latensi cache CPU single-threaded saat menulis byte berurutan ke `Uint8ClampedArray`.

11. **Bagaimana jika arsitektur rendering dipindahkan ke WebGPU: bagaimana struktur memori framebuffer harus dirancang ulang?**  
    *Petunjuk Jawaban:* Framebuffer array JavaScript di RAM utama harus diganti dengan `GPUTexture` teralokasi di VRAM GPU atau `GPUBuffer` bertipe *storage buffer*, di mana penulisan warna dilakukan secara masif paralel melalui fragmen shader atau compute shader tanpa keterlibatan transfer memori CPU-GPU per pixel.

12. **Bagaimana jika algoritma backward mapping (pengujian jarak) diimplementasikan pada WebGPU Compute Shader alih-alih CPU JavaScript?**  
    *Petunjuk Jawaban:* Backward mapping akan mengalami lonjakan performa dramatis (mencapai ratusan frame per detik) karena setiap pixel pada layar $800 \times 600$ dapat dieksekusi secara paralel independen oleh ribuan *thread execution units* (SIMD workgroups) pada GPU.

13. **Bagaimana jika denah arsitektur memiliki 10 juta segmen mikro pada resolusi 4K: kapan titik impas (*break-even point*) efisiensi forward vs backward berbalik?**  
    *Petunjuk Jawaban:* Backward mapping berbasis GPU dengan akselerasi spasial (seperti BVH atau uniform spatial grid) akan melampaui forward rasterizer ketika jumlah primitif sangat padat sehingga biaya penelusuran hierarki spasial per pixel ($\mathcal{O}(\log N)$) lebih murah daripada memproyeksikan jutaan geometri yang memicu *massive vertex transformation* dan *overdraw*.

14. **Bagaimana jika denah bangunan memiliki ruangan cekung (*concave*) atau memiliki void/taman di tengah (*inner holes*): apa yang rusak pada fungsi `triangle()` saat ini dan bagaimana solusinya?**  
    *Petunjuk Jawaban:* Pendekatan kipas segitiga (*triangle fan*) saat ini akan bocor dan menggambar area di luar dinding cekung, sehingga diperlukan algoritma partisi poligon non-trivial seperti *Ear Clipping (Earcut)* atau *Constrained Delaunay Triangulation* sebelum primitif diserahkan ke tahap rasterisasi.

15. **Bagaimana jika pipeline grafis modern memerlukan penanganan transparansi dinding kaca dan tumpukan lantai bertingkat secara akurat?**  
    *Petunjuk Jawaban:* Diperlukan penambahan *Depth Buffer (Z-Buffer)* 24/32-bit untuk uji kedalaman geometri non-transparan (*early depth testing*) dikombinasikan dengan pengurutan poligon dari belakang ke depan (*back-to-front sorting*) atau teknik *Order-Independent Transparency (OIT)* untuk blending warna alpha.

---

## Bagian II: 3 Commit Terpenting di Repositori & Alasan Teknisnya

Berikut adalah 3 commit dalam riwayat Git repositori `archplan-2d` yang paling representatif, memiliki bobot teknis tertinggi, dan paling layak dipaparkan secara mendalam saat sesi ujian viva:

---

### 1. Commit `7c5eabf`: Implementasi Fondasi Rasterizer From-Scratch & Tes E1–E5
- **Pesan Commit:** `feat(module2): tambah rasteriser starter dan tes Modul 2`
- **Hash Singkat:** `7c5eabf`
- **Tanggal:** 21 Oktober 2026, 15:58 WIB

#### Mengapa Commit Ini Layak Dijelaskan?
Commit ini merupakan batu fondasi matematis dan algoritmik dari seluruh proyek. Tanpa ketergantungan pada pustaka rendering eksternal atau elemen HTML `<canvas>`, commit ini membangun seluruh pipeline perangkat lunak murni dari nol:
1. **Implementasi Algoritma Garis:** Mengodekan `lineDDA` dan `lineBresenham` lengkap dengan normalisasi 8 oktan.
2. **Rasterisasi Segitiga Pineda:** Mengimplementasikan fungsi sisi `edge()`, evaluasi koordinat barisentrik `barycentric()`, serta penanganan aturan kepemilikan sisi bersama `isTopLeft()`.
3. **Verifikasi Kuantitatif:** Mengintegrasikan suite pengujian unit awal (`tests.mjs`) yang memverifikasi persamaan analitis E1 (sample centre 4 vs 9 pixel), E2-E3 (garis 8 pixel), E4 (edge function segitiga), dan E5 (interpolasi barisentrik = 20), serta pencocokan byte-identical bujur sangkar terhadap referensi.

#### Poin Kunci yang Harus Dipaparkan ke Penguji:
- Bagaimana `Framebuffer` mengelola array byte linier $W \times H \times 3$ tanpa abstraction layer.
- Mekanisme matematika fungsi sisi Pineda dan pembuktian bahwa titik berada di dalam segitiga jika ketiga fungsi sisi memiliki tanda yang seragam.
- Struktur pembuktian otomatis E1–E5 sebagai bukti keabsahan implementasi.

---

### 2. Commit `76152de`: Penguatan Diagnosis Pitfall & Anti-Aliasing Xiaolin Wu Linear-Light
- **Pesan Commit:** `docs: tambah catatan toolchain dan sumber Lab 1 ... feat: tambah review Lab 2 dan anti-aliasing Wu`
- **Hash Singkat:** `76152de`
- **Tanggal:** 21 Oktober 2026, 19:18 WIB

#### Mengapa Commit Ini Layak Dijelaskan?
Commit ini membuktikan kedalaman analisis grafika komputer dan pemahaman terhadap fenomena kegagalan rasterisasi (*pitfalls*) tingkat lanjut:
1. **Implementasi Anti-Aliasing Xiaolin Wu (`wu.mjs`):** Memisahkan kalkulasi sampel cakupan pecahan garis dari penulisan framebuffer, serta membuktikan pentingnya pengomposisian warna pada ruang energi foton nyata (*Linear-Light Blending*) vs kompresi non-linier sRGB.
2. **Koreksi Kritis Aturan Top-Left:** Menemukan dan mendokumentasikan kontradiksi matematis antara teks modul §9 dengan orientasi koordinat layar $y$-bawah, membuktikan bahwa kode sumber adalah implementasi yang secara geometris presisi.
3. **Eksperimen Spasial Komprehensif:** Menyediakan demo visual pembuktian distorsi sampel sudut pada `sample_centre_demo.mjs` serta analisis metrik Chebyshev pada roda bintang 24-jari-jari (`asterisk.mjs`).
4. **Validasi Skala Penuh:** Meningkatkan jumlah pengujian unit dari 11 menjadi 15 asersi kelulusan 100% (`ALL CHECKS PASSED (15 ok)`).

#### Poin Kunci yang Harus Dipaparkan ke Penguji:
- Mengapa pencampuran 50% putih di atas hitam menghasilkan nilai integer 188 pada ruang linier, sedangkan pada sRGB naif keliru menghasilkan 128.
- Analisis matematis mengapa variasi panjang spoke asterisk (29–41 pixel) bukan sebuah bug, melainkan konsekuensi logis dari geometri metrik Chebyshev pada grid diskrit.
- Bukti pemecahan masalah *crack* dan *double-draw* pada pengujian diagonal `triangle_gap_bug.mjs`.

---

### 3. Commit `8af131f`: Integrasi Web Viewer Three.js, Aksesibilitas Viridis & Simulasi Deuteranopia
- **Pesan Commit:** `feat(web): tambah web viewer Three.js, legenda aksesibel viridis, simulasi deuteranopia, dan ekspor plan_three`
- **Hash Singkat:** `8af131f`
- **Tanggal:** 21 Oktober 2026, 22:34 WIB

#### Mengapa Commit Ini Layak Dijelaskan?
Commit ini mengangkat proyek dari sekadar eksperimen rasterizer konsol menjadi aplikasi penampil denah arsitektur interaktif modern yang siap pakai dan berstandar industri:
1. **Arsitektur Dual-Pipeline:** Mengintegrasikan pemodelan denah arsitektur berbasis data JSON (`myplan.json`) yang dapat dikonsumsi secara serentak oleh *software rasterizer* CPU maupun engine akselerasi WebGL/Three.js (`viewer.mjs`).
2. **Kepatuhan Aksesibilitas Universal (WCAG 2.1 SC 1.4.1):** Merancang antarmuka legenda multi-modal dengan palet Viridis strictly monotonic dan 5 bentuk ikon marker SVG independen (garis, persegi, segitiga, lingkaran, diamond).
3. **Simulasi CVD Real-Time:** Menerapkan filter SVG `feColorMatrix` dengan matriks proyeksi warna linear-RGB terkalibrasi untuk memverifikasi keterbacaan denah pada spektrum buta warna deuteranopia secara langsung di browser.
4. **Verifikasi Diff Kuantitatif:** Menyediakan mekanisme ekspor `plan_three.png` dan skrip komparasi citra otomatis (`compare.mjs`) yang membuktikan kesesuaian struktural 98,05% SSIM 0,994 antara engine CPU mandiri dan pustaka standar WebGL.

#### Poin Kunci yang Harus Dipaparkan ke Penguji:
- Bagaimana arsitektur *dual-pipeline* memvalidasi kebenaran software rasterizer mandiri dengan menjadikannya pembanding terhadap engine standar industri Three.js.
- Pembuktian matematis bahwa nilai relatif luminansi $Y$ dari kelima kategori denah tetap bertingkat secara monotonik murni ($0,0209 < 0,0820 < 0,2084 < 0,4263 < 0,7983$) saat simulasi deuteranopia diaktifkan.
- Demonstrasi alur *clean clone* dan live deployment pada GitHub Pages sebagai bukti keterulangan pengujian (*reproducibility*).
