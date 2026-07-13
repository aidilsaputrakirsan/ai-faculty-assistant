-- ==================================================================
-- SETUP LENGKAP AI Faculty Assistant
-- Jalankan SELURUH isi file ini di Supabase Dashboard > SQL Editor.
-- Aman dijalankan ulang: blok RESET di bawah menghapus objek lama dulu.
-- Catatan: dialog "destructive operations" muncul karena perintah DROP
-- pada blok reset. Pada project baru ini aman -> klik "Run query".
-- ==================================================================

-- ========== RESET (hapus objek lama bila ada) ==========
drop table if exists public.activity_logs cascade;
drop table if exists public.usage_logs cascade;
drop table if exists public.feedback cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.document_chunks cascade;
drop table if exists public.documents cascade;
drop table if exists public.faqs cascade;
drop table if exists public.units cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop type if exists public.user_role cascade;
drop type if exists public.message_role cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.faqs_tsv_refresh() cascade;
drop function if exists public.chunks_tsv_refresh() cascade;
drop function if exists public.search_faqs(text, int) cascade;
drop function if exists public.search_chunks(text, int) cascade;
drop function if exists public.admin_stats() cascade;
drop policy if exists "documents storage: authenticated read" on storage.objects;
drop policy if exists "documents storage: admin write" on storage.objects;
drop policy if exists "documents storage: admin update" on storage.objects;
drop policy if exists "documents storage: admin delete" on storage.objects;

-- ========== 0001_schema.sql ==========
-- =====================================================================
-- AI Faculty Assistant - Core schema (MVP)
-- =====================================================================
-- Roles: 'admin' and 'user'. Auth is handled by Supabase Auth (auth.users).
-- Each auth user gets a row in public.profiles via trigger.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ------------------------- helper: updated_at ------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================ profiles ===============================
create type public.user_role as enum ('admin', 'user');

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  role         public.user_role not null default 'user',
  program_studi text default '',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Convenience: check whether the current auth user is an admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- On new auth user, create a profile. First user becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count int;
  assigned_role public.user_role;
begin
  select count(*) into existing_count from public.profiles;
  if existing_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := 'user';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    assigned_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================== categories =============================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================== units ===============================
create table public.units (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text default '',
  location    text default '',
  email       text default '',
  phone       text default '',
  whatsapp    text default '',
  office_hours text default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_units_updated before update on public.units
  for each row execute function public.set_updated_at();

-- =============================== faqs ===============================
create table public.faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  answer        text not null,
  category_id   uuid references public.categories(id) on delete set null,
  unit_id       uuid references public.units(id) on delete set null,
  keywords      text[] not null default '{}',
  reference     text default '',
  priority      int not null default 0,
  is_active     boolean not null default true,
  effective_date date,
  expiry_date   date,
  created_by    uuid references public.profiles(id) on delete set null,
  updated_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_faqs_updated before update on public.faqs
  for each row execute function public.set_updated_at();

-- Full text search over question + answer + keywords (Indonesian-friendly).
-- Maintained via trigger (a plain column + trigger sidesteps the strict
-- IMMUTABLE requirement of generated columns for to_tsvector).
alter table public.faqs add column search_tsv tsvector;

create or replace function public.faqs_tsv_refresh()
returns trigger
language plpgsql
as $$
begin
  new.search_tsv := to_tsvector('simple',
    coalesce(new.question,'') || ' ' ||
    coalesce(new.answer,'') || ' ' ||
    array_to_string(new.keywords, ' '));
  return new;
end;
$$;

create trigger trg_faqs_tsv
  before insert or update on public.faqs
  for each row execute function public.faqs_tsv_refresh();

create index faqs_search_idx on public.faqs using gin (search_tsv);
create index faqs_category_idx on public.faqs (category_id);

-- ============================ documents =============================
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text default '',
  category_id   uuid references public.categories(id) on delete set null,
  unit_id       uuid references public.units(id) on delete set null,
  year          int,
  doc_number    text default '',
  version       text default '1.0',
  storage_path  text default '',
  is_public     boolean not null default true,
  is_active     boolean not null default true,
  effective_date date,
  created_by    uuid references public.profiles(id) on delete set null,
  updated_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- ==================== document knowledge chunks =====================
create table public.document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index int not null default 0,
  content     text not null,
  created_at  timestamptz not null default now()
);
alter table public.document_chunks add column search_tsv tsvector;

create or replace function public.chunks_tsv_refresh()
returns trigger
language plpgsql
as $$
begin
  new.search_tsv := to_tsvector('simple', coalesce(new.content,''));
  return new;
end;
$$;

create trigger trg_chunks_tsv
  before insert or update on public.document_chunks
  for each row execute function public.chunks_tsv_refresh();

create index chunks_search_idx on public.document_chunks using gin (search_tsv);
create index chunks_document_idx on public.document_chunks (document_id);

-- =========================== conversations ==========================
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null default 'Percakapan baru',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_conversations_updated before update on public.conversations
  for each row execute function public.set_updated_at();
create index conversations_user_idx on public.conversations (user_id);

-- ============================= messages =============================
create type public.message_role as enum ('user', 'assistant');

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            public.message_role not null,
  content         text not null,
  -- Sources are stored as JSON: [{type, title, ref_id}]
  sources         jsonb not null default '[]',
  -- true when the assistant could not answer and referred the user to a unit
  needs_human     boolean not null default false,
  referred_unit_id uuid references public.units(id) on delete set null,
  model           text default '',
  tokens_used     int default 0,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id);

-- ============================= feedback =============================
create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     int not null check (rating in (-1, 1)), -- -1 negative, 1 positive
  comment    text default '',
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);
create index feedback_message_idx on public.feedback (message_id);

-- =========================== usage logs =============================
create table public.usage_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  question        text default '',
  answered        boolean not null default true,
  category_id     uuid references public.categories(id) on delete set null,
  model           text default '',
  tokens_used     int default 0,
  created_at      timestamptz not null default now()
);
create index usage_logs_created_idx on public.usage_logs (created_at);

-- ======================== admin activity log ========================
create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs (created_at);

-- ========== 0002_rls.sql ==========
-- =====================================================================
-- Row Level Security policies
-- =====================================================================
-- Principles:
--  * Everyone authenticated can read active reference data (categories,
--    units, faqs, public documents).
--  * Only admins can write reference data.
--  * Users can only read/write their own conversations, messages, feedback.
--  * usage_logs / activity_logs readable by admins only.
-- =====================================================================

alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.units           enable row level security;
alter table public.faqs            enable row level security;
alter table public.documents       enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;
alter table public.feedback        enable row level security;
alter table public.usage_logs      enable row level security;
alter table public.activity_logs   enable row level security;

-- ----------------------------- profiles ------------------------------
create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own (non-role) "
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin manage"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------- categories / units / faqs ---------------------
create policy "categories: read"
  on public.categories for select
  using (is_active or public.is_admin());
create policy "categories: admin write"
  on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "units: read"
  on public.units for select
  using (is_active or public.is_admin());
create policy "units: admin write"
  on public.units for all
  using (public.is_admin()) with check (public.is_admin());

create policy "faqs: read active"
  on public.faqs for select
  using (is_active or public.is_admin());
create policy "faqs: admin write"
  on public.faqs for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------- documents ------------------------------
create policy "documents: read public/active or admin"
  on public.documents for select
  using ((is_active and is_public) or public.is_admin());
create policy "documents: admin write"
  on public.documents for all
  using (public.is_admin()) with check (public.is_admin());

-- chunks follow their parent document visibility
create policy "chunks: read via document"
  on public.document_chunks for select
  using (
    public.is_admin() or exists (
      select 1 from public.documents d
      where d.id = document_id and d.is_active and d.is_public
    )
  );
create policy "chunks: admin write"
  on public.document_chunks for all
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------- conversations ----------------------------
create policy "conversations: owner"
  on public.conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "conversations: admin read"
  on public.conversations for select
  using (public.is_admin());

-- ----------------------------- messages ------------------------------
create policy "messages: owner via conversation"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    ) or public.is_admin()
  );
create policy "messages: owner insert"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ----------------------------- feedback ------------------------------
create policy "feedback: owner manage"
  on public.feedback for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "feedback: admin read"
  on public.feedback for select
  using (public.is_admin());

-- --------------------- usage_logs / activity_logs --------------------
create policy "usage_logs: admin read"
  on public.usage_logs for select
  using (public.is_admin());
-- Users may insert their own usage log rows (defense in depth; the edge
-- function uses the service role and bypasses RLS anyway).
create policy "usage_logs: self insert"
  on public.usage_logs for insert
  with check (user_id = auth.uid() or user_id is null);

create policy "activity_logs: admin read"
  on public.activity_logs for select
  using (public.is_admin());
create policy "activity_logs: admin insert"
  on public.activity_logs for insert
  with check (public.is_admin());

-- ========== 0003_functions.sql ==========
-- =====================================================================
-- Hybrid search RPCs + admin statistics + storage bucket
-- =====================================================================

-- Search FAQs by free text. Returns ranked active FAQs.
create or replace function public.search_faqs(query_text text, max_results int default 5)
returns table (
  id uuid,
  question text,
  answer text,
  reference text,
  category_name text,
  unit_id uuid,
  unit_name text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id, f.question, f.answer, f.reference,
    c.name as category_name,
    f.unit_id, u.name as unit_name,
    ts_rank(f.search_tsv, websearch_to_tsquery('simple', query_text)) as rank
  from public.faqs f
  left join public.categories c on c.id = f.category_id
  left join public.units u on u.id = f.unit_id
  where f.is_active
    and (f.expiry_date is null or f.expiry_date >= current_date)
    and f.search_tsv @@ websearch_to_tsquery('simple', query_text)
  order by rank desc, f.priority desc
  limit greatest(max_results, 1);
$$;

-- Search document chunks (public + active documents only).
create or replace function public.search_chunks(query_text text, max_results int default 4)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  content text,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dc.id as chunk_id,
    d.id as document_id,
    d.title as document_title,
    dc.content,
    ts_rank(dc.search_tsv, websearch_to_tsquery('simple', query_text)) as rank
  from public.document_chunks dc
  join public.documents d on d.id = dc.document_id
  where d.is_active and d.is_public
    and dc.search_tsv @@ websearch_to_tsquery('simple', query_text)
  order by rank desc
  limit greatest(max_results, 1);
$$;

-- Admin dashboard statistics in a single call.
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_faqs', (select count(*) from public.faqs where is_active),
    'total_documents', (select count(*) from public.documents where is_active),
    'total_conversations', (select count(*) from public.conversations),
    'questions_today', (
      select count(*) from public.usage_logs
      where created_at >= date_trunc('day', now())
    ),
    'unanswered', (select count(*) from public.usage_logs where not answered),
    'feedback_positive', (select count(*) from public.feedback where rating = 1),
    'feedback_negative', (select count(*) from public.feedback where rating = -1),
    'top_categories', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select c.name, count(*) as count
        from public.usage_logs ul
        join public.categories c on c.id = ul.category_id
        group by c.name
        order by count desc
        limit 5
      ) t
    ),
    'usage_last_7_days', (
      select coalesce(jsonb_agg(t order by t.day), '[]'::jsonb) from (
        select to_char(d.day, 'YYYY-MM-DD') as day,
               count(ul.id) as count
        from generate_series(
          date_trunc('day', now()) - interval '6 days',
          date_trunc('day', now()),
          interval '1 day'
        ) as d(day)
        left join public.usage_logs ul
          on date_trunc('day', ul.created_at) = d.day
        group by d.day
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- ============================= storage ==============================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Anyone authenticated can read document files (app enforces public flag
-- when listing; signed URLs are used for downloads).
create policy "documents storage: authenticated read"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

create policy "documents storage: admin write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_admin());

create policy "documents storage: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.is_admin());

create policy "documents storage: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- ========== seed.sql ==========
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
