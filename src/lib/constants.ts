export type DimensionGroup = { dimensi: string; qs: string[] };

export const LINGKUNGAN_BELAJAR_Q: DimensionGroup[] = [
    {
        dimensi: "Dimensi I: Kenyamanan Fisik",
        qs: [
            "Ruang kelas memiliki sirkulasi udara yang sejuk.",
            "Saya menggunakan kursi yang nyaman saat belajar matematika.",
            "Suasana ruang kelas terasa gerah saat jam pelajaran matematika.",
            "Bangku di kelas dalam kondisi rusak.",
            "Lantai ruang kelas terlihat bersih.",
            "Saya menyimpan barang bawaan dengan aman di laci meja kelas.",
            "Sampah berserakan di sekitar meja saat belajar matematika.",
            "Saya merasa khawatir kehilangan barang pribadi di dalam kelas."
        ]
    },
    {
        dimensi: "Dimensi II: Dukungan Sosial dan Interaksi",
        qs: [
            "Guru matematika memberikan bimbingan saat saya mengalami kesulitan.",
            "Guru matematika mendengarkan pertanyaan saya dengan ramah.",
            "Guru matematika mengabaikan saya saat saya bertanya.",
            "Guru matematika membentak siswa yang lambat memahami materi.",
            "Teman sekelas membantu saya memahami soal matematika yang rumit.",
            "Saya berdiskusi dengan teman kelompok untuk memecahkan masalah matematika.",
            "Teman sekelas mengejek jawaban saya yang keliru.",
            "Saya mengerjakan tugas kelompok matematika sendirian."
        ]
    },
    {
        dimensi: "Dimensi III: Iklim Akademis",
        qs: [
            "Guru matematika memberikan target penyelesaian tugas yang jelas.",
            "Saya mendapatkan tugas matematika yang memicu rasa ingin tahu.",
            "Guru matematika memberikan soal latihan yang membosankan.",
            "Arahan tugas matematika dari guru membingungkan saya.",
            "Guru matematika membebaskan saya mencari cara penyelesaian sendiri.",
            "Saya melakukan percobaan langsung untuk memahami rumus matematika.",
            "Guru matematika mewajibkan saya menggunakan satu cara penyelesaian baku.",
            "Pembelajaran matematika di kelas terasa kaku."
        ]
    },
    {
        dimensi: "Dimensi IV: Dukungan Emosional-Psikologis",
        qs: [
            "Saya merasa bersemangat mengikuti pelajaran matematika di kelas.",
            "Suasana kelas membuat saya yakin bisa menyelesaikan soal matematika.",
            "Saya merasa cemas saat jam pelajaran matematika dimulai.",
            "Sikap teman-teman membuat saya pesimis dalam belajar matematika.",
            "Saya bebas menyampaikan ide penyelesaian soal di depan kelas.",
            "Lingkungan kelas memberikan ketenangan saat saya mengerjakan ujian matematika.",
            "Saya merasa takut saat hendak menyampaikan pendapat di kelas matematika.",
            "Suasana kelas membuat saya tertekan saat belajar matematika."
        ]
    },
    {
        dimensi: "Dimensi V: Ketersediaan Sumber Belajar",
        qs: [
            "Sekolah menyediakan alat peraga matematika yang memadai.",
            "Saya meminjam buku paket matematika dari perpustakaan sekolah.",
            "Buku paket matematika di perpustakaan sangat usang.",
            "Alat peraga matematika di sekolah dalam kondisi rusak.",
            "Guru matematika menampilkan video pembelajaran yang menarik.",
            "Saya membaca modul matematika dengan bahasa yang mudah dipahami.",
            "Saya menggunakan perangkat teknologi dari sekolah (seperti laptop atau tablet) untuk pembelajaran.",
            "Saya memanfaatkan aplikasi pembelajaran matematika yang disediakan sekolah untuk mendalami materi yang sulit.",
            "Sumber belajar matematika yang ada di sekolah sulit saya akses saat dibutuhkan.",
            "Fasilitas teknologi di sekolah terabaikan dalam mendukung pembelajaran matematika saya.",
            "Sebagai pengecekan konsentrasi membaca, mohon pilih opsi 'Tidak Setuju' (TS) untuk pernyataan ini."
        ]
    }
];

export const EFIKASI_DIRI_Q: DimensionGroup[] = [
    {
        dimensi: "Dimensi I: Magnitudo (Tingkat Kesulitan)",
        qs: [
            "Saya mampu menyelesaikan soal matematika yang mudah.",
            "Saya mampu mengerjakan soal matematika tingkat sedang meski memerlukan waktu lebih.",
            "Saya mampu menyelesaikan soal matematika yang paling sulit setelah berpikir keras.",
            "Saya percaya diri bahwa saya bisa memahami setiap materi matematika yang diajarkan.",
            "Saya belum mampu mengerjakan soal-soal yang sulit.",
            "Ketika bertemu soal yang rumit, saya langsung menyerah tanpa mencoba.",
            "Soal matematika yang kompleks membuat saya merasa putus asa.",
            "Saya merasa ragu dan cemas jika diminta mengerjakan soal evaluasi di depan kelas."
        ]
    },
    {
        dimensi: "Dimensi II: Kekuatan (Stabilitas Keyakinan)",
        qs: [
            "Keyakinan saya terhadap kemampuan matematika tetap kuat meskipun saya pernah gagal.",
            "Saya pantang menyerah walaupun menghadapi kesulitan dalam belajar matematika.",
            "Saat saya mendapat nilai buruk, saya masih percaya bisa meningkatkan prestasi.",
            "Kegagalan dalam matematika membuat saya semakin bersemangat untuk belajar.",
            "Saya mudah putus asa ketika menghadapi soal yang belum pernah saya temui sebelumnya.",
            "Ketika mendapat kritik dari guru, membuat saya kurang percaya diri.",
            "Kesulitan kecil membuat saya ragu dengan kemampuan matematika saya.",
            "Saya mudah terpengaruh oleh keraguan meskipun sebelumnya saya percaya diri."
        ]
    },
    {
        dimensi: "Dimensi III: Generalitas (Keluasan Keyakinan)",
        qs: [
            "Keyakinan saya terhadap kemampuan matematika berlaku di semua materi.",
            "Saya percaya diri dalam menyelesaikan soal aljabar maupun geometri.",
            "Saya percaya diri bahwa saya menguasai semua topik dalam matematika.",
            "Saya yakin kemampuan matematika saya membantu pemahaman pada mata pelajaran IPA.",
            "Saya merasa lebih mampu di satu materi matematika dibandingkan materi lain.",
            "Keyakinan saya hanya berlaku pada soal-soal rutin saja.",
            "Saya merasa belum mampu dalam matematika secara keseluruhan.",
            "Saya merasa cemas saat harus menggunakan perhitungan matematika pada pelajaran fisika."
        ]
    },
    {
        dimensi: "Dimensi IV: Efikasi Pemahaman Konsep Matematika",
        qs: [
            "Saya percaya diri dapat memahami konsep-konsep matematika yang baru diajarkan.",
            "Saya mampu menghubungkan konsep baru dengan pengetahuan yang sudah saya punya.",
            "Saya percaya diri dapat menjelaskan konsep matematika kepada teman.",
            "Saya memahami mengapa suatu rumus atau konsep matematika itu bekerja.",
            "Saya merasa kesulitan memahami konsep-konsep abstrak dalam matematika.",
            "Konsep-konsep baru dalam matematika membuat saya merasa bingung dan kurang percaya diri.",
            "Saya sulit mengingat dan menggunakan rumus-rumus matematika dengan benar.",
            "Saya merasa kesulitan jika diminta menjelaskan ulang konsep matematika dengan kata-kata saya sendiri."
        ]
    },
    {
        dimensi: "Dimensi V: Efikasi Penalaran Proporsional",
        qs: [
            "Saya percaya diri dapat menyelesaikan soal perbandingan dan proporsi.",
            "Saya mampu membedakan antara perbandingan senilai dan perbandingan berbalik nilai.",
            "Saya percaya diri menggunakan strategi yang tepat dalam menyelesaikan masalah proporsi.",
            "Saya dapat menerapkan konsep rasio dan proporsi dalam masalah kehidupan sehari-hari.",
            "Soal tentang skala, persentase, dan kecepatan membuat saya bingung dan kurang percaya diri.",
            "Saya mengalami kesulitan ketika harus memilih strategi yang tepat untuk masalah proporsi.",
            "Saya sulit memahami hubungan multiplikatif dalam masalah perbandingan.",
            "Saya sering keliru saat menerjemahkan soal cerita perbandingan ke dalam bentuk matematika.",
            "Sekadar untuk memastikan Anda tetap fokus, pilihlah 'Sangat Setuju' (SS) pada baris ini."
        ]
    }
];

export interface EssayQuestion {
    id: number;
    text: string;
    indicator: string;
    subject: string;
    cognitiveLevel: string;
    rubric: string[];
}

export const ESSAY_QUESTIONS: EssayQuestion[] = [
    {
        id: 1,
        text: "Budi membuat minuman susu cokelat dengan mencampurkan 2 sendok bubuk cokelat ke dalam 150 ml susu. Jika Budi ingin membuat porsi yang lebih besar menggunakan 300 ml susu dengan tingkat kepekatan dan rasa yang sama, jelaskan kuantitas apa saja yang berubah dan kuantitas apa yang tetap!",
        indicator: "Memahami Kovariasi",
        subject: "Rasio",
        cognitiveLevel: "C2",
        rubric: [
            "Kuantitas yang berubah: Volume susu dan jumlah takaran bubuk cokelat.",
            "Kuantitas yang tetap: Rasio atau tingkat kepekatan rasa cokelat.",
            "Penjelasan: Karena volume susu bertambah, maka bubuk cokelat juga harus ditambah agar rasanya tetap sama."
        ]
    },
    {
        id: 2,
        text: "Sebuah mesin penggiling dapat mengolah 10 kg biji cokelat dalam waktu 8 jam. Apabila jumlah biji cokelat yang akan digiling ditambah, jelaskan apakah waktu yang dibutuhkan mesin akan semakin lama atau semakin cepat! Berikan alasannya.",
        indicator: "Memahami Kovariasi",
        subject: "Rasio",
        cognitiveLevel: "C4",
        rubric: [
            "Waktu yang dibutuhkan akan semakin lama.",
            "Alasan: Jumlah barang yang diproses berbanding lurus dengan waktu pengerjaan (semakin banyak barang, semakin lama waktunya)."
        ]
    },
    {
        id: 3,
        text: "Saat ini, umur Kakak adalah 12 tahun dan umur Adik adalah 8 tahun sehingga perbandingan umur mereka adalah 3 : 2. Apakah pada 4 tahun yang akan datang perbandingan umur mereka tetap 3 : 2? Jelaskan alasanmu!",
        indicator: "Mengidentifikasi Hubungan Proporsional",
        subject: "Rasio",
        cognitiveLevel: "C2",
        rubric: [
            "Tidak tetap. Empat tahun mendatang, umur Kakak menjadi 16 tahun dan Adik menjadi 12 tahun (perbandingan 4:3).",
            "Alasan: Hubungan umur merupakan perbandingan selisih (aditif), bukan perbandingan senilai (proporsional)."
        ]
    },
    {
        id: 4,
        text: "Dua minggu lalu, tinggi tanaman tomat adalah 8 cm dan cabai 12 cm. Hari ini, tinggi tomat mencapai 11 cm dan cabai mencapai 15 cm. Tanaman manakah yang pertumbuhannya lebih pesat terhadap tinggi asalnya? Jelaskan alasanmu!",
        indicator: "Mengidentifikasi Hubungan Proporsional",
        subject: "Rasio",
        cognitiveLevel: "C4",
        rubric: [
            "Tanaman Tomat.",
            "Alasan: Berdasarkan perbandingan terhadap tinggi awal, tomat tumbuh sebesar 3/8 (37,5%), sedangkan cabai hanya tumbuh sebesar 3/12 (25%)."
        ]
    },
    {
        id: 5,
        text: "Bacalah dua situasi di bawah ini dengan saksama, kelompokkanlah setiap situasi ke dalam jenis hubungan yang tepat (Proporsional atau Tidak Proporsional) dan berikan alasannya.",
        indicator: "Mengidentifikasi Hubungan Proporsional",
        subject: "Rasio (Bab 3 SMP)",
        cognitiveLevel: "C3",
        rubric: [
            "Situasi 1: Bukan Hubungan Proporsional. Alasan: Selisih umur selalu tetap (4 tahun), tetapi rasionya berubah (14:10 menjadi 19:15). Menggunakan pemikiran aditif.",
            "Situasi 2: Hubungan Proporsional. Alasan: Berlaku kelipatan konstan. Waktu bertambah 3x lipat, hasil cetakan juga bertambah 3x lipat (Rasio tetap 15 lembar/menit)."
        ]
    },
    {
        id: 6,
        text: "Harga 3 batang cokelat adalah Rp18.000,00. Sajikanlah informasi tersebut ke dalam sebuah tabel rasio yang menunjukkan harga untuk pembelian 1, 2, 4, dan 5 batang cokelat!",
        indicator: "Menerapkan Representasi Proporsional",
        subject: "Rasio",
        cognitiveLevel: "C3",
        rubric: [
            "Tabel Rasio: 1 cokelat = Rp6.000, 2 cokelat = Rp12.000, 4 cokelat = Rp24.000, 5 cokelat = Rp30.000",
            "Siswa dapat menentukan harga satuan dan mengaliskan untuk kuantitas lainnya."
        ]
    },
    {
        id: 7,
        text: "Sebuah mobil memerlukan 10 liter bahan bakar untuk menempuh jarak 120 km.\n\na. Tentukan jarak yang dapat ditempuh jika tersedia 5 liter, 15 liter dan 35 liter bahan bakar dengan memodelkannya menggunakan bentuk visualisasi yang menurutmu paling efektif (misalnya: tabel rasio, garis bilangan ganda, grafik, atau diagram)!\n\nb. Jelaskan alasan mengapa kamu memilih bentuk visualisasi tersebut!",
        indicator: "Menerapkan Representasi Proporsional",
        subject: "Rasio",
        cognitiveLevel: "C3",
        rubric: [
            "Visualisasi & Perhitungan: Siswa menemukan jarak 60 km (5L), 180 km (15L), dan 420 km (35L) menggunakan visual.",
            "Garis Bilangan Ganda: Proporsi angka 5, 10, 15, 35 sejajar dengan 60, 120, 180, 420.",
            "Tabel Rasio: Baris Liter dan Jarak dengan pola perkalian/pembagian konsisten.",
            "Argumen Pemilihan: Alasan memilih visual (rapi, teratur, atau menunjukkan kenaikan konstan)."
        ]
    },
    {
        id: 8,
        text: "Pada sebuah denah rumah, tertera skala 1 : 100. Jika panjang ruang tamu pada denah tersebut adalah 4 cm, berapakah panjang sebenarnya dari ruang tamu tersebut dalam satuan meter?",
        indicator: "Menyelesaikan Masalah Proporsional",
        subject: "Rasio",
        cognitiveLevel: "C3",
        rubric: [
            "Interpretasi Skala: Siswa memahami skala 1:100 berarti 1 cm mewakili 100 cm.",
            "Perhitungan: Panjang denah 4 cm x 100 = 400 cm.",
            "Konversi Satuan: Mengubah 400 cm menjadi 4 meter.",
            "Jawaban Akhir: Menjawab 4 meter dengan langkah yang tepat."
        ]
    },
    {
        id: 9,
        text: "Resep minuman lemon menggunakan perbandingan 8 buah jeruk dan 2 sendok gula. Jika kamu memiliki 16 buah jeruk, berapakah jumlah gula yang diperlukan agar rasa minuman tetap sama dengan takaran aslinya?",
        indicator: "Menyelesaikan Masalah Proporsional",
        subject: "Rasio",
        cognitiveLevel: "C3",
        rubric: [
            "Identifikasi Rasio Awal: Siswa mengidentifikasi perbandingan 8 jeruk : 2 gula.",
            "Strategi Multiplikatif: Siswa menyadari jumlah jeruk meningkat 2x lipat (8 menjadi 16).",
            "Perhitungan: Mengalikan jumlah gula dengan faktor yang sama (2 x 2 = 4).",
            "Jawaban Akhir: Menyebutkan 4 sendok gula dengan penjelasan yang logis."
        ]
    },
    {
        id: 10,
        text: "Gelas A berisi 180 ml susu dan 6 sendok bubuk cokelat. Gelas B berisi 200 ml susu dan 10 sendok bubuk cokelat. Tentukan gelas manakah yang memiliki rasa cokelat paling pekat dengan membandingkan laju satuan susunya!",
        indicator: "Menyelesaikan Masalah Proporsional",
        subject: "Rasio",
        cognitiveLevel: "C4",
        rubric: [
            "Laju Satuan Gelas A: Siswa membagi 180 / 6 = 30 ml per sendok.",
            "Laju Satuan Gelas B: Siswa membagi 200 / 10 = 20 ml per sendok.",
            "Komparasi Kepekatan: Siswa menyimpulkan Gelas B lebih pekat karena rasio susu per sendok cokelatnya lebih kecil (lebih sedikit susu untuk jumlah cokelat yang sama).",
            "Jawaban Akhir: Gelas B dengan penjelasan perhitungan laju satuan yang benar."
        ]
    }
];

// Legacy support for parts of the app still using the string
export const TES_SOAL = ESSAY_QUESTIONS[0].text;
