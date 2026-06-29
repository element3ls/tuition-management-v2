import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

const organizationId = "01000000-0000-4000-8000-000000000001";

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

const credentialsPath = optionValue("credentials-file", process.env.UAT_CREDENTIALS_FILE ?? ".supabase/uat-users.local.json");

loadEnvFile(optionValue("env-file", process.env.SUPABASE_ENV_FILE ?? ".env.local"));

const credentials = JSON.parse(readFileSync(credentialsPath, "utf8"));
const client = new pg.Client({
  connectionString: requiredEnv("SUPABASE_DB_URL"),
  ssl: { rejectUnauthorized: false }
});

await client.connect();
try {
  const { rows } = await client.query(
    `
    select p.id, p.email, r.name as role, om.role as tenant_role, om.status as tenant_status
    from public.profiles p
    left join public.user_roles ur on ur.user_id = p.id
    left join public.roles r on r.id = ur.role_id
    left join public.organization_memberships om on om.user_id = p.id and om.organization_id = $3
    where p.email in ($1, $2)
    order by p.email, r.name;
  `,
    [credentials.studentEmail, credentials.adminEmail, organizationId]
  );
  const missingTenantMemberships = [credentials.studentEmail, credentials.adminEmail].filter(
    (email) => !rows.some((row) => row.email === email && row.tenant_status === "active")
  );
  if (missingTenantMemberships.length > 0) {
    throw new Error(`Missing active tenant membership for ${missingTenantMemberships.join(", ")}.`);
  }
  console.log(JSON.stringify(rows, null, 2));
} finally {
  await client.end();
}
