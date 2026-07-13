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
