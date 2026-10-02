import type { Widen } from "../widen";
import type { docs as en } from "../en/docs";

export const docs = {
  title: "Dokumentasi",
  header: {
    logo: "Beranda Resivo",
    home: "Dokumen",
    openApp: "Buka aplikasi",
    language: "Bahasa",
    lightTheme: "Ganti ke tema terang",
    darkTheme: "Ganti ke tema gelap",
    openNav: "Buka menu dokumentasi",
    closeNav: "Tutup menu dokumentasi",
  },
  nav: {
    label: "Dokumentasi",
    skip: "Lompat ke isi",
  },
  page: {
    breadcrumbs: "Jejak halaman",
    onThisPage: "Di halaman ini",
    pager: "Halaman lainnya",
    previous: "Sebelumnya",
    next: "Berikutnya",
  },
  search: {
    trigger: "Cari",
    placeholder: "Cari di dokumentasi",
    hint: "Ketik untuk mencari di semua halaman.",
    nothing: "Tidak ada hasil. Coba kata yang lebih pendek atau berbeda.",
    error: "Pencarian tidak dapat dimuat. Periksa koneksi Anda lalu coba lagi.",
    page: "Halaman",
    section: "Bagian",
  },
  code: {
    copy: "Salin kode",
    copied: "Tersalin",
  },
  notFound: {
    title: "Halaman itu tidak ada di dokumentasi",
    body: "Mungkin halamannya sudah dipindah, atau tautannya keliru. Beranda dokumentasi memuat semua yang ada.",
    home: "Beranda dokumentasi",
  },
} satisfies Widen<typeof en>;
