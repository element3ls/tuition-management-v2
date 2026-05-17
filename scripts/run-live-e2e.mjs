import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const credentialPath = ".supabase/uat-users.local.json";
if (!existsSync(credentialPath)) {
  throw new Error("Missing .supabase/uat-users.local.json. Run npm run db:create-uat-users first.");
}

const credentials = JSON.parse(readFileSync(credentialPath, "utf8"));
const result = spawnSync("node", ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.config.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL ?? "https://tuition-management-v2.vercel.app",
    E2E_STUDENT_EMAIL: credentials.studentEmail,
    E2E_ADMIN_EMAIL: credentials.adminEmail,
    E2E_PASSWORD: credentials.password
  }
});

process.exit(result.status ?? 1);
