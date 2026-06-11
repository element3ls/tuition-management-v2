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

loadEnvFile(".env.local");

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
      (select count(*)::int from public.student_profiles) as student_profiles,
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
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exams') as exam_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_chapters') as exam_chapter_tables,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exams' and column_name = 'subject_id') as exam_subject_columns,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_questions') as exam_question_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_assets') as exam_asset_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_processing_runs') as exam_processing_run_tables,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exams' and column_name = 'intake_mode') as exam_intake_mode_columns,
      (select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'exams' and column_name = 'processing_status') as exam_processing_status_columns;
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

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("solution-materials")
    .createSignedUrl("demo/linear-equations-solution.pdf", 60);
  if (signedUrlError || !signedUrlData?.signedUrl) throw signedUrlError ?? new Error("Signed URL creation failed.");

  console.log(
    JSON.stringify(
      {
        authUsers: ["student@example.com", "admin@example.com"],
        counts,
        integrity,
        privateBuckets: ["solution-materials", "exam-sources", "exam-assets"],
        signedUrlCreated: true
      },
      null,
      2
    )
  );
} finally {
  await client.end();
}
