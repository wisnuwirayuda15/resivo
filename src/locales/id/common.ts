import type { Widen } from "../widen";
import type { common as en } from "../en/common";

export const common = {
  cancel: "Batal",
  close: "Tutup",
  delete: "Hapus",
  save: "Simpan",
  rename: "Ganti nama",
  reload: "Muat ulang",
} satisfies Widen<typeof en>;
