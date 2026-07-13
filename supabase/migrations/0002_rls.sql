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
