create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('student', 'teacher', 'admin', 'super_admin')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  guardian_name text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_group_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  group_id uuid not null references public.content_groups(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, group_id)
);

create table if not exists public.years (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_ai_indexable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.years(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_ai_indexable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_ai_indexable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  question_text text not null default '',
  description text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_ai_indexable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  title text not null,
  description text,
  youtube_video_id text not null,
  duration_seconds integer,
  recorded_at timestamptz,
  transcript_text text,
  transcript_source text not null default 'none' check (transcript_source in ('none', 'manual', 'youtube', 'generated')),
  transcript_review_status text not null default 'draft' check (transcript_review_status in ('draft', 'reviewed', 'approved')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_ai_indexable boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solution_materials (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  title text not null,
  description text,
  storage_bucket text not null default 'solution-materials',
  file_key text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  is_downloadable boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_ai_indexable boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, file_key)
);

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  grantee_type text not null check (grantee_type in ('user', 'group')),
  grantee_id uuid not null,
  resource_type text not null check (resource_type in ('year', 'subject', 'chapter', 'question', 'recording', 'solution_material')),
  resource_id uuid not null,
  permission text not null check (permission in ('view', 'download')),
  starts_at timestamptz,
  expires_at timestamptz,
  granted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.content_tags (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.tags(id) on delete cascade,
  resource_type text not null check (resource_type in ('chapter', 'question', 'recording', 'solution_material')),
  resource_id uuid not null,
  unique (tag_id, resource_type, resource_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subjects_year_id on public.subjects(year_id);
create index if not exists idx_chapters_subject_id on public.chapters(subject_id);
create index if not exists idx_questions_chapter_id on public.questions(chapter_id);
create index if not exists idx_recordings_chapter_id on public.recordings(chapter_id);
create index if not exists idx_solution_materials_chapter_id on public.solution_materials(chapter_id);
create index if not exists idx_access_grants_grantee on public.access_grants(grantee_type, grantee_id);
create index if not exists idx_access_grants_resource on public.access_grants(resource_type, resource_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_activity_events_user_created_at on public.activity_events(user_id, created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_student_profiles_updated_at on public.student_profiles;
create trigger set_student_profiles_updated_at before update on public.student_profiles for each row execute function public.set_updated_at();
drop trigger if exists set_content_groups_updated_at on public.content_groups;
create trigger set_content_groups_updated_at before update on public.content_groups for each row execute function public.set_updated_at();
drop trigger if exists set_years_updated_at on public.years;
create trigger set_years_updated_at before update on public.years for each row execute function public.set_updated_at();
drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();
drop trigger if exists set_chapters_updated_at on public.chapters;
create trigger set_chapters_updated_at before update on public.chapters for each row execute function public.set_updated_at();
drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at before update on public.questions for each row execute function public.set_updated_at();
drop trigger if exists set_recordings_updated_at on public.recordings;
create trigger set_recordings_updated_at before update on public.recordings for each row execute function public.set_updated_at();
drop trigger if exists set_solution_materials_updated_at on public.solution_materials;
create trigger set_solution_materials_updated_at before update on public.solution_materials for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.content_groups enable row level security;
alter table public.student_group_memberships enable row level security;
alter table public.years enable row level security;
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.questions enable row level security;
alter table public.recordings enable row level security;
alter table public.solution_materials enable row level security;
alter table public.access_grants enable row level security;
alter table public.tags enable row level security;
alter table public.content_tags enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_events enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('solution-materials', 'solution-materials', false, 26214400, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']),
  ('transcripts', 'transcripts', false, 26214400, null),
  ('admin-imports', 'admin-imports', false, 26214400, null)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
