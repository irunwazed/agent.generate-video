# Panduan Generate VO di ai33.pro — Video "Seandainya Jepang Masih Menjajah Indonesia"

## File naskah TTS + SRT (di folder ini)
Naskah `.txt` dan panduan timing `.srt` dibuat berpasangan (satu cue SRT = satu baris naskah; estimasi pace 2,0 kata/detik). Regenerate SRT dengan `python scripts/gen-seandainya-srt.py` setiap naskah berubah.

| # | File | Bab | Kata (±) | VO (±) |
|---|---|---|---|---|
| 1 | 01_intro | Intro | 152 | 1:22 |
| 2 | 02_bab1a_pendudukan | Bab 1a: Pendudukan, gun-seikai, Romusha & Rel Saketi-Bayah | 275 | 2:33 |
| 3 | 03_bab1b_kelaparan_perlawanan | Bab 1b: Kelaparan, Peristiwa Mandor, Perlawanan, Janji Koiso | 248 | 2:17 |
| 4 | 04_bab2_divergensi | Bab 2: Titik Divergensi & Peta Nusantara | 339 | 3:07 |
| 5 | 05_bab3a_perang | Bab 3a: Perang Rakyat & Peta per Pulau | 236 | 2:10 |
| 6 | 06_bab3b_bertahan | Bab 3b: Balasan Kenpeitai, Blokade & Sekutu | 235 | 2:12 |
| 7 | 07_bab4_twist | Bab 4: Twist "Sang Penjajah Dijajah" + Kepemimpinan Masa Tunggu | 362 | 3:23 |
| 8 | 08_bab5_terburuk | Bab 5: Skenario Terburuk (Korea 35 th, Taiwan, Manchukuo) | 354 | 3:16 |
| 9 | 09_bab6_kemajuan | Bab 6: Kemajuan Jepang, Lebih Baik? | 214 | 2:01 |
| 10 | 10_bab7_penutup | Bab 7: Keseimbangan Sejarah + 3 Pelajaran + Outro | 368 | 3:28 |

**Total: 2.783 kata ≈ 24 menit VO → video final ±30 menit** (sisa waktu: peta animasi tanpa narasi, title card antar bab, musik bumper intro/outro).

## Aturan generate (sama seperti video Merdeka)
1. Voice Bahasa Indonesia, **satu nada stabil** dari awal sampai akhir (narasi dokumenter, tanpa akting emosional berlebihan).
2. **Jangan tambahkan** background music atau SFX.
3. Kualitas ekspor tertinggi: WAV ideal, atau MP3 minimal 128 kbps, 44.1/48 kHz.
4. Generate **per file** (jangan digabung) — penting untuk word-timing per bab.
5. **Pakai file .srt** yang berdampingan sebagai input timing di ai33.pro (satu cue = satu baris naskah).
6. **SRT ini sudah mengandung tag ekspresi** gaya ai33.pro di awal tiap cue: `[serious]`, `[determined]`, `[whispering]`, `[somber]`, `[laughter]`, `[excited]` — biarkan tag tetap menempel saat memasukkan ke ai33.pro agar suaranya ekspresif. Tag & kecepatan baca per tag dikonfigurasi di `scripts/gen-seandainya-srt.py` (ganti string di satu tempat jika ai33.pro memakai nama tag berbeda).
7. Simpan hasilnya sebagai `voice/seandainya/01_intro.mp3`, `02_bab1a_pendudukan.mp3`, dst. (nama file sama dengan naskah, ekstensi .mp3/.wav).
8. Kalau ada SRT/timestamp hasil dari ai33.pro, unduh juga per file — mempercepat alignment.

## Target durasi total: **video final ±30 menit** (VO ±24 menit + peta/title card/bumper).
Kalau ada file yang hasilnya sangat berbeda dari estimasi, kabarkan — timing bab bisa disesuaikan, bukan rombak naskah.
