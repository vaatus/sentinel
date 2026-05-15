import chalk from "chalk";
import ora from "ora";
import { resolve } from "node:path";
import { FindingsStore, computeScore } from "../orchestrator/findingsStore.js";
import { discoverFiles, runAudit, runPhiTrace } from "../orchestrator/bobRunner.js";
import { buildAuditPrompt, buildTracePrompt } from "../orchestrator/promptBuilder.js";
import type { Framework, Finding, Severity } from "../types.js";

export interface ScanOptions {
  framework: Framework;
  path: string;
  storeDir?: string;
  json?: boolean;
}

function makeFindingId(scanRunId: string, framework: Framework, control: string, file: string, line: number, idx: number): string {
  const runShort = scanRunId.replace(/[^a-z0-9]/gi, "").slice(-8);
  const slug = `${runShort}-${framework}-${control}-${file.replace(/[^a-z0-9]/gi, "_")}-${line}-${idx}`
    .toLowerCase()
    .slice(0, 120);
  return slug;
}

export async function runScan(opts: ScanOptions): Promise<void> {
  const target = resolve(opts.path);
  const storeDir = opts.storeDir ? resolve(opts.storeDir) : target;
  const store = new FindingsStore(storeDir);

  if (!opts.json) {
    console.log();
    console.log(chalk.bold.cyan("  ┌──────────────────────────────────────────────┐"));
    console.log(chalk.bold.cyan("  │") + chalk.bold.white("   SENTINEL — Compliance Engineering Copilot  ") + chalk.bold.cyan("│"));
    console.log(chalk.bold.cyan("  │") + chalk.dim("           powered by IBM Bob                 ") + chalk.bold.cyan("│"));
    console.log(chalk.bold.cyan("  └──────────────────────────────────────────────┘"));
    console.log();
    console.log(chalk.dim(`  Target:    `) + target);
    console.log(chalk.dim(`  Framework: `) + opts.framework.toUpperCase());
    console.log();
  }

  const scanRun = store.createScanRun(opts.framework, target);
  const discoverSpin = opts.json ? null : ora("Discovering files…").start();
  const files = await discoverFiles(target);
  discoverSpin?.succeed(`Discovered ${chalk.bold(files.length)} files`);

  const auditSpin = opts.json
    ? null
    : ora(`Invoking IBM Bob (${opts.framework}-auditor mode)…`).start();

  const auditPrompt = buildAuditPrompt(opts.framework, files);
  const audit = await runAudit({
    framework: opts.framework,
    cwd: target,
    files,
    prompt: auditPrompt,
  });

  auditSpin?.succeed(
    `Bob (${opts.framework}-auditor, ${audit.source}) returned ${chalk.bold(audit.json.findings.length)} findings across ${audit.json.scanned_files} files`,
  );

  const findings: Finding[] = audit.json.findings.map((f, i) => ({
    id: makeFindingId(scanRun.id, opts.framework, f.control, f.file, f.line_start, i),
    framework: opts.framework,
    control: f.control,
    control_name: f.control_name,
    file: f.file,
    line_start: f.line_start,
    line_end: f.line_end,
    code_snippet: f.code_snippet,
    severity: f.severity,
    explanation: f.explanation,
    remediation_hint: f.remediation_hint,
    status: "open",
    bob_session_id: audit.bobSessionId,
    created_at: new Date().toISOString(),
  }));

  store.insertFindings(scanRun.id, opts.framework, findings);

  let flowCount = 0;
  if (opts.framework === "hipaa") {
    const traceSpin = opts.json ? null : ora("Tracing PHI data flow (phi-tracer mode)…").start();
    const tracePrompt = buildTracePrompt(files);
    const trace = await runPhiTrace({ cwd: target, files, prompt: tracePrompt });
    store.insertDataFlows(scanRun.id, trace.json.flows);
    flowCount = trace.json.flows.length;
    traceSpin?.succeed(`Bob (phi-tracer, ${trace.source}) mapped ${chalk.bold(flowCount)} PHI flows`);
  }

  const score = computeScore(findings);
  store.finalizeScanRun(scanRun.id, {
    totalFiles: audit.json.scanned_files,
    findingCount: findings.length,
    score,
  });
  const exportPath = store.exportToJson();
  store.close();

  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        {
          scan_id: scanRun.id,
          framework: opts.framework,
          score,
          findings,
          flow_count: flowCount,
          summary: audit.json.summary,
          export: exportPath,
          bob_session_id: audit.bobSessionId,
          source: audit.source,
        },
        null,
        2,
      ),
    );
    process.stdout.write("\n");
    return;
  }

  printSummary({ framework: opts.framework, findings, score, flowCount, exportPath, source: audit.source });
}

function printSummary(args: {
  framework: Framework;
  findings: Finding[];
  score: number;
  flowCount: number;
  exportPath: string;
  source: "live" | "mock";
}) {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of args.findings) counts[f.severity]++;

  console.log();
  console.log(chalk.bold(`  ── Scan complete ───────────────────────────────`));
  console.log();

  const scoreColor = args.score >= 85 ? chalk.green : args.score >= 60 ? chalk.yellow : chalk.red;
  const verdict = args.score >= 85 ? "✓ AUDIT READY" : args.score >= 60 ? "⚠ NEEDS WORK" : "✗ NOT AUDITABLE";
  console.log(`  Compliance Score:  ` + scoreColor.bold(`${args.score} / 100`) + `  ${scoreColor(verdict)}`);
  console.log();
  console.log(`  Findings:`);
  console.log(`    ` + chalk.red.bold(`critical  ${counts.critical}`));
  console.log(`    ` + chalk.magenta.bold(`high      ${counts.high}`));
  console.log(`    ` + chalk.yellow.bold(`medium    ${counts.medium}`));
  console.log(`    ` + chalk.dim(`low       ${counts.low}`));
  if (args.framework === "hipaa") {
    console.log();
    console.log(`  PHI data flows:    ${chalk.bold(args.flowCount)}`);
  }
  console.log();
  console.log(chalk.dim(`  Bob source:        `) + (args.source === "live" ? chalk.green("live") : chalk.yellow("mock (set BOB_LIVE=1 with bob installed)")));
  console.log(chalk.dim(`  Findings exported: `) + args.exportPath);
  console.log();
  console.log(chalk.bold(`  Next:`));
  console.log(`    ${chalk.cyan("sentinel dashboard")}        open the web dashboard`);
  console.log(`    ${chalk.cyan("sentinel remediate --all")}  auto-fix every finding via Bob`);
  console.log();
}
