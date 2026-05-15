import chalk from "chalk";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

export interface InitOptions {
  path: string;
}

const CONFIG_TEMPLATE = `{
  "framework": "hipaa",
  "scan": {
    "include": ["src/**/*.{ts,tsx,js,jsx}", "routes/**/*", "db/**/*"],
    "exclude": ["node_modules/**", "dist/**", "build/**", ".next/**"]
  },
  "remediation": {
    "branch_prefix": "sentinel/fix-",
    "auto_apply": false
  }
}
`;

export async function runInit(opts: InitOptions): Promise<void> {
  const target = resolve(opts.path);
  const sentinelDir = join(target, ".sentinel");
  mkdirSync(sentinelDir, { recursive: true });
  const cfg = join(sentinelDir, "sentinel.config.json");
  if (!existsSync(cfg)) {
    writeFileSync(cfg, CONFIG_TEMPLATE);
  }
  console.log();
  console.log(chalk.green("✓ Sentinel initialized at ") + sentinelDir);
  console.log(chalk.dim(`  Config:  ${cfg}`));
  console.log();
  console.log(chalk.bold("Next:"));
  console.log(`  ${chalk.cyan("sentinel scan --framework hipaa")}`);
  console.log();
}
