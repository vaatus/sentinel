import chalk from "chalk";
import { checkbox, select, confirm } from "@inquirer/prompts";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface InitOptions {
  path: string;
}

type Framework = "hipaa" | "soc2" | "pci" | "gdpr";
type BlockerLevel = "critical" | "high";

interface InitAnswers {
  frameworks: Framework[];
  blockerLevel: BlockerLevel;
  installWorkflow: boolean;
}

/**
 * Show a diff preview of what would change if we overwrite an existing file
 */
function showDiff(existingContent: string, newContent: string, filepath: string): void {
  console.log();
  console.log(chalk.yellow(`⚠ ${filepath} already exists`));
  console.log(chalk.dim("Current content:"));
  console.log(chalk.dim(existingContent.split("\n").slice(0, 10).join("\n")));
  if (existingContent.split("\n").length > 10) {
    console.log(chalk.dim(`... (${existingContent.split("\n").length - 10} more lines)`));
  }
  console.log();
  console.log(chalk.dim("New content:"));
  console.log(chalk.green(newContent.split("\n").slice(0, 10).join("\n")));
  if (newContent.split("\n").length > 10) {
    console.log(chalk.green(`... (${newContent.split("\n").length - 10} more lines)`));
  }
  console.log();
}

/**
 * Idempotently write a file, prompting before overwriting if it exists
 */
async function writeFileIdempotent(
  filepath: string,
  content: string,
  description: string
): Promise<boolean> {
  if (existsSync(filepath)) {
    const existing = readFileSync(filepath, "utf-8");
    if (existing === content) {
      console.log(chalk.dim(`  ✓ ${description} (unchanged)`));
      return false;
    }
    showDiff(existing, content, filepath);
    const shouldOverwrite = await confirm({
      message: `Overwrite ${filepath}?`,
      default: false,
    });
    if (!shouldOverwrite) {
      console.log(chalk.dim(`  ⊘ ${description} (skipped)`));
      return false;
    }
  }
  
  mkdirSync(join(filepath, ".."), { recursive: true });
  writeFileSync(filepath, content, "utf-8");
  console.log(chalk.green(`  ✓ ${description}`));
  return true;
}

/**
 * Generate .sentinel/config.json content
 */
function generateSentinelConfig(answers: InitAnswers): string {
  return JSON.stringify(
    {
      frameworks: answers.frameworks,
      blockerLevel: answers.blockerLevel,
      scan: {
        include: ["src/**/*.{ts,tsx,js,jsx}", "routes/**/*", "db/**/*"],
        exclude: ["node_modules/**", "dist/**", "build/**", ".next/**"],
      },
      remediation: {
        branch_prefix: "sentinel/fix-",
        auto_apply: false,
      },
    },
    null,
    2
  );
}

/**
 * Generate .github/workflows/sentinel-pr-check.yml content
 */
function generateWorkflowContent(answers: InitAnswers): string {
  const primaryFramework = answers.frameworks[0] || "hipaa";
  return `name: Sentinel PR check

# Agentic compliance gate. On every pull request:
#   1. Scan the changed files against the framework declared in
#      \`.sentinel/config.json\` (defaults to ${primaryFramework}).
#   2. Post the findings as a sticky PR comment (created once, updated
#      on every push — never duplicated).
#   3. Fail the check (= block the merge) if there are any
#      ${answers.blockerLevel}-severity findings.
#
# Tuning knobs (override in repo Settings → Secrets and variables):
#   COMPLIANCE_FRAMEWORK         hipaa | soc2 | pci | gdpr   (default: ${primaryFramework})
#   COMPLIANCE_BLOCKER_LEVEL     critical | high             (default: ${answers.blockerLevel})

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  sentinel-scan:
    runs-on: ubuntu-latest
    timeout-minutes: 8
    env:
      COMPLIANCE_FRAMEWORK: \${{ vars.COMPLIANCE_FRAMEWORK || '${primaryFramework}' }}
      COMPLIANCE_BLOCKER_LEVEL: \${{ vars.COMPLIANCE_BLOCKER_LEVEL || '${answers.blockerLevel}' }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install + build Sentinel CLI
        run: |
          npm ci --silent
          npm run build --silent

      - name: Scan PR for compliance violations
        id: scan
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Run watch mode to scan only changed files in the PR diff.
          # The CLI auto-detects whether an ANTHROPIC_API_KEY is present
          # and falls back to mock mode if not, so this still produces
          # useful findings without any secret configured.
          node packages/cli/dist/index.js watch \\
            --framework "$COMPLIANCE_FRAMEWORK" \\
            --path . \\
            --base "origin/\${{ github.base_ref }}" \\
            --format json > sentinel-result.json

          echo "score=$(jq '.score' sentinel-result.json)" >> "$GITHUB_OUTPUT"
          echo "total=$(jq '.findings | length' sentinel-result.json)" >> "$GITHUB_OUTPUT"
          echo "critical=$(jq '[.findings[] | select(.severity == "critical")] | length' sentinel-result.json)" >> "$GITHUB_OUTPUT"
          echo "high=$(jq '[.findings[] | select(.severity == "high")] | length' sentinel-result.json)" >> "$GITHUB_OUTPUT"
          echo "medium=$(jq '[.findings[] | select(.severity == "medium")] | length' sentinel-result.json)" >> "$GITHUB_OUTPUT"
          echo "low=$(jq '[.findings[] | select(.severity == "low")] | length' sentinel-result.json)" >> "$GITHUB_OUTPUT"

      - name: Annotate PR diff with findings
        if: always()
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Emit GitHub Actions annotations for inline diff comments
          node packages/cli/dist/index.js watch \\
            --framework "$COMPLIANCE_FRAMEWORK" \\
            --path . \\
            --base "origin/\${{ github.base_ref }}" \\
            --format github-actions

      - name: Build PR comment body
        id: comment
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          # Use watch mode with markdown format to generate the PR comment
          node packages/cli/dist/index.js watch \\
            --framework "$COMPLIANCE_FRAMEWORK" \\
            --path . \\
            --base "origin/\${{ github.base_ref }}" \\
            --format markdown > comment.md
          
          # Smuggle the multi-line body through GITHUB_OUTPUT.
          {
            echo "body<<__SENTINEL_EOF__"
            cat comment.md
            echo "__SENTINEL_EOF__"
          } >> "$GITHUB_OUTPUT"

      - name: Post sticky PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const body = \`\${{ steps.comment.outputs.body }}\`;
            const marker = "<!-- sentinel-watch-comment -->";
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(c => c.body && c.body.includes(marker));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body,
              });
              core.info(\`Updated comment #\${existing.id}\`);
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
              core.info("Created new Sentinel comment");
            }

      - name: Fail check if blocking findings
        run: |
          if [ "\${{ steps.scan.outputs.critical }}" -gt 0 ]; then
            echo "::error::Sentinel found \${{ steps.scan.outputs.critical }} critical compliance violation(s) — blocking merge."
            exit 1
          fi
          if [ "$COMPLIANCE_BLOCKER_LEVEL" = "high" ] && [ "\${{ steps.scan.outputs.high }}" -gt 0 ]; then
            echo "::error::Sentinel found \${{ steps.scan.outputs.high }} high-severity compliance violation(s) — blocking merge (blocker level: high)."
            exit 1
          fi
          echo "✓ No blocking compliance findings."
`;
}

/**
 * Print next steps after successful initialization
 */
function printNextSteps(answers: InitAnswers): void {
  console.log();
  console.log(chalk.bold.green("✓ Sentinel initialized!"));
  console.log();
  console.log(chalk.bold("Next steps:"));
  console.log();
  console.log(chalk.cyan("  1. Commit the Sentinel configuration:"));
  console.log(chalk.dim("     git add . && git commit -m \"Add Sentinel compliance scanning\""));
  console.log();
  console.log(chalk.cyan("  2. (Optional) Set your Anthropic API key for live scans:"));
  console.log(chalk.dim("     gh secret set ANTHROPIC_API_KEY"));
  console.log(chalk.dim("     (Skip this — mock mode still works for demos)"));
  console.log();
  console.log(chalk.cyan("  3. Open a PR — Sentinel will scan it automatically"));
  console.log();
  console.log(chalk.cyan("  4. Run a local scan any time:"));
  console.log(chalk.dim(`     sentinel scan --framework ${answers.frameworks[0] || "hipaa"}`));
  console.log();
  console.log(chalk.cyan("  5. View findings in the dashboard:"));
  console.log(chalk.dim("     sentinel dashboard"));
  console.log();
}

/**
 * Interactive bootstrapper — drops all Sentinel artefacts into a target repo
 */
export async function runInit(opts: InitOptions): Promise<void> {
  const target = resolve(opts.path);
  
  console.log();
  console.log(chalk.bold("🛡️  Sentinel — Compliance-as-CI Bootstrapper"));
  console.log();
  console.log(chalk.dim(`Target: ${target}`));
  console.log();

  // Ask three questions with sensible defaults
  const frameworks = await checkbox<Framework>({
    message: "Which compliance frameworks do you need?",
    choices: [
      { name: "HIPAA (Healthcare)", value: "hipaa", checked: true },
      { name: "SOC 2 (Trust Services)", value: "soc2" },
      { name: "PCI-DSS (Payment Cards)", value: "pci" },
      { name: "GDPR (EU Privacy)", value: "gdpr" },
    ],
    required: true,
  });

  const blockerLevel = await select<BlockerLevel>({
    message: "What severity level should block PR merges?",
    choices: [
      { name: "Critical only (recommended)", value: "critical" },
      { name: "High and above (strict)", value: "high" },
    ],
    default: "critical",
  });

  const installWorkflow = await confirm({
    message: "Install the GitHub Actions PR-check workflow?",
    default: true,
  });

  const answers: InitAnswers = { frameworks, blockerLevel, installWorkflow };

  console.log();
  console.log(chalk.bold("Creating Sentinel artefacts..."));
  console.log();

  // 1. Copy .bob/custom_modes.yaml from repo root
  const bobModesSource = join(import.meta.dirname, "../../../../.bob/custom_modes.yaml");
  const bobModesTarget = join(target, ".bob/custom_modes.yaml");
  const bobModesContent = existsSync(bobModesSource)
    ? readFileSync(bobModesSource, "utf-8")
    : "# .bob/custom_modes.yaml not found in Sentinel repo\n";
  
  await writeFileIdempotent(
    bobModesTarget,
    bobModesContent,
    ".bob/custom_modes.yaml (Bob IDE skill pack)"
  );

  // 2. Create .sentinel/config.json
  const sentinelConfigPath = join(target, ".sentinel/config.json");
  const sentinelConfigContent = generateSentinelConfig(answers);
  
  await writeFileIdempotent(
    sentinelConfigPath,
    sentinelConfigContent,
    ".sentinel/config.json (Sentinel configuration)"
  );

  // 3. Create .github/workflows/sentinel-pr-check.yml (if requested)
  if (installWorkflow) {
    const workflowPath = join(target, ".github/workflows/sentinel-pr-check.yml");
    const workflowContent = generateWorkflowContent(answers);
    
    await writeFileIdempotent(
      workflowPath,
      workflowContent,
      ".github/workflows/sentinel-pr-check.yml (GitHub Actions workflow)"
    );
  } else {
    console.log(chalk.dim("  ⊘ .github/workflows/sentinel-pr-check.yml (skipped)"));
  }

  // Print next steps
  printNextSteps(answers);
}

// Made with Bob
