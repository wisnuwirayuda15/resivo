import type { Widen } from "../widen";
import type { templates as en } from "../en/templates";

/**
 * Nama template tidak diterjemahkan: Classic, Modern, Technical, dan Editorial
 * adalah nama, seperti yang tertulis di halaman galeri dan di berkas yang
 * dibagikan orang.
 */
export const templates = {
  classic: {
    name: "Classic",
    description:
      "Resume satu kolom yang klasik dengan huruf serif dan judul bagian bergaris.",
    atsNotes:
      "Satu kolom, tanpa tabel, tanpa kolom, judul mengikuti urutan dokumen. Pilihan paling aman untuk pembacaan otomatis.",
  },
  modern: {
    name: "Modern",
    description:
      "Tata letak masa kini yang bersih dengan huruf sans, memakai ketebalan dan ruang sebagai pengganti garis.",
    atsNotes:
      "Satu kolom dengan jarak lapang. Judul bagian tetap berupa teks biasa, jadi parser membacanya seperti biasa.",
  },
  technical: {
    name: "Technical",
    description:
      "Tata letak yang lebih padat dengan judul monospace, cocok untuk peran rekayasa dengan daftar keahlian panjang.",
    atsNotes:
      "Ukuran teks yang lebih kecil memuat lebih banyak isi per halaman. Keahlian tampil sebagai teks yang dipisah koma, bukan chip, sehingga terbaca andal.",
  },
  editorial: {
    name: "Editorial",
    description:
      "Tata letak serif dengan nama besar dan jarak baris lapang, untuk peran menulis dan desain.",
    atsNotes:
      "Pembatas mati secara bawaan dan hierarki berasal dari ukuran huruf. Tetap satu kolom dan aman bagi parser.",
  },
} satisfies Widen<typeof en>;
