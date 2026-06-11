alter table public.exams
  add column if not exists intake_mode text not null default 'ai_solved',
  add column if not exists processing_status text not null default 'idle';

alter table public.exams
  drop constraint if exists exams_status_check;

update public.exams
set processing_status = case
  when status = 'processing' then 'processing'
  when status = 'failed' then 'failed'
  when status in ('ready', 'published') then 'completed'
  else 'idle'
end
where status in ('uploading', 'uploaded', 'processing', 'ready', 'failed');

update public.exams
set status = case
  when status = 'published' then 'published'
  when status = 'archived' then 'archived'
  when status = 'ready' then 'review'
  else 'draft'
end
where status in ('uploading', 'uploaded', 'processing', 'ready', 'failed');

alter table public.exams
  drop constraint if exists exams_intake_mode_check,
  drop constraint if exists exams_processing_status_check,
  alter column status set default 'draft',
  add constraint exams_status_check
    check (status in ('draft', 'review', 'published', 'archived')),
  add constraint exams_intake_mode_check
    check (intake_mode in ('ai_solved', 'teacher_html', 'handwritten_images')),
  add constraint exams_processing_status_check
    check (processing_status in ('idle', 'processing', 'completed', 'failed'));

alter table public.exams
  alter column source_bucket drop not null,
  alter column source_key drop not null,
  alter column source_file_name drop not null,
  alter column source_mime_type drop not null,
  alter column source_size_bytes drop not null;

alter table public.exam_questions
  add column if not exists question_format text not null default 'markdown',
  add column if not exists answer_format text not null default 'markdown',
  add column if not exists question_html text,
  add column if not exists answer_html text,
  add column if not exists requires_visual boolean not null default false,
  add column if not exists visual_not_needed boolean not null default false;

alter table public.exam_questions
  alter column question_text drop not null,
  alter column answer_text drop not null;

alter table public.exam_questions
  drop constraint if exists exam_questions_question_format_check,
  drop constraint if exists exam_questions_answer_format_check,
  add constraint exam_questions_question_format_check
    check (question_format in ('markdown', 'html', 'image')),
  add constraint exam_questions_answer_format_check
    check (answer_format in ('markdown', 'html', 'image'));

create table if not exists public.exam_assets (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid references public.exam_questions(id) on delete set null,
  role text not null check (
    role in (
      'source_pdf',
      'answer_html',
      'html_image',
      'question_image',
      'answer_image',
      'question_visual',
      'answer_visual'
    )
  ),
  variant text not null default 'raw' check (variant in ('raw', 'display')),
  original_asset_id uuid references public.exam_assets(id) on delete set null,
  storage_bucket text not null default 'exam-assets',
  storage_key text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  upload_status text not null default 'pending' check (upload_status in ('pending', 'ready', 'failed')),
  sort_order integer not null default 0,
  source_page integer check (source_page is null or source_page > 0),
  crop_x double precision,
  crop_y double precision,
  crop_width double precision,
  crop_height double precision,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  rotation integer not null default 0 check (rotation in (0, 90, 180, 270)),
  alt_text text,
  student_visible boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_key)
);

create table if not exists public.exam_processing_runs (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  mode text not null check (mode in ('ai_solved', 'teacher_html')),
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  model text not null,
  response_id text unique,
  error text,
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_exam_assets_exam_id on public.exam_assets(exam_id);
create index if not exists idx_exam_assets_question_id on public.exam_assets(question_id);
create index if not exists idx_exam_processing_runs_exam_id on public.exam_processing_runs(exam_id);
create unique index if not exists idx_exam_processing_runs_one_active
  on public.exam_processing_runs(exam_id)
  where status = 'processing';

drop trigger if exists set_exam_assets_updated_at on public.exam_assets;
create trigger set_exam_assets_updated_at
before update on public.exam_assets
for each row execute function public.set_updated_at();

alter table public.exam_assets enable row level security;
alter table public.exam_processing_runs enable row level security;

grant all privileges on public.exam_assets to service_role;
grant all privileges on public.exam_processing_runs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-assets',
  'exam-assets',
  false,
  52428800,
  array['application/pdf', 'text/html', 'application/xhtml+xml', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into public.exam_assets (
  exam_id,
  role,
  variant,
  storage_bucket,
  storage_key,
  file_name,
  mime_type,
  size_bytes,
  upload_status,
  uploaded_by
)
select
  id,
  'source_pdf',
  'raw',
  source_bucket,
  source_key,
  source_file_name,
  source_mime_type,
  source_size_bytes,
  'ready',
  uploaded_by
from public.exams
where source_bucket is not null
  and source_key is not null
on conflict (storage_bucket, storage_key) do nothing;

insert into public.exam_processing_runs (
  exam_id,
  mode,
  status,
  model,
  response_id,
  error,
  started_by,
  started_at,
  completed_at
)
select
  exam.id,
  'ai_solved',
  case when exam.ai_error is null then 'completed' else 'failed' end,
  exam.ai_model,
  exam.ai_response_id,
  exam.ai_error,
  exam.uploaded_by,
  coalesce(exam.processing_started_at, exam.created_at),
  exam.processing_completed_at
from public.exams exam
where exam.ai_model is not null
  and not exists (
    select 1
    from public.exam_processing_runs run
    where run.exam_id = exam.id
      and run.response_id is not distinct from exam.ai_response_id
      and run.model = exam.ai_model
  )
on conflict (response_id) do nothing;

drop function if exists public.save_exam_questions(uuid, jsonb, uuid, boolean);

create or replace function public.save_exam_review(
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
  asset_item jsonb;
  current_status text;
  current_mode text;
  v_question_id uuid;
  invalid_count integer;
begin
  select status, intake_mode
  into current_status, current_mode
  from public.exams
  where id = p_exam_id
  for update;

  if current_status is null then
    raise exception 'Exam not found.';
  end if;

  if current_status in ('published', 'archived') then
    raise exception 'Published or archived exams cannot be edited.';
  end if;

  if jsonb_array_length(p_questions) = 0 then
    raise exception 'At least one exam question is required.';
  end if;

  delete from public.exam_questions
  where exam_id = p_exam_id
    and id not in (
      select (value->>'id')::uuid
      from jsonb_array_elements(p_questions)
    );

  update public.exam_assets
  set question_id = null,
      student_visible = false
  where exam_id = p_exam_id
    and variant = 'display'
    and role in ('question_image', 'answer_image', 'question_visual', 'answer_visual');

  for item in select value from jsonb_array_elements(p_questions)
  loop
    v_question_id := (item->>'id')::uuid;

    if (
      current_mode = 'ai_solved'
      and (item->>'question_format' <> 'markdown' or item->>'answer_format' <> 'markdown')
    ) or (
      current_mode = 'teacher_html'
      and (item->>'question_format' <> 'markdown' or item->>'answer_format' <> 'html')
    ) or (
      current_mode = 'handwritten_images'
      and (item->>'question_format' <> 'image' or item->>'answer_format' <> 'image')
    ) then
      raise exception 'Question formats do not match the selected exam mode.';
    end if;

    insert into public.exam_questions (
      id,
      exam_id,
      question_number,
      question_text,
      answer_text,
      question_html,
      answer_html,
      question_format,
      answer_format,
      marks,
      source_pages,
      review_warning,
      sort_order,
      requires_visual,
      visual_not_needed
    )
    values (
      v_question_id,
      p_exam_id,
      item->>'question_number',
      nullif(item->>'question_text', ''),
      nullif(item->>'answer_text', ''),
      nullif(item->>'question_html', ''),
      nullif(item->>'answer_html', ''),
      item->>'question_format',
      item->>'answer_format',
      case when item->'marks' = 'null'::jsonb then null else (item->>'marks')::integer end,
      array(select jsonb_array_elements_text(item->'source_pages')::integer),
      nullif(item->>'review_warning', ''),
      (item->>'sort_order')::integer,
      coalesce((item->>'requires_visual')::boolean, false),
      coalesce((item->>'visual_not_needed')::boolean, false)
    )
    on conflict (id) do update
    set question_number = excluded.question_number,
        question_text = excluded.question_text,
        answer_text = excluded.answer_text,
        question_html = excluded.question_html,
        answer_html = excluded.answer_html,
        question_format = excluded.question_format,
        answer_format = excluded.answer_format,
        marks = excluded.marks,
        source_pages = excluded.source_pages,
        review_warning = excluded.review_warning,
        sort_order = excluded.sort_order,
        requires_visual = excluded.requires_visual,
        visual_not_needed = excluded.visual_not_needed
    where public.exam_questions.exam_id = p_exam_id;

    if not found then
      raise exception 'Exam question belongs to another exam.';
    end if;

    for asset_item in
      select value from jsonb_array_elements(coalesce(item->'assets', '[]'::jsonb))
    loop
      if (
        current_mode = 'handwritten_images'
        and asset_item->>'role' not in ('question_image', 'answer_image')
      ) or (
        current_mode in ('ai_solved', 'teacher_html')
        and asset_item->>'role' not in ('question_visual', 'answer_visual')
      ) then
        raise exception 'Question asset role does not match the selected exam mode.';
      end if;

      update public.exam_assets
      set question_id = v_question_id,
          role = asset_item->>'role',
          sort_order = (asset_item->>'sort_order')::integer,
          alt_text = nullif(asset_item->>'alt_text', ''),
          student_visible = true
      where id = (asset_item->>'id')::uuid
        and exam_id = p_exam_id
        and variant = 'display'
        and upload_status = 'ready';

      if not found then
        raise exception 'Exam asset was not found or is not ready.';
      end if;
    end loop;
  end loop;

  update public.exams
  set status = 'review'
  where id = p_exam_id;

  if p_publish then
    select count(*) into invalid_count
    from public.exam_questions q
    where q.exam_id = p_exam_id
      and (
        nullif(trim(q.question_number), '') is null
        or q.review_warning is not null
        or (
          current_mode in ('ai_solved', 'teacher_html')
          and nullif(trim(coalesce(q.question_text, '')), '') is null
        )
        or (
          current_mode = 'ai_solved'
          and nullif(trim(coalesce(q.answer_text, '')), '') is null
        )
        or (
          current_mode = 'teacher_html'
          and nullif(trim(coalesce(q.answer_html, '')), '') is null
        )
        or (
          q.requires_visual
          and not q.visual_not_needed
          and not exists (
            select 1 from public.exam_assets a
            where a.question_id = q.id
              and a.student_visible
              and a.variant = 'display'
              and a.role in ('question_visual', 'answer_visual')
          )
        )
        or (
          current_mode = 'handwritten_images'
          and (
            not exists (
              select 1 from public.exam_assets a
              where a.question_id = q.id
                and a.student_visible
                and a.variant = 'display'
                and a.role = 'question_image'
            )
            or not exists (
              select 1 from public.exam_assets a
              where a.question_id = q.id
                and a.student_visible
                and a.variant = 'display'
                and a.role = 'answer_image'
            )
          )
        )
      );

    if invalid_count > 0 then
      raise exception 'Every question must satisfy the selected exam mode before publishing.';
    end if;

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

revoke all on function public.save_exam_review(uuid, jsonb, uuid, boolean) from public, anon, authenticated;
grant execute on function public.save_exam_review(uuid, jsonb, uuid, boolean) to service_role;

create or replace function public.complete_exam_processing_run(
  p_run_id uuid,
  p_questions jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  current_exam_id uuid;
  current_run_status text;
  current_exam_status text;
begin
  select exam_id, status
  into current_exam_id, current_run_status
  from public.exam_processing_runs
  where id = p_run_id
  for update;

  if current_exam_id is null then
    raise exception 'Exam processing run was not found.';
  end if;

  if current_run_status = 'completed' then
    return false;
  end if;

  if current_run_status = 'failed' then
    raise exception 'Failed processing runs cannot be completed.';
  end if;

  select status
  into current_exam_status
  from public.exams
  where id = current_exam_id
  for update;

  if current_exam_status in ('published', 'archived') then
    raise exception 'Published or archived exams cannot be replaced by AI processing.';
  end if;

  if jsonb_array_length(p_questions) = 0 then
    raise exception 'At least one processed question is required.';
  end if;

  delete from public.exam_questions
  where exam_id = current_exam_id;

  for item in select value from jsonb_array_elements(p_questions)
  loop
    insert into public.exam_questions (
      id,
      exam_id,
      question_number,
      question_text,
      answer_text,
      question_html,
      answer_html,
      question_format,
      answer_format,
      marks,
      source_pages,
      review_warning,
      sort_order,
      requires_visual,
      visual_not_needed
    )
    values (
      (item->>'id')::uuid,
      current_exam_id,
      item->>'question_number',
      nullif(item->>'question_text', ''),
      nullif(item->>'answer_text', ''),
      nullif(item->>'question_html', ''),
      nullif(item->>'answer_html', ''),
      item->>'question_format',
      item->>'answer_format',
      case when item->'marks' = 'null'::jsonb then null else (item->>'marks')::integer end,
      array(select jsonb_array_elements_text(item->'source_pages')::integer),
      nullif(item->>'review_warning', ''),
      (item->>'sort_order')::integer,
      coalesce((item->>'requires_visual')::boolean, false),
      coalesce((item->>'visual_not_needed')::boolean, false)
    );
  end loop;

  update public.exam_processing_runs
  set status = 'completed',
      error = null,
      completed_at = now()
  where id = p_run_id;

  update public.exams
  set status = 'review',
      processing_status = 'completed',
      ai_error = null,
      processing_completed_at = now()
  where id = current_exam_id;

  return true;
end;
$$;

revoke all on function public.complete_exam_processing_run(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.complete_exam_processing_run(uuid, jsonb) to service_role;
