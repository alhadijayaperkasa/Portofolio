# Alhadi Cyber Media — Landing Page & Penawaran

Landing page portofolio jasa pembuatan **Website · WebApp · SaaS · Fitur AI** dengan
teknik **scroll-world** (https://github.com/oso95/scroll-world): kamera menembus
dunia-dunia bidang usaha yang digerakkan oleh scroll, tanpa potongan antar-scene.

Konsep visual: **"Infinite Screen Zoom"** — tiap dunia bidang usaha berakhir di
layar device yang menampilkan website/app-nya, lalu kamera menarik mundur
mengungkap dunia berikutnya.

**Status: video sudah aktif** (`PAKAI_VIDEO = true`). 8 video Google Flow →
5 scene + 3 connector:

| Scene | Dunia | File video |
|---|---|---|
| 1 | ✈️ Travel (paralayang → dashboard travel) | `scene1.mp4` |
| — | connector → villa | `conn1.mp4` |
| 2 | 🏠 Properti (villa → dashboard properti) | `scene2.mp4` |
| — | connector → bengkel | `conn2.mp4` |
| 3 | 🔧 Otomotif (bengkel → dashboard servis) | `scene3.mp4` |
| — | connector → landasan roket | `conn3.mp4` |
| 4 | 🚀 Peluncuran (roket lepas landas) | `scene4.mp4` |
| 5 | 🚀 Finale + CTA (roket membumbung) | `scene5.mp4` |

Scene 4 → 5 tersambung langsung tanpa connector (frame-nya identik).

## Struktur

| File / folder | Isi |
|---|---|
| `index.html` | Hero video scroll-world (5 scene) **+ 7 section bergaya Nocturne** (lihat di bawah) |
| `penawaran.html` | Penawaran profesional: layanan, fitur AI, katalog solusi gratis (Mapbox, Tesseract.js, Web Speech API, dll), stack, paket, FAQ, kontak |
| `flow/PANDUAN-FLOW.md` | Prompt final — 8 gambar + 7 video (Frames to Video) di Google Flow |
| `flow/proses.sh` | Skrip pendamping: ekstrak frame batas + encode + poster |
| `assets/scene*.svg` | Placeholder sementara (tergantikan otomatis saat video aktif) |
| `vendor/scroll-world/` | Engine scrub asli dari repo scroll-world |
| `work/` | Tempat menaruh unduhan video dari Flow (dive1..7, conn1..6) |

## Menjalankan

**Wajib lewat server lokal** — engine memuat video sebagai Blob via `fetch()`, dan
`fetch` diblokir di `file://`. Kalau dibuka langsung dari file, video tidak akan
muncul (hanya poster).

```bash
npx serve "D:\DATA PC ALI\CLONE APLIKASI\Portofolio"
```

## Catatan reduced-motion (penting)

Windows punya setelan **Settings → Accessibility → Visual effects → Animation
effects**. Bila OFF, semua browser melaporkan `prefers-reduced-motion: reduce`, dan
engine scroll-world bawaan repo **sengaja tidak memuat video sama sekali**.

Karena di halaman ini video adalah kontennya, `vendor/scroll-world/scrub-engine.js`
diberi opsi `videoUnderReducedMotion` (dipakai di `index.html`): klip tetap dimuat,
tetapi seluruh gerak dekoratif (partikel, ken-burns poster, parallax teks,
smooth-scroll) tetap dimatikan otomatis — video hanya bergerak mengikuti scroll
pengunjung, 1:1, tanpa animasi yang berjalan sendiri.

## Alur produksi video (Google Flow — Frames to Video)

**8 gambar AI + 7 video.** Tiap gambar "dashboard" sudah digambar berada secara
fisik di lokasi dunia berikutnya (mis. laptop dashboard travel duduk di meja
marmer *di dalam villa*), sehingga video connector cukup **menarik kamera mundur**
dari layar untuk mengungkap dunia di sekelilingnya — tanpa trik "layar menembus
jadi nyata".

```
Img1(paralayang) → [dive1] → Img2(dashboard travel, di villa)
                 → [conn1] → Img3(villa tampak luar)
                 → [dive2] → Img4(dashboard properti, di bengkel)
                 → [conn2] → Img5(bengkel otomotif malam)
                 → [dive3] → Img6(dashboard servis, di ruang kontrol)
                 → [conn3] → Img7(roket di landasan)
                 → [dive4] → Img8(roket meluncur, finale)
```

1. Ikuti `flow/PANDUAN-FLOW.md`: generate 8 gambar (Text to Image), lalu 7 video
   (**Frames to Video** — pasangkan Gambar N sebagai awal & Gambar N+1 sebagai akhir).
2. Simpan tiap video ke `work/` dengan nama yang tertera (`dive1..4`, `conn1..3`).
3. `bash flow/proses.sh` → semua ter-encode ke `assets/vid/` + poster ke `assets/poster/`.
4. Di `index.html` ubah `PAKAI_VIDEO = false` → `true`.

Prasyarat skrip: ffmpeg (sudah terpasang via winget, 2026-07-23).

## Kustomisasi cepat

- **Nomor WhatsApp**: ganti `6281234567890` di `penawaran.html`.
- **Email**: `ali.coolz30@gmail.com` di `index.html` & `penawaran.html`.
- **Harga paket**: bagian `#paket` di `penawaran.html` — angka titik awal, sesuaikan.
- **Copy scene**: objek `sections` di `index.html`.

## Urutan hero (6 beat)

| # | Klip | Yang terlihat | Copy |
|---|---|---|---|
| 01 | `scene1` | paralayang di atas pantai | *Website · WebApp · SaaS · AI* — "Apa pun kebutuhan usaha Anda, bisa jadi aplikasi." |
| 02 | `scene1b` | zoom-out: ternyata dashboard di laptop | *Contoh 1 · Website booking travel* — "Booking perjalanan yang jalan sendiri." |
| 03 | `scene2` | villa mewah | *Contoh 2 · Website listing properti* — "Listing rumah dengan tur 360°." |
| 04 | `scene3` | bengkel malam | *Contoh 3 · Aplikasi booking servis* — "Booking servis, antrian live." |
| 05 | `scene4` | roket lepas landas | *Website · WebApp · SaaS · AI* — "Ide Anda, jadi aplikasi yang bekerja." |
| 06 | `scene5` | roket membumbung | *Konsultasi gratis* — "Mari bangun bersama kami." + CTA |

**Beat 01 dan 02 berasal dari satu klip yang sama.** `work/dive1.mp4` (8 detik)
memuat dua momen cerita — paralayang (0–4s) lalu zoom-out yang mengungkap laptop
(4–8s) — jadi `flow/proses.sh` memotongnya di detik 4 menjadi `scene1` + `scene1b`.
Pembuka umum muncul saat masih di paralayang; copy booking travel baru muncul
setelah dashboard-nya terungkap. Karena keduanya potongan berurutan dari sumber
yang sama, `connectors[0] = null` dan crossfade di sambungannya tak terlihat.

Pola "Contoh 1/2/3" dipakai supaya pengunjung paham ini **showcase jasa**, bukan
situs travel/properti/bengkel. Garis positioning ditaruh di beat 05 (roket lepas
landas) agar mendarat setelah ketiga contoh terlihat.

## Urutan halaman

Hero video (5 scene) → lalu 7 section yang menuntun dari "apa yang bisa dibuat"
sampai "cara memulai":

| # | Section | Isi |
|---|---|---|
| 01 | Portofolio Solusi | 6 cetak biru aplikasi + fitur inti + stack |
| — | Band angka | 6 / 4 / 9 / 4 — menghitung naik saat di-scroll |
| 02 | Arsitektur & Backend | 4 lapisan: frontend → API → data → infrastruktur |
| 03 | Autentikasi & Keamanan | metode login, RBAC, proteksi aplikasi & data |
| 04 | Fitur AI | 9 kemampuan yang bisa ditanam ke aplikasi |
| 05 | Cara Kerja | 6 tahap, tiap tahap menyebut apa yang Anda terima |
| 06 | Serah Terima | kode, dokumentasi, kepemilikan akun, garansi |
| 07 | Mulai | CTA WhatsApp / penawaran / ulangi perjalanan |

## Design konten: "Nocturne"

Bagian di bawah hero memakai design system **Nocturne**, diimpor dari
claude.ai/design (project *Scroll World Nocturne redesign*). Ciri khasnya:

- ritme vertikal 28px, tipografi Inter, aksen blurple `#9184d9`
- baris editorial bernomor dengan rule yang memudar di kedua ujung
- satu-satunya bidang tersaturasi: band angka indigo (angkanya menghitung naik saat di-scroll)
- gerak dipetakan 1:1 ke posisi scroll (`--t`, 0..1) lewat satu rAF — bukan
  animasi berjalan sendiri, jadi tetap aman saat reduced-motion aktif

Token Nocturne memakai nama `--color-*` / `--font-*` sehingga **tidak bertabrakan**
dengan `--sw-*` milik hero — hero tetap memakai tema neon cyan-nya sendiri.

Dua penyesuaian penting saat integrasi (jangan dihapus):

- `frame()` berhenti lebih awal selama pengunjung masih di dunia video. Tanpa itu,
  `getBoundingClientRect()` dibaca untuk puluhan elemen tiap frame — memaksa layout
  sinkron dan merebut waktu dari seek video.
- `.doc-glow` (`position:fixed`, satu layar penuh) hanya dinyalakan setelah
  `body.past-world`. Tanpa itu ia melukis gradien di atas video hero sepanjang waktu.

## Pemanasan klip video

Engine baru memuat klip saat scene ±1,6 layar dari viewport. Kalau pengunjung
menggulir cepat, scene masih menampilkan poster diam. Karena itu `index.html`
mengunduh kedelapan klip berurutan di latar setelah event `load`, sehingga fetch
milik engine langsung mengenai HTTP cache.

Totalnya ~16 MB (varian mobile) sampai ~46 MB (desktop), jadi pemanasan
**dilewati** bila browser melaporkan `navigator.connection.saveData` atau
`effectiveType` 2g/slow-2g — pengunjung tetap dapat pengalaman penuh, klipnya
saja dimuat saat dibutuhkan.

## ⚠️ Yang HARUS diganti sebelum online

Kartu di section **Portofolio** (`index.html` → `<section id="portofolio">`) saat ini
berisi **cetak biru solusi** — deskripsi jenis aplikasi beserta fitur dan stack nyata
yang dipakai membangunnya. Itu **bukan** klaim proyek klien tertentu.

Begitu ada proyek riil: ganti judul kartu dengan nama proyek, tambahkan tautan
demo/screenshot, dan sesuaikan daftar fiturnya. **Jangan menambahkan nama klien atau
testimoni yang tidak nyata** — selain menyesatkan calon klien, itu berisiko secara
hukum dan reputasi.
