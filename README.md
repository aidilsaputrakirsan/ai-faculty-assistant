# AI Faculty Assistant

Asisten AI hybrid untuk civitas fakultas (mahasiswa, dosen, tenaga kependidikan, admin).
Membantu mencari informasi akademik, layanan administrasi, SOP, FAQ, jadwal, kontak unit, dan
dokumen resmi — dengan jawaban yang **berdasarkan data resmi**, menampilkan **sumber**, dan
**tidak mengarang**.

> Status: **MVP**. Frontend static (GitHub Pages) + Supabase (Auth/DB/Storage/Edge Function) +
> Groq sebagai penyedia model AI. Groq API key **hanya** ada di backend (Edge Function).

---

## Daftar Isi

- [Fitur](#fitur)
- [Arsitektur](#arsitektur)
- [Teknologi](#teknologi)
- [Struktur Folder](#struktur-folder)
- [Konsep Hybrid AI](#konsep-hybrid-ai)
- [Instalasi & Menjalankan Lokal](#instalasi--menjalankan-lokal)
- [Setup Supabase](#setup-supabase)
- [Setup Groq API](#setup-groq-api)
- [Membuat Admin Pertama](#membuat-admin-pertama)
- [Deployment ke GitHub Pages](#deployment-ke-github-pages)
- [Deployment Edge Function](#deployment-edge-function)
- [Environment Variables](#environment-variables)
- [Catatan Keamanan](#catatan-keamanan)
- [Akun Demo](#akun-demo)
- [Testing](#testing)
- [Batasan MVP](#batasan-mvp)
- [Rencana Pengembangan](#rencana-pengembangan)
- [Asumsi](#asumsi)

---

## Fitur

**Pengguna (User)**

- Login / registrasi (email + password)
- Chatbot dengan jawaban berbasis FAQ & dokumen resmi
- Sumber jawaban ditampilkan di tiap balasan
- Rating (👍/👎) + komentar terhadap jawaban AI
- Riwayat percakapan & detail percakapan
- Informasi umum (FAQ) dengan pencarian & filter kategori
- Daftar dokumen resmi (unduh via signed URL)
- Kontak unit pelayanan
- Profil pengguna

**Admin**

- Dashboard statistik penggunaan
- CRUD FAQ (cari, filter kategori/status, aktif/nonaktif, prioritas, kata kunci, sumber)
- CRUD Kategori
- CRUD Dokumen + upload PDF + konten pencarian AI (chunk) + publik/internal
- CRUD Kontak Unit
- Daftar feedback pengguna
- Statistik (volume 7 hari, kepuasan, kategori terpopuler)
- Manajemen pengguna (ubah peran & status)
- Log aktivitas admin

**Perilaku AI**

- Bahasa Indonesia, ringkas, profesional
- Hanya menjawab dari konteks (FAQ + dokumen); jika tidak cukup → arahkan ke unit terkait
- Menampilkan sumber (FAQ / Dokumen / Unit)
- Rate limiting & validasi input di backend

---

## Arsitektur

```
┌─────────────────────────┐        ┌──────────────────────────────────────────┐
│   Browser (static SPA)   │        │                 Supabase                 │
│  React + Vite + Tailwind │        │                                          │
│                          │  HTTPS │  ┌────────────┐   ┌───────────────────┐  │
│  supabase-js (anon key)  ├────────┼─▶│ Auth        │   │ Postgres + RLS    │  │
│                          │        │  └────────────┘   │  profiles, faqs,   │  │
│  invoke('chat')          ├────────┼─▶┌────────────┐   │  documents, chunks,│  │
│                          │        │  │ Edge Func   │   │  conversations,    │  │
└─────────────────────────┘        │  │  "chat"     │──▶│  messages, ...     │  │
        GitHub Pages               │  │ (service    │   └───────────────────┘  │
                                   │  │  role)      │        ▲  Storage(docs)   │
                                   │  └─────┬──────┘        │                   │
                                   └────────┼───────────────┴───────────────────┘
                                            │ Groq API key (secret)
                                            ▼
                                   ┌──────────────────┐
                                   │     Groq API     │
                                   └──────────────────┘
```

Semua proses server berjalan di Supabase. GitHub Pages hanya menyajikan file statis
(tidak ada server runtime). Komunikasi ke Groq **hanya** dari Edge Function.

---

## Teknologi

| Lapisan   | Pilihan                                                        |
| --------- | -------------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, React Router         |
| Data      | TanStack Query, `@supabase/supabase-js`                        |
| Ikon      | lucide-react                                                   |
| Backend   | Supabase (Postgres, Auth, Storage, Edge Functions/Deno)        |
| AI        | Groq API (default `llama-3.3-70b-versatile`)                   |
| Retrieval | PostgreSQL full-text search (`tsvector`) untuk FAQ & chunk     |
| Test      | Vitest + Testing Library                                       |
| Deploy    | GitHub Actions → GitHub Pages                                  |

---

## Struktur Folder

```
ai-faculty-assistant/
├─ .github/workflows/deploy.yml     # CI: test + build + deploy Pages
├─ public/                          # 404.html (SPA fallback), favicon
├─ src/
│  ├─ components/
│  │  ├─ ui/                        # Button, Modal, Field, EmptyState, ...
│  │  ├─ layout/                    # AppShell (sidebar/header), PublicLayout
│  │  ├─ features/                  # FaqBrowser, ContactsList, MessageBubble, StatCard
│  │  └─ RouteGuards.tsx            # ProtectedRoute, AdminRoute
│  ├─ context/                      # AuthContext, ToastContext
│  ├─ lib/                          # supabase, api (data access), types, validation, format
│  ├─ pages/
│  │  ├─ public/                    # Landing, Login, InfoPage, ContactsPage
│  │  ├─ user/                      # Dashboard, Chat, History, Detail, Profile, Documents
│  │  └─ admin/                     # Dashboard, FAQ, Categories, Documents, Units, Feedback, Stats, Users, Logs
│  ├─ test/setup.ts
│  ├─ App.tsx                       # Router
│  └─ main.tsx
├─ supabase/
│  ├─ migrations/                   # 0001_schema, 0002_rls, 0003_functions
│  ├─ functions/chat/index.ts       # Edge Function (hybrid RAG + Groq)
│  ├─ seed.sql                      # Sample data (kategori, unit, FAQ, dokumen, chunk)
│  └─ config.toml
├─ .env.example
└─ README.md
```

---

## Konsep Hybrid AI

Urutan di Edge Function `chat`:

1. Cari jawaban dari **FAQ** (`search_faqs` — full-text).
2. Cari konteks dari **potongan dokumen** (`search_chunks`).
3. Bila **ada konteks**, kirim ke Groq dengan _system prompt_ ketat (jawab hanya dari konteks).
4. Bila **tidak ada konteks**, model **tidak dipanggil** — sistem membalas bahwa informasi belum
   cukup dan mengarahkan ke unit terkait (`needs_human = true`).
5. Sumber (FAQ/Dokumen/Unit) disimpan & ditampilkan.
6. Setiap request dicatat di `usage_logs` (untuk statistik) dan dibatasi (rate limit).

---

## Instalasi & Menjalankan Lokal

Prasyarat: Node.js 20+, akun Supabase, akun Groq.

```bash
npm install
cp .env.example .env     # lalu isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev              # http://localhost:5173
```

Perintah lain:

```bash
npm run build            # typecheck + build produksi
npm run preview          # pratinjau hasil build
npm test                 # jalankan unit test
npm run lint             # eslint
```

---

## Setup Supabase

1. Buat project di [supabase.com](https://supabase.com). Catat **Project URL** dan **anon key**
   (Settings → API).
2. Jalankan migration + seed. Ada dua cara:

   **A. Supabase CLI (disarankan)**

   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase db push                 # menjalankan semua migration di supabase/migrations
   # seed:
   supabase db execute --file supabase/seed.sql
   ```

   **B. SQL Editor (manual)** — buka dashboard → SQL Editor, jalankan berurutan:
   `0001_schema.sql`, `0002_rls.sql`, `0003_functions.sql`, lalu `seed.sql`.

3. Bucket storage `documents` dibuat otomatis oleh `0003_functions.sql` (privat; unduhan pakai
   signed URL).
4. Isi `.env` dengan URL & anon key.

> Registrasi email: untuk pengujian cepat, matikan konfirmasi email di
> **Authentication → Providers → Email → Confirm email = off**, atau konfirmasi lewat dashboard.

---

## Setup Groq API

1. Buat API key di [console.groq.com](https://console.groq.com).
2. Simpan sebagai **secret Edge Function** (bukan di frontend):

   ```bash
   supabase secrets set GROQ_API_KEY=gsk_xxxxxxxx
   # opsional: ganti model
   supabase secrets set GROQ_MODEL=llama-3.3-70b-versatile
   ```

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia untuk Edge Function.

---

## Membuat Admin Pertama

Trigger `handle_new_user` menjadikan **akun pertama yang mendaftar sebagai `admin`** secara
otomatis. Jadi:

1. Buka aplikasi → **Daftar** dengan akun Anda (ini menjadi admin).
2. Pendaftar berikutnya menjadi `user` biasa.

Alternatif (promosikan user via SQL):

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

---

## Deployment ke GitHub Pages

Sudah tersedia workflow `.github/workflows/deploy.yml`.

1. Push repo ke GitHub, aktifkan **Settings → Pages → Source: GitHub Actions**.
2. Tambahkan konfigurasi:
   - **Secrets** (Settings → Secrets and variables → Actions → Secrets):
     `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - **Variables** (tab Variables): `VITE_BASE_PATH` = `/<nama-repo>/`
     (untuk _project page_; untuk _user/custom domain_ gunakan `/`).
3. Push ke `main` → workflow menjalankan test, build, dan deploy.

Routing SPA saat refresh ditangani oleh `dist/404.html` (disalin dari `index.html` saat build),
sehingga URL dalam seperti `/app/chat` tidak error saat di-refresh.

---

## Deployment Edge Function

```bash
supabase functions deploy chat
```

Fungsi memakai `verify_jwt = false` (lihat `supabase/config.toml`) karena verifikasi token
dilakukan manual di dalam fungsi (`auth.getUser(token)`), sehingga pesan error bisa berbahasa
Indonesia dan konsisten.

---

## Environment Variables

Frontend (`.env`, publik — aman di browser):

| Variabel                 | Keterangan                                          |
| ------------------------ | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL project Supabase                                |
| `VITE_SUPABASE_ANON_KEY` | Anon/public key (dilindungi RLS)                    |
| `VITE_BASE_PATH`         | Base path build (`/` atau `/<repo>/`)               |

Backend (Edge Function secrets — **rahasia**, tidak di frontend):

| Variabel                    | Keterangan                                    |
| --------------------------- | --------------------------------------------- |
| `GROQ_API_KEY`              | API key Groq                                  |
| `GROQ_MODEL`                | (opsional) id model, default llama-3.3-70b    |
| `SUPABASE_SERVICE_ROLE_KEY` | otomatis tersedia untuk fungsi                |

---

## Catatan Keamanan

- Tidak ada secret di repository (`.gitignore` mengecualikan `.env`).
- Groq API key **hanya** di Edge Function; tidak pernah dikirim ke browser.
- **RLS aktif di semua tabel**. User hanya bisa membaca percakapan/pesan/feedback miliknya.
  Data referensi (FAQ/kategori/unit/dokumen publik) dapat dibaca; **penulisan hanya admin**.
- Route admin dijaga ganda: `AdminRoute` di frontend **dan** RLS + `is_admin()` di database.
- Validasi input form (frontend) + validasi panjang/isi pertanyaan & tipe/ukuran file (frontend
  dan backend). Upload dibatasi **PDF ≤ 10 MB**.
- Rate limiting per user di Edge Function (default 12 pesan / menit).
- Error internal tidak ditampilkan mentah; pesan ramah berbahasa Indonesia.
- Anon key memang publik; keamanan bergantung pada RLS, bukan penyembunyian key.

---

## Akun Demo

Tidak ada kredensial demo yang di-hardcode (demi keamanan). Untuk mencoba:

1. Daftar akun pertama → otomatis **admin**.
2. Daftar akun kedua → **user** biasa.

Data contoh (FAQ, dokumen, unit, kategori) sudah tersedia lewat `seed.sql`, sehingga chatbot
langsung dapat menjawab pertanyaan seperti _"Apa syarat mengajukan seminar proposal?"_.

---

## Testing

```bash
npm test
```

Mencakup: validasi form (login/signup/FAQ/dokumen/file), helper format, proteksi role
(`ProtectedRoute`/`AdminRoute`), dan penanganan error `sendChat`. Build & test juga dijalankan
otomatis di CI sebelum deploy.

---

## Batasan MVP

- Dua peran: `admin`, `user`.
- Retrieval memakai full-text search PostgreSQL (bukan embedding/vektor).
- "Chunk" dokumen diisi manual (ringkasan/isi untuk pencarian AI); belum ada ekstraksi teks PDF
  otomatis.
- Tidak ada integrasi sistem akademik eksternal, pembayaran, email otomatis, atau multi-agent.
- Statistik bersifat sederhana (agregasi SQL).

---

## Rencana Pengembangan

- Ekstraksi & chunking teks PDF otomatis saat upload.
- Pencarian semantik (pgvector + embedding).
- Streaming jawaban AI.
- Notifikasi & eskalasi tiket ke unit.
- Peran lebih granular (dosen, tendik) & audit lebih lengkap.
- Ekspor statistik dan laporan.

---

## Asumsi

- Autentikasi cukup email+password (tanpa SSO kampus untuk MVP).
- Akun pertama = admin (paling sederhana untuk bootstrap).
- Dokumen publik dapat dibaca semua pengguna terautentikasi; dokumen internal hanya admin.
- Base path default `/`; untuk GitHub _project page_ diset lewat `VITE_BASE_PATH`.
- Bahasa antarmuka & jawaban: Indonesia.
