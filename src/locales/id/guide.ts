import type { Widen } from "../widen";
import type { guide as en } from "../en/guide";

export const guide = {
  title: "Panduan menulis",
  button: "Panduan",
  tabs: "Panduan",
  copyPrompt: "Salin prompt AI",
  copyGuide: "Salin panduan ini",
  copied: "Tersalin",
  promptNote:
    "Prompt ini menyatakan seluruh format, dan apa yang tidak boleh ditulis. Tempelkan ke asisten mana pun, tambahkan riwayat Anda di bawahnya, lalu tempel hasilnya ke panel Markdown.",
  heading: "Menulis resume di Resivo",
  summary:
    "Resivo-Markdown adalah CommonMark dan GFM ditambah beberapa direktif, karena resume punya struktur yang tidak dapat dinyatakan oleh judul dan daftar.",
  chapters: {
    markdown: {
      title: "Markdown",
      intro:
        "Dokumennya adalah Markdown itu. Semua yang ada di kertas berasal dari berkas ini, dan setiap perubahan di kertas ditulis kembali ke dalamnya, jadi berkas dengan bentuk ini adalah resume yang selesai, siapa atau apa pun yang mengetiknya.",
      sections: {
        shape: {
          title: "Bentuk berkasnya",
          body: [
            "`#` adalah nama Anda. Hanya ada satu, ia datang pertama, dan itu satu-satunya hal yang harus dimiliki berkas.",
            "Paragraf di bawahnya adalah tajuk, satu baris yang berada di bawah nama Anda.",
            "`##` membuka sebuah bagian, dan teksnya adalah judul bagian itu. Beberapa judul juga memberi tahu template jenis bagiannya: Ringkasan, Pengalaman, Pendidikan, Keahlian, Proyek, Sertifikasi, Penghargaan, Publikasi, Bahasa, Minat (atau padanan bahasa Inggrisnya). Judul lain tidak masalah dan tampil sama.",
            "Berkas yang ditulis dengan judul `###` tetap berfungsi apa adanya: tingkat judul paling dangkal di berkas dianggap tingkat bagian, dan dirapikan saat penyimpanan pertama.",
          ],
        },
        contacts: {
          title: "Kontak",
          body: [
            "Satu `::contact` per baris, satu per keterangan. Teks dalam kurung adalah yang tercetak; `icon` adalah nama ikon Phosphor dalam kebab-case, dan `href` bersifat opsional. Dengannya, baris itu menjadi tautan di PDF dan ekspor HTML.",
            "Tab Bagian di inspektur punya pemilih untuk semua ini, jadi nama ikon tidak perlu ditebak dengan tangan.",
          ],
        },
        entries: {
          title: "Entri",
          body: [
            "Entri adalah satu blok yang tidak dapat dinyatakan oleh konvensi judul. `### Lead Engineer, Difference Engine Co., London (2021-2024)` berarti menebak tanda baca untuk mengambil kembali keempat fakta, dan menebak itulah yang membuat pulang-pergi kehilangan isi. Maka semuanya ditulis sebagai atribut.",
            'Semua dari `subtitle`, `location`, `start`, dan `end` bersifat opsional. `current="true"` menggantikan `end` untuk sesuatu yang masih dijalani.',
            'Tanggal berupa `YYYY-MM` atau `YYYY`, dan diformat sesuai bahasa dokumen. Selain itu dicetak persis seperti diketik, jadi "Musim panas 2019" adalah rentang tanggal yang sah dan bukan kesalahan.',
            "Di dalam blok, paragraf pertama adalah ringkasan entri dan daftarnya adalah butir-butirnya.",
          ],
        },
        tags: {
          title: "Keahlian, label, dan ikon",
          body: [
            "`::tags` menerima daftar yang dipisah koma dan menggambarnya sebagai pil, bentuk yang tepat untuk keahlian, alat, dan bahasa.",
            "`::label` adalah satu baris dengan ikon di depannya. `:icon` menaruh ikon di dalam kalimat, di tengahnya.",
            "Keduanya menerima `weight`: thin, light, regular, bold, fill, atau duotone. Semua 1512 ikon Phosphor tersedia dalam keenamnya, dan pemilih di inspektur mencarinya.",
          ],
        },
        imagesBreaks: {
          title: "Gambar dan pemisah halaman",
          body: [
            "`::pagebreak` memaksa apa pun yang mengikutinya ke lembar baru. Sebuah bagian juga dapat diatur mulai di lembar baru, dari tab Bagian, dan satu pengaturan seluruh dokumen menentukan apakah judul boleh menjadi hal terakhir di sebuah halaman.",
            "Gambar dirujuk lewat id, dan id itu milik basis data browser ini, jadi tidak dapat ditulis dengan tangan atau ditebak. Tambahkan gambar dari tab Aset dan direktifnya ditulis untuk Anda; `width` adalah persentase dari lebar kolom teks, dan kontrol di kertas yang mengaturnya.",
          ],
        },
        ordinary: {
          title: "Selebihnya adalah Markdown biasa",
          body: [
            "CommonMark dan GFM, dan semuanya ditata: judul, daftar butir dan bernomor di kedalaman berapa pun, daftar tugas, tabel, kutipan, blok kode, pemisah tematik, serta tebal, miring, dan tautan di dalam baris.",
            "Yang tidak dapat diwakili model (HTML mentah, catatan kaki, definisi rujukan tautan) disimpan apa adanya dan dilaporkan sebagai peringatan, bukan dibuang diam-diam. Teks yang datang di atas judul pertama masuk ke bagian tanpa judul, bukan ditolak.",
          ],
        },
      },
    },
    styling: {
      title: "Gaya",
      intro:
        "Sebagian besar penataan di sini bukan CSS. Tab Gaya adalah kontrol untuk setiap token desain yang dibaca template, dan menggesernya di sana lebih mudah sekaligus lebih aman daripada menimpanya: kertas diukur pada nilai-nilai itu, jadi pemisahan halaman tetap benar.",
      sections: {
        tokens: {
          title: "Coba tab Gaya dulu",
          body: [
            "Ukuran kertas dan margin, keluarga huruf dan skalanya, warna, ritme vertikal, garis bagian, bawaan ikon, dan di mana halaman boleh terpisah: semuanya berupa kontrol dan bukan aturan yang harus ditulis.",
            "Setiap template satu kolom dan ramah ATS, dan semuanya murni CSS di atas markup yang sama. Berganti template tidak pernah mengubah dokumen, hanya cara menggambarnya.",
          ],
        },
        customCss: {
          title: "CSS kustom, dan apa yang dapat dijangkaunya",
          body: [
            "Tab CSS di samping Markdown berlaku untuk kertas dan tidak ada yang lain. Ia disisipkan ke pratinjau di dalam `@layer custom`, lapisan tertinggi, jadi ia mengalahkan template tanpa perlu `!important`, dan tidak dapat menjangkau aplikasi di sekelilingnya.",
            "Ia ikut bersama resume: ekspor HTML menyisipkannya, dan PDF adalah berkas hasil ekspor itu yang dicetak, jadi aturan yang ditulis di sini ada di setiap bentuk dokumen.",
          ],
        },
        classes: {
          title: "Nama kelas",
          body: [
            "Satu halaman: `.rp-page`. Header: `.rp-name`, `.rp-headline`, `.rp-contacts`, dan `.rp-contact`.",
            "Sebuah bagian: `.rp-section`, `.rp-section-title`, `.rp-section-rule`.",
            "Sebuah entri: `.rp-entry-title`, `.rp-entry-subtitle`, `.rp-entry-meta`, `.rp-entry-summary`, dan `.rp-bullets` untuk daftarnya.",
            "Sisanya: `.rp-tags` dan `.rp-tag`, `.rp-icon-label`, `.rp-table`, `.rp-quote`, `.rp-code-block`, `.rp-figure` dan `.rp-figure-caption`, `.rp-divider`, `.rp-link`.",
          ],
        },
        refused: {
          title: "Apa yang ditolak, dan mengapa",
          body: [
            "`@import`, dan `url()` apa pun yang bukan `data:` atau `blob:`. Resivo mengutamakan lokal, dan stylesheet yang mengambil sesuatu adalah stylesheet yang mengumumkan dirinya, di setiap render.",
            "`@page` dan `position: fixed`. Keduanya akan membuat dokumen cetak berbeda dari pratinjau yang dipaginasi, padahal itulah satu-satunya jaminan yang ingin diberikan pratinjau.",
            "`expression()`, `behavior`, dan `-moz-binding`: jalur lama dari stylesheet menuju skrip yang berjalan. Sudah lama mati, murah untuk ditolak, dan teks ini bisa dibaca bertahun-tahun lagi oleh browser yang bukan yang ini.",
            "Tidak ada yang dibuang diam-diam: setiap penolakan dilaporkan sebagai peringatan dengan baris dan kolom tempat ia berada.",
          ],
        },
        limits: {
          title: "Apa yang tidak dapat dilakukan CSS di sini",
          body: [
            "Ia tidak dapat memindahkan pemisah halaman. Paginasi diukur (setiap blok ditata sekali pada lebar halaman yang persis, diukur, lalu dibagikan ke kotak halaman), dan setiap kotak diberi tepat satu lembar.",
            "Jadi sebuah entri tidak pernah terbelah antar halaman, sebuah paragraf tidak pernah diseimbangkan melewati pemisah, dan `break-inside`, `orphans`, dan `widows` sengaja tidak ada di stylesheet cetak: tidak ada lagi fragmentasi CSS yang bisa mereka pengaruhi. Pakai `::pagebreak`, atau pengaturan bagian itu sendiri.",
          ],
        },
      },
    },
  },
} satisfies Widen<typeof en>;
