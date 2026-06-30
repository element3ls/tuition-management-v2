import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const targets = new Set(["local", "staging", "production"]);
const args = process.argv.slice(2);
const originalEnv = { ...process.env };

function usage() {
  console.log(`Usage: node scripts/check-release-readiness.mjs [local|staging|production] [--env-file=.env.staging.local] [--skip-commands]

Runs the local release gate:
- npm run db:check
- npm run lint
- npm test
- npm run build

For staging/production, validates the env file shape before running checks.`);
}

function optionValue(name, fallback) {
  const prefix = `--${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return false;
  }

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

  return true;
}

function validateUrl(name, target) {
  const raw = process.env[name];
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  if (target !== "local" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error(`${name} must not point to localhost for ${target}.`);
  }
}

function validateReleaseEnv(target) {
  if (target === "local") return;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_DB_URL",
    "OPENAI_API_KEY",
    "OPENAI_WEBHOOK_SECRET",
    "PLAYWRIGHT_BASE_URL"
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required ${target} env var(s): ${missing.join(", ")}.`);
  }

  validateUrl("NEXT_PUBLIC_SUPABASE_URL", target);
  validateUrl("PLAYWRIGHT_BASE_URL", target);
}

function run(command, commandArgs) {
  const isWindows = process.platform === "win32";
  const result = spawnSync(isWindows ? `${command} ${commandArgs.join(" ")}` : command, isWindows ? [] : commandArgs, {
    cwd: process.cwd(),
    env: commandArgs[0] === "test" ? originalEnv : process.env,
    stdio: "inherit",
    shell: isWindows
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${result.status}.`);
  }
}

let target = "local";
for (const arg of args) {
  if (arg === "--help" || arg === "-h") {
    usage();
    process.exit(0);
  }
  if (arg.startsWith("--")) continue;
  if (!targets.has(arg)) throw new Error(`Unknown release target "${arg}".`);
  target = arg;
}

const envFile = optionValue("env-file", target === "local" ? ".env.local" : `.env.${target}.local`);
const skipCommands = args.includes("--skip-commands");
const envLoaded = loadEnvFile(envFile);
validateReleaseEnv(target);

console.log(`Release target: ${target}`);
console.log(`Env file: ${envFile}${envLoaded ? "" : " (not found, using current process env)"}`);

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const checks = [
  ["run", "db:check"],
  ["run", "lint"],
  ["test"],
  ["run", "build"]
];

if (skipCommands) {
  console.log("Skipped command checks.");
} else {
  for (const check of checks) {
    run(npm, check);
  }
}

if (target === "local") {
  console.log("Local release gate passed. Use staging or production target for deploy env validation.");
} else {
  const credentialsFile = `.supabase/uat-users.${target}.local.json`;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  console.log(`Release gate passed for ${target}. Next explicit steps:`);
  console.log(`npm run db:live -- --env-file=${envFile}`);
  console.log(`npm run db:verify-live -- --env-file=${envFile}`);
  console.log(`npm run db:create-uat-users -- --env-file=${envFile} --credentials-file=${credentialsFile}`);
  console.log(`npm run db:verify-uat-users -- --env-file=${envFile} --credentials-file=${credentialsFile}`);
  console.log(`npm run test:e2e:live -- --base-url=${baseUrl} --credentials-file=${credentialsFile}`);
}
