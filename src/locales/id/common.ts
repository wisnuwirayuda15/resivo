import type { Widen } from "../widen";
import type { common as en } from "../en/common";

export const common = {
  cancel: "Batal",
  close: "Tutup",
  delete: "Hapus",
  save: "Simpan",
  rename: "Ganti nama",
  reload: "Muat ulang",
  errors: {
    somethingWrong: "Terjadi kesalahan",
    somethingWrongBody:
      "Resume Anda tersimpan di perangkat ini dan tidak terpengaruh. Muat ulang untuk mencoba lagi.",
    notFound: "Halaman tidak ditemukan",
    notFoundBody: "Alamat itu tidak ada di Resivo.",
    goToResumes: "Buka resume",
  },
} satisfies Widen<typeof en>;
