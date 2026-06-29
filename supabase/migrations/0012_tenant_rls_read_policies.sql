create or replace function public.has_global_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role_record on role_record.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role_record.name = any(p_roles)
  );
$$;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization_record on organization_record.id = membership.organization_id
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and organization_record.status = 'active'
  );
$$;

create or replace function public.has_tenant_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization_record on organization_record.id = membership.organization_id
    where membership.organization_id = p_organization_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = any(p_roles)
      and organization_record.status = 'active'
  );
$$;

create or replace function public.can_read_tenant_staff_data(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_global_role(array['super_admin'])
    or public.has_tenant_role(p_organization_id, array['owner', 'admin', 'teacher']);
$$;

create or replace function public.can_read_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id = auth.uid()
    or public.has_global_role(array['super_admin'])
    or exists (
      select 1
      from public.organization_memberships membership
      where membership.user_id = p_user_id
        and membership.status = 'active'
        and public.can_read_tenant_staff_data(membership.organization_id)
    );
$$;

revoke all on function public.has_global_role(text[]) from public, anon;
revoke all on function public.is_organization_member(uuid) from public, anon;
revoke all on function public.has_tenant_role(uuid, text[]) from public, anon;
revoke all on function public.can_read_tenant_staff_data(uuid) from public, anon;
revoke all on function public.can_read_profile(uuid) from public, anon;

grant execute on function public.has_global_role(text[]) to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, text[]) to authenticated;
grant execute on function public.can_read_tenant_staff_data(uuid) to authenticated;
grant execute on function public.can_read_profile(uuid) to authenticated;

drop policy if exists profiles_select_self_or_staff on public.profiles;
create policy profiles_select_self_or_staff
on public.profiles
for select
to authenticated
using (public.can_read_profile(id));

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);

drop policy if exists user_roles_select_self_or_staff on public.user_roles;
create policy user_roles_select_self_or_staff
on public.user_roles
for select
to authenticated
using (public.can_read_profile(user_id));

drop policy if exists organizations_select_member_or_super_admin on public.organizations;
create policy organizations_select_member_or_super_admin
on public.organizations
for select
to authenticated
using (
  public.has_global_role(array['super_admin'])
  or public.is_organization_member(id)
);

drop policy if exists organization_memberships_select_self_or_staff on public.organization_memberships;
create policy organization_memberships_select_self_or_staff
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_read_tenant_staff_data(organization_id)
);

drop policy if exists student_profiles_select_self_or_staff on public.student_profiles;
create policy student_profiles_select_self_or_staff
on public.student_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_read_tenant_staff_data(organization_id)
);

drop policy if exists student_group_memberships_select_self_or_staff on public.student_group_memberships;
create policy student_group_memberships_select_self_or_staff
on public.student_group_memberships
for select
to authenticated
using (
  student_id = auth.uid()
  or public.can_read_tenant_staff_data(organization_id)
);

drop policy if exists content_groups_select_tenant_staff on public.content_groups;
create policy content_groups_select_tenant_staff
on public.content_groups
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists years_select_tenant_staff on public.years;
create policy years_select_tenant_staff
on public.years
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists subjects_select_tenant_staff on public.subjects;
create policy subjects_select_tenant_staff
on public.subjects
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists chapters_select_tenant_staff on public.chapters;
create policy chapters_select_tenant_staff
on public.chapters
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists questions_select_tenant_staff on public.questions;
create policy questions_select_tenant_staff
on public.questions
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists recordings_select_tenant_staff on public.recordings;
create policy recordings_select_tenant_staff
on public.recordings
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists solution_materials_select_tenant_staff on public.solution_materials;
create policy solution_materials_select_tenant_staff
on public.solution_materials
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists exams_select_tenant_staff on public.exams;
create policy exams_select_tenant_staff
on public.exams
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists exam_chapters_select_tenant_staff on public.exam_chapters;
create policy exam_chapters_select_tenant_staff
on public.exam_chapters
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists exam_questions_select_tenant_staff on public.exam_questions;
create policy exam_questions_select_tenant_staff
on public.exam_questions
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists exam_assets_select_tenant_staff on public.exam_assets;
create policy exam_assets_select_tenant_staff
on public.exam_assets
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists exam_processing_runs_select_tenant_staff on public.exam_processing_runs;
create policy exam_processing_runs_select_tenant_staff
on public.exam_processing_runs
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists ai_usage_events_select_tenant_staff on public.ai_usage_events;
create policy ai_usage_events_select_tenant_staff
on public.ai_usage_events
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists access_grants_select_tenant_staff on public.access_grants;
create policy access_grants_select_tenant_staff
on public.access_grants
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists tags_select_tenant_staff on public.tags;
create policy tags_select_tenant_staff
on public.tags
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists content_tags_select_tenant_staff on public.content_tags;
create policy content_tags_select_tenant_staff
on public.content_tags
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists audit_logs_select_tenant_staff on public.audit_logs;
create policy audit_logs_select_tenant_staff
on public.audit_logs
for select
to authenticated
using (public.can_read_tenant_staff_data(organization_id));

drop policy if exists activity_events_select_self_or_staff on public.activity_events;
create policy activity_events_select_self_or_staff
on public.activity_events
for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_read_tenant_staff_data(organization_id)
);
