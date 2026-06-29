import { readFileSync, existsSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function optionValue(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

loadEnvFile(optionValue("env-file", process.env.SUPABASE_ENV_FILE ?? ".env.local"));

const dbUrl = requiredEnv("SUPABASE_DB_URL");
const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

await client.connect();
try {
  const student = await findUserByEmail(supabase, "student@example.com");
  const admin = await findUserByEmail(supabase, "admin@example.com");
  if (!student) throw new Error("student@example.com auth user missing.");
  if (!admin) throw new Error("admin@example.com auth user missing.");

  const { rows } = await client.query(`
    select
      (select count(*)::int from public.roles) as roles,
      (select count(*)::int from public.profiles where email in ('student@example.com', 'admin@example.com')) as profiles,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'must_change_password') as must_change_password_columns,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'organizations') as organization_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'organization_memberships') as organization_membership_tables,
      (select count(*)::int from public.organizations where status = 'active') as active_organizations,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'billing_status') as organization_billing_status_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'billing_plan') as organization_billing_plan_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'billing_email') as organization_billing_email_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'stripe_customer_id') as organization_stripe_customer_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'stripe_subscription_id') as organization_stripe_subscription_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'trial_ends_at') as organization_trial_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'current_period_ends_at') as organization_current_period_columns,
      (
        select case when count(*) = 2 then 1 else 0 end
        from pg_constraint
        where connamespace = 'public'::regnamespace
          and conname = any(array[
            'organizations_billing_status_check',
            'organizations_billing_plan_check'
          ])
      ) as organization_billing_constraints,
      (
        select case when not exists (
          select 1
          from public.organizations
          where billing_status is null
             or billing_plan is null
             or length(trim(billing_plan)) = 0
        ) then 1 else 0 end
      ) as organization_billing_integrity,
      (select count(*)::int from public.student_profiles) as student_profiles,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'student_profiles' and column_name = 'organization_id') as student_profile_organization_columns,
      (select count(*)::int from public.content_groups) as groups,
      (select count(*)::int from public.student_group_memberships where status = 'active') as active_memberships,
      (select count(*)::int from public.years where status = 'published') as published_years,
      (select count(*)::int from public.subjects where status = 'published') as published_subjects,
      (select count(*)::int from public.chapters where status = 'published') as published_chapters,
      (select count(*)::int from public.questions where status = 'published') as published_questions,
      (select count(*)::int from public.recordings where status = 'published') as published_recordings,
      (select count(*)::int from public.solution_materials where status = 'published') as published_materials,
      (select count(*)::int from public.access_grants where revoked_at is null) as active_grants,
      (select count(*)::int from storage.buckets where id = 'solution-materials' and public = false) as private_solution_buckets,
      (select count(*)::int from storage.buckets where id = 'exam-sources' and public = false) as private_exam_buckets,
      (select count(*)::int from storage.buckets where id = 'exam-assets' and public = false) as private_exam_asset_buckets,
      (
        select case when count(*) = 1 then 1 else 0 end
        from pg_proc procedure_record
        join pg_namespace namespace_record on namespace_record.oid = procedure_record.pronamespace
        where namespace_record.nspname = 'public'
          and procedure_record.proname = 'storage_key_has_organization_prefix'
      ) as storage_key_prefix_functions,
      (
        select case when count(*) = 3 then 1 else 0 end
        from pg_constraint
        where connamespace = 'public'::regnamespace
          and conname = any(array[
            'solution_materials_storage_key_org_prefix_check',
            'exams_source_key_org_prefix_check',
            'exam_assets_storage_key_org_prefix_check'
          ])
      ) as storage_key_prefix_constraints,
      (
        select case when not exists (
          select 1
          from public.solution_materials material
          where material.storage_bucket = 'solution-materials'
            and not public.storage_key_has_organization_prefix(material.organization_id, material.file_key, 'materials')
        )
        and not exists (
          select 1
          from public.exams exam
          where exam.source_key is not null
            and not public.storage_key_has_organization_prefix(exam.organization_id, exam.source_key, 'exams')
        )
        and not exists (
          select 1
          from public.exam_assets asset
          where not public.storage_key_has_organization_prefix(asset.organization_id, asset.storage_key, 'exams')
        )
        then 1 else 0 end
      ) as storage_key_prefix_integrity,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exams') as exam_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_chapters') as exam_chapter_tables,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exams' and column_name = 'subject_id') as exam_subject_columns,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_questions') as exam_question_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_assets') as exam_asset_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_processing_runs') as exam_processing_run_tables,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exams' and column_name = 'intake_mode') as exam_intake_mode_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exams' and column_name = 'processing_status') as exam_processing_status_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exams' and column_name = 'organization_id') as exam_organization_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exam_assets' and column_name = 'organization_id') as exam_asset_organization_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'organization_id') as audit_log_organization_columns,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'ai_usage_events') as ai_usage_event_tables,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'ai_usage_events' and column_name = 'organization_id') as ai_usage_event_organization_columns,
      (
        select case when count(*) = 14 then 1 else 0 end
        from pg_constraint
        where connamespace = 'public'::regnamespace
          and conname = any(array[
            'student_group_memberships_org_student_fkey',
            'student_group_memberships_org_group_fkey',
            'subjects_org_year_fkey',
            'chapters_org_subject_fkey',
            'questions_org_chapter_fkey',
            'recordings_org_chapter_fkey',
            'solution_materials_org_chapter_fkey',
            'exams_org_subject_fkey',
            'exam_chapters_org_exam_fkey',
            'exam_chapters_org_chapter_fkey',
            'exam_questions_org_exam_fkey',
            'exam_assets_org_exam_fkey',
            'exam_processing_runs_org_exam_fkey',
            'content_tags_org_tag_fkey'
          ])
      ) as tenant_consistency_foreign_keys,
      (
        select case when count(*) = 6 then 1 else 0 end
        from pg_proc procedure_record
        join pg_namespace namespace_record on namespace_record.oid = procedure_record.pronamespace
        where namespace_record.nspname = 'public'
          and procedure_record.proname = any(array[
            'ensure_recording_question_tenant_consistency',
            'ensure_solution_material_question_tenant_consistency',
            'ensure_exam_asset_question_tenant_consistency',
            'ensure_ai_usage_event_tenant_consistency',
            'ensure_content_tag_resource_tenant_consistency',
            'ensure_access_grant_tenant_consistency'
          ])
      ) as tenant_consistency_functions,
      (
        select case when count(*) = 6 then 1 else 0 end
        from pg_trigger
        where not tgisinternal
          and tgname = any(array[
            'ensure_recordings_question_tenant_consistency',
            'ensure_solution_materials_question_tenant_consistency',
            'ensure_exam_assets_question_tenant_consistency',
            'ensure_ai_usage_events_tenant_consistency',
            'ensure_content_tags_resource_tenant_consistency',
            'ensure_access_grants_tenant_consistency'
          ])
      ) as tenant_consistency_triggers,
      (
        select case when count(*) = 5 then 1 else 0 end
        from pg_proc procedure_record
        join pg_namespace namespace_record on namespace_record.oid = procedure_record.pronamespace
        where namespace_record.nspname = 'public'
          and procedure_record.proname = any(array[
            'has_global_role',
            'is_organization_member',
            'has_tenant_role',
            'can_read_tenant_staff_data',
            'can_read_profile'
          ])
      ) as tenant_rls_helper_functions,
      (
        select case when count(*) = 25 then 1 else 0 end
        from pg_policies
        where schemaname = 'public'
          and policyname = any(array[
            'profiles_select_self_or_staff',
            'roles_select_authenticated',
            'user_roles_select_self_or_staff',
            'organizations_select_member_or_super_admin',
            'organization_memberships_select_self_or_staff',
            'student_profiles_select_self_or_staff',
            'student_group_memberships_select_self_or_staff',
            'content_groups_select_tenant_staff',
            'years_select_tenant_staff',
            'subjects_select_tenant_staff',
            'chapters_select_tenant_staff',
            'questions_select_tenant_staff',
            'recordings_select_tenant_staff',
            'solution_materials_select_tenant_staff',
            'exams_select_tenant_staff',
            'exam_chapters_select_tenant_staff',
            'exam_questions_select_tenant_staff',
            'exam_assets_select_tenant_staff',
            'exam_processing_runs_select_tenant_staff',
            'ai_usage_events_select_tenant_staff',
            'access_grants_select_tenant_staff',
            'tags_select_tenant_staff',
            'content_tags_select_tenant_staff',
            'audit_logs_select_tenant_staff',
            'activity_events_select_self_or_staff'
          ])
      ) as tenant_rls_select_policies;
  `);

  const counts = rows[0];
  for (const [key, value] of Object.entries(counts)) {
    if (Number(value) < 1) throw new Error(`Verification failed: ${key}=${value}`);
  }

  const { rows: integrityRows } = await client.query(`
    select count(*)::int as auth_users_without_profiles
    from auth.users auth_user
    left join public.profiles profile on profile.id = auth_user.id
    where profile.id is null;
  `);
  const integrity = integrityRows[0];
  if (Number(integrity.auth_users_without_profiles) > 0) {
    throw new Error(`Verification failed: auth_users_without_profiles=${integrity.auth_users_without_profiles}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("solution-materials")
    .createSignedUrl(
      "organizations/01000000-0000-4000-8000-000000000001/materials/demo/linear-equations-solution.pdf",
      60
    );
  if (signedUrlError || !signedUrlData?.signedUrl) throw signedUrlError ?? new Error("Signed URL creation failed.");

  console.log(
    JSON.stringify(
      {
        authUsers: ["student@example.com", "admin@example.com"],
        counts,
        integrity,
        privateBuckets: ["solution-materials", "exam-sources", "exam-assets"],
        organizationBillingReady: true,
        signedUrlCreated: true
      },
      null,
      2
    )
  );
} finally {
  await client.end();
}
