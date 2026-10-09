import type { Widen } from "../widen";
import type { onboarding as en } from "../en/onboarding";

export const onboarding = {
  buttons: {
    next: "Lanjut",
    end: "Selesai",
    prev: "Kembali",
    skip: "Lewati",
    stepCounter: "{{current}} dari {{total}}",
  },
  library: {
    newResume: {
      title: "Mulai dari sini",
      content:
        "Pilih template satu kolom, atau impor berkas Markdown yang sudah Anda punya, pengimpor menyimpan apa yang tidak dapat ditatanya dan tidak membuangnya.",
    },
    assets: {
      title: "Gambar dan font dipakai bersama",
      content:
        "Diunggah sekali dan tersedia untuk setiap resume di perangkat ini, jadi foto yang sama tidak perlu ditambahkan dua kali. Kedua halamannya juga menunjukkan apa yang tidak dirujuk lagi oleh apa pun, satu-satunya cara aman untuk mengambil kembali ruangnya.",
    },
    settings: {
      title: "Ini yang terpenting",
      content:
        "Semuanya ada di browser ini dan tidak di tempat lain. Membersihkan penyimpanannya menghapus resume Anda, dan tidak ada server yang menyimpan salinannya. Berkas cadangan di Pengaturan adalah satu-satunya yang bertahan, membuatnya sekarang lebih murah daripada menyesal kemudian.",
    },
    appMenu: {
      title: "Semuanya, dari keyboard",
      content:
        "Ctrl+K (atau Cmd+K) membuka palet perintah di atas seluruh aplikasi: setiap halaman, setiap perintah, dapat dicari. Menu di sini mencantumkan pintasan lainnya, dan di sinilah tur ini dapat dimulai lagi.",
    },
  },
  editor: {
    code: {
      title: "Markdown, dan CSS Anda sendiri",
      content:
        "Dua tab. Markdown adalah dokumennya (judul, daftar, tabel, daftar tugas), dan CSS milik Anda untuk menata ulang kertas. CSS itu disaring dan dibatasi, jadi ia tidak dapat menjangkau aplikasi di sekelilingnya atau merusak pemisahan halaman yang telah diukur.",
    },
    guide: {
      title: "Setiap direktif, dengan contoh",
      content:
        "Formatnya adalah Markdown ditambah beberapa direktif (entri, kontak, daftar keahlian). Ini membuka dokumentasinya di tab baru: setiap direktif dituliskan dengan contoh yang diperiksa terhadap parser sungguhan, dan prompt yang menyatakan seluruh format kepada asisten, termasuk apa yang tidak boleh ditulis, sehingga resume yang Anda minta darinya kembali dalam bentuk yang dapat dibaca aplikasi ini.",
    },
    paper: {
      title: "Kertasnya juga dapat disunting",
      content:
        "Beralih ke Visual dan klik teks mana pun untuk mengubahnya di tempat, atau seret sebuah blok untuk memindahkannya. Setiap perubahan masuk ke dokumen yang sama dengan Markdown, itulah sebabnya satu riwayat urungkan mencakup semuanya.",
    },
    paperTitlebar: {
      title: "Ekspor adalah dokumen yang sama",
      content:
        "HTML adalah satu berkas mandiri (gambar dan font disisipkan, tanpa rujukan eksternal apa pun), dan PDF adalah berkas yang sama itu dicetak, jadi keduanya tidak mungkin berbeda. Markdown memakai penulis yang sama dengan yang dibaca editor.",
    },
    inspector: {
      title: "Empat tab yang perlu diketahui",
      content:
        "Gaya adalah setiap token desain: ukuran kertas, margin, huruf, warna, garis, dan di mana halaman terpisah. Bagian adalah kerangkanya: urutkan, sembunyikan, tambah ikon, mulai bagian di halaman baru. Aset menaruh gambar atau mengatur resume dengan huruf yang diunggah. ATS mencantumkan cara-cara umum resume terbaca buruk oleh sistem pelacakan pelamar, dan memperbaiki sebagian di antaranya dengan satu klik.",
    },
    history: {
      title: "Tidak ada yang searah di sini",
      content:
        "Urungkan dan ulangi mencakup dokumen, dari permukaan mana pun perubahan itu berasal: penggeser, seretan, atau ketikan di kertas. Penyimpanan otomatis menulis ke perangkat ini sambil Anda bekerja.",
    },
  },
} satisfies Widen<typeof en>;
