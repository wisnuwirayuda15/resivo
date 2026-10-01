import type { Widen } from "../widen";
import type { ats as en } from "../en/ats";

export const ats = {
  tab: {
    clean: "Tidak ada masalah yang kami kenali",
    disclaimer:
      "Ini mencari masalah yang umum. Ini tidak dapat menjamin bagaimana sistem tertentu akan membaca berkasnya.",
    errors_one: "{{count}} kesalahan",
    errors_other: "{{count}} kesalahan",
    warnings_one: "{{count}} peringatan",
    warnings_other: "{{count}} peringatan",
    infos_one: "{{count}} saran",
    infos_other: "{{count}} saran",
    fixAll: "Perbaiki {{count}}",
    fixAllLabel: "Perbaiki semua {{count}}",
    dismiss: "Abaikan untuk sementara",
    dismissIssue: "Abaikan: {{message}}",
    dismissed_one: "{{count}} masalah diabaikan",
    dismissed_other: "{{count}} masalah diabaikan",
    showAgain: "Tampilkan lagi",
    issues: "Masalah ATS",
    lengthNotChecked:
      "Panjang resume tidak diperiksa di sini. Buka tab Kertas untuk mengukurnya.",
    untitledSection: "Bagian tanpa judul",
    untitledEntry: "Entri tanpa judul",
    severity: {
      error: "kesalahan",
      warning: "peringatan",
      info: "saran",
    },
  },
  rules: {
    "name-missing": {
      message: "Resume ini tidak memiliki nama.",
      why: "Parser membaca baris pertama sebagai nama kandidat, dan resume tanpa nama tersimpan atas nama siapa pun.",
      where: "Header",
    },
    "email-missing": {
      message: "Tidak ada alamat email di kontak.",
      why: "Kebanyakan sistem membuat catatan kandidat dari email, dan resume tanpa email sering tidak dapat dicocokkan atau dihubungi.",
      where: "Header, kontak",
    },
    "phone-missing": {
      message: "Tidak ada nomor telepon di kontak.",
      why: "Perekrut sering menelepon lebih dulu, dan sebagian sistem menyimpan nomor sebagai cara kedua mencocokkan kandidat.",
      where: "Header, kontak",
    },
    "contact-icon-only": {
      message: "Sebuah kontak hanya menampilkan ikon tanpa teks.",
      why: "Parser membaca teks, bukan gambar, sehingga keterangan yang diwakili ikon itu hilang.",
      where: "Header, kontak {{number}}",
    },
    "section-title-empty": {
      message: "Sebuah bagian tidak punya judul.",
      why: "Parser membagi resume menjadi bagian-bagian menurut judulnya, dan isi tanpa judul tidak dikaitkan dengan apa pun.",
      where: "Bagian {{number}}",
    },
    "section-empty": {
      message: "Bagian {{section}} kosong.",
      why: "Judul tanpa isi tercetak sebagai ruang kosong, dan perekrut membacanya sebagai sesuatu yang belum selesai.",
      where: "{{section}}",
      fix: "Sembunyikan bagian",
    },
    "core-sections-missing": {
      message:
        "Tidak ada bagian Pengalaman, Pendidikan, atau Proyek yang berisi.",
      why: "Bagian-bagian ini yang dipakai sistem untuk menilai kandidat, sehingga resume tanpanya hampir tidak punya yang bisa diperingkat.",
      where: "Dokumen",
    },
    "section-title-unusual": {
      message: "“{{section}}” bukan judul yang kemungkinan dikenali parser.",
      why: "Sistem mengenali daftar judul yang pendek, seperti Pengalaman dan Pendidikan, dan menyimpan yang lain dengan kurang andal.",
      where: "{{section}}",
    },
    "columns-two": {
      message: "{{section}} diatur dalam dua kolom.",
      why: "Banyak parser membaca lurus ke bawah halaman, sehingga dua kolom bisa keluar saling selang-seling, satu baris dari masing-masing.",
      where: "{{section}}",
      fix: "Pakai satu kolom",
    },
    "table-used": {
      message: "Sebuah tabel dipakai.",
      why: "Parser sering meratakan tabel sel demi sel dan kehilangan nilai mana yang milik judul kolom mana.",
      where: "{{section}}",
    },
    "raw-block": {
      message:
        "Markdown yang tidak ditata aplikasi ini dicetak sebagai teks biasa.",
      why: "HTML mentah, catatan kaki, dan definisi tautan disimpan apa adanya, sehingga muncul di berkas sebagai markup itu sendiri.",
      where: "{{section}}",
    },
    "image-alt-missing": {
      message: "Sebuah gambar tidak punya teks alternatif.",
      why: "Parser tidak dapat membaca gambar, dan teks alternatif adalah satu-satunya bagiannya yang sampai ke lapisan teks.",
      where: "{{section}}",
    },
    "avatar-present": {
      message: "Header memuat foto.",
      why: "Foto diabaikan parser, dan sebagian pemberi kerja lebih suka tidak menerimanya sama sekali.",
      where: "Header",
    },
    "date-order": {
      message: "Tanggal akhir lebih awal daripada tanggal mulai.",
      why: "Parser yang membaca tanggal menghitung masa kerja darinya, dan rentang negatif dibuang atau dibaca sebagai salah ketik.",
      where: "{{section}}, {{entry}}",
    },
    "date-start-missing": {
      message: "Rentang tanggal punya akhir tetapi tidak punya awal.",
      why: "Dengan salah satu ujung hilang, sistem tidak dapat menghitung berapa lama peran itu berlangsung, sehingga sering mencatat tidak ada.",
      where: "{{section}}, {{entry}}",
    },
    "date-unparsed": {
      message: "Sebuah tanggal ditulis dengan kata, bukan tahun atau bulan.",
      why: "Sistem membaca tanggal seperti 2021 atau 2021-03 dan menyerah pada teks bebas seperti Musim panas 2019, sehingga peran itu masuk tanpa tanggal.",
      where: "{{section}}, {{entry}}",
    },
    "date-format-mixed": {
      message: "{{section}} mencampur tahun dan bulan.",
      why: "Tanggal yang ditulis seragam terbaca sebagai satu lini masa, dan sistem membandingkannya dengan lebih andal.",
      where: "{{section}}",
    },
    "date-gap": {
      message: "Ada jeda sekitar {{months}} bulan sebelum peran ini.",
      why: "Perekrut yang membaca lini masa akan menanyakan jeda yang panjang, dan satu baris yang menjelaskannya menjawabnya lebih dulu.",
      where: "{{section}}, {{entry}}",
    },
    "font-size-small": {
      message: "Teks isi berukuran {{size}}pt.",
      why: "Tulisan kecil sulit dibaca orang dan sulit dipulihkan pemindai, dan perekrut membaca sekilas.",
      where: "Gaya, ukuran isi",
      fix: "Atur ke {{fixSize}}pt",
    },
    "margins-narrow": {
      message: "Sebuah margin halaman kurang dari 0,4 inci.",
      why: "Printer memotong di dekat tepi kertas, sehingga teks sedekat itu bisa terpotong di atas kertas.",
      where: "Gaya, margin kertas",
      fix: "Naikkan ke 0,5 in",
    },
    "contrast-low": {
      message_text:
        "Warna teks isi memiliki kontras {{ratio}} banding 1 di atas kertas.",
      message_heading:
        "Warna judul memiliki kontras {{ratio}} banding 1 di atas kertas.",
      message_accent:
        "Warna aksen memiliki kontras {{ratio}} banding 1 di atas kertas.",
      message_muted:
        "Warna redup memiliki kontras {{ratio}} banding 1 di atas kertas.",
      why: "Teks pucat sulit dibaca dan bisa hilang saat dicetak atau dipindai. Batas minimum yang lazim untuk teks isi adalah 4,5 banding 1.",
      where_text: "Gaya, warna teks isi",
      where_heading: "Gaya, warna judul",
      where_accent: "Gaya, warna aksen",
      where_muted: "Gaya, warna redup",
      fix: "Pulihkan warna template",
    },
    "font-custom": {
      message_body: "Font isi adalah font yang Anda unggah.",
      message_heading: "Font judul adalah font yang Anda unggah.",
      why: "Font yang diunggah disematkan di PDF dan HTML di sini, tetapi sistem yang merender ulang teks bisa menggantinya dengan miliknya, jadi font bawaan lebih aman.",
      where_body: "Gaya, font isi",
      where_heading: "Gaya, font judul",
      fix: "Pakai font template",
    },
    "css-hides-text": {
      "message_display-none": "CSS kustom memakai display: none.",
      "message_visibility-hidden": "CSS kustom memakai visibility: hidden.",
      "message_font-size-zero": "CSS kustom memakai ukuran huruf 0.",
      "message_opacity-zero": "CSS kustom memakai opasitas 0.",
      "message_color-transparent": "CSS kustom memakai teks transparan.",
      why: "Teks tersembunyi dibaca parser dan tidak pernah dibaca orang, dan sebagian sistem menilai pola ini sebagai penjejalan kata kunci.",
      where: "CSS kustom",
    },
    "css-generated-content": {
      message: "CSS kustom menambahkan teks dengan ::before atau ::after.",
      why: "Teks yang dihasilkan stylesheet digambar di halaman dan tidak ada di berkas, sehingga parser tidak pernah membacanya.",
      where: "CSS kustom",
    },
    "bullet-long": {
      message: "Sebuah butir melewati sekitar tiga baris.",
      why: "Butir yang panjang dilewati begitu saja, sehingga poin yang disampaikannya adalah yang paling kecil kemungkinannya dilihat perekrut.",
      where: "{{section}}",
    },
    "summary-long": {
      message: "Ringkasan lebih panjang daripada satu paragraf pendek.",
      why: "Ringkasan dibaca pertama dan cepat, jadi yang terlalu panjang menggagalkan alasan ia diletakkan di atas.",
      where: "{{section}}",
    },
    "entry-empty": {
      message: "Sebuah peran tidak punya deskripsi.",
      why: "Jabatan dan tanggal menyebut di mana seseorang bekerja, dan butir-butir adalah tempat sistem menemukan keahlian untuk dicocokkan.",
      where: "{{section}}, {{entry}}",
    },
    "page-count": {
      message: "Resume ini mencapai {{count}} halaman.",
      why: "Penyaringan adalah tahap pertama yang cepat, jadi yang jatuh di halaman ketiga jarang terbaca, dan resume yang panjang sering disisihkan tanpa dibaca.",
      where: "Seluruh dokumen",
    },
  },
} satisfies Widen<typeof en>;
