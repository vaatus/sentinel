#!/usr/bin/env node
import { Command } from "commander";
import { runScan } from "./commands/scan.js";
import { runRemediate } from "./commands/remediate.js";
import { runDashboard } from "./commands/dashboard.js";
import { runInit } from "./commands/init.js";
import { runWatch } from "./commands/watch.js";
import type { Framework } from "./types.js";

const program = new Command();

program
  .name("sentinel")
  .description("Compliance Engineering Copilot — powered by IBM Bob")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan a repository against a compliance framework")
  .option("-f, --framework <framework>", "hipaa | soc2 | pci | gdpr", "hipaa")
  .option("-p, --path <path>", "target repo path", process.cwd())
  .option("--json", "output JSON only (no pretty progress)", false)
  .action(async (opts) => {
    const framework = opts.framework as Framework;
    if (!["hipaa", "soc2", "pci", "gdpr"].includes(framework)) {
      console.error(`Unknown framework: ${framework}`);
      process.exit(1);
    }
    await runScan({ framework, path: opts.path, json: opts.json });
  });

program
  .command("remediate")
  .description("Generate remediation PRs for findings via Bob")
  .option("-p, --path <path>", "target repo path", process.cwd())
  .option("-i, --finding-id <id>", "specific finding ID")
  .option("--all", "remediate every open finding", false)
  .option("--apply", "also apply fixes to the working tree (not just on branches)", false)
  .option("--json", "output JSON only", false)
  .action(async (opts) => {
    await runRemediate({
      path: opts.path,
      findingId: opts.findingId,
      all: opts.all,
      apply: opts.apply,
      json: opts.json,
    });
  });

program
  .command("dashboard")
  .description("Launch the Sentinel web dashboard")
  .option("-p, --path <path>", "target repo path", process.cwd())
  .option("--port <port>", "dashboard port", "3000")
  .action(async (opts) => {
    await runDashboard({ path: opts.path, port: parseInt(opts.port, 10) });
  });

program
  .command("init")
  .description("Initialize Sentinel config in a repository")
  .option("-p, --path <path>", "target repo path", process.cwd())
  .action(async (opts) => {
    await runInit({ path: opts.path });
  });

program
  .command("watch")
  .description("Scan only changed files in a git diff (agentic CI mode)")
  .option("-f, --framework <framework>", "hipaa | soc2 | pci | gdpr", "hipaa")
  .option("-p, --path <path>", "target repo path", process.cwd())
  .option("-b, --base <ref>", "git ref to diff against", "origin/main")
  .option("--format <format>", "json | github-actions | markdown", "json")
  .action(async (opts) => {
    const framework = opts.framework as Framework;
    if (!["hipaa", "soc2", "pci", "gdpr"].includes(framework)) {
      console.error(`Unknown framework: ${framework}`);
      process.exit(1);
    }
    const format = opts.format as "json" | "github-actions" | "markdown";
    if (!["json", "github-actions", "markdown"].includes(format)) {
      console.error(`Unknown format: ${format}`);
      process.exit(1);
    }
    await runWatch({ framework, path: opts.path, base: opts.base, format });
  });

program.parseAsync(process.argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
