import type { Widen } from "../widen";
import type { settings as en } from "../en/settings";

export const settings = {
  language: {
    title: "Bahasa",
    description:
      "Bahasa menu, dialog, dan pesan. Ini tidak menerjemahkan apa yang Anda tulis di resume, yang punya pengaturan bahasa sendiri di panel gaya.",
    label: "Bahasa antarmuka",
  },
  backup: {
    title: "Cadangkan dan pulihkan",
    intro:
      "Semua yang disimpan Resivo ada di browser ini, di perangkat ini. Tidak ada salinan di tempat lain, jadi cadangan adalah satu-satunya yang bertahan setelah browser dibersihkan atau perangkat hilang.",
    backUp: "Cadangkan",
    backUpBody:
      "Menulis setiap resume, grup, gambar, dan font di perangkat ini ke satu berkas JSON. Tidak ada yang dikirim ke mana pun, berkasnya disimpan oleh browser Anda.",
    download: "Unduh cadangan",
    restore: "Pulihkan",
    restoreBody:
      "Menambahkan isi sebuah cadangan ke perangkat ini. Tidak ada yang sudah ada di sini yang diganti atau dihapus: resume yang bentrok dengan yang sudah Anda punya dipulihkan di sebelahnya, ditandai <code>(restored)</code>, dan gambar yang byte-nya sudah tersimpan tidak digandakan.",
    choose: "Pilih berkas cadangan",
    restoring: "Memulihkan…",
    failedTitle: "Tidak ada yang dipulihkan",
    restoredTitle: "Dipulihkan",
    writeFailed: "Cadangan tidak dapat ditulis.",
    restoreFailed: "Berkas itu tidak dapat dipulihkan.",
    summary: {
      resumes_one: "{{count}} resume dipulihkan",
      resumes_other: "{{count}} resume dipulihkan",
      alongside: "({{count}} disimpan di samping salinan yang sudah ada)",
      groups_one: "{{count}} grup dipulihkan",
      groups_other: "{{count}} grup dipulihkan",
      images_one: "{{count}} gambar dipulihkan",
      images_other: "{{count}} gambar dipulihkan",
      imagesPresent_one:
        "{{count}} gambar sudah tersimpan, jadi tidak digandakan",
      imagesPresent_other:
        "{{count}} gambar sudah tersimpan, jadi tidak digandakan",
      fonts_one: "{{count}} font dipulihkan",
      fonts_other: "{{count}} font dipulihkan",
      fontsPresent_one: "{{count}} font sudah tersimpan",
      fontsPresent_other: "{{count}} font sudah tersimpan",
      settings_one:
        "{{count}} pengaturan dipulihkan, tanpa mengubah yang sudah ada di perangkat ini",
      settings_other:
        "{{count}} pengaturan dipulihkan, tanpa mengubah yang sudah ada di perangkat ini",
      empty: "Cadangan itu kosong. Tidak ada yang berubah.",
    },
    rejected: {
      notJson: "Berkas itu bukan JSON yang valid, jadi bukan cadangan Resivo.",
      notBackup:
        'Berkas JSON itu bukan cadangan Resivo. Cadangan diawali dengan "kind": "{{kind}}".',
      newer:
        "Cadangan itu ditulis oleh versi Resivo yang lebih baru (format {{version}}, build ini membaca {{supported}}). Perbarui sebelum memulihkannya, memulihkannya di sini bisa menghilangkan sebagian isinya.",
      unreadable: "Cadangan itu tidak dapat dibaca. Tidak ada yang diubah.",
      unreadableAt:
        "Cadangan itu tidak dapat dibaca: {{detail}} (di {{path}}). Tidak ada yang diubah.",
    },
  },
  storage: {
    title: "Penyimpanan",
    intro:
      "Setiap gambar dan font disimpan sekali dan dipakai bersama oleh semua resume di perangkat ini.",
    images: "Gambar",
    fonts: "Font",
    files_one: "{{count}} berkas",
    files_other: "{{count}} berkas",
    unused: "{{count}} tidak dipakai",
    note: "Resume sendiri berupa teks dan memakan ruang yang nyaris tak terasa; gambar dan font yang dirasakan perangkat. Tidak ada yang dihapus otomatis, karena sebuah aset bisa tidak dipakai hanya karena belum diletakkan: halaman Gambar dan Font adalah tempat keputusan itu diambil.",
  },
  install: {
    title: "Pasang di perangkat ini",
    intro:
      "Resivo dapat dipasang seperti aplikasi lain, dan setelah tersimpan di cache ia terbuka dengan atau tanpa jaringan.",
    installed:
      "Terpasang di perangkat ini, dan berjalan di jendelanya sendiri.",
    button: "Pasang Resivo",
    availableBody:
      "Memasang menaruh Resivo di dock, taskbar, atau layar utama Anda. Ia mendapat jendela sendiri tanpa bilah alamat, dan terbuka di resume Anda, bukan di halaman landing. Tidak ada yang diunggah dan tidak ada yang berubah tentang di mana data Anda disimpan.",
    notOffered:
      "Browser ini belum menawarkan untuk memasang Resivo. Di tempat yang mendukung pemasangan, bilah alamat memuat ikon pasang; di iPhone atau iPad, pilih Bagikan, lalu Tambah ke Layar Utama.",
    cache: {
      ready:
        "Aplikasinya sendiri tersimpan di cache di perangkat ini, jadi ia terbuka dan berjalan tanpa jaringan sama sekali.",
      pending:
        "Aplikasinya baru saja disimpan di cache di perangkat ini. Saat dibuka berikutnya ia akan berfungsi tanpa jaringan.",
      absent:
        "Aplikasinya belum tersimpan di cache di perangkat ini, jadi membukanya masih memerlukan koneksi. Resume Anda tersimpan di sini dalam kedua kasus.",
    },
  },
} satisfies Widen<typeof en>;
