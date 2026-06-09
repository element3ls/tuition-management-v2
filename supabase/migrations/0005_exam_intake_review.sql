create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  description text,
  source_bucket text not null default 'exam-sources',
  source_key text not null,
  source_file_name text not null,
  source_mime_type text not null default 'application/pdf',
  source_size_bytes bigint not null check (source_size_bytes >= 0),
  status text not null default 'uploading'
    check (status in ('uploading', 'uploaded', 'processing', 'ready', 'failed', 'published', 'archived')),
  ai_model text,
  ai_response_id text,
  ai_error text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  uploaded_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_bucket, source_key)
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_number text not null,
  question_text text not null,
  answer_text text not null,
  marks integer check (marks is null or marks >= 0),
  source_pages integer[] not null default '{}',
  review_warning text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exams_chapter_id on public.exams(chapter_id);
create index if not exists idx_exams_status on public.exams(status);
create index if not exists idx_exam_questions_exam_id on public.exam_questions(exam_id);

drop trigger if exists set_exams_updated_at on public.exams;
create trigger set_exams_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

drop trigger if exists set_exam_questions_updated_at on public.exam_questions;
create trigger set_exam_questions_updated_at
before update on public.exam_questions
for each row execute function public.set_updated_at();

alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exam-sources', 'exam-sources', false, 52428800, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

grant all privileges on public.exams to service_role;
grant all privileges on public.exam_questions to service_role;

create or replace function public.save_exam_questions(
  p_exam_id uuid,
  p_questions jsonb,
  p_actor_id uuid,
  p_publish boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  current_status text;
begin
  select status into current_status
  from public.exams
  where id = p_exam_id
  for update;

  if current_status is null then
    raise exception 'Exam not found.';
  end if;

  if current_status <> 'ready' then
    raise exception 'Only a reviewed exam can be edited or published.';
  end if;

  for item in select value from jsonb_array_elements(p_questions)
  loop
    update public.exam_questions
    set question_number = item->>'question_number',
        question_text = item->>'question_text',
        answer_text = item->>'answer_text',
        marks = case when item->'marks' = 'null'::jsonb then null else (item->>'marks')::integer end,
        source_pages = array(select jsonb_array_elements_text(item->'source_pages')::integer),
        review_warning = nullif(item->>'review_warning', ''),
        sort_order = (item->>'sort_order')::integer
    where id = (item->>'id')::uuid
      and exam_id = p_exam_id;

    if not found then
      raise exception 'Exam question not found.';
    end if;
  end loop;

  if p_publish then
    update public.exams
    set status = 'published',
        approved_by = p_actor_id,
        approved_at = now(),
        published_at = now(),
        ai_error = null
    where id = p_exam_id;
  end if;
end;
$$;

revoke all on function public.save_exam_questions(uuid, jsonb, uuid, boolean) from public, anon, authenticated;
grant execute on function public.save_exam_questions(uuid, jsonb, uuid, boolean) to service_role;
