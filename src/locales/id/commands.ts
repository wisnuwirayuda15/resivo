import type { Widen } from "../widen";
import type { commands as en } from "../en/commands";

export const commands = {
  groups: {
    create: "Buat",
    goTo: "Buka",
    app: "Aplikasi ini",
  },
  newResume: {
    label: "Resume baru",
    description: "Pilih template, atau impor berkas",
    keywords: "buat tambah impor create add import",
  },
  newGroup: {
    label: "Grup baru",
    description: "Folder untuk sekumpulan resume",
    keywords: "buat tambah folder create add",
  },
  resumes: {
    label: "Semua resume",
    keywords: "pustaka beranda library home",
  },
  archive: { label: "Diarsipkan", keywords: "arsip tersembunyi hidden" },
  templates: {
    label: "Template",
    description: "Untuk apa tiap tata letak, dan bagaimana parser membacanya",
    keywords: "ats tata letak desain layout design",
  },
  images: {
    label: "Gambar",
    description:
      "Semua gambar di perangkat ini, dan yang tidak dipakai apa pun",
    keywords: "foto avatar aset tidak terpakai photo assets unused",
  },
  fonts: {
    label: "Font",
    description: "Jenis huruf yang diunggah",
    keywords: "huruf aset typeface assets woff",
  },
  settings: {
    label: "Pengaturan",
    description: "Cadangkan dan pulihkan, dan apa yang disimpan perangkat",
    keywords: "cadangan pulihkan ekspor penyimpanan bahasa backup restore",
  },
  about: {
    label: "Tentang Resivo",
    keywords: "bantuan privasi lokal help privacy local",
  },
  theme: {
    light: "Tema terang",
    dark: "Tema gelap",
    keywords: "gelap terang tampilan warna dark light appearance colour",
  },
  sidebar: {
    label: "Buka atau tutup bilah samping",
    description: "Ciutkan menjadi deretan ikon, atau tampilkan kembali",
    keywords: "navbar sempit sembunyi collapse expand hide rail",
  },
  shortcuts: {
    label: "Pintasan keyboard",
    keywords: "tombol bantuan keys help bindings",
  },
  tour: {
    label: "Ikuti tur",
    description: "Tur singkat tentang hal-hal yang perlu diketahui",
    keywords: "pengenalan bantuan panduan onboarding help guide intro",
  },
  language: {
    label: "Ganti bahasa ke {{language}}",
    keywords: "bahasa language terjemahan translate locale",
  },
  nothingFound: "Tidak ada perintah yang cocok.",
  search: "Cari perintah…",
} satisfies Widen<typeof en>;
