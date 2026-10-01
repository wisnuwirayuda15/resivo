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
    importMarkdown: "Impor Markdown",
    chooseAnother: "Pilih berkas lain",
    submit: "Buat resume",
    tooBig:
      "{{name}} berukuran {{size}} KB. Resume Markdown hanya beberapa kilobita, jadi ini kemungkinan bukan resume.",
    empty: "{{name}} kosong.",
    readClean: "Terbaca tanpa sisa.",
    readWarnings_one:
      "Terbaca. {{count}} baris tidak dapat ditata dan disimpan sebagai teks sumber, editor menunjukkannya.",
    readWarnings_other:
      "Terbaca. {{count}} baris tidak dapat ditata dan disimpan sebagai teks sumber, editor menunjukkan masing-masing.",
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
