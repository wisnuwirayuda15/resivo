import type { Widen } from "../widen";
import type { landing as en } from "../en/landing";

export const landing = {
  nav: {
    templates: "Template",
    about: "Tentang",
    docs: "Dokumentasi",
    logo: "Resivo",
    openApp: "Buka aplikasi",
    lightTheme: "Tema terang",
    darkTheme: "Tema gelap",
  },
  hero: {
    title: "Resume Anda tidak pernah meninggalkan browser ini.",
    body: "Tulis dalam Markdown, atur dengan CSS sungguhan, dan ekspor PDF yang persis sama dengan halamannya.",
    openApp: "Buka aplikasi",
    seeTemplates: "Lihat template",
  },
  surfaces: {
    title: "Tiga cara menyuntingnya. Satu dokumen di bawahnya.",
    markdown: {
      title: "Markdown",
      body: "CommonMark dan GFM, ditambah beberapa direktif untuk hal-hal yang tidak dapat dipulihkan kembali oleh konvensi judul.",
    },
    paper: {
      title: "Kertasnya",
      body: "Klik baris mana pun untuk mengubahnya di tempatnya, atau seret sebuah blok untuk memindahkannya. Halaman yang Anda sunting adalah halaman yang tercetak.",
    },
    style: {
      title: "Panel gaya",
      body: "Setiap token desain: ukuran kertas, margin, huruf, warna, garis, ikon, dan di mana halaman terpisah.",
    },
    note: "Penggeser, seretan di halaman, dan ketikan di Markdown semuanya menulis ke model yang sama, itulah sebabnya satu riwayat urungkan mencakup ketiganya.",
  },
  showcase: {
    title: "Setiap template satu kolom.",
    body: "Masing-masing murni CSS di atas markup yang sama, jadi berganti template tidak pernah menulis ulang apa yang Anda tulis. Satu kolom dengan judul berurutan sesuai dokumen juga yang benar-benar dapat dibaca sistem pelacakan pelamar.",
  },
  localFirst: {
    title: "Tanpa akun. Tanpa server. Tanpa salinan di tempat lain.",
    body: "Resume adalah dokumen tentang Anda: di mana Anda tinggal, siapa yang mempekerjakan Anda, berapa gaji Anda. Semuanya tetap di browser ini, di perangkat ini. Tidak ada backend yang bisa dibobol dan tidak ada akun yang perlu dihapus.",
    price:
      "Itu ada harganya, dan lebih baik diketahui sekarang daripada saat pertama kali ia berarti. Membersihkan penyimpanan browser ini menghapus resume Anda. Berkas cadangan di Pengaturan adalah satu-satunya yang bertahan, dan membuatnya hanya butuh satu klik.",
  },
  capabilities: {
    title: "Apa yang dikerjakan aplikasi saat Anda tidak melihat.",
    breaks: {
      title: "Pemisah halaman diukur, bukan ditebak",
      body: "Setiap blok ditata sekali pada lebar halaman yang sebenarnya, diukur, lalu ditempatkan. Sebuah entri tidak pernah terpotong di tengah, dan ekspor memakai ulang pemisah yang sudah ditemukan pratinjau, bukan menghitungnya lagi.",
    },
    markdown: {
      title: "Markdown yang bisa kembali utuh",
      body: "HTML mentah, catatan kaki, dan definisi tautan disimpan apa adanya dan dilaporkan, tidak pernah dibuang diam-diam.",
    },
    icons: {
      title: "1512 ikon, enam ketebalan",
      body: "Dapat dicari, dan disisipkan sebagai SVG sungguhan sehingga bertahan dalam ekspor.",
    },
    assets: {
      title: "Gambar dan font, dipakai bersama",
      body: "Diunggah sekali dan tersedia untuk setiap resume di perangkat ini. Kedua halamannya juga menunjukkan apa yang tidak dirujuk lagi oleh apa pun.",
    },
    keyboard: {
      title: "Semuanya dari keyboard",
      body: "Palet perintah di atas setiap halaman dan perintah, dengan pintasan yang tercantum di tempat yang mudah ditemukan.",
    },
    css: {
      title: "Stylesheet Anda sendiri, terbatas pada kertas",
      body: "Disaring saat masuk, tanpa impor dan tanpa permintaan eksternal, dan disisipkan ke lapisan cascade di atas template. Ia dapat menata ulang halaman dan tidak dapat menjangkau aplikasi di sekelilingnya atau merusak pemisahan halaman yang telah diukur.",
    },
  },
  closing: {
    title: "Mulai dengan halaman kosong.",
    body: "Tidak ada yang perlu didaftarkan. Resume pertama hanya butuh satu klik dan sebuah nama.",
    openApp: "Buka aplikasi",
    footer: "Semua yang Anda tulis tetap ada di perangkat ini.",
    settings: "Pengaturan",
  },
  sourcePanel: {
    file: "resume.md",
  },
  about: {
    title: "Tentang Resivo",
    keeps: {
      title: "Pembuat resume yang menjaga resume Anda",
      body: "Resume adalah dokumen tentang Anda: di mana Anda tinggal, siapa yang mempekerjakan Anda, berapa gaji Anda. Resivo menyimpan semuanya di browser ini, di perangkat ini. Tidak ada akun, tidak ada server, dan tidak ada permintaan yang membawa data Anda ke mana pun.",
    },
    costs: {
      title: "Apa harganya",
      body: "Membersihkan penyimpanan browser ini menghapus resume Anda, dan tidak ada salinan di tempat lain untuk diandalkan. Jendela pribadi tidak menyimpan apa pun setelah ditutup, dan perangkat lain tidak melihat satu pun dari ini. Berkas cadangan di <settings>Pengaturan</settings> adalah satu-satunya yang bertahan setelah browser dibersihkan atau perangkat hilang, lebih baik membuatnya sekarang daripada saat pertama kali ia berarti.",
    },
    how: {
      title: "Cara kerjanya",
      body: "Satu dokumen, tiga cara menyuntingnya: Markdown, kertasnya sendiri, dan panel gaya. Ketiganya menulis ke model yang sama, itulah yang menjaga satu riwayat urungkan tetap koheren di antara mereka. Pratinjau adalah dokumen tersendiri dan bukan kotak bergaya di dalam aplikasi, jadi yang Anda lihat adalah yang dicetak ekspor PDF, pemisah halaman diukur dari yang sebenarnya, bukan ditebak.",
    },
    exports: {
      title: "Ekspor dan impor",
      body: "HTML adalah satu berkas tanpa rujukan eksternal apa pun, gambar, font yang diunggah, dan huruf bawaan semuanya disisipkan, jadi ia terbuka di komputer yang belum pernah melihat Resivo. PDF adalah berkas yang sama, dicetak. Markdown bisa pulang-pergi: apa yang tidak dapat ditata aplikasi disimpan apa adanya dan dilaporkan, bukan dibuang.",
    },
    ats: {
      title: "Template dan ATS",
      body: "Setiap <templates>template</templates> satu kolom dan aman bagi parser: tanpa tabel yang menahan tata letak, tanpa teks di dalam gambar, tanpa urutan baca dua kolom yang bisa diacak mesin. Perbedaannya pada huruf, jarak, dan seberapa banyak hierarki berasal dari garis dibanding ukuran huruf.",
    },
  },
  templatesPage: {
    title: "Template",
    intro:
      "Setiap template satu kolom dan aman bagi parser. Perbedaannya pada huruf, jarak, dan seberapa banyak hierarki berasal dari garis dibanding ukuran huruf.",
  },
} satisfies Widen<typeof en>;
