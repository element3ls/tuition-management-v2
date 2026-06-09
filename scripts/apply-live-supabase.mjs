import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function tempPassword() {
  return `Tms-${crypto.randomBytes(12).toString("base64url")}!9a`;
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function getOrCreateAuthUser(supabase, email, fullName, credentials) {
  const existing = await findUserByEmail(supabase, email);
  if (existing) return { id: existing.id, created: false };

  const password = process.env.SUPABASE_SEED_PASSWORD || tempPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (error || !data.user) throw error ?? new Error(`Could not create ${email}`);

  credentials.push({ email, password });
  return { id: data.user.id, created: true };
}

async function applySqlFile(client, file) {
  const sql = readFileSync(file, "utf8");
  await client.query(sql);
}

async function seedPublicData(client, ids) {
  await client.query(`
    insert into public.roles (name, description)
    values
      ('student', 'Student portal user'),
      ('teacher', 'Teacher CMS user'),
      ('admin', 'Admin CMS user'),
      ('super_admin', 'Full CMS user')
    on conflict (name) do update set description = excluded.description;
  `);

  await client.query(
    `
    insert into public.profiles (id, email, full_name, is_active)
    values
      ($1, 'student@example.com', 'Demo Student', true),
      ($2, 'admin@example.com', 'Demo Admin', true)
    on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        is_active = excluded.is_active;
  `,
    [ids.studentId, ids.adminId]
  );

  await client.query(
    `
    insert into public.user_roles (user_id, role_id)
    select $1::uuid, id from public.roles where name = 'student'
    on conflict do nothing;
  `,
    [ids.studentId]
  );

  await client.query(
    `
    insert into public.user_roles (user_id, role_id)
    select $1::uuid, id from public.roles where name = 'super_admin'
    on conflict do nothing;
  `,
    [ids.adminId]
  );

  await client.query(
    `
    insert into public.student_profiles (user_id, guardian_name, phone, notes)
    values ($1, 'Demo Guardian', '+60120000000', 'Seed student for live testing.')
    on conflict (user_id) do update
    set guardian_name = excluded.guardian_name,
        phone = excluded.phone,
        notes = excluded.notes;
  `,
    [ids.studentId]
  );

  await client.query(`
    insert into public.content_groups (id, name, description, is_active)
    values ('10000000-0000-4000-8000-000000000001', 'Year 7 Maths Alpha', 'Seed group for MVP testing.', true)
    on conflict (id) do update set name = excluded.name, description = excluded.description, is_active = excluded.is_active;
  `);

  await client.query(
    `
    insert into public.student_group_memberships (student_id, group_id, status, starts_at, expires_at)
    values ($1, '10000000-0000-4000-8000-000000000001', 'active', now() - interval '1 day', null)
    on conflict (student_id, group_id) do update set status = excluded.status, starts_at = excluded.starts_at, expires_at = excluded.expires_at;
  `,
    [ids.studentId]
  );

  await client.query(`
    insert into public.years (id, name, description, sort_order, status, is_ai_indexable)
    values ('20000000-0000-4000-8000-000000000001', 'Year 7', 'Lower secondary foundation year.', 1, 'published', true)
    on conflict (id) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order, status = excluded.status;

    insert into public.subjects (id, year_id, name, description, sort_order, status, is_ai_indexable)
    values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Mathematics', 'Core mathematics lessons and worked examples.', 1, 'published', true)
    on conflict (id) do update set name = excluded.name, description = excluded.description, status = excluded.status;

    insert into public.chapters (id, subject_id, title, description, sort_order, status, is_ai_indexable)
    values ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Linear Equations', 'Solving one-variable equations step by step.', 1, 'published', true)
    on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status;

    insert into public.questions (id, chapter_id, title, question_text, description, sort_order, status, is_ai_indexable)
    values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Balancing Equations', 'Solve 2x + 5 = 17.', 'Worked algebra question.', 1, 'published', true)
    on conflict (id) do update set title = excluded.title, question_text = excluded.question_text, description = excluded.description, status = excluded.status;
  `);

  await client.query(
    `
    insert into public.recordings (id, chapter_id, question_id, title, description, youtube_video_id, duration_seconds, recorded_at, transcript_text, transcript_source, transcript_review_status, status, is_ai_indexable, created_by)
    values ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Solving 2x + 5 = 17', 'Teacher walkthrough for balancing equations.', 'dQw4w9WgXcQ', 420, now(), 'Move 5 to the other side, then divide by 2.', 'manual', 'approved', 'published', true, $1)
    on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status;
  `,
    [ids.adminId]
  );

  await client.query(
    `
    insert into public.solution_materials (id, chapter_id, question_id, title, description, storage_bucket, file_key, file_name, mime_type, file_size_bytes, is_downloadable, status, is_ai_indexable, uploaded_by)
    values ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Linear Equations Solution Sheet', 'PDF solution notes for the demo question.', 'solution-materials', 'demo/linear-equations-solution.pdf', 'linear-equations-solution.pdf', 'application/pdf', 24576, true, 'published', true, $1)
    on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status;
  `,
    [ids.adminId]
  );

  await client.query(
    `
    insert into public.access_grants (id, grantee_type, grantee_id, resource_type, resource_id, permission, starts_at, expires_at, granted_by)
    values ('80000000-0000-4000-8000-000000000001', 'group', '10000000-0000-4000-8000-000000000001', 'year', '20000000-0000-4000-8000-000000000001', 'download', now() - interval '1 day', null, $1)
    on conflict (id) do update set permission = excluded.permission, revoked_at = null, revoked_by = null;
  `,
    [ids.adminId]
  );

  await client.query(`
    insert into public.tags (id, name, slug)
    values ('90000000-0000-4000-8000-000000000001', 'Algebra', 'algebra')
    on conflict (id) do update set name = excluded.name, slug = excluded.slug;

    insert into public.content_tags (tag_id, resource_type, resource_id)
    values ('90000000-0000-4000-8000-000000000001', 'chapter', '40000000-0000-4000-8000-000000000001')
    on conflict do nothing;
  `);
}

async function verify(client) {
  const { rows } = await client.query(`
    select
      (select count(*)::int from public.roles) as roles,
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.years) as years,
      (select count(*)::int from public.subjects) as subjects,
      (select count(*)::int from public.chapters) as chapters,
      (select count(*)::int from public.questions) as questions,
      (select count(*)::int from public.recordings) as recordings,
      (select count(*)::int from public.solution_materials) as materials,
      (select count(*)::int from public.access_grants where revoked_at is null) as active_grants,
      (select count(*)::int from storage.buckets where id = 'solution-materials' and public = false) as private_solution_buckets,
      (select count(*)::int from storage.buckets where id = 'exam-sources' and public = false) as private_exam_buckets,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exams') as exam_tables,
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'exam_questions') as exam_question_tables;
  `);
  return rows[0];
}

async function uploadDemoMaterial(supabase) {
  const pdf = Buffer.from(
    [
      "%PDF-1.4",
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >> endobj",
      "4 0 obj << /Length 67 >> stream",
      "BT /F1 12 Tf 24 96 Td (Linear Equations Solution Sheet) Tj ET",
      "endstream endobj",
      "xref",
      "0 5",
      "0000000000 65535 f ",
      "0000000009 00000 n ",
      "0000000058 00000 n ",
      "0000000115 00000 n ",
      "0000000202 00000 n ",
      "trailer << /Root 1 0 R /Size 5 >>",
      "startxref",
      "319",
      "%%EOF"
    ].join("\n")
  );

  const { error } = await supabase.storage.from("solution-materials").upload("demo/linear-equations-solution.pdf", pdf, {
    contentType: "application/pdf",
    upsert: true
  });
  if (error) throw error;
  console.log("Uploaded demo solution material file");
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

const credentials = [];

await client.connect();
try {
  const migrationDir = join(process.cwd(), "supabase", "migrations");
  const migrations = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migration of migrations) {
    await applySqlFile(client, join(migrationDir, migration));
    console.log(`Applied ${migration}`);
  }

  const student = await getOrCreateAuthUser(supabase, "student@example.com", "Demo Student", credentials);
  const admin = await getOrCreateAuthUser(supabase, "admin@example.com", "Demo Admin", credentials);

  await seedPublicData(client, { studentId: student.id, adminId: admin.id });
  console.log("Seeded public data");
  await uploadDemoMaterial(supabase);

  if (credentials.length > 0) {
    mkdirSync(".supabase", { recursive: true });
    const credentialText = [
      "Temporary live seed credentials. Change these passwords immediately after first login.",
      "",
      ...credentials.map((item) => `${item.email} ${item.password}`)
    ].join("\n");
    writeFileSync(join(".supabase", "seed-users.local.txt"), `${credentialText}\n`, { mode: 0o600 });
    console.log("Created missing auth users. Temporary passwords saved to .supabase/seed-users.local.txt");
  } else {
    console.log("Reused existing auth users. Passwords unchanged.");
  }

  console.log(JSON.stringify(await verify(client), null, 2));
} finally {
  await client.end();
}
