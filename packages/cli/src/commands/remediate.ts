import chalk from "chalk";
import ora from "ora";
import { resolve } from "node:path";
import { simpleGit } from "simple-git";
import { FindingsStore } from "../orchestrator/findingsStore.js";
import { runRemediation, runAudit } from "../orchestrator/bobRunner.js";
import { buildRemediationPrompt, buildAuditPrompt } from "../orchestrator/promptBuilder.js";
import { openLocalPr } from "../git/prGenerator.js";
import type { Finding, VerificationResult, VerificationStatus, RemediationResult } from "../types.js";

export interface RemediateOptions {
  path: string;
  findingId?: string;
  all?: boolean;
  apply?: boolean;
  json?: boolean;
}

async function verifyRemediation(args: {
  repoRoot: string;
  branch: string;
  finding: Finding;
  patchedFiles: string[];
}): Promise<VerificationResult> {
  const git = simpleGit(args.repoRoot);
  const isRepo = await git.checkIsRepo().catch(() => false);
  
  if (!isRepo) {
    // Can't verify without git - assume neutral
    return {
      status: "neutral",
      new_findings: [],
      original_finding_present: false,
      new_high_severity_count: 0,
    };
  }

  try {
    // Get current branch to restore later
    const status = await git.status();
    const currentBranch = status.current ?? "main";
    
    // Checkout the fix branch
    await git.checkout(args.branch);
    
    // Re-run audit on just the patched files
    const auditPrompt = buildAuditPrompt(args.finding.framework, args.patchedFiles);
    const audit = await runAudit({
      framework: args.finding.framework,
      cwd: args.repoRoot,
      files: args.patchedFiles,
      prompt: auditPrompt,
    });
    
    // Restore original branch
    await git.checkout(currentBranch);
    
    // Analyze the new findings
    const newFindings = audit.json.findings;
    
    // Check if original finding is still present
    const originalStillPresent = newFindings.some(
      (f) =>
        f.control === args.finding.control &&
        f.file === args.finding.file &&
        Math.abs(f.line_start - args.finding.line_start) <= 5 // Allow small line shifts
    );
    
    // Count new high-severity findings (critical or high)
    const newHighSeverityCount = newFindings.filter(
      (f) => f.severity === "critical" || f.severity === "high"
    ).length;
    
    // Determine verification status
    let verificationStatus: VerificationStatus;
    if (originalStillPresent) {
      verificationStatus = "regression";
    } else if (newHighSeverityCount > 0) {
      verificationStatus = "partial";
    } else if (newFindings.length === 0) {
      verificationStatus = "verified-resolved";
    } else {
      verificationStatus = "neutral";
    }
    
    return {
      status: verificationStatus,
      new_findings: newFindings,
      original_finding_present: originalStillPresent,
      new_high_severity_count: newHighSeverityCount,
    };
  } catch (error) {
    // If verification fails, return neutral status
    return {
      status: "neutral",
      new_findings: [],
      original_finding_present: false,
      new_high_severity_count: 0,
    };
  }
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

  const results: RemediationResult[] = [];
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

      // Run verification if we successfully created a branch
      let verification: VerificationResult | undefined;
      if (pr.status === "applied" && pr.filesChanged.length > 0) {
        if (spin) {
          spin.text = `${f.severity.padEnd(8)} ${f.control}  ${f.file}:${f.line_start} - verifying fix...`;
        }
        verification = await verifyRemediation({
          repoRoot: target,
          branch: pr.branch,
          finding: f,
          patchedFiles: pr.filesChanged,
        });
      }

      store.insertRemediation({
        findingId: f.id,
        branch: pr.branch,
        diff: rem.json.diff,
        blastRadius: rem.json.blast_radius,
        rationale: rem.json.rationale,
        status: pr.status,
        verification,
      });

      results.push({
        finding_id: f.id,
        branch: pr.branch,
        files_changed: pr.filesChanged,
        status: pr.status,
        verification,
      });

      // Format status message with appropriate color
      let statusMsg = "";
      if (pr.status === "applied") {
        statusMsg = chalk.green("PR created");
      } else if (pr.status === "applied:working-tree-only") {
        statusMsg = chalk.green("Applied to working tree");
      } else if (pr.status === "skipped:dirty-tree") {
        statusMsg = chalk.yellow("⚠ Skipped (dirty tree) - patch saved");
      } else if (pr.status === "skipped:not-a-repo") {
        statusMsg = chalk.yellow("⚠ Skipped (not a repo) - patch saved");
      }

      // Add verification badge
      let verifyBadge = "";
      if (verification) {
        if (verification.status === "verified-resolved") {
          verifyBadge = chalk.green(" ✓ verified");
        } else if (verification.status === "partial") {
          verifyBadge = chalk.yellow(` ⚠ partial (${verification.new_high_severity_count} new high-severity)`);
        } else if (verification.status === "regression") {
          verifyBadge = chalk.red(" ✗ regression");
        } else {
          verifyBadge = chalk.dim(" • neutral");
        }
      }

      spin?.succeed(
        `${statusMsg}  ${pr.branch}${verifyBadge}  ${chalk.dim(`(blast radius: ${rem.json.blast_radius.length} files)`)}`,
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
