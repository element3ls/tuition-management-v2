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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");

const credentials = JSON.parse(readFileSync(".supabase/uat-users.local.json", "utf8"));
const client = new pg.Client({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
try {
  const { rows } = await client.query(
    `
    select p.id, p.email, r.name as role
    from public.profiles p
    left join public.user_roles ur on ur.user_id = p.id
    left join public.roles r on r.id = ur.role_id
    where p.email in ($1, $2)
    order by p.email, r.name;
  `,
    [credentials.studentEmail, credentials.adminEmail]
  );
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await client.end();
}
