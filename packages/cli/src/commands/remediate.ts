import chalk from "chalk";
import ora from "ora";
import { resolve } from "node:path";
import { FindingsStore } from "../orchestrator/findingsStore.js";
import { runRemediation } from "../orchestrator/bobRunner.js";
import { buildRemediationPrompt } from "../orchestrator/promptBuilder.js";
import { openLocalPr } from "../git/prGenerator.js";

export interface RemediateOptions {
  path: string;
  findingId?: string;
  all?: boolean;
  apply?: boolean;
  json?: boolean;
}

export async function runRemediate(opts: RemediateOptions): Promise<void> {
  const target = resolve(opts.path);
  const store = new FindingsStore(target);

  const scanRun = store.latestScanRun();
  if (!scanRun) {
    console.error(chalk.red("No scan run found. Run `sentinel scan` first."));
    store.close();
    process.exit(1);
  }

  const targets = opts.all
    ? store.findingsForRun(scanRun.id).filter((f) => f.status === "open")
    : opts.findingId
    ? [store.findingById(opts.findingId)].filter(Boolean) as ReturnType<FindingsStore["findingById"]>[]
    : [];

  if (targets.length === 0) {
    console.error(chalk.red("No matching findings to remediate."));
    store.close();
    process.exit(1);
  }

  if (!opts.json) {
    console.log();
    console.log(chalk.bold.cyan(`Bob is opening remediation PRs for ${targets.length} finding(s)…`));
    console.log();
  }

  const results: any[] = [];
  for (const f of targets) {
    if (!f) continue;
    const spin = opts.json ? null : ora(`${f.severity.padEnd(8)} ${f.control}  ${f.file}:${f.line_start}`).start();
    const prompt = buildRemediationPrompt(f.id, {
      control: f.control,
      file: f.file,
      line_start: f.line_start,
      code_snippet: f.code_snippet,
      explanation: f.explanation,
    });

    try {
      const rem = await runRemediation({
        cwd: target,
        findingId: f.id,
        finding: f,
        prompt,
      });

      const pr = await openLocalPr({
        repoRoot: target,
        finding: f,
        remediation: rem.json,
        applyToWorkingTree: opts.apply,
      });

      store.insertRemediation({
        findingId: f.id,
        branch: pr.branch,
        diff: rem.json.diff,
        blastRadius: rem.json.blast_radius,
        rationale: rem.json.rationale,
      });

      results.push({ finding_id: f.id, branch: pr.branch, files_changed: pr.filesChanged });
      spin?.succeed(
        `${chalk.green("PR")}  ${pr.branch}  ${chalk.dim(`(blast radius: ${rem.json.blast_radius.length} files)`)}`,
      );
    } catch (e: any) {
      spin?.fail(`failed: ${e.message}`);
    }
  }

  store.exportToJson();
  store.close();

  if (opts.json) {
    process.stdout.write(JSON.stringify({ remediated: results.length, prs: results }, null, 2));
    process.stdout.write("\n");
    return;
  }

  console.log();
  console.log(chalk.green.bold(`✓ Opened ${results.length} remediation branches.`));
  console.log(chalk.dim(`  Re-run \`sentinel scan\` to verify the score improvement.`));
  console.log();
}
