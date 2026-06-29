create unique index if not exists idx_student_profiles_org_user_unique
  on public.student_profiles(organization_id, user_id);
create unique index if not exists idx_content_groups_org_id_unique
  on public.content_groups(organization_id, id);
create unique index if not exists idx_years_org_id_unique
  on public.years(organization_id, id);
create unique index if not exists idx_subjects_org_id_unique
  on public.subjects(organization_id, id);
create unique index if not exists idx_chapters_org_id_unique
  on public.chapters(organization_id, id);
create unique index if not exists idx_questions_org_id_unique
  on public.questions(organization_id, id);
create unique index if not exists idx_exams_org_id_unique
  on public.exams(organization_id, id);
create unique index if not exists idx_exam_questions_org_id_unique
  on public.exam_questions(organization_id, id);
create unique index if not exists idx_tags_org_id_unique
  on public.tags(organization_id, id);

alter table public.student_group_memberships
  drop constraint if exists student_group_memberships_org_student_fkey,
  drop constraint if exists student_group_memberships_org_group_fkey;
alter table public.student_group_memberships
  add constraint student_group_memberships_org_student_fkey
    foreign key (organization_id, student_id)
    references public.student_profiles(organization_id, user_id)
    on delete cascade,
  add constraint student_group_memberships_org_group_fkey
    foreign key (organization_id, group_id)
    references public.content_groups(organization_id, id)
    on delete cascade;

alter table public.subjects
  drop constraint if exists subjects_org_year_fkey;
alter table public.subjects
  add constraint subjects_org_year_fkey
    foreign key (organization_id, year_id)
    references public.years(organization_id, id)
    on delete cascade;

alter table public.chapters
  drop constraint if exists chapters_org_subject_fkey;
alter table public.chapters
  add constraint chapters_org_subject_fkey
    foreign key (organization_id, subject_id)
    references public.subjects(organization_id, id)
    on delete cascade;

alter table public.questions
  drop constraint if exists questions_org_chapter_fkey;
alter table public.questions
  add constraint questions_org_chapter_fkey
    foreign key (organization_id, chapter_id)
    references public.chapters(organization_id, id)
    on delete cascade;

alter table public.recordings
  drop constraint if exists recordings_org_chapter_fkey;
alter table public.recordings
  add constraint recordings_org_chapter_fkey
    foreign key (organization_id, chapter_id)
    references public.chapters(organization_id, id)
    on delete cascade;

alter table public.solution_materials
  drop constraint if exists solution_materials_org_chapter_fkey;
alter table public.solution_materials
  add constraint solution_materials_org_chapter_fkey
    foreign key (organization_id, chapter_id)
    references public.chapters(organization_id, id)
    on delete cascade;

alter table public.exams
  drop constraint if exists exams_org_subject_fkey;
alter table public.exams
  add constraint exams_org_subject_fkey
    foreign key (organization_id, subject_id)
    references public.subjects(organization_id, id)
    on delete cascade;

alter table public.exam_chapters
  drop constraint if exists exam_chapters_org_exam_fkey,
  drop constraint if exists exam_chapters_org_chapter_fkey;
alter table public.exam_chapters
  add constraint exam_chapters_org_exam_fkey
    foreign key (organization_id, exam_id)
    references public.exams(organization_id, id)
    on delete cascade,
  add constraint exam_chapters_org_chapter_fkey
    foreign key (organization_id, chapter_id)
    references public.chapters(organization_id, id)
    on delete cascade;

alter table public.exam_questions
  drop constraint if exists exam_questions_org_exam_fkey;
alter table public.exam_questions
  add constraint exam_questions_org_exam_fkey
    foreign key (organization_id, exam_id)
    references public.exams(organization_id, id)
    on delete cascade;

alter table public.exam_assets
  drop constraint if exists exam_assets_org_exam_fkey;
alter table public.exam_assets
  add constraint exam_assets_org_exam_fkey
    foreign key (organization_id, exam_id)
    references public.exams(organization_id, id)
    on delete cascade;

alter table public.exam_processing_runs
  drop constraint if exists exam_processing_runs_org_exam_fkey;
alter table public.exam_processing_runs
  add constraint exam_processing_runs_org_exam_fkey
    foreign key (organization_id, exam_id)
    references public.exams(organization_id, id)
    on delete cascade;

alter table public.content_tags
  drop constraint if exists content_tags_org_tag_fkey;
alter table public.content_tags
  add constraint content_tags_org_tag_fkey
    foreign key (organization_id, tag_id)
    references public.tags(organization_id, id)
    on delete cascade;

do $$
begin
  if exists (
    select 1
    from public.recordings recording
    join public.questions question on question.id = recording.question_id
    where recording.question_id is not null
      and question.organization_id <> recording.organization_id
  ) then
    raise exception 'Existing recordings.question_id rows cross organization boundaries.';
  end if;

  if exists (
    select 1
    from public.solution_materials material
    join public.questions question on question.id = material.question_id
    where material.question_id is not null
      and question.organization_id <> material.organization_id
  ) then
    raise exception 'Existing solution_materials.question_id rows cross organization boundaries.';
  end if;

  if exists (
    select 1
    from public.exam_assets asset
    join public.exam_questions question on question.id = asset.question_id
    where asset.question_id is not null
      and (
        question.organization_id <> asset.organization_id
        or question.exam_id <> asset.exam_id
      )
  ) then
    raise exception 'Existing exam_assets.question_id rows cross exam or organization boundaries.';
  end if;

  if exists (
    select 1
    from public.ai_usage_events event
    join public.exams exam on exam.id = event.exam_id
    where event.exam_id is not null
      and exam.organization_id <> event.organization_id
  ) then
    raise exception 'Existing ai_usage_events.exam_id rows cross organization boundaries.';
  end if;

  if exists (
    select 1
    from public.ai_usage_events event
    join public.exam_processing_runs run on run.id = event.run_id
    where event.run_id is not null
      and run.organization_id <> event.organization_id
  ) then
    raise exception 'Existing ai_usage_events.run_id rows cross organization boundaries.';
  end if;

  if exists (
    select 1
    from public.content_tags tag_link
    where not (
      (
        tag_link.resource_type = 'chapter'
        and exists (
          select 1
          from public.chapters chapter
          where chapter.id = tag_link.resource_id
            and chapter.organization_id = tag_link.organization_id
        )
      )
      or (
        tag_link.resource_type = 'question'
        and exists (
          select 1
          from public.questions question
          where question.id = tag_link.resource_id
            and question.organization_id = tag_link.organization_id
        )
      )
      or (
        tag_link.resource_type = 'recording'
        and exists (
          select 1
          from public.recordings recording
          where recording.id = tag_link.resource_id
            and recording.organization_id = tag_link.organization_id
        )
      )
      or (
        tag_link.resource_type = 'solution_material'
        and exists (
          select 1
          from public.solution_materials material
          where material.id = tag_link.resource_id
            and material.organization_id = tag_link.organization_id
        )
      )
      or (
        tag_link.resource_type = 'exam'
        and exists (
          select 1
          from public.exams exam
          where exam.id = tag_link.resource_id
            and exam.organization_id = tag_link.organization_id
        )
      )
    )
  ) then
    raise exception 'Existing content_tags.resource_id rows cross organization boundaries or point at missing resources.';
  end if;

  if exists (
    select 1
    from public.access_grants grant_record
    where (
      grant_record.grantee_type = 'group'
      and not exists (
        select 1
        from public.content_groups group_record
        where group_record.id = grant_record.grantee_id
          and group_record.organization_id = grant_record.organization_id
      )
    )
    or (
      grant_record.grantee_type = 'user'
      and not exists (
        select 1
        from public.organization_memberships membership
        where membership.user_id = grant_record.grantee_id
          and membership.organization_id = grant_record.organization_id
      )
    )
  ) then
    raise exception 'Existing access_grants.grantee_id rows cross organization boundaries or point at missing grantees.';
  end if;

  if exists (
    select 1
    from public.access_grants grant_record
    where not (
      (
        grant_record.resource_type = 'year'
        and exists (
          select 1
          from public.years year_record
          where year_record.id = grant_record.resource_id
            and year_record.organization_id = grant_record.organization_id
        )
      )
      or (
        grant_record.resource_type = 'subject'
        and exists (
          select 1
          from public.subjects subject
          where subject.id = grant_record.resource_id
            and subject.organization_id = grant_record.organization_id
        )
      )
      or (
        grant_record.resource_type = 'chapter'
        and exists (
          select 1
          from public.chapters chapter
          where chapter.id = grant_record.resource_id
            and chapter.organization_id = grant_record.organization_id
        )
      )
      or (
        grant_record.resource_type = 'question'
        and exists (
          select 1
          from public.questions question
          where question.id = grant_record.resource_id
            and question.organization_id = grant_record.organization_id
        )
      )
      or (
        grant_record.resource_type = 'recording'
        and exists (
          select 1
          from public.recordings recording
          where recording.id = grant_record.resource_id
            and recording.organization_id = grant_record.organization_id
        )
      )
      or (
        grant_record.resource_type = 'solution_material'
        and exists (
          select 1
          from public.solution_materials material
          where material.id = grant_record.resource_id
            and material.organization_id = grant_record.organization_id
        )
      )
      or (
        grant_record.resource_type = 'exam'
        and exists (
          select 1
          from public.exams exam
          where exam.id = grant_record.resource_id
            and exam.organization_id = grant_record.organization_id
        )
      )
    )
  ) then
    raise exception 'Existing access_grants.resource_id rows cross organization boundaries or point at missing resources.';
  end if;
end
$$;

create or replace function public.ensure_recording_question_tenant_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.question_id is not null
    and not exists (
      select 1
      from public.questions question
      where question.id = new.question_id
        and question.organization_id = new.organization_id
    )
  then
    raise exception 'Recording question must belong to the same organization.';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_solution_material_question_tenant_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.question_id is not null
    and not exists (
      select 1
      from public.questions question
      where question.id = new.question_id
        and question.organization_id = new.organization_id
    )
  then
    raise exception 'Solution material question must belong to the same organization.';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_exam_asset_question_tenant_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.question_id is not null
    and not exists (
      select 1
      from public.exam_questions question
      where question.id = new.question_id
        and question.exam_id = new.exam_id
        and question.organization_id = new.organization_id
    )
  then
    raise exception 'Exam asset question must belong to the same exam and organization.';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_ai_usage_event_tenant_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.exam_id is not null
    and not exists (
      select 1
      from public.exams exam
      where exam.id = new.exam_id
        and exam.organization_id = new.organization_id
    )
  then
    raise exception 'AI usage event exam must belong to the same organization.';
  end if;

  if new.run_id is not null
    and not exists (
      select 1
      from public.exam_processing_runs run
      where run.id = new.run_id
        and run.organization_id = new.organization_id
    )
  then
    raise exception 'AI usage event processing run must belong to the same organization.';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_content_tag_resource_tenant_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    (
      new.resource_type = 'chapter'
      and exists (
        select 1
        from public.chapters chapter
        where chapter.id = new.resource_id
          and chapter.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'question'
      and exists (
        select 1
        from public.questions question
        where question.id = new.resource_id
          and question.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'recording'
      and exists (
        select 1
        from public.recordings recording
        where recording.id = new.resource_id
          and recording.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'solution_material'
      and exists (
        select 1
        from public.solution_materials material
        where material.id = new.resource_id
          and material.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'exam'
      and exists (
        select 1
        from public.exams exam
        where exam.id = new.resource_id
          and exam.organization_id = new.organization_id
      )
    )
  ) then
    raise exception 'Content tag resource must belong to the same organization.';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_access_grant_tenant_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.grantee_type = 'group' then
    if not exists (
      select 1
      from public.content_groups group_record
      where group_record.id = new.grantee_id
        and group_record.organization_id = new.organization_id
    ) then
      raise exception 'Access grant group must belong to the same organization.';
    end if;
  elsif new.grantee_type = 'user' then
    if not exists (
      select 1
      from public.organization_memberships membership
      where membership.user_id = new.grantee_id
        and membership.organization_id = new.organization_id
    ) then
      raise exception 'Access grant user must belong to the same organization.';
    end if;
  else
    raise exception 'Access grant grantee type is not supported.';
  end if;

  if not (
    (
      new.resource_type = 'year'
      and exists (
        select 1
        from public.years year_record
        where year_record.id = new.resource_id
          and year_record.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'subject'
      and exists (
        select 1
        from public.subjects subject
        where subject.id = new.resource_id
          and subject.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'chapter'
      and exists (
        select 1
        from public.chapters chapter
        where chapter.id = new.resource_id
          and chapter.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'question'
      and exists (
        select 1
        from public.questions question
        where question.id = new.resource_id
          and question.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'recording'
      and exists (
        select 1
        from public.recordings recording
        where recording.id = new.resource_id
          and recording.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'solution_material'
      and exists (
        select 1
        from public.solution_materials material
        where material.id = new.resource_id
          and material.organization_id = new.organization_id
      )
    )
    or (
      new.resource_type = 'exam'
      and exists (
        select 1
        from public.exams exam
        where exam.id = new.resource_id
          and exam.organization_id = new.organization_id
      )
    )
  ) then
    raise exception 'Access grant resource must belong to the same organization.';
  end if;

  return new;
end;
$$;

revoke all on function public.ensure_recording_question_tenant_consistency() from public, anon, authenticated;
revoke all on function public.ensure_solution_material_question_tenant_consistency() from public, anon, authenticated;
revoke all on function public.ensure_exam_asset_question_tenant_consistency() from public, anon, authenticated;
revoke all on function public.ensure_ai_usage_event_tenant_consistency() from public, anon, authenticated;
revoke all on function public.ensure_content_tag_resource_tenant_consistency() from public, anon, authenticated;
revoke all on function public.ensure_access_grant_tenant_consistency() from public, anon, authenticated;

drop trigger if exists ensure_recordings_question_tenant_consistency on public.recordings;
create trigger ensure_recordings_question_tenant_consistency
before insert or update of organization_id, question_id on public.recordings
for each row execute function public.ensure_recording_question_tenant_consistency();

drop trigger if exists ensure_solution_materials_question_tenant_consistency on public.solution_materials;
create trigger ensure_solution_materials_question_tenant_consistency
before insert or update of organization_id, question_id on public.solution_materials
for each row execute function public.ensure_solution_material_question_tenant_consistency();

drop trigger if exists ensure_exam_assets_question_tenant_consistency on public.exam_assets;
create trigger ensure_exam_assets_question_tenant_consistency
before insert or update of organization_id, exam_id, question_id on public.exam_assets
for each row execute function public.ensure_exam_asset_question_tenant_consistency();

drop trigger if exists ensure_ai_usage_events_tenant_consistency on public.ai_usage_events;
create trigger ensure_ai_usage_events_tenant_consistency
before insert or update of organization_id, exam_id, run_id on public.ai_usage_events
for each row execute function public.ensure_ai_usage_event_tenant_consistency();

drop trigger if exists ensure_content_tags_resource_tenant_consistency on public.content_tags;
create trigger ensure_content_tags_resource_tenant_consistency
before insert or update of organization_id, resource_type, resource_id on public.content_tags
for each row execute function public.ensure_content_tag_resource_tenant_consistency();

drop trigger if exists ensure_access_grants_tenant_consistency on public.access_grants;
create trigger ensure_access_grants_tenant_consistency
before insert or update of organization_id, grantee_type, grantee_id, resource_type, resource_id on public.access_grants
for each row execute function public.ensure_access_grant_tenant_consistency();
