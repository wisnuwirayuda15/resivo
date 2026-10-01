import type { Widen } from "../widen";
import type { assets as en } from "../en/assets";

export const assets = {
  images: {
    title: "Gambar",
    add: "Tambah gambar",
    stored_one: "{{count}} tersimpan",
    stored_other: "{{count}} tersimpan",
    empty:
      "Belum ada gambar. Tambahkan satu dan gambar itu tersedia untuk setiap resume di perangkat ini.",
    tooltip: "{{name}}, {{width}}×{{height}}, {{size}}",
    tooltipUnused: "{{name}}, {{width}}×{{height}}, {{size}}, tidak dipakai",
    imageName: "Nama gambar",
    usePhoto: "Pakai sebagai foto",
    removePhoto: "Lepas sebagai foto",
    sectionTo: "Bagian tujuan sisipan",
    insertInto: "Sisipkan ke bagian…",
    insert: "Sisipkan",
    usedByNone: "Tidak dipakai resume mana pun",
    inUse: "Sedang dipakai",
    delete: "Hapus",
    untitledSection: "Bagian tanpa judul",
  },
  fonts: {
    title: "Font",
    add: "Tambah font",
    empty:
      "Tiga keluarga huruf bawaan tidak perlu diunggah. Tambahkan berkas WOFF2, WOFF, TrueType, atau OpenType untuk memakai milik Anda sendiri, font itu disematkan di ekspor HTML, sehingga berkasnya tetap mandiri.",
    body: "Isi",
    headings: "Judul",
  },
  card: {
    unused: "tidak dipakai",
    italic: "miring",
    delete: "Hapus",
  },
  dialogs: {
    deleteImage: {
      confirm: "Hapus gambar",
      title: "Hapus {{name}}?",
      fallbackName: "gambar",
      inUse:
        "Sebuah resume masih merujuk gambar ini. Menghapusnya membuat resume itu menampilkan kotak gambar hilang.",
      unused:
        "Gambar ini tidak dipakai resume mana pun. Menghapusnya membebaskan ruang yang dipakainya di perangkat ini.",
    },
    deleteFont: {
      confirm: "Hapus font",
      title: "Hapus {{name}}?",
      fallbackName: "font",
      inUse:
        "Sebuah resume memakai font ini. Menghapusnya membuat resume itu tercetak dengan huruf pengganti, yang mengubah letak pemisah halamannya.",
      unused:
        "Tidak ada resume yang memakai font ini. Menghapusnya membebaskan ruang yang dipakainya di perangkat ini.",
    },
  },
  imagesPage: {
    intro:
      "Gambar disimpan di perangkat ini dan dipakai bersama oleh semua resume di dalamnya, jadi foto yang sama tidak perlu diunggah dua kali. Tidak ada yang dihapus otomatis: sebuah gambar bisa tidak dipakai hanya karena belum diletakkan.",
    stats: "{{count}} tersimpan · {{size}} · {{unused}} tidak dipakai",
    filter: "Saring gambar",
    filterAll: "Semua",
    filterUnused: "Tidak dipakai",
    nameOf: "Nama {{name}}",
    meta: "{{width}}×{{height}} · {{size}}",
    metaUnused: "{{width}}×{{height}} · {{size}} · tidak dipakai",
    emptyTitle: "Belum ada gambar",
    emptyBody:
      "Unggah gambar untuk dipakai sebagai foto atau diletakkan di resume. Gambar tetap ada di perangkat ini dan dapat dipakai ulang di berbagai resume.",
    nothingUnusedTitle: "Tidak ada yang menganggur",
    nothingUnusedBody:
      "Setiap gambar yang tersimpan dirujuk oleh sedikitnya satu resume.",
  },
  fontsPage: {
    intro:
      "Resivo menyertakan Instrument Sans, JetBrains Mono, dan Source Serif 4, yang tidak perlu diunggah. Tambahkan berkas WOFF2, WOFF, TrueType, atau OpenType untuk memakai milik Anda sendiri, pengurai font milik browser memeriksanya saat diunggah, jadi berkas yang rusak ditolak dan bukan diam-diam diganti, dan hurufnya disematkan ke ekspor HTML.",
    stats: "{{count}} tersimpan · {{size}} · {{unused}} tidak dipakai",
    emptyTitle: "Belum ada font kustom",
    emptyBody:
      "Unggah berkas WOFF2, WOFF, atau TrueType untuk mengatur resume dengan jenis huruf Anda sendiri. Berkasnya tetap ada di perangkat ini dan disematkan ke ekspor.",
  },
  rejected: {
    image: {
      notDecodable:
        "Berkas itu tidak dapat didekode sebagai gambar. Mungkin rusak, atau ekstensinya tidak sesuai dengan isinya.",
      unsupported:
        "{{type}} bukan gambar yang didukung. Pakai PNG, JPEG, WebP, atau GIF.",
      unsupportedUnknown:
        "Berkas itu bukan gambar yang didukung. Pakai PNG, JPEG, WebP, atau GIF.",
      tooLarge:
        "Gambar itu berukuran {{size}}. Batasnya {{limit}}, ekspor salinan yang lebih kecil, karena resume mencetaknya paling lebar beberapa inci.",
    },
    font: {
      unreadable:
        "Berkas itu bukan font yang dapat dibaca browser ini. Bila formatnya lebih tua, mengonversinya ke WOFF2 biasanya berhasil.",
      tooLarge:
        "Berkas itu berukuran {{size}}. Batasnya {{limit}}, yang sudah longgar untuk satu ketebalan huruf teks.",
      notAFont:
        "Berkas itu bukan font WOFF2, WOFF, TrueType, atau OpenType, apa pun namanya.",
    },
  },
} satisfies Widen<typeof en>;
