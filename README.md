# Sentinel — Compliance Engineering Copilot

Sentinel is a developer-facing compliance copilot that scans source code for **HIPAA**, **SOC 2**, and **PCI-DSS** violations, traces Protected Health Information (PHI) data flows, and generates minimal, reviewable remediation patches — all powered by **Claude** (`claude-opus-4-7` with adaptive thinking and prompt caching).

---

## What it does

| Command | Description |
|---|---|
| `sentinel scan --framework hipaa` | Scans a codebase, returns prioritised findings + a compliance score (0–100) |
| `sentinel scan --framework soc2` | Same for SOC 2 Trust Services Criteria |
| `sentinel scan --framework pci` | Same for PCI-DSS controls |
| `sentinel remediate --all` | Generates diff patches for every open finding and opens local git branches |
| `sentinel dashboard` | Opens a Next.js web dashboard showing score, findings, PHI flows, and PRs |

---

## Architecture

```
sentinel/
├── packages/cli/          # TypeScript CLI (ESM, Node 20+)
│   └── src/
│       ├── commands/      # scan.ts, remediate.ts — CLI entry points
│       ├── orchestrator/  # claudeRunner.ts (Anthropic SDK), bobRunner.ts, findingsStore.ts
│       ├── frameworks/    # HIPAA, SOC2, PCI control definitions
│       └── git/           # prGenerator.ts — local branch + diff writer
└── packages/dashboard/    # Next.js 14 App Router dashboard
    ├── app/               # Pages: overview, findings, data-flow, prs
    └── lib/data.ts        # Reads .sentinel/findings.json + remediations.json
```

**Data flow:**

1. `discoverFiles()` globs source files (respects `.gitignore`)
2. `runAudit()` → `callClaudeAudit()` — sends files to Claude with framework-specific controls; prompt-cached system turn for repeat scans
3. Findings are stored in SQLite (`.sentinel/sentinel.db`) and exported to `.sentinel/findings.json`
4. For HIPAA, `callClaudeTrace()` maps PHI sources → sinks (log, db, api, file, response)
5. `sentinel remediate` calls `callClaudeRemediation()` for each finding, writes a unified diff and opens a local git branch
6. The Next.js dashboard reads the JSON exports; API routes (`/api/scan`, `/api/remediate`) shell out to the CLI

---

## Claude integration

`packages/cli/src/orchestrator/claudeRunner.ts` drives all LLM calls:

- **Model**: `claude-opus-4-7` with `thinking: { type: "adaptive" }`
- **Prompt caching**: `cache_control: { type: "ephemeral" }` on the system prompt + controls list (stable across scans of the same framework), cutting repeat-scan costs
- **File budget**: max 40 files / 80 KB per request to stay within practical context limits
- **Fallback**: without `ANTHROPIC_API_KEY`, the tool falls back to deterministic mock data so the UI and CLI can be demoed without an API key

The three Claude call surfaces:

| Function | Purpose | Caching |
|---|---|---|
| `callClaudeAudit()` | Control-by-control code audit | System prompt cached |
| `callClaudeTrace()` | PHI data-flow tracing | System prompt cached |
| `callClaudeRemediation()` | Diff generation for a specific finding | None (finding-specific) |

---

## Quick start

```bash
# Install
npm install

# Build the CLI
npm run build

# Scan with real Claude (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=sk-ant-... node packages/cli/dist/index.js scan \
  --framework hipaa \
  --path ./path/to/your/app

# Scan in mock mode (no API key needed — great for demos)
node packages/cli/dist/index.js scan --framework hipaa --path ./path/to/your/app

# Open remediation PRs for all open findings
node packages/cli/dist/index.js remediate --all --path ./path/to/your/app

# Launch the dashboard (reads .sentinel/ exports)
npm run dashboard
# → http://localhost:3000
```

**JSON output** (for CI pipelines):

```bash
node packages/cli/dist/index.js scan --framework hipaa --path . --json | jq .score
```

---

## Claude custom modes

`.bob/custom_modes.yaml` defines five Claude custom modes that mirror the CLI's scan surfaces:

| Mode | Slash command |
|---|---|
| `hipaa-auditor` | `/audit-hipaa` |
| `soc2-auditor` | `/audit-soc2` |
| `pci-auditor` | `/audit-pci` |
| `phi-tracer` | `/trace-phi` |
| `remediation-engineer` | `/remediate <finding-id>` |

These can be used directly in Claude Code (the CLI) as persistent, version-controlled agent configurations.

---

## Compliance score

```
score = 100 − (critical × 25 + high × 10 + medium × 4 + low × 1)  [clamped 0–100]
```

| Score | Verdict |
|---|---|
| ≥ 85 | ✓ AUDIT READY |
| 60–84 | ⚠ NEEDS WORK |
| < 60 | ✗ NOT AUDITABLE |

---

## Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Enables live Claude calls; omit for mock mode |
| `BOB_LIVE=1` + `SENTINEL_BOB_BIN` | Legacy: route through a local `bob` binary instead |
