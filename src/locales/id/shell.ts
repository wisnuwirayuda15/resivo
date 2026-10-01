import type { Widen } from "../widen";
import type { shell as en } from "../en/shell";

export const shell = {
  appBar: {
    toggleSidebar: "Buka atau tutup bilah samping",
    toggleNavigation: "Buka atau tutup navigasi",
    toggleTheme: "Ganti tema",
    lightTheme: "Tema terang",
    darkTheme: "Tema gelap",
    applicationMenu: "Menu aplikasi",
    keyboardShortcuts: "Pintasan keyboard",
    about: "Tentang Resivo",
    takeTheTour: "Ikuti tur",
  },
  sidebar: {
    newResume: "Resume baru",
    allResumes: "Semua resume",
    coverLetters: "Surat lamaran",
    archived: "Diarsipkan",
    groups: "Grup",
    ungrouped: "Tanpa grup",
    newGroup: "Grup baru",
    library: "Pustaka",
    templates: "Template",
    images: "Gambar",
    fonts: "Font",
    settings: "Pengaturan",
    privacy: "Tanpa akun. Tanpa cloud.",
  },
  shortcuts: {
    title: "Pintasan keyboard",
    or: "atau",
    anywhere: {
      title: "Di mana saja di aplikasi",
      palette: "Buka palet perintah",
      sidebar: "Ciutkan atau lebarkan bilah samping",
      undo: "Urungkan perubahan terakhir pada resume",
      redo: "Ulangi",
    },
    code: {
      title: "Di panel Markdown dan CSS",
      note: "Editor kode punya riwayatnya sendiri, jadi urungkan di sana berarti teks yang Anda ketik, bukan seluruh dokumen.",
      undo: "Urungkan ketikan, selangkah demi selangkah",
      find: "Cari di panel",
      commands: "Daftar perintah milik editor kode",
    },
    paper: {
      title: "Di kertas, dalam mode Visual",
      note: "Kertas adalah dokumen tersendiri, itulah sebabnya tombol yang ditekan di dalamnya tidak sampai ke aplikasi di sekelilingnya.",
      edit: "Sunting teks yang disorot",
      keep: "Selesai menyunting dan simpan perubahan",
      discard: "Selesai menyunting dan buang perubahan",
    },
  },
} satisfies Widen<typeof en>;
