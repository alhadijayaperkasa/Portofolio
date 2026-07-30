# PROMPT FINAL — Google Flow · Alhadi Cyber Media

> ✅ **STATUS: SELESAI DIPRODUKSI (29 Juli 2026).** Delapan video sudah jadi,
> ter-encode di `assets/vid/`, dan aktif di halaman (`PAKAI_VIDEO = true`).
> Dokumen ini disimpan sebagai catatan produksi + acuan bila ingin menambah/
> mengganti scene di kemudian hari. Rantai final yang dipakai: **8 gambar,
> 8 video** — Video 8 (roket membumbung) adalah tambahan finale yang menyambung
> langsung dari Video 7 tanpa connector.

**Metode: Frames to Video** (frame awal + frame akhir, keduanya gambar AI). Total
kebutuhan: **8 gambar, 7 video** (+1 video finale opsional = 8, seperti yang dipakai). Setiap gambar "dashboard" sudah digambar berada
secara fisik di lokasi dunia berikutnya (mis. laptop dashboard travel duduk di meja
marmer *di dalam villa*) — sehingga video connector tinggal **menarik kamera mundur**
dari layar untuk mengungkap dunia di sekelilingnya. Tidak ada trik "layar menembus
jadi nyata" — semua transisi adalah gerakan kamera fisik yang masuk akal, jauh lebih
mudah dieksekusi Veo.

**Rantai:** ✈️ Travel → 🏠 Properti → 🔧 Otomotif → 🚀 Roket (finale)

*(3 bidang usaha dipilih paling kontras & sinematik: udara/adrenalin → mewah/tenang
→ industrial/malam. Otomotif sengaja jadi penutup sebelum roket karena percikan
api las adalah "visual rhyme" dengan nyala mesin roket — eskalasi energi ke klimaks.)*

Pengaturan Flow: **16:9**, kualitas tertinggi, **Frames to Video**, durasi 8 detik.
Audio dibuang otomatis oleh skrip.

---

## LANGKAH 1 — 8 Gambar (Text to Image)

**Gambar 1 — Paralayang** *(awal Video 1)*
```
A paraglider with a vivid orange canopy soaring above a turquoise tropical coastline at golden hour, dramatic cliffs and a white sand beach far below, tiny boats on the water, sun flare through the canopy lines. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, shallow depth of field, rich cinematic color grade, volumetric light, high detail. No text, no captions, no watermarks.
```

**Gambar 2 — Dashboard Travel, di dalam Villa** *(akhir Video 1 / awal Video 2)*
```
A laptop screen displaying a clean modern travel-booking website dashboard — a large hero photo of a tropical coastline, destination cards, and a booking calendar — the laptop resting on a marble kitchen counter inside a luxurious modern tropical villa, warm golden-hour light glowing through floor-to-ceiling glass walls in the background, shallow depth of field with the villa softly blurred behind the laptop. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Gambar 3 — Villa Tampak Luar** *(akhir Video 2 / awal Video 3)*
```
A luxurious modern tropical villa at golden hour seen from a low angle, infinity pool perfectly reflecting the sunset, floor-to-ceiling glass walls glowing warm from inside, palm trees swaying, manicured garden with stepping stones. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, shallow depth of field, rich cinematic color grade, volumetric light, high detail. No text, no captions, no watermarks.
```

**Gambar 4 — Dashboard Properti, di dalam Bengkel** *(akhir Video 3 / awal Video 4)*
```
A tablet screen displaying a clean modern property-listing website with a 360-degree virtual-tour viewer and villa photos, the tablet resting on a rolling tool cart inside a dark custom motorcycle workshop, neon shop signs glowing softly out of focus in the background, shallow depth of field. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Gambar 5 — Bengkel Otomotif Malam** *(akhir Video 4 / awal Video 5)*
```
A custom motorcycle workshop at night, a mechanic angle-grinding a steel frame with a fountain of orange sparks, neon shop signs glowing, polished custom bikes lined up, tools on pegboard walls, cinematic haze. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, shallow depth of field, rich cinematic color grade, volumetric light, high detail. No text, no captions, no watermarks.
```

**Gambar 6 — Dashboard Servis, di Ruang Kontrol Peluncuran** *(akhir Video 5 / awal Video 6)*
```
A wall-mounted monitor displaying a clean modern workshop service-booking app with a live repair queue and status badges, dark theme with orange accents, the monitor mounted inside a mission-control room with rows of glowing consoles, a large observation window behind it showing a floodlit rocket on a launchpad at dusk, shallow depth of field. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Gambar 7 — Roket di Landasan** *(akhir Video 6 / awal Video 7)*
```
A sleek white rocket on a launchpad at dusk, floodlights and rising steam, the launch tower stark against a deep violet sky, poised and still before ignition. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, shallow depth of field, rich cinematic color grade, volumetric light, high detail. No text, no captions, no watermarks.
```

**Gambar 8 — Roket Meluncur** *(akhir Video 7, finale)*
```
A sleek white rocket lifting off from its launchpad at dusk, engines igniting with brilliant flame, thick steam and smoke billowing outward, the launch tower falling away below, rising into a deep violet sky with thin clouds. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, shallow depth of field, rich cinematic color grade, volumetric light, high detail. No text, no captions, no watermarks.
```

---

## LANGKAH 2 — 7 Video (Frames to Video)

Di Flow pilih **Frames to Video**, upload Gambar N sebagai **frame awal** dan
Gambar N+1 sebagai **frame akhir**, lalu salin prompt.

**Video 1 → `work/dive1.mp4`** — frame awal: Gambar 1, frame akhir: Gambar 2
```
Single continuous cinematic shot, no cuts. FPV camera soars alongside the orange paraglider, sweeping past the cliff edge in a graceful arc, diving toward the turquoise water and white sand beach; then the camera rapidly zooms out and pulls back, the aerial view shrinking away as the frame reveals it was being viewed on a laptop screen resting on a marble counter inside a luxurious tropical villa, arriving in a clean, straight-on, static shot of the laptop fully displaying a travel-booking website dashboard, warm golden villa light glowing softly out of focus behind it. Smooth stabilized camera motion throughout, no shake, the final zoom-out settles still and sharp on the laptop screen. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Video 2 → `work/conn1.mp4`** — frame awal: Gambar 2, frame akhir: Gambar 3
```
Single continuous cinematic shot, no cuts. The camera pulls back from the laptop screen showing the travel-booking dashboard, rising and widening steadily through the villa's glass walls, revealing the full luxurious modern tropical villa from a low angle outside, its infinity pool perfectly reflecting the golden sunset. Smooth stabilized camera motion, constant pulling-back energy, never stopping. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Video 3 → `work/dive2.mp4`** — frame awal: Gambar 3, frame akhir: Gambar 4
```
Single continuous cinematic shot, no cuts. The camera glides low across the infinity pool skimming its reflection, flies through the open glass doors into the warm luxurious living room, revealing designer furniture and a grand staircase; then the camera rapidly zooms out and pulls back, the villa view shrinking away as the frame reveals it was being viewed on a tablet screen resting on a rolling tool cart inside a dark custom motorcycle workshop, arriving in a clean, straight-on, static shot of the tablet fully displaying a property-listing website with a 360-degree virtual tour, neon workshop signs glowing softly out of focus behind it. Smooth stabilized camera motion throughout, no shake, the final zoom-out settles still and sharp on the tablet screen. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Video 4 → `work/conn2.mp4`** — frame awal: Gambar 4, frame akhir: Gambar 5
```
Single continuous cinematic shot, no cuts. The camera pulls back from the tablet screen showing the property-listing website, widening steadily to reveal the full custom motorcycle workshop at night, neon shop signs glowing, a mechanic angle-grinding a steel frame as a fountain of orange sparks erupts, polished custom bikes lined up in the haze. Smooth stabilized camera motion, constant pulling-back energy, never stopping. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Video 5 → `work/dive3.mp4`** — frame awal: Gambar 5, frame akhir: Gambar 6
```
Single continuous cinematic shot, no cuts. The camera weaves through the workshop as orange sparks fountain past the lens, circles the mechanic grinding the frame, glides along the line of polished custom motorcycles; then the camera rapidly zooms out and pulls back, the workshop view shrinking away as the frame reveals it was being viewed on a wall-mounted monitor inside a mission-control room, arriving in a clean, straight-on, static shot of the monitor fully displaying a workshop service-booking app, rows of glowing consoles and a large observation window glowing softly out of focus behind it. Smooth stabilized camera motion throughout, no shake, the final zoom-out settles still and sharp on the monitor screen. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Video 6 → `work/conn3.mp4`** — frame awal: Gambar 6, frame akhir: Gambar 7
```
Single continuous cinematic shot, no cuts. The camera pulls back from the wall-mounted monitor showing the service-booking app, sweeping past the glowing consoles toward the large observation window, passing through the glass to arrive outside facing a sleek white rocket poised on its launchpad at dusk, floodlights and rising steam, the launch tower stark against a deep violet sky. Smooth stabilized camera motion, constant forward energy, never stopping. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Video 7 → `work/dive4.mp4`** — frame awal: Gambar 7, frame akhir: Gambar 8
```
Single continuous cinematic shot, no cuts. The camera rises alongside the white rocket as its engines ignite in brilliant flame, the launch tower falling away below, thick steam and smoke billowing outward, ascending together with the rocket toward the deep violet sky and thin clouds. Smooth stabilized camera motion, slow steady movement, no shake. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

**Video 8 → `work/dive5.mp4`** — finale tambahan, melanjutkan frame akhir Video 7
*(roket membumbung tinggi menembus langit malam berbintang — tidak perlu connector,
scene 4 dan 5 tersambung langsung lewat crossfade karena frame-nya identik)*
```
Single continuous cinematic shot, no cuts. The camera ascends with the white rocket as it climbs higher and higher, the flame trail glowing beneath it, clouds falling away below, the sky deepening from violet dusk into a dark starry night as the rocket soars upward toward the stars. Smooth stabilized camera motion, slow steady upward movement, no shake. Wide 16:9 cinematic landscape aspect ratio. Hyperrealistic cinematic footage, anamorphic lens, rich cinematic color grade, volumetric light, high detail. No captions, no watermarks.
```

---

## LANGKAH 3 — Finalisasi

1. Semua 7 file di `work/` → jalankan:
   ```bash
   bash flow/proses.sh
   ```
   Ini meng-encode ke `assets/vid/` (tanpa audio, siap di-scrub) + poster ke `assets/poster/`.
2. Di `index.html`, ubah `PAKAI_VIDEO = false` → `true`.
3. QA: scroll pelan lewati tiap sambungan — karena frame awal/akhir sudah dikunci
   presis dari gambar yang sama, seam otomatis presisi tanpa loncatan.

## Kalau hasil Flow kurang pas

- Video sulit "menemukan jalan" antar dua frame yang jauh berbeda → perkecil jarak
  komposisi antar gambar (mis. sudut kamera Gambar 3 & Gambar 4 jangan terlalu jauh berbeda).
- Dashboard di frame akhir kurang tajam/jelas → tambahkan `sharp focus, in-focus screen, clearly rendered UI` di prompt gambar tsb.
- Transisi terasa terlalu cepat/lambat → re-roll video itu saja, gambar tidak perlu diulang.
