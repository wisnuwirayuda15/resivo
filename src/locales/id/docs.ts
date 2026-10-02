import type { Widen } from "../widen";
import type { docs as en } from "../en/docs";

export const docs = {
  title: "Dokumentasi",
  notFound: {
    title: "Halaman itu tidak ada di dokumentasi",
    body: "Mungkin halamannya sudah dipindah, atau tautannya keliru. Beranda dokumentasi memuat semua yang ada.",
    home: "Beranda dokumentasi",
  },
} satisfies Widen<typeof en>;
