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
