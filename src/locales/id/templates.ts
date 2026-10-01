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
  compact: {
    name: "Compact",
    description:
      "Tata letak sans yang padat dengan irama rapat, untuk riwayat panjang yang harus tetap muat di sedikit halaman.",
    atsNotes:
      "Teks isi 9,5pt dengan margin 0,5 inci, yang terkecil yang diterima pemeriksaan ATS. Satu kolom, jadi terbaca berurutan.",
  },
  profile: {
    name: "Profile",
    description:
      "Header yang dibangun di sekitar foto Anda, dengan judul serif di atas isi sans.",
    atsNotes:
      "Foto berada di samping nama dan hanya hiasan. Tanpa foto, header berupa blok rata kiri biasa. Tetap satu kolom.",
  },
  bold: {
    name: "Bold",
    description:
      "Nama huruf kapital yang tebal dan judul bagian yang kuat di atas garis aksen yang tebal.",
    atsNotes:
      "Bobotnya datang dari huruf dan garis, bukan dari tata letak. Huruf kapital hanya gaya, jadi teks yang dibaca parser adalah yang Anda ketik.",
  },
} satisfies Widen<typeof en>;
