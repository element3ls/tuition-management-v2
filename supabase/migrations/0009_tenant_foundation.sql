create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'teacher', 'student')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

insert into public.organizations (id, name, slug, status, metadata)
values (
  '01000000-0000-4000-8000-000000000001',
  'Legacy Tuition Center',
  'legacy-tuition-center',
  'active',
  '{"source":"mvp_backfill"}'::jsonb
)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    status = excluded.status;

with ranked_roles as (
  select
    user_roles.user_id,
    roles.name,
    case roles.name
      when 'super_admin' then 1
      when 'admin' then 2
      when 'teacher' then 3
      else 4
    end as role_rank
  from public.user_roles
  join public.roles on roles.id = user_roles.role_id
),
best_roles as (
  select distinct on (user_id)
    user_id,
    case name
      when 'super_admin' then 'owner'
      when 'admin' then 'admin'
      when 'teacher' then 'teacher'
      else 'student'
    end as tenant_role
  from ranked_roles
  order by user_id, role_rank
)
insert into public.organization_memberships (organization_id, user_id, role, status)
select
  '01000000-0000-4000-8000-000000000001',
  user_id,
  tenant_role,
  'active'
from best_roles
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status;

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_organization_memberships_updated_at on public.organization_memberships;
create trigger set_organization_memberships_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

grant all privileges on public.organizations to service_role;
grant all privileges on public.organization_memberships to service_role;

alter default privileges in schema public grant all privileges on tables to service_role;

alter table public.student_profiles add column if not exists organization_id uuid;
alter table public.content_groups add column if not exists organization_id uuid;
alter table public.student_group_memberships add column if not exists organization_id uuid;
alter table public.years add column if not exists organization_id uuid;
alter table public.subjects add column if not exists organization_id uuid;
alter table public.chapters add column if not exists organization_id uuid;
alter table public.questions add column if not exists organization_id uuid;
alter table public.recordings add column if not exists organization_id uuid;
alter table public.solution_materials add column if not exists organization_id uuid;
alter table public.exams add column if not exists organization_id uuid;
alter table public.exam_chapters add column if not exists organization_id uuid;
alter table public.exam_questions add column if not exists organization_id uuid;
alter table public.exam_assets add column if not exists organization_id uuid;
alter table public.exam_processing_runs add column if not exists organization_id uuid;
alter table public.access_grants add column if not exists organization_id uuid;
alter table public.tags add column if not exists organization_id uuid;
alter table public.content_tags add column if not exists organization_id uuid;
alter table public.audit_logs add column if not exists organization_id uuid;
alter table public.activity_events add column if not exists organization_id uuid;

update public.student_profiles set organization_id = '01000000-0000-4000-8000-000000000001' where organization_id is null;
update public.content_groups set organization_id = '01000000-0000-4000-8000-000000000001' where organization_id is null;
update public.years set organization_id = '01000000-0000-4000-8000-000000000001' where organization_id is null;
update public.tags set organization_id = '01000000-0000-4000-8000-000000000001' where organization_id is null;
update public.audit_logs set organization_id = '01000000-0000-4000-8000-000000000001' where organization_id is null;
update public.activity_events set organization_id = '01000000-0000-4000-8000-000000000001' where organization_id is null;

update public.student_group_memberships membership
set organization_id = coalesce(group_record.organization_id, '01000000-0000-4000-8000-000000000001')
from public.content_groups group_record
where membership.group_id = group_record.id
  and membership.organization_id is null;

update public.subjects subject
set organization_id = coalesce(year_record.organization_id, '01000000-0000-4000-8000-000000000001')
from public.years year_record
where subject.year_id = year_record.id
  and subject.organization_id is null;

update public.chapters chapter
set organization_id = coalesce(subject.organization_id, '01000000-0000-4000-8000-000000000001')
from public.subjects subject
where chapter.subject_id = subject.id
  and chapter.organization_id is null;

update public.questions question
set organization_id = coalesce(chapter.organization_id, '01000000-0000-4000-8000-000000000001')
from public.chapters chapter
where question.chapter_id = chapter.id
  and question.organization_id is null;

update public.recordings recording
set organization_id = coalesce(chapter.organization_id, '01000000-0000-4000-8000-000000000001')
from public.chapters chapter
where recording.chapter_id = chapter.id
  and recording.organization_id is null;

update public.solution_materials material
set organization_id = coalesce(chapter.organization_id, '01000000-0000-4000-8000-000000000001')
from public.chapters chapter
where material.chapter_id = chapter.id
  and material.organization_id is null;

update public.exams exam
set organization_id = coalesce(subject.organization_id, '01000000-0000-4000-8000-000000000001')
from public.subjects subject
where exam.subject_id = subject.id
  and exam.organization_id is null;

update public.exam_chapters exam_chapter
set organization_id = coalesce(exam.organization_id, '01000000-0000-4000-8000-000000000001')
from public.exams exam
where exam_chapter.exam_id = exam.id
  and exam_chapter.organization_id is null;

update public.exam_questions question
set organization_id = coalesce(exam.organization_id, '01000000-0000-4000-8000-000000000001')
from public.exams exam
where question.exam_id = exam.id
  and question.organization_id is null;

update public.exam_assets asset
set organization_id = coalesce(exam.organization_id, '01000000-0000-4000-8000-000000000001')
from public.exams exam
where asset.exam_id = exam.id
  and asset.organization_id is null;

update public.exam_processing_runs run
set organization_id = coalesce(exam.organization_id, '01000000-0000-4000-8000-000000000001')
from public.exams exam
where run.exam_id = exam.id
  and run.organization_id is null;

update public.content_tags content_tag
set organization_id = coalesce(tag.organization_id, '01000000-0000-4000-8000-000000000001')
from public.tags tag
where content_tag.tag_id = tag.id
  and content_tag.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(group_record.organization_id, '01000000-0000-4000-8000-000000000001')
from public.content_groups group_record
where grant_record.grantee_type = 'group'
  and grant_record.grantee_id = group_record.id
  and grant_record.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(year_record.organization_id, '01000000-0000-4000-8000-000000000001')
from public.years year_record
where grant_record.resource_type = 'year'
  and grant_record.resource_id = year_record.id
  and grant_record.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(subject.organization_id, '01000000-0000-4000-8000-000000000001')
from public.subjects subject
where grant_record.resource_type = 'subject'
  and grant_record.resource_id = subject.id
  and grant_record.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(chapter.organization_id, '01000000-0000-4000-8000-000000000001')
from public.chapters chapter
where grant_record.resource_type = 'chapter'
  and grant_record.resource_id = chapter.id
  and grant_record.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(question.organization_id, '01000000-0000-4000-8000-000000000001')
from public.questions question
where grant_record.resource_type = 'question'
  and grant_record.resource_id = question.id
  and grant_record.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(recording.organization_id, '01000000-0000-4000-8000-000000000001')
from public.recordings recording
where grant_record.resource_type = 'recording'
  and grant_record.resource_id = recording.id
  and grant_record.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(material.organization_id, '01000000-0000-4000-8000-000000000001')
from public.solution_materials material
where grant_record.resource_type = 'solution_material'
  and grant_record.resource_id = material.id
  and grant_record.organization_id is null;

update public.access_grants grant_record
set organization_id = coalesce(exam.organization_id, '01000000-0000-4000-8000-000000000001')
from public.exams exam
where grant_record.resource_type = 'exam'
  and grant_record.resource_id = exam.id
  and grant_record.organization_id is null;

update public.access_grants
set organization_id = '01000000-0000-4000-8000-000000000001'
where organization_id is null;

alter table public.student_profiles alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.content_groups alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.student_group_memberships alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.years alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.subjects alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.chapters alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.questions alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.recordings alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.solution_materials alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.exams alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.exam_chapters alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.exam_questions alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.exam_assets alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.exam_processing_runs alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.access_grants alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.tags alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.content_tags alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.audit_logs alter column organization_id set default '01000000-0000-4000-8000-000000000001';
alter table public.activity_events alter column organization_id set default '01000000-0000-4000-8000-000000000001';

alter table public.student_profiles alter column organization_id set not null;
alter table public.content_groups alter column organization_id set not null;
alter table public.student_group_memberships alter column organization_id set not null;
alter table public.years alter column organization_id set not null;
alter table public.subjects alter column organization_id set not null;
alter table public.chapters alter column organization_id set not null;
alter table public.questions alter column organization_id set not null;
alter table public.recordings alter column organization_id set not null;
alter table public.solution_materials alter column organization_id set not null;
alter table public.exams alter column organization_id set not null;
alter table public.exam_chapters alter column organization_id set not null;
alter table public.exam_questions alter column organization_id set not null;
alter table public.exam_assets alter column organization_id set not null;
alter table public.exam_processing_runs alter column organization_id set not null;
alter table public.access_grants alter column organization_id set not null;
alter table public.tags alter column organization_id set not null;
alter table public.content_tags alter column organization_id set not null;
alter table public.audit_logs alter column organization_id set not null;
alter table public.activity_events alter column organization_id set not null;

alter table public.content_groups drop constraint if exists content_groups_name_key;
alter table public.tags drop constraint if exists tags_name_key;
alter table public.tags drop constraint if exists tags_slug_key;

alter table public.student_profiles drop constraint if exists student_profiles_organization_id_fkey;
alter table public.content_groups drop constraint if exists content_groups_organization_id_fkey;
alter table public.student_group_memberships drop constraint if exists student_group_memberships_organization_id_fkey;
alter table public.years drop constraint if exists years_organization_id_fkey;
alter table public.subjects drop constraint if exists subjects_organization_id_fkey;
alter table public.chapters drop constraint if exists chapters_organization_id_fkey;
alter table public.questions drop constraint if exists questions_organization_id_fkey;
alter table public.recordings drop constraint if exists recordings_organization_id_fkey;
alter table public.solution_materials drop constraint if exists solution_materials_organization_id_fkey;
alter table public.exams drop constraint if exists exams_organization_id_fkey;
alter table public.exam_chapters drop constraint if exists exam_chapters_organization_id_fkey;
alter table public.exam_questions drop constraint if exists exam_questions_organization_id_fkey;
alter table public.exam_assets drop constraint if exists exam_assets_organization_id_fkey;
alter table public.exam_processing_runs drop constraint if exists exam_processing_runs_organization_id_fkey;
alter table public.access_grants drop constraint if exists access_grants_organization_id_fkey;
alter table public.tags drop constraint if exists tags_organization_id_fkey;
alter table public.content_tags drop constraint if exists content_tags_organization_id_fkey;
alter table public.audit_logs drop constraint if exists audit_logs_organization_id_fkey;
alter table public.activity_events drop constraint if exists activity_events_organization_id_fkey;

alter table public.student_profiles add constraint student_profiles_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.content_groups add constraint content_groups_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.student_group_memberships add constraint student_group_memberships_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.years add constraint years_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.subjects add constraint subjects_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.chapters add constraint chapters_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.questions add constraint questions_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.recordings add constraint recordings_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.solution_materials add constraint solution_materials_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.exams add constraint exams_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.exam_chapters add constraint exam_chapters_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.exam_questions add constraint exam_questions_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.exam_assets add constraint exam_assets_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.exam_processing_runs add constraint exam_processing_runs_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.access_grants add constraint access_grants_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.tags add constraint tags_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.content_tags add constraint content_tags_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.audit_logs add constraint audit_logs_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;
alter table public.activity_events add constraint activity_events_organization_id_fkey foreign key (organization_id) references public.organizations(id) on delete cascade;

create unique index if not exists idx_content_groups_org_name on public.content_groups(organization_id, name);
create unique index if not exists idx_tags_org_name on public.tags(organization_id, name);
create unique index if not exists idx_tags_org_slug on public.tags(organization_id, slug);

create index if not exists idx_organization_memberships_user on public.organization_memberships(user_id, status);
create index if not exists idx_student_profiles_organization_id on public.student_profiles(organization_id);
create index if not exists idx_content_groups_organization_id on public.content_groups(organization_id);
create index if not exists idx_student_group_memberships_organization_id on public.student_group_memberships(organization_id);
create index if not exists idx_years_organization_id on public.years(organization_id);
create index if not exists idx_subjects_organization_id on public.subjects(organization_id);
create index if not exists idx_chapters_organization_id on public.chapters(organization_id);
create index if not exists idx_questions_organization_id on public.questions(organization_id);
create index if not exists idx_recordings_organization_id on public.recordings(organization_id);
create index if not exists idx_solution_materials_organization_id on public.solution_materials(organization_id);
create index if not exists idx_exams_organization_id on public.exams(organization_id);
create index if not exists idx_exam_chapters_organization_id on public.exam_chapters(organization_id);
create index if not exists idx_exam_questions_organization_id on public.exam_questions(organization_id);
create index if not exists idx_exam_assets_organization_id on public.exam_assets(organization_id);
create index if not exists idx_exam_processing_runs_organization_id on public.exam_processing_runs(organization_id);
create index if not exists idx_access_grants_organization_id on public.access_grants(organization_id);
create index if not exists idx_tags_organization_id on public.tags(organization_id);
create index if not exists idx_content_tags_organization_id on public.content_tags(organization_id);
create index if not exists idx_audit_logs_organization_created_at on public.audit_logs(organization_id, created_at desc);
create index if not exists idx_activity_events_organization_created_at on public.activity_events(organization_id, created_at desc);
