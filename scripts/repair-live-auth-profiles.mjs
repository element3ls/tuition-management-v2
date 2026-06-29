import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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

function fullNameFor(authUser) {
  const metadata = authUser.raw_user_meta_data ?? {};
  const candidate =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";
  if (candidate.trim()) return candidate.trim();
  return authUser.email?.split("@")[0] || "Live Auth User";
}

loadEnvFile(".env.local");

const dryRun = process.argv.includes("--dry-run");
const dbUrl = requiredEnv("SUPABASE_DB_URL");
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
try {
  const { rows: orphanedUsers } = await client.query(`
    select
      auth_user.id,
      auth_user.email,
      auth_user.raw_user_meta_data,
      auth_user.created_at
    from auth.users auth_user
    left join public.profiles profile on profile.id = auth_user.id
    where profile.id is null
    order by auth_user.created_at asc;
  `);

  if (orphanedUsers.length === 0) {
    console.log("No Supabase Auth users are missing public.profiles rows.");
    process.exit(0);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        orphanedUsers: orphanedUsers.map((user) => ({
          id: user.id,
          email: user.email,
          full_name: fullNameFor(user),
          created_at: user.created_at
        }))
      },
      null,
      2
    )
  );

  if (dryRun) {
    process.exit(0);
  }

  for (const user of orphanedUsers) {
    if (!user.email) {
      throw new Error(`Auth user ${user.id} has no email; refusing to create a profile.`);
    }

    await client.query(
      `
      insert into public.profiles (id, email, full_name, is_active, must_change_password, created_at, updated_at)
      values ($1, $2, $3, true, false, coalesce($4::timestamptz, now()), now())
      on conflict (id) do update
      set email = excluded.email,
          full_name = excluded.full_name,
          is_active = true,
          updated_at = now();
    `,
      [user.id, user.email, fullNameFor(user), user.created_at]
    );
  }

  const { rows: integrityRows } = await client.query(`
    select count(*)::int as auth_users_without_profiles
    from auth.users auth_user
    left join public.profiles profile on profile.id = auth_user.id
    where profile.id is null;
  `);

  console.log(
    JSON.stringify(
      {
        repairedProfiles: orphanedUsers.length,
        integrity: integrityRows[0]
      },
      null,
      2
    )
  );
} finally {
  await client.end();
}
