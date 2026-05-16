# Sentinel — Compliance Engineering Copilot

> **Built with IBM Bob IDE** for the IBM Bob Hackathon (May 15–17, 2026). Exported Bob task session reports are in [`bob_sessions/`](./bob_sessions).

Sentinel is a developer-facing compliance copilot that scans source code for **HIPAA**, **SOC 2**, and **PCI-DSS** violations, traces Protected Health Information (PHI) data flows, and generates minimal, reviewable remediation patches.

- **Development partner:** IBM Bob IDE. Bob handled cross-file reasoning during the build — designing the 16 HIPAA controls, refactoring the orchestrator, writing the PHI-trace prompts, and reviewing the dashboard pages. Each task is exported as a markdown transcript + consumption-summary screenshot in `bob_sessions/`.
- **Runtime engine:** Claude `claude-opus-4-7` (adaptive thinking, prompt caching). Sentinel's CLI ships the orchestrator and prompts; the model is swappable — a local Bob Shell binary works as a drop-in via `BOB_LIVE=1 SENTINEL_BOB_BIN=bob`.
- **Falls back to deterministic mock** when no API key or Bob Shell is available, so the demo runs anywhere.

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

## How Bob IDE shaped the build

Per the hackathon eligibility rule that Bob IDE must be a core component of the solution, every non-trivial decision in this codebase has a corresponding Bob IDE task session in [`bob_sessions/`](./bob_sessions). Highlights:

- **Designing the HIPAA control catalog** — Bob proposed the 15-control split between regex prefilter + semantic pass and produced the initial `frameworks/hipaa.ts` object shape.
- **Wiring `bobRunner.ts`** — Bob suggested the live → mock fallback hierarchy and surfaced the edge case where a dirty working tree silently no-ops the remediation branch.
- **PHI-tracer prompt design** — Bob iterated the JSON schema for `phi-tracer` until the dashboard's React Flow graph could render it without post-processing.
- **Dashboard server-component refactor** — Bob caught two pages that imported the SQLite native binding from the Next.js process and rewrote them against `lib/data.ts` exclusively.

The `.bob/custom_modes.yaml` file in this repo loads directly into Bob IDE as five custom modes (`hipaa-auditor`, `soc2-auditor`, `pci-auditor`, `phi-tracer`, `remediation-engineer`) — so judges can replay any audit live inside Bob IDE on this codebase.

## Runtime engine

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

## Bob IDE custom modes

`.bob/custom_modes.yaml` defines five custom modes that load into Bob IDE (and mirror the CLI's scan surfaces):

| Mode | Slash command |
|---|---|
| `hipaa-auditor` | `/audit-hipaa` |
| `soc2-auditor` | `/audit-soc2` |
| `pci-auditor` | `/audit-pci` |
| `phi-tracer` | `/trace-phi` |
| `remediation-engineer` | `/remediate <finding-id>` |

Loaded into Bob IDE, these modes drive the compliance audits that produced the task histories in `bob_sessions/`. The CLI calls the same prompt templates so behaviour is consistent across the IDE and headless runtime.

---

## Compliance score

```
score = 100 − (critical × 8 + high × 4 + medium × 2 + low × 1)  [clamped 0–100]
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

---

## Control reference

Sentinel detects violations across **26 compliance controls** spanning HIPAA Security Rule (16 controls), SOC 2 TSC (6 controls), and PCI-DSS v4.0 (4 controls).

Each control has detailed reference documentation explaining:
- What the regulatory requirement means in plain English
- How Sentinel's detection strategy works (regex patterns + semantic analysis)
- Example code violations and remediations
- Related controls that often co-occur

**📚 [Browse the complete control reference →](./docs/controls/)**

### Quick links by framework

- **[HIPAA Security Rule](./docs/controls/README.md#hipaa-security-rule)** — 16 controls covering access control, encryption, audit logging, PHI integrity, and workforce security
- **[SOC 2 Trust Services Criteria](./docs/controls/README.md#soc-2-trust-services-criteria)** — 6 controls for logical access, monitoring, and change management
- **[PCI-DSS v4.0](./docs/controls/README.md#pci-dss-v40)** — 4 controls for cardholder data protection and secure transmission

### Example controls

| Control ID | Title | Severity | What it detects |
|---|---|---|---|
| [164.312(a)(1)](./docs/controls/hipaa/164-312-a-1.md) | Access Control | High | PHI endpoints without authentication |
| [164.312(a)(2)(iv)](./docs/controls/hipaa/164-312-a-2-iv.md) | Encryption at Rest | Critical | Unencrypted PHI in database schemas |
| [CC6.6](./docs/controls/soc2/cc6-6.md) | Encryption in Transit | Critical | HTTP (non-TLS) external calls |
| [3.3.1](./docs/controls/pci/3-3-1.md) | CVV Storage Prohibited | Critical | Any storage of CVV/CVC codes |

| `BOB_LIVE=1` + `SENTINEL_BOB_BIN` | Optional: route runtime LLM calls through a local Bob Shell binary instead of the Anthropic API |
