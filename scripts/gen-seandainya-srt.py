# Generates expressive SRT files (one cue per script line) for the
# "Seandainya" TTS scripts, in the ai33.pro expression format:
#   [tag] teks cue...
# Pace per tag (words/sec) is calibrated from the Merdeka VO (~2.0 w/s).
# Regenerate after any script change: python scripts/gen-seandainya-srt.py
import os
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS_DIR = os.path.join(ROOT, "voice", "seandainya_tts")

# ---------------- expression configuration (swap strings here if ai33.pro uses other names)
DEFAULT_TAG = "[serious]"
TAG_RATE = {
    "[serious]": 2.0,
    "[determined]": 1.8,
    "[whispering]": 1.7,
    "[somber]": 1.7,
    "[laughter]": 2.2,
    "[excited]": 2.2,
}

# manual overrides (checked first, per file, by substring, case-sensitive)
OVERRIDES = {
    "02_bab1a_pendudukan": [("Tapi yang paling menentukan", "[determined]")],
    "10_bab7_penutup": [("di Blitar, di Indramayu", "[determined]")],
}

# heuristic keyword sets (lowercase substring match, first match wins)
KW_LAUGHTER = [
    "masih dijajah sampai hari ini", "kelaparan besar tahun 1946",
    "lebih absurd", "tidak bisa menang perang panjang",
]
KW_WHISPER = [
    "menjajah siapa", "seandainya hari itu", "seandainya bom",
    "dan tanggal 17 agustus", "minyak tipis", "kapal tidak datang",
    "coba pikirkan", "jalur cerita yang lebih gelap", "seandainya jepang menang",
    "bayangkan indonesia", "tetap dijajah jepang", "bisakah semua itu",
    "dua wajah", "sabotase malam", "bergerak malam", "diam-diam",
    "satu hal lagi yang sering dilupakan",
    "seandainya jepang masih menjajah indonesia pada",
]
KW_SOMBER = [
    "romusha", "kelaparan", "meninggal", "mandor", "korban", "mengeksekusi",
    "ditumpas", "penjara", "interniran", "siksaan", "jutaan", "makan benih",
    "kekejaman", "tidak kembali", "berdiri kecil", "kantong terisolasi",
    "tanpa kapal", "merah putih tidak naik", "rutinitas kelam",
    "dipaksa berganti nama", "ditata ulang", "dibawa ke mana-mana",
    "nama-nama kota ikut diubah", "paling menyakitkan", "menghilang dari sekolah",
    "nama-nama kita", "dikemas", "kelas yang berbeda", "tidak ada satu pun kursi",
    "berjalan terus", "tidak ada jalan keluar", "kelas dua",
    "rumah sakit untuk penguasa", "anak pejabat", "cukup belajar untuk bekerja",
    "paling padat", "terlambat merdeka", "tidak akan pernah sempat",
    "lahir di dalam penjajahan", "rakyat hidup sekali",
    "menyerahkan satu anak", "gua pertahanan", "saketi", "tanah merah",
    "dikerahkan", "yang kembali hidup-hidup", "siksaan", "jutaan orang",
    "delapan puluh sembilan", "untuk mengangkut batu bara",
]
KW_DETERMINED = [
    "sang penjajah", "tidak batal", "hampir pasti", "tidak mungkin",
    "twist yang mengubah",
    "berperang melawan", "memberontak", "menyatu jadi satu medan",
    "tidak punya satu markas", "terjebak", "pola yang benar-benar terjadi",
    "meledak jadi satu hal", "strategi terakhir", "nusantara jadi benteng",
    "malah mengeras", "tidak ada proklamasi", "titik divergensi",
    "alat perang", "bagian paling penting", "memberontak terbuka",
    "aturan main", "bukan penjajah baru yang lebih lembut", "bukan purna bakti",
    "karena rakyat menekannya", "tiga tenaga", "mengakui kedaulatan",
    "rakyat akan berperang", "hilang dari garis depan",
    "membalas dengan cara yang sangat", "tulang punggung", "maju duluan",
    "terlalu lama diinjak", "titik api", "dikejar kebalikannya",
    "berbalik jadi jaringan senjata", "koloni mulai rontok",
    "pasti dikeluarkan", "tugas pejuang", "bukan 1945",
    "kehabisan tenaga", "kebaikan penjajah", "tidak bisa dihancurkan",
    "perang yang gigih", "paling penting", "tidak berdiri di atas kebaikan",
    "berdiri di atas perlawanan", "meja perundingan", "hanya tertunda",
    "tidak melihat kemajuan", "jangan tertipu", "bukan untuk rakyatnya",
    "menunjuk ke satu arah", "negara dagang", "kekaisaran yang menindas",
    "koloni tidak pernah", "jawaban pertanyaan itu", "tidak akan lebih baik",
    "tetap menang perang dunia", "tiga puluh lima tahun",
]
KW_EXCITED = [
    "bayangkan kalender", "pertanyaannya banyak", "jadi ikuti sampai selesai",
    "peta dunia kita yang baru", "coba lihat peta", "perhatikan pola",
    "lihat peta asia", "mitra besar", "investor terbesar", "pemberi bantuan",
    "mrt jakarta", "dibangun bersama", "anak muda", "anime, manga",
    "tulis di komentar", "channel seandainya", "sampai jumpa", "berdiri sejajar",
]

HEURISTICS = [
    (KW_LAUGHTER, "[laughter]"),
    (KW_WHISPER, "[whispering]"),
    (KW_SOMBER, "[somber]"),
    (KW_DETERMINED, "[determined]"),
    (KW_EXCITED, "[excited]"),
]

LEAD_IN = 0.5
GAP = 0.35
MIN_CUE = 1.2
ELLIPSIS_EXTRA = 0.3


def fmt(t: float) -> str:
    total_ms = int(round(t * 1000))
    h = total_ms // 3600000
    m = (total_ms % 3600000) // 60000
    s = (total_ms % 60000) // 1000
    ms = total_ms % 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def pick_tag(stem: str, line: str) -> str:
    for needle, tag in OVERRIDES.get(stem, []):
        if needle in line:
            return tag
    low = line.lower()
    for keywords, tag in HEURISTICS:
        for kw in keywords:
            if kw in low:
                return tag
    return DEFAULT_TAG


for txt_path in sorted(glob.glob(os.path.join(TTS_DIR, "*.txt"))):
    stem = os.path.splitext(os.path.basename(txt_path))[0]
    with open(txt_path, "r", encoding="utf-8") as f:
        lines = [ln.strip() for ln in f.readlines() if ln.strip()]

    t = LEAD_IN
    cues = []
    tag_count: dict = {}
    for line in lines:
        tag = pick_tag(stem, line)
        tag_count[tag] = tag_count.get(tag, 0) + 1
        words = len(line.split())
        dur = max(MIN_CUE, words / TAG_RATE.get(tag, 2.0) + min(1.0, line.count("...") * ELLIPSIS_EXTRA))
        cues.append((t, t + dur, tag, line))
        t += dur + GAP

    srt_path = os.path.splitext(txt_path)[0] + ".srt"
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, (a, b, tag, line) in enumerate(cues, start=1):
            f.write(f"{i}\n{fmt(a)} --> {fmt(b)}\n{tag} {line}\n\n")

    dist = ", ".join(f"{k}={v}" for k, v in sorted(tag_count.items(), key=lambda x: -x[1]))
    print(f"{stem}.srt | {len(cues)} cues | VO {t - GAP:6.1f}s | {dist}")
