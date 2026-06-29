create or replace function public.storage_key_has_organization_prefix(
  p_organization_id uuid,
  p_storage_key text,
  p_resource_segment text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_storage_key like 'organizations/' || p_organization_id::text || '/' || p_resource_segment || '/%';
$$;

revoke all on function public.storage_key_has_organization_prefix(uuid, text, text) from public, anon;
grant execute on function public.storage_key_has_organization_prefix(uuid, text, text) to authenticated;

update public.solution_materials
set file_key = 'organizations/' || organization_id::text || '/materials/' || file_key
where storage_bucket = 'solution-materials'
  and file_key not like 'organizations/' || organization_id::text || '/materials/%';

update public.exams
set source_key =
  'organizations/' ||
  organization_id::text ||
  '/exams/' ||
  case
    when source_key = 'demo/linear-equations-exam.pdf' then id::text || '/raw/' || source_key
    when source_key like 'exams/%' then substring(source_key from 7)
    else source_key
  end
where source_key is not null
  and source_key not like 'organizations/' || organization_id::text || '/exams/%';

update public.exam_assets
set storage_key =
  'organizations/' ||
  organization_id::text ||
  '/exams/' ||
  case
    when storage_key = 'demo/linear-equations-exam.pdf' then exam_id::text || '/raw/' || storage_key
    when storage_key like 'exams/%' then substring(storage_key from 7)
    else storage_key
  end
where storage_key not like 'organizations/' || organization_id::text || '/exams/%';

do $$
begin
  if exists (
    select 1
    from public.solution_materials material
    where material.storage_bucket = 'solution-materials'
      and not public.storage_key_has_organization_prefix(material.organization_id, material.file_key, 'materials')
  ) then
    raise exception 'Existing solution material storage keys must be tenant-prefixed.';
  end if;

  if exists (
    select 1
    from public.exams exam
    where exam.source_key is not null
      and not public.storage_key_has_organization_prefix(exam.organization_id, exam.source_key, 'exams')
  ) then
    raise exception 'Existing exam source keys must be tenant-prefixed.';
  end if;

  if exists (
    select 1
    from public.exam_assets asset
    where not public.storage_key_has_organization_prefix(asset.organization_id, asset.storage_key, 'exams')
  ) then
    raise exception 'Existing exam asset storage keys must be tenant-prefixed.';
  end if;
end
$$;

alter table public.solution_materials
  drop constraint if exists solution_materials_storage_key_org_prefix_check;
alter table public.solution_materials
  add constraint solution_materials_storage_key_org_prefix_check
  check (
    storage_bucket <> 'solution-materials'
    or public.storage_key_has_organization_prefix(organization_id, file_key, 'materials')
  );

alter table public.exams
  drop constraint if exists exams_source_key_org_prefix_check;
alter table public.exams
  add constraint exams_source_key_org_prefix_check
  check (
    source_key is null
    or public.storage_key_has_organization_prefix(organization_id, source_key, 'exams')
  );

alter table public.exam_assets
  drop constraint if exists exam_assets_storage_key_org_prefix_check;
alter table public.exam_assets
  add constraint exam_assets_storage_key_org_prefix_check
  check (public.storage_key_has_organization_prefix(organization_id, storage_key, 'exams'));
