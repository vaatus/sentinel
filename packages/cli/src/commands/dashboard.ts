import chalk from "chalk";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DashboardOptions {
  path: string;
  port: number;
}

export async function runDashboard(opts: DashboardOptions): Promise<void> {
  const target = resolve(opts.path);
  const dashboardDir = locateDashboard();
  if (!dashboardDir) {
    console.error(chalk.red("Dashboard package not found. Run `npm install` at the repo root."));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold.cyan("Starting Sentinel dashboard…"));
  console.log(chalk.dim(`  Findings source: ${join(target, ".sentinel/findings.json")}`));
  console.log(chalk.dim(`  Dashboard root:  ${dashboardDir}`));
  console.log();

  const proc = spawn("npm", ["run", "dev", "--", "-p", String(opts.port)], {
    cwd: dashboardDir,
    stdio: "inherit",
    env: {
      ...process.env,
      SENTINEL_TARGET: target,
      PORT: String(opts.port),
    },
  });

  proc.on("close", (code) => process.exit(code ?? 0));
}

function locateDashboard(): string | null {
  const candidates = [
    resolve(__dirname, "../../../dashboard"),
    resolve(__dirname, "../../../../packages/dashboard"),
    resolve(process.cwd(), "packages/dashboard"),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, "package.json"))) return c;
  }
  return null;
}
