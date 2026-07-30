#!/usr/bin/env bash
# ============================================================================
# Pendamping alur manual Google Flow (lihat flow/PANDUAN-FLOW.md)
# Metode Frames-to-Video: dive1 -> conn1 -> dive2 -> conn2 -> dive3 -> conn3
#   -> dive4 -> dive5 (3 connector; dive4->dive5 tersambung langsung tanpa
#   connector karena roket lepas-landas berlanjut ke roket membumbung)
#
# dive1 memuat DUA beat cerita dalam satu klip: paralayang (0-4s), lalu zoom-out
# yang mengungkap dashboard booking di laptop (4-8s). Halaman menampilkan copy
# berbeda untuk masing-masing beat, jadi klipnya dipotong dua di detik SPLIT1_AT
# menjadi scene1 (pembuka) + scene1b (booking travel). Keduanya berurutan dari
# sumber yang sama, sehingga crossfade di sambungannya tak terlihat.
# Idempotent — jalankan kapan saja setelah menambah video baru ke work/. Ia:
#   1. Ekstrak frame batas tiap video -> work/seam/ (buat QA seam)
#   2. Ekstrak poster (frame pertama tiap dive) -> assets/poster/
#   3. Encode semua video yang sudah lengkap -> assets/vid/ (scrub-ready)
# Varian mobile: work/*-m.mp4 -> assets/vid/*-m.mp4 (720p, GOP 4)
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p work/seam assets/vid assets/poster

# Fallback PATH untuk instalasi winget (ffmpeg) bila shell belum refresh
LAD="$(cygpath "$LOCALAPPDATA" 2>/dev/null || echo "$LOCALAPPDATA")"
PATH="$PATH:$LAD/Microsoft/WinGet/Links"
for d in "$LAD"/Microsoft/WinGet/Packages/*/; do
  [ -d "$d" ] && PATH="$PATH:$d"
  for sub in "$d"*/bin; do [ -d "$sub" ] && PATH="$PATH:$sub"; done
done
export PATH
command -v ffmpeg >/dev/null || { echo "ffmpeg tidak ditemukan — buka terminal baru atau install dulu"; exit 1; }

# Lewati file yang korup/tak terbaca supaya skrip tidak berhenti di tengah jalan
valid_video() { ffprobe -v error -select_streams v:0 -show_entries stream=codec_type \
  -of csv=p=0 "$1" >/dev/null 2>&1; }

# Detik tempat dive1 dipotong: paralayang berakhir & whip-pan ke villa dimulai.
SPLIT1_AT=${SPLIT1_AT:-4}
if [ -f work/dive1.mp4 ] && valid_video work/dive1.mp4; then
  if [ ! -f work/dive1a.mp4 ]; then
    ffmpeg -y -loglevel error -i work/dive1.mp4 -t "$SPLIT1_AT" -c copy work/dive1a.mp4
    echo "   dive1 dipotong -> dive1a.mp4 (0-${SPLIT1_AT}s, paralayang)"
  fi
  if [ ! -f work/dive1b.mp4 ]; then
    ffmpeg -y -loglevel error -ss "$SPLIT1_AT" -i work/dive1.mp4 -c copy work/dive1b.mp4
    echo "   dive1 dipotong -> dive1b.mp4 (${SPLIT1_AT}s-akhir, dashboard travel)"
  fi
fi

# Pemetaan sumber di work/ -> nama tujuan di assets/vid/
PASANGAN="dive1a:scene1 dive1b:scene1b dive2:scene2 dive3:scene3 dive4:scene4 dive5:scene5 conn1:conn1 conn2:conn2 conn3:conn3"

echo "== [1/2] Ekstrak frame (last = starting image video berikutnya di Flow) =="
extract_frames() {  # nama-file (tanpa .mp4), label utk pesan
  local f="work/${1}.mp4"
  [ -f "$f" ] || return 0
  valid_video "$f" || { echo "   !! ${1}.mp4 korup/tak terbaca — dilewati"; return 0; }
  if [ ! -f "work/seam/${1}_last.png" ]; then
    ffmpeg -y -loglevel error -sseof -0.15 -i "$f" -frames:v 1 -q:v 2 "work/seam/${1}_last.png"
    echo "   ${1} -> seam/${1}_last.png  (upload ini sbg starting image video berikutnya)"
  fi
  if [ ! -f "work/seam/${1}_first.png" ]; then
    ffmpeg -y -loglevel error -ss 0 -i "$f" -frames:v 1 -q:v 2 "work/seam/${1}_first.png"
    echo "   ${1} -> seam/${1}_first.png  (buat QA seam)"
  fi
}
for i in 1 2 3 4 5; do extract_frames "dive${i}"; done
for i in 1 2 3;     do extract_frames "conn${i}"; done

# Poster halaman = frame pertama tiap klip yang benar-benar dipakai index.html
for map in $PASANGAN; do
  src="work/${map%%:*}.mp4"; nama="${map##*:}"
  case "$nama" in conn*) continue;; esac
  if [ -f "$src" ] && valid_video "$src" && [ ! -f "assets/poster/${nama}.jpg" ]; then
    ffmpeg -y -loglevel error -ss 0 -i "$src" -frames:v 1 -q:v 3 "assets/poster/${nama}.jpg"
    echo "   ${map%%:*} -> assets/poster/${nama}.jpg"
  fi
done

echo "== [2/2] Encode scrub-ready ke assets/vid/ =="
enc_desktop() {  # sumber, tujuan
  ffmpeg -y -loglevel error -i "$1" -an -vf "unsharp=5:5:0.8:5:5:0.0" \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -g 8 -keyint_min 8 -sc_threshold 0 -movflags +faststart "$2"
  echo "   $1 -> $2"
}
enc_mobile() {   # sumber, tujuan (720 lebar, GOP rapat utk decoder HP)
  ffmpeg -y -loglevel error -i "$1" -an -vf "scale=720:-2" \
    -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
    -g 4 -keyint_min 4 -sc_threshold 0 -movflags +faststart "$2"
  echo "   $1 -> $2 (mobile)"
}

# Encode satu pasang: desktop + varian mobile.
# Varian mobile memakai sumber 9:16 native (work/NAMA-m.mp4) bila ada; kalau tidak,
# dibuat dari sumber 16:9 yang sama — tetap berguna karena 720p + GOP rapat jauh
# lebih ringan di-scrub oleh decoder HP daripada master 1080p.
pair() {  # $1 = nama sumber di work/ (tanpa .mp4), $2 = nama tujuan di assets/vid/
  local src="work/${1}.mp4" dst="assets/vid/${2}.mp4"
  local srcm="work/${1}-m.mp4" dstm="assets/vid/${2}-m.mp4"
  [ -f "$src" ] && valid_video "$src" || return 0
  [ ! -f "$dst" ] && { enc_desktop "$src" "$dst"; n=$((n+1)); }
  if [ ! -f "$dstm" ]; then
    if [ -f "$srcm" ] && valid_video "$srcm"; then enc_mobile "$srcm" "$dstm"
    else enc_mobile "$src" "$dstm"; fi
    n=$((n+1))
  fi
}

n=0
for map in $PASANGAN; do pair "${map%%:*}" "${map##*:}"; done
[ "$n" -eq 0 ] && echo "   (tidak ada file baru untuk di-encode)"

echo ""
d=$(ls assets/vid/scene*.mp4 2>/dev/null | grep -cv -- '-m' || true)
c=$(ls assets/vid/conn*.mp4 2>/dev/null | grep -cv -- '-m' || true)
echo "Status: ${d}/6 scene, ${c}/3 connector siap di assets/vid/"
if [ "$d" -eq 6 ] && [ "$c" -eq 3 ]; then
  echo "LENGKAP! Ubah PAKAI_VIDEO menjadi true di index.html."
else
  echo "Lanjutkan langkah di flow/PANDUAN-FLOW.md, lalu jalankan skrip ini lagi."
fi
