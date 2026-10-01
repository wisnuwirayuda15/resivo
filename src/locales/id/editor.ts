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
    failed: "Ekspor tidak dapat ditulis.",
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
    couldNotOpen: "Resume ini tidak dapat dibuka",
    couldNotRead: "Dokumen yang tersimpan tidak dapat dibaca.",
    notFound: "Resume tidak ditemukan",
    notFoundBody:
      "Mungkin sudah dihapus di perangkat ini. Kembali ke pustaka untuk melihat apa yang ada.",
    untitled: "Resume",
  },
} satisfies Widen<typeof en>;
