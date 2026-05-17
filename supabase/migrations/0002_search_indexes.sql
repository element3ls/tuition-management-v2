create index if not exists idx_chapters_fts
on public.chapters
using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

create index if not exists idx_questions_fts
on public.questions
using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(question_text, '') || ' ' || coalesce(description, '')));

create index if not exists idx_recordings_fts
on public.recordings
using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(transcript_text, '')));

create index if not exists idx_solution_materials_fts
on public.solution_materials
using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(file_name, '')));

create or replace function public.search_content(search_query text)
returns table (
  resource_type text,
  resource_id uuid,
  title text,
  description text,
  rank real
)
language sql
stable
as $$
  with query as (
    select plainto_tsquery('english', search_query) as q
  )
  select 'chapter', c.id, c.title, c.description,
    ts_rank(to_tsvector('english', coalesce(c.title, '') || ' ' || coalesce(c.description, '')), query.q) as rank
  from public.chapters c, query
  where query.q @@ to_tsvector('english', coalesce(c.title, '') || ' ' || coalesce(c.description, ''))
  union all
  select 'question', qn.id, qn.title, coalesce(qn.description, qn.question_text),
    ts_rank(to_tsvector('english', coalesce(qn.title, '') || ' ' || coalesce(qn.question_text, '') || ' ' || coalesce(qn.description, '')), query.q) as rank
  from public.questions qn, query
  where query.q @@ to_tsvector('english', coalesce(qn.title, '') || ' ' || coalesce(qn.question_text, '') || ' ' || coalesce(qn.description, ''))
  union all
  select 'recording', r.id, r.title, r.description,
    ts_rank(to_tsvector('english', coalesce(r.title, '') || ' ' || coalesce(r.description, '') || ' ' || coalesce(r.transcript_text, '')), query.q) as rank
  from public.recordings r, query
  where query.q @@ to_tsvector('english', coalesce(r.title, '') || ' ' || coalesce(r.description, '') || ' ' || coalesce(r.transcript_text, ''))
  union all
  select 'solution_material', m.id, m.title, m.description,
    ts_rank(to_tsvector('english', coalesce(m.title, '') || ' ' || coalesce(m.description, '') || ' ' || coalesce(m.file_name, '')), query.q) as rank
  from public.solution_materials m, query
  where query.q @@ to_tsvector('english', coalesce(m.title, '') || ' ' || coalesce(m.description, '') || ' ' || coalesce(m.file_name, ''))
  order by rank desc, title asc, resource_id asc;
$$;
