import type { Widen } from "../widen";
import type { settings as en } from "../en/settings";

export const settings = {
  language: {
    title: "Bahasa",
    description:
      "Bahasa menu, dialog, dan pesan. Ini tidak menerjemahkan apa yang Anda tulis di resume, yang punya pengaturan bahasa sendiri di panel gaya.",
    label: "Bahasa antarmuka",
  },
} satisfies Widen<typeof en>;
