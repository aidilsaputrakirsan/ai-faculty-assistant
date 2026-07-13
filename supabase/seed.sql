-- =====================================================================
-- Seed data - realistic sample content for AI Faculty Assistant (MVP)
-- Run AFTER migrations. Safe to re-run (uses stable UUIDs + upserts).
-- =====================================================================

-- --------------------------- categories ------------------------------
insert into public.categories (id, name, slug, description) values
  ('11111111-0000-0000-0000-000000000001','Akademik','akademik','Perkuliahan, KRS, seminar, skripsi, dan kelulusan'),
  ('11111111-0000-0000-0000-000000000002','Kemahasiswaan','kemahasiswaan','Organisasi mahasiswa, kegiatan, dan pembinaan'),
  ('11111111-0000-0000-0000-000000000003','Keuangan','keuangan','UKT, pembayaran, dan keringanan biaya'),
  ('11111111-0000-0000-0000-000000000004','Surat dan Administrasi','surat-administrasi','Surat aktif kuliah, legalisir, dan layanan TU'),
  ('11111111-0000-0000-0000-000000000005','Penelitian','penelitian','Hibah, publikasi, dan etik penelitian'),
  ('11111111-0000-0000-0000-000000000006','Pengabdian Masyarakat','pengabdian','Program pengabdian dan KKN'),
  ('11111111-0000-0000-0000-000000000007','Sarana Prasarana','sarana-prasarana','Ruang, laboratorium, dan fasilitas'),
  ('11111111-0000-0000-0000-000000000008','Jadwal dan Kalender','jadwal-kalender','Jadwal kuliah, UTS/UAS, dan kalender akademik'),
  ('11111111-0000-0000-0000-000000000009','Beasiswa','beasiswa','Beasiswa internal dan eksternal'),
  ('11111111-0000-0000-0000-000000000010','Kontak Layanan','kontak-layanan','Kontak unit dan layanan fakultas')
on conflict (id) do update set name = excluded.name, description = excluded.description;

-- ------------------------------ units --------------------------------
insert into public.units (id, name, description, location, email, phone, whatsapp, office_hours) values
  ('22222222-0000-0000-0000-000000000001','Bagian Akademik','Layanan KRS, seminar, ujian, dan kelulusan','Gedung A Lantai 1','akademik@fakultas.ac.id','021-7890101','0812-1000-0001','Senin-Jumat 08.00-15.00'),
  ('22222222-0000-0000-0000-000000000002','Bagian Kemahasiswaan','Organisasi, kegiatan, dan pembinaan mahasiswa','Gedung A Lantai 2','kemahasiswaan@fakultas.ac.id','021-7890102','0812-1000-0002','Senin-Jumat 08.00-15.00'),
  ('22222222-0000-0000-0000-000000000003','Bagian Keuangan','UKT, pembayaran, dan keringanan biaya','Gedung A Lantai 1','keuangan@fakultas.ac.id','021-7890103','0812-1000-0003','Senin-Jumat 08.00-14.00'),
  ('22222222-0000-0000-0000-000000000004','Tata Usaha','Surat-menyurat dan administrasi umum','Gedung A Lantai 1','tu@fakultas.ac.id','021-7890104','0812-1000-0004','Senin-Jumat 08.00-15.00'),
  ('22222222-0000-0000-0000-000000000005','Program Studi','Bimbingan akademik dan kurikulum program studi','Gedung B Lantai 2','prodi@fakultas.ac.id','021-7890105','0812-1000-0005','Senin-Jumat 08.00-16.00'),
  ('22222222-0000-0000-0000-000000000006','Perpustakaan','Peminjaman buku dan akses referensi','Gedung C Lantai 1','perpustakaan@fakultas.ac.id','021-7890106','0812-1000-0006','Senin-Jumat 08.00-17.00'),
  ('22222222-0000-0000-0000-000000000007','Laboratorium','Praktikum dan peminjaman alat','Gedung C Lantai 2','lab@fakultas.ac.id','021-7890107','0812-1000-0007','Senin-Jumat 08.00-16.00'),
  ('22222222-0000-0000-0000-000000000008','Unit Teknologi Informasi','Akun SIAKAD, email kampus, dan jaringan','Gedung A Lantai 3','it@fakultas.ac.id','021-7890108','0812-1000-0008','Senin-Jumat 08.00-16.00')
on conflict (id) do update set description = excluded.description, email = excluded.email;

-- ------------------------------ FAQs ---------------------------------
insert into public.faqs (id, question, answer, category_id, unit_id, keywords, reference, priority, effective_date) values
  ('33333333-0000-0000-0000-000000000001',
   'Apa syarat mengajukan seminar proposal?',
   E'Untuk mengajukan seminar proposal, mahasiswa harus memenuhi persyaratan berikut:\n\n1. Telah menyelesaikan jumlah SKS minimum sesuai ketentuan program studi (umumnya 110 SKS).\n2. Mendapat persetujuan dari dosen pembimbing.\n3. Mengunggah proposal sesuai format fakultas.\n4. Melengkapi formulir pendaftaran seminar di Bagian Akademik.',
   '11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',
   array['seminar','proposal','syarat','skripsi','sidang'],'SOP Seminar Proposal',10,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000002',
   'Bagaimana cara mengisi KRS?',
   E'Pengisian KRS dilakukan melalui SIAKAD dengan langkah:\n\n1. Login ke SIAKAD menggunakan akun mahasiswa.\n2. Pilih menu KRS pada semester berjalan.\n3. Pilih mata kuliah sesuai paket semester dan sisa SKS.\n4. Ajukan persetujuan kepada Dosen Pembimbing Akademik.\n5. Cetak KRS setelah disetujui.\n\nKRS hanya dapat diisi selama masa pengisian sesuai kalender akademik.',
   '11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',
   array['krs','siakad','rencana studi','mata kuliah'],'Panduan SIAKAD',9,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000003',
   'Bagaimana cara mengajukan surat keterangan aktif kuliah?',
   E'Surat keterangan aktif kuliah dapat diajukan melalui Tata Usaha:\n\n1. Ajukan permohonan melalui layanan TU (loket atau formulir daring).\n2. Sertakan NIM dan keperluan surat.\n3. Surat diproses dalam 1-2 hari kerja.\n4. Ambil surat di loket TU atau unduh versi digital bila tersedia.',
   '11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000004',
   array['surat','aktif kuliah','keterangan','tata usaha','legalisir'],'SOP Layanan Surat',8,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000004',
   'Kapan batas waktu pembayaran UKT?',
   E'Pembayaran UKT dilakukan setiap awal semester sesuai jadwal yang diumumkan Bagian Keuangan. Umumnya batas pembayaran adalah sebelum masa pengisian KRS berakhir.\n\nMahasiswa yang belum membayar UKT tidak dapat mengisi KRS. Untuk tanggal pasti pada semester berjalan, silakan cek pengumuman resmi atau hubungi Bagian Keuangan.',
   '11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000003',
   array['ukt','pembayaran','biaya','batas waktu','tagihan'],'Pengumuman Keuangan',7,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000005',
   'Bagaimana cara mengajukan keringanan atau penyesuaian UKT?',
   E'Pengajuan keringanan UKT dilakukan dengan:\n\n1. Mengisi formulir permohonan penyesuaian UKT.\n2. Melampirkan dokumen pendukung kondisi ekonomi (mis. slip gaji, surat keterangan tidak mampu).\n3. Menyerahkan berkas ke Bagian Keuangan sesuai periode pengajuan.\n\nKeputusan penyesuaian mengikuti hasil verifikasi. Silakan konfirmasi periode pengajuan ke Bagian Keuangan.',
   '11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000003',
   array['keringanan','ukt','penyesuaian','beasiswa','ekonomi'],'SOP Penyesuaian UKT',6,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000006',
   'Bagaimana prosedur peminjaman buku di perpustakaan?',
   E'Peminjaman buku di Perpustakaan:\n\n1. Pastikan status keanggotaan aktif menggunakan kartu mahasiswa.\n2. Maksimal peminjaman 3 buku selama 7 hari dan dapat diperpanjang satu kali.\n3. Keterlambatan dikenakan denda sesuai ketentuan perpustakaan.\n\nJam layanan: Senin-Jumat 08.00-17.00.',
   '11111111-0000-0000-0000-000000000007','22222222-0000-0000-0000-000000000006',
   array['perpustakaan','buku','pinjam','denda','referensi'],'Tata Tertib Perpustakaan',5,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000007',
   'Bagaimana cara mendaftar beasiswa?',
   E'Pendaftaran beasiswa mengikuti pengumuman resmi dari Bagian Kemahasiswaan. Secara umum:\n\n1. Perhatikan pengumuman jenis beasiswa dan persyaratannya.\n2. Siapkan berkas seperti transkrip, KTM, dan dokumen pendukung.\n3. Ajukan melalui kanal yang ditentukan sebelum batas waktu.\n\nJenis dan kuota beasiswa berbeda tiap periode. Silakan konfirmasi ke Bagian Kemahasiswaan.',
   '11111111-0000-0000-0000-000000000009','22222222-0000-0000-0000-000000000002',
   array['beasiswa','pendaftaran','kip','prestasi','bantuan'],'Pengumuman Beasiswa',6,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000008',
   'Bagaimana cara mengatur ulang (reset) akun SIAKAD atau email kampus?',
   E'Untuk kendala akun SIAKAD atau email kampus:\n\n1. Hubungi Unit Teknologi Informasi dengan menyertakan NIM dan nama lengkap.\n2. Sampaikan jenis kendala (lupa password, akun terkunci, dsb).\n3. Verifikasi identitas akan dilakukan sebelum reset.\n\nDemi keamanan, reset tidak dilakukan tanpa verifikasi identitas.',
   '11111111-0000-0000-0000-000000000010','22222222-0000-0000-0000-000000000008',
   array['siakad','email','reset','password','akun','it'],'Panduan Layanan TI',5,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000009',
   'Kapan jadwal UTS dan UAS semester ini?',
   E'Jadwal UTS dan UAS ditetapkan dalam kalender akademik dan diumumkan Bagian Akademik setiap semester. UTS umumnya berlangsung pada pekan ke-8 dan UAS pada pekan ke-16 perkuliahan.\n\nUntuk tanggal pasti semester berjalan, silakan lihat kalender akademik resmi atau hubungi Bagian Akademik.',
   '11111111-0000-0000-0000-000000000008','22222222-0000-0000-0000-000000000001',
   array['uts','uas','ujian','jadwal','kalender akademik'],'Kalender Akademik',7,'2025-01-01'),

  ('33333333-0000-0000-0000-000000000010',
   'Bagaimana cara meminjam laboratorium untuk penelitian?',
   E'Peminjaman laboratorium untuk penelitian:\n\n1. Ajukan surat/formulir peminjaman ke pengelola Laboratorium.\n2. Cantumkan tujuan, waktu, dan alat yang dibutuhkan.\n3. Dapatkan persetujuan dosen penanggung jawab.\n4. Patuhi tata tertib keselamatan laboratorium selama penggunaan.',
   '11111111-0000-0000-0000-000000000007','22222222-0000-0000-0000-000000000007',
   array['laboratorium','penelitian','peminjaman','alat','praktikum'],'SOP Penggunaan Laboratorium',4,'2025-01-01')
on conflict (id) do update set answer = excluded.answer, keywords = excluded.keywords;

-- ---------------------------- documents ------------------------------
insert into public.documents (id, title, description, category_id, unit_id, year, doc_number, version, is_public, effective_date) values
  ('44444444-0000-0000-0000-000000000001','SOP Seminar Proposal','Prosedur pengajuan dan pelaksanaan seminar proposal skripsi.','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',2025,'SOP/AK/2025/007','1.0',true,'2025-01-01'),
  ('44444444-0000-0000-0000-000000000002','Panduan Pengisian KRS','Langkah pengisian Kartu Rencana Studi melalui SIAKAD.','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',2025,'PAND/AK/2025/002','1.1',true,'2025-01-01'),
  ('44444444-0000-0000-0000-000000000003','Pedoman Layanan Surat dan Administrasi','Ketentuan permohonan surat aktif kuliah dan legalisir.','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000004',2025,'PED/TU/2025/003','1.0',true,'2025-01-01'),
  ('44444444-0000-0000-0000-000000000004','Ketentuan Keuangan dan UKT','Aturan pembayaran UKT dan penyesuaian biaya.','11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000003',2025,'KEU/2025/011','1.0',true,'2025-01-01')
on conflict (id) do update set description = excluded.description;

-- ------------------------- document chunks ---------------------------
insert into public.document_chunks (id, document_id, chunk_index, content) values
  ('55555555-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001',0,
   'SOP Seminar Proposal. Mahasiswa dapat mengajukan seminar proposal setelah menyelesaikan minimal 110 SKS dan lulus mata kuliah metodologi penelitian. Proposal harus disetujui dosen pembimbing dan diunggah dalam format PDF sesuai template fakultas. Pendaftaran dilakukan di Bagian Akademik dengan melengkapi formulir dan bukti bimbingan minimal empat kali.'),
  ('55555555-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000001',1,
   'Pelaksanaan seminar proposal dijadwalkan oleh Bagian Akademik. Mahasiswa wajib hadir tepat waktu, mengenakan pakaian rapi, dan menyiapkan bahan presentasi. Hasil seminar dapat berupa diterima, diterima dengan perbaikan, atau ditolak. Perbaikan wajib diselesaikan sesuai batas waktu yang ditetapkan tim penguji.'),
  ('55555555-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000002',0,
   'Panduan Pengisian KRS. KRS diisi melalui SIAKAD pada masa pengisian sesuai kalender akademik. Mahasiswa memilih mata kuliah sesuai paket semester dan batas SKS yang ditentukan indeks prestasi. KRS harus disetujui Dosen Pembimbing Akademik sebelum dicetak. Perubahan KRS hanya dapat dilakukan pada masa revisi KRS.'),
  ('55555555-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000003',0,
   'Pedoman Layanan Surat. Permohonan surat keterangan aktif kuliah diajukan melalui Tata Usaha dengan menyertakan NIM dan keperluan. Surat diproses dalam satu sampai dua hari kerja. Legalisir ijazah dan transkrip dilayani dengan menunjukkan dokumen asli. Layanan surat tidak dipungut biaya kecuali diatur lain.'),
  ('55555555-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000004',0,
   'Ketentuan Keuangan dan UKT. Pembayaran UKT dilakukan setiap awal semester melalui bank mitra sebelum masa pengisian KRS. Mahasiswa yang belum membayar UKT tidak dapat mengisi KRS. Penyesuaian UKT dapat diajukan dengan formulir dan dokumen pendukung kondisi ekonomi, dan diputuskan setelah verifikasi Bagian Keuangan.')
on conflict (id) do update set content = excluded.content;
