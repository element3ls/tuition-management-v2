import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const studentEmail = "uat-student@example.com";
const adminEmail = "uat-admin@example.com";

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

function password() {
  return `Tms-UAT-${crypto.randomBytes(12).toString("base64url")}!9a`;
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

async function upsertUser(supabase, email, fullName, sharedPassword) {
  const existing = await findUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: sharedPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (error || !data.user) throw error ?? new Error(`Could not update ${email}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: sharedPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (error || !data.user) throw error ?? new Error(`Could not create ${email}`);
  return data.user;
}

async function roleId(client, name) {
  const { rows } = await client.query("select id from public.roles where name = $1", [name]);
  if (!rows[0]?.id) throw new Error(`Missing role ${name}`);
  return rows[0].id;
}

loadEnvFile(".env.local");

const dbUrl = requiredEnv("SUPABASE_DB_URL");
const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const sharedPassword = password();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
try {
  const student = await upsertUser(supabase, studentEmail, "UAT Student", sharedPassword);
  const admin = await upsertUser(supabase, adminEmail, "UAT Admin", sharedPassword);
  const studentRoleId = await roleId(client, "student");
  const adminRoleId = await roleId(client, "super_admin");

  await client.query(
    `
    insert into public.profiles (id, email, full_name, is_active)
    values ($1, $2, 'UAT Student', true), ($3, $4, 'UAT Admin', true)
    on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        is_active = true;
  `,
    [student.id, studentEmail, admin.id, adminEmail]
  );

  await client.query(
    `
    insert into public.student_profiles (user_id, guardian_name, phone, notes)
    values ($1, 'UAT Guardian', '+60000000000', 'Automated deployed UAT student.')
    on conflict (user_id) do update
    set guardian_name = excluded.guardian_name,
        phone = excluded.phone,
        notes = excluded.notes;
  `,
    [student.id]
  );

  await client.query(
    `
    insert into public.user_roles (user_id, role_id)
    values ($1, $2), ($3, $4)
    on conflict do nothing;
  `,
    [student.id, studentRoleId, admin.id, adminRoleId]
  );

  await client.query(
    `
    insert into public.student_group_memberships (student_id, group_id, status, starts_at, expires_at)
    values ($1, '10000000-0000-4000-8000-000000000001', 'active', now() - interval '1 day', null)
    on conflict (student_id, group_id) do update
    set status = 'active',
        starts_at = excluded.starts_at,
        expires_at = null;
  `,
    [student.id]
  );

  mkdirSync(".supabase", { recursive: true });
  writeFileSync(
    join(".supabase", "uat-users.local.json"),
    `${JSON.stringify({ studentEmail, adminEmail, password: sharedPassword }, null, 2)}\n`,
    { mode: 0o600 }
  );

  console.log("Created/updated UAT auth users and wrote credentials to .supabase/uat-users.local.json");
} finally {
  await client.end();
}
