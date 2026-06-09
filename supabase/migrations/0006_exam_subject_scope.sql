alter table public.exams
  add column if not exists subject_id uuid references public.subjects(id) on delete cascade;

create table if not exists public.exam_chapters (
  exam_id uuid not null references public.exams(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exam_id, chapter_id)
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exams'
      and column_name = 'chapter_id'
  ) then
    update public.exams as exam
    set subject_id = chapter.subject_id
    from public.chapters as chapter
    where exam.chapter_id = chapter.id
      and exam.subject_id is null;

    insert into public.exam_chapters (exam_id, chapter_id)
    select id, chapter_id
    from public.exams
    where chapter_id is not null
    on conflict (exam_id, chapter_id) do nothing;

    drop index if exists public.idx_exams_chapter_id;
    alter table public.exams drop column chapter_id;
  end if;
end
$$;

do $$
begin
  if exists (select 1 from public.exams where subject_id is null) then
    raise exception 'Cannot require exams.subject_id while exams without a subject exist';
  end if;
end
$$;

alter table public.exams
  alter column subject_id set not null;

create index if not exists idx_exams_subject_id
  on public.exams(subject_id);

create index if not exists idx_exams_fts
  on public.exams
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

create index if not exists idx_exam_chapters_chapter_id
  on public.exam_chapters(chapter_id);

alter table public.exam_chapters enable row level security;
grant all privileges on public.exam_chapters to service_role;

alter table public.access_grants
  drop constraint if exists access_grants_resource_type_check;

alter table public.access_grants
  add constraint access_grants_resource_type_check
  check (
    resource_type in (
      'year',
      'subject',
      'chapter',
      'question',
      'recording',
      'solution_material',
      'exam'
    )
  );

alter table public.content_tags
  drop constraint if exists content_tags_resource_type_check;

alter table public.content_tags
  add constraint content_tags_resource_type_check
  check (
    resource_type in (
      'chapter',
      'question',
      'recording',
      'solution_material',
      'exam'
    )
  );
