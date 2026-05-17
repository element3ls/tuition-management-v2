import { spawn, spawnSync } from "node:child_process";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isWindows = process.platform === "win32";

async function waitForServer(timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function isServerAlreadyRunning() {
  try {
    const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

function stopProcessTree(child) {
  if (!child || child.killed) return;
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", timeout: 10000 });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

const externalServer = await isServerAlreadyRunning();
const devServer = externalServer
  ? null
  : spawn("node", ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1"], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
      detached: !isWindows
    });

let exitCode = 1;

try {
  await waitForServer();
  const result = spawnSync("node", ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.config.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl }
  });
  exitCode = result.status ?? 1;
} finally {
  if (!externalServer) stopProcessTree(devServer);
}

process.exit(exitCode);
