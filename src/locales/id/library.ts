import type { Widen } from "../widen";
import type { library as en } from "../en/library";

export const library = {
  title: {
    all: "Semua resume",
    archived: "Diarsipkan",
  },
  search: {
    placeholder: "Cari resume",
    label: "Cari resume",
    noMatches: "Tidak ada yang cocok",
    noMatchesBody:
      'Tidak ada yang cocok dengan "{{query}}" di tampilan ini. Coba pencarian yang lebih pendek, atau kosongkan untuk melihat semuanya.',
  },
  sort: {
    label: "Urutkan resume",
    by: "Urutkan menurut",
    edited: "Terakhir diubah",
    created: "Tanggal dibuat",
    name: "Nama",
  },
  newResume: "Resume baru",
  empty: {
    none: "Belum ada resume",
    noneBody:
      "Buat resume untuk memulai. Semua yang Anda tulis tetap ada di perangkat ini.",
    group: "Belum ada isi di {{group}}",
    groupBody: "Pindahkan resume ke grup ini, atau buat satu di sini.",
    archived: "Tidak ada yang diarsipkan",
    archivedBody:
      "Mengarsipkan menyembunyikan resume dari pustaka tanpa menghapusnya. Resume yang diarsipkan muncul di sini.",
  },
  card: {
    edited: "Diubah",
    more: "Lainnya",
    actions: "Tindakan untuk {{title}}",
    rename: "Ganti nama",
    duplicate: "Gandakan",
    moveTo: "Pindahkan ke",
    archive: "Arsipkan",
    restore: "Pulihkan",
    delete: "Hapus",
    exportZip: "Ekspor sebagai zip",
    exportFailed: "Bundel untuk {{title}} tidak dapat ditulis.",
  },
  bundle: {
    rejected: {
      notZip: "Berkas itu bukan arsip zip, jadi bukan bundel Resivo.",
      notBundle:
        "Zip itu bukan bundel resume Resivo. Bundel memuat manifes yang menamainya.",
      newer:
        "Bundel itu ditulis oleh Resivo versi lebih baru (format {{version}}, build ini membaca {{supported}}). Perbarui sebelum mengimpornya. Tidak ada yang diubah.",
      missing: "Bundel tidak memuat {{name}}. Tidak ada yang diubah.",
      unreadable:
        "Bundel tidak dapat dibaca: {{detail}}. Tidak ada yang diubah.",
      document:
        "Resume di dalam bundel tidak valid: {{detail}} Tidak ada yang diubah.",
      corrupt:
        "{{name}} tidak cocok dengan checksum yang tercatat di bundel, jadi rusak. Tidak ada yang diubah.",
      tooLarge:
        "Bundel itu berukuran {{size}}. Batasnya {{limit}}, dan sebuah resume jauh lebih kecil.",
      entryTooLarge:
        "{{name}} di dalam bundel berukuran {{size}}, melebihi batas {{limit}} untuk satu berkas.",
      tooManyEntries:
        "Bundel memuat lebih dari {{limit}} berkas, yang tidak dimiliki resume mana pun.",
    },
  },
  delete: {
    title: 'Hapus "{{title}}"?',
    body: "Resume ini dihapus dari perangkat dan tidak dapat dikembalikan. Arsipkan saja bila hanya ingin menyingkirkannya dari tampilan.",
    confirm: "Hapus",
  },
  rename: {
    title: "Ganti nama resume",
    name: "Nama",
    submit: "Ganti nama",
  },
  create: {
    title: "Resume baru",
    template: "Template",
    startFrom: "Mulai dari",
    example: "Resume contoh",
    blank: "Halaman kosong",
    exampleHint:
      "Resume jadi untuk disunting, lengkap dengan entri, tanggal, dan daftar keahlian yang sudah tertulis.",
    blankHint:
      "Empat bagian yang hampir selalu ada di resume, semuanya kosong.",
    importedHint: "Berkas yang diimpor menentukan isi halaman.",
    name: "Nama",
    namePlaceholder: "Lamaran Staff Engineer 2026",
    group: "Grup",
    noGroup: "Tanpa grup",
    importFile: "Impor berkas",
    chooseAnother: "Pilih berkas lain",
    submit: "Buat resume",
    tooBig:
      "{{name}} berukuran {{size}} KB. Berkas resume hanya beberapa kilobita, jadi ini kemungkinan bukan resume.",
    empty: "{{name}} kosong.",
    bundleHint:
      "Bundel membawa template dan gayanya sendiri, jadi template yang dipilih di atas tidak dipakai.",
    templateChanged:
      "Template telah berubah sejak bundel ini diekspor (revisi {{from}}, sekarang {{to}}), jadi halaman mungkin terpisah berbeda dari aslinya.",
    importHint:
      "Markdown, JSON Resume, teks biasa, atau bundel Resivo (.zip). Judul dalam berkas teks menentukan bagian-bagiannya, jadi periksa sekali setelah terbuka.",
    readClean: "Terbaca tanpa sisa.",
    dropped:
      "Tidak disertakan, karena resume di sini tidak punya tempat untuknya: {{fields}}.",
    droppedFields: {
      image: "foto",
      urls: "tautan pada pekerjaan, sekolah, dan proyek",
      score: "nilai",
      courses: "mata kuliah",
      level: "tingkat keahlian",
      keywords: "kata kunci proyek",
    },
    errors: {
      invalidJson: "Berkas itu bukan JSON yang valid.",
      notJsonResume:
        "Berkas JSON itu bukan JSON Resume, jadi tidak ada yang dapat dibaca sebagai resume.",
      invalid: "Berkas itu tidak dapat dijadikan resume. {{detail}}",
    },
    readWarnings_one:
      "Terbaca. {{count}} baris tidak dapat ditata dan disimpan sebagai teks sumber, editor menunjukkannya.",
    readWarnings_other:
      "Terbaca. {{count}} baris tidak dapat ditata dan disimpan sebagai teks sumber, editor menunjukkan masing-masing.",
  },
  version: {
    action: "Buat versi untuk lowongan",
    title: "Versi baru",
    intro:
      "Salinan {{title}} untuk disesuaikan dengan satu lowongan. Ia resume tersendiri, dan keduanya tetap dapat dibandingkan.",
    company: "Perusahaan",
    role: "Posisi",
    url: "Tautan lowongan",
    urlHint:
      "Opsional. Tempat lowongan berada, untuk saat tiba waktunya bersiap.",
    urlInvalid: "Tautan diawali http:// atau https://",
    companyRequired: "Sebutkan untuk perusahaan mana.",
    titleFor: "{{title}} untuk {{company}}",
    submit: "Buat versi",
    for: "Untuk {{company}}, {{role}}",
    forCompany: "Untuk {{company}}",
    count_one: "{{count}} versi",
    count_other: "{{count}} versi",
  },
  group: {
    ungrouped: "Tanpa grup",
    newTitle: "Grup baru",
    name: "Nama",
    placeholder: "Lamaran",
    create: "Buat grup",
    actions: "Tindakan untuk {{name}}",
    rename: "Ganti nama",
    renameTitle: "Ganti nama grup",
    delete: "Hapus grup",
    deleteTitle: "Hapus {{name}}?",
    deleteEmpty: "Grup ini kosong, jadi tidak ada hal lain yang berubah.",
    deleteSome_one:
      "Resume di dalamnya menjadi tanpa grup. Tidak ada yang dihapus selain grupnya sendiri.",
    deleteSome_other:
      "{{count}} resume di dalamnya menjadi tanpa grup. Tidak ada yang dihapus selain grupnya sendiri.",
  },
} satisfies Widen<typeof en>;
