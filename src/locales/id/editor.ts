import type { Widen } from "../widen";
import type { editor as en } from "../en/editor";

export const editor = {
  panes: {
    label: "Panel editor",
    code: "Kode",
    paper: "Kertas",
    style: "Gaya",
  },
  code: {
    sourceFiles: "Berkas sumber",
    notices_one: "{{count}} catatan",
    notices_other: "{{count}} catatan",
  },
  history: {
    undo: "Urungkan ({{shortcut}})",
    redo: "Ulangi ({{shortcut}})",
  },
  save: {
    saved: {
      label: "Tersimpan",
      detail: "Tertulis di perangkat ini. Tidak ada salinan di tempat lain.",
    },
    saving: {
      label: "Menyimpan",
      detail: "Menulis ke perangkat ini.",
    },
    error: {
      label: "Belum tersimpan",
      detail:
        "Penulisan terakhir gagal, dan resume ini belum ada di disk. Perubahan Anda masih ada di layar, ekspor salinannya sebelum menutup tab.",
    },
  },
  export: {
    button: "Ekspor",
    print: "Cetak",
    file: "Berkas",
    pdf: {
      name: "PDF",
      hint: "Mencetak dokumen hasil ekspor. Pilih “Simpan sebagai PDF”, dan biarkan skala dan margin apa adanya.",
    },
    formats: {
      html: {
        hint: "Satu berkas mandiri. Tata letak sama dengan pratinjau, tanpa jaringan.",
      },
      markdown: {
        hint: "Hanya isi, dalam dialek yang sama dengan yang dibaca editor. Gaya hilang.",
      },
      "json-resume": {
        hint: "Isi dalam format JSON Resume yang dibaca alat lain. Bagian tanpa padanan tidak disertakan.",
      },
      text: {
        hint: "Teks biasa tanpa gaya, untuk formulir yang meminta Anda menempelkan resume.",
      },
      bundle: {
        hint: "Resume ini beserta gambar, font, dan gayanya. Impor di mana saja dan tampilannya sama.",
      },
    },
    letterFile: "Surat lamaran {{name}}",
    failed: "Ekspor tidak dapat ditulis.",
  },
  versions: {
    chip: "Versi untuk {{company}}",
    chipAria: "Resume ini adalah versi untuk {{company}}",
    openBase: "Buka {{title}}",
    compare: "Bandingkan",
    title: "Perubahan dari {{title}}",
    intro:
      "Apa yang dimiliki versi ini tetapi tidak dimiliki {{title}}, dan apa yang tidak ada padanya.",
    identical: "Belum ada yang berbeda dari {{title}}.",
    noSharedIdentity:
      "Keduanya tidak berbagi bagian berdasarkan identitas, yang terjadi ketika Markdown salah satunya diganti seluruhnya. Karena itu semua di bawah ditampilkan sebagai baru, dan perbandingan baris demi baris tidak mungkin.",
    header: {
      name: "Nama",
      headline: "Judul singkat",
      contact: "Kontak",
    },
    settings: {
      template: "Template berbeda",
      design: "Pengaturan gaya berbeda",
      customCss: "CSS khusus berbeda",
    },
    section: {
      added: "Bagian ditambahkan",
      removed: "Bagian dihapus",
      moved: "Dipindahkan",
      hidden: "Disembunyikan di sini",
      shown: "Ditampilkan di sini",
      renamed: "Diganti namanya dari {{from}}",
      style: "Gaya berbeda",
    },
    block: {
      added: "Ditambahkan",
      removed: "Dihapus",
      changed: "Diubah",
      moved: "Dipindahkan",
      formatOnly: "Kata sama, format berbeda",
    },
    unchanged_one: "{{count}} bagian tidak berubah.",
    unchanged_other: "{{count}} bagian tidak berubah.",
  },
  preview: {
    pages_one: "{{count}} halaman",
    pages_other: "{{count}} halaman",
    paperSize: "Ukuran kertas",
    zoomOut: "Perkecil",
    zoomIn: "Perbesar",
    fitWidth: "Sesuaikan lebar",
    mode: "Mode pratinjau",
    read: "Baca",
    visual: "Visual",
    paperAndZoom: "Kertas dan zoom",
    paper: "Kertas",
    zoom: "Zoom",
    frameTitle: "Pratinjau resume",
    page: "Halaman {{number}}",
  },
  chrome: {
    insertBreak: "Sisipkan pemisah halaman setelah ini",
    imageWidth: "Lebar gambar",
    drag: "Seret untuk memindahkan",
    moveUp: "Naikkan",
    moveDown: "Turunkan",
    delete: "Hapus",
  },
  route: {
    couldNotOpen: "Dokumen ini tidak dapat dibuka",
    couldNotRead: "Dokumen yang tersimpan tidak dapat dibaca.",
    notFound: "Dokumen tidak ditemukan",
    notFoundBody:
      "Mungkin sudah dihapus di perangkat ini. Kembali ke pustaka untuk melihat apa yang ada.",
    untitled: "Tanpa judul",
  },
} satisfies Widen<typeof en>;
