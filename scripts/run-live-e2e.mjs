import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function optionValue(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

const credentialPath = optionValue("credentials-file", process.env.UAT_CREDENTIALS_FILE ?? ".supabase/uat-users.local.json");
if (!existsSync(credentialPath)) {
  throw new Error(`Missing ${credentialPath}. Run npm run db:create-uat-users first.`);
}

const credentials = JSON.parse(readFileSync(credentialPath, "utf8"));
const baseUrl = optionValue("base-url", process.env.PLAYWRIGHT_BASE_URL ?? "https://tuition-management-v2.vercel.app");
const result = spawnSync("node", ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.config.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseUrl,
    E2E_STUDENT_EMAIL: credentials.studentEmail,
    E2E_ADMIN_EMAIL: credentials.adminEmail,
    E2E_PASSWORD: credentials.password
  }
});

process.exit(result.status ?? 1);
