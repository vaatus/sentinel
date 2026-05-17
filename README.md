<p align="center">
  <img src="./docs/demo.gif" alt="Sentinel CLI scanning demo-clinic-app for HIPAA violations and auto-remediating" width="900">
</p>

# Sentinel — Compliance-as-CI for healthcare and fintech

<p align="center">
  <em>The Bob-powered agent that scans every pull request, comments findings inline, and blocks merges that ship a HIPAA / SOC 2 / PCI / GDPR violation.</em>
</p>

<p align="center">
  <strong>$50K external audit + 6 months</strong> → <strong>$0 + 4 minutes per PR.</strong>
</p>


```
  ┌──────────────────────────────────────────────────────────────┐
  │   SENTINEL — Compliance Engineering Copilot                  │
  │   powered by IBM Bob IDE                                     │
  └──────────────────────────────────────────────────────────────┘

  $ sentinel scan --framework hipaa --path ./demo-clinic-app
  ✔ Discovered 9 files
  ✔ Bob (hipaa-auditor, live) returned 19 findings across 9 files
  ✔ Bob (phi-tracer, live) mapped 5 PHI flows

  ── Scan complete ───────────────────────────────────────────────
  Compliance Score:  26 / 100   ✗ NOT AUDITABLE
                                                                
  Findings:                       PHI data flows:        5      
    critical  3                   Bob session:    live           
    high      9                   Export:    .sentinel/...      
    medium    5
    low       2
```

<p align="center">
  <a href="https://vaatus.github.io/sentinel/">🌐 Live demo</a>
  · <a href="./bob_sessions/">🤖 Bob IDE task sessions</a>
  · <a href="./docs/controls/">📚 30 compliance controls reference</a>
</p>

> **Submitted to the IBM Bob Hackathon (May 15–17, 2026).** Exported Bob IDE task session reports are in [`bob_sessions/`](./bob_sessions); the modes that drove them are in [`.bob/custom_modes.yaml`](./.bob/custom_modes.yaml).

## For judges — start here

If you have 30 seconds:

1. Watch the GIF above.
2. Skim [`bob_sessions/`](./bob_sessions) — twelve exported Bob IDE task histories that produced real code in this repo ($18.72 of Bobcoin spend, every file edit traceable to a task ID).
3. Open [`.bob/custom_modes.yaml`](./.bob/custom_modes.yaml) — five compliance auditor modes you can load straight into your own Bob IDE on this repo and run `/audit-hipaa` yourself.

If you have 5 minutes:

4. Open the [live demo](https://vaatus.github.io/sentinel/) — the dashboard pre-populated with a real HIPAA scan of `demo-clinic-app/`.
5. Run `npm install && npm run demo` — produces a real scan + remediation cycle in mock mode (no API key needed).
6. Compare the Bob IDE session [`bob_task_may-16-2026_4-25-09-pm.md`](./bob_sessions) with the code in [`packages/cli/src/frameworks/hipaa.ts`](./packages/cli/src/frameworks/hipaa.ts) — Bob designed the 16th HIPAA control end-to-end and that diff is the strongest single piece of evidence for "meaningful use of Bob".

## The pitch

Compliance tooling is broken because it's **periodic**. A quarterly audit. A release-gate scan. A spreadsheet that loses to deadline pressure. By the time a HIPAA finding hits Jira, the engineer who wrote the violating line has moved on three sprints. The fix becomes someone else's problem — usually 6 months and $50K of external auditors later.

Sentinel breaks the cycle by being **three surfaces in one product**, each closing the loop at a different point in the dev flow:

| Surface | Lives at | Triggers on | Closes the loop by |
|---|---|---|---|
| **🤖 Bob IDE skill pack** ([`.bob/custom_modes.yaml`](./.bob/custom_modes.yaml)) | Every developer's editor | Every keystroke | `/audit-hipaa`, `/trace-phi`, `/remediate <id>` inline |
| **🛡️ GitHub Actions agent** ([`.github/workflows/sentinel-pr-check.yml`](./.github/workflows/sentinel-pr-check.yml)) | Every pull request | Push, sync, reopen | Sticky PR comment + **fails the check** on critical findings |
| **⚡ CLI + dashboard** (`sentinel scan`, `sentinel remediate`, `sentinel dashboard`) | Local + CI | On-demand | One-shot audit + auto-remediation patches with blast-radius |

> **The agent surface is the part you've never seen before.** Drop the workflow into any healthcare / fintech repo and **non-compliant code stops merging.** Drop the modes into any team's Bob IDE and every keystroke becomes auditor-aware. The CLI exists because there always has to be a last-resort batch tool.

That's how compliance moves from **an event to a habit** — and how HIPAA fines, SOC 2 audit cycles, and PCI assessment fees stop being budget lines.

## The ROI math

A single F500 hospital network or fintech runs **2–4 external HIPAA / SOC 2 audits per year** at $30K–$150K each, plus 2–6 months of engineering time per audit cycle reviewing findings and back-filling fixes. Per-incident HIPAA penalties run **$50K–$1.5M**. PCI-DSS non-compliance fines run **$5K–$100K per month** until resolved.

Sentinel's per-PR cost (with Claude as the runtime engine) is **~$0.03** of API spend per scan — call it $200/year for a busy repo. The Bob IDE skill pack is free; it's a YAML file.

| Status quo | With Sentinel as CI gate |
|---|---|
| $50K × 2/yr external audit fees | $0 |
| 4 engineer-months/yr on audit follow-up | < 1 engineer-day/yr |
| Mean time to discover a HIPAA violation: **months** | **Before the PR merges** |
| Mean cost to remediate post-shipping: **$10K–$50K** | **0 — never shipped** |

That's a **$100K+/year per repo** structural cost-out for a tool that takes 10 minutes to install.

## Built with Bob IDE — receipts in `bob_sessions/`

Per the hackathon brief, Bob IDE is the **mandatory development partner**, not just a passing helper. Every non-trivial decision in this repo has a corresponding Bob IDE task session you can read:

| Task | What Bob did | Cost |
|---|---|---|
| [`audit run`](./bob_sessions) | Ran the `hipaa-auditor` custom mode end-to-end on `demo-clinic-app/` and produced structured JSON findings | $0.10 |
| [`add §164.310 control`](./bob_sessions) | Designed + implemented a new HIPAA control across 4 files, including the demo violation that fires it | $1.49 |
| [`generate tests`](./bob_sessions) | Wrote a 679-LOC `node:test` suite for `findingsStore.ts` — 30 cases, 30 passing | $0.39 |
| [`refactor dirty-tree`](./bob_sessions) | Fixed a silent no-op in the remediation runner with a structured status field propagated through CLI + dashboard | $1.09 |
| [`review controls`](./bob_sessions) | Auditor-style code review of `frameworks/hipaa.ts` with false-positive and false-negative analysis per control | $0.07 |
| [`generate docs`](./bob_sessions) | Produced 26 per-control reference pages in `docs/controls/` plus an index | $2.92 |
| [`build watch agent`](./bob_sessions) | Designed + built `sentinel watch` — diff-scoped agentic scan with 3 output formats (json / github-actions / markdown) + 3 new tests | $2.52 |
| [`stub GDPR framework`](./bob_sessions) | Added GDPR Article 32 as 4th compliance framework (4 controls + 4 per-control docs); proves the architecture is regime-agnostic | $3.26 |
| [`build init wizard`](./bob_sessions) | Replaced stub `init` with a real interactive `@inquirer/prompts` bootstrapper that drops `.bob/`, workflow, config into any repo (350 LOC + 170 LOC tests) | $1.11 |
| [`seed multi-framework violations`](./bob_sessions) | Added 5 deliberate violations across SOC 2, PCI, GDPR in `demo-clinic-app` so every framework scan returns real findings | $1.38 |
| [`build verification loop`](./bob_sessions) | After each remediation, re-audits the patched files and labels result `verified-resolved`/`partial`/`regression`/`neutral` — closes the agentic loop | $3.61 |
| [`live hipaa-auditor mode`](./bob_sessions) | Ran the `hipaa-auditor` **custom mode** end-to-end on `demo-clinic-app` and emitted a structured findings list + 200-word auditor's executive summary | $0.23 |
| **Total** | | **$18.72 / 40 Bobcoins** |

## What this gets you

- **One-command install** — `sentinel init` runs an interactive wizard (`@inquirer/prompts`) that drops `.bob/custom_modes.yaml`, `.github/workflows/sentinel-pr-check.yml`, and `.sentinel/config.json` into any repo. Idempotent with diff previews before overwrite.
- **CLI** — `sentinel scan --framework {hipaa,soc2,pci,gdpr} --path .` returns prioritised findings + a 0–100 compliance score.
- **Watch mode** — `sentinel watch --format {json,github-actions,markdown}` scans only changed files in a git diff for agentic CI integration.
- **Dashboard** — `sentinel dashboard` opens a Next.js UI showing the score, findings detail, PHI data-flow graph, and remediation PRs with per-fix verification badges.
- **Auto-remediation with closed-loop verification** — `sentinel remediate --all` generates diff patches with blast-radius analysis, applies them on disposable `sentinel/fix-*` branches, **then re-audits the patched files** to confirm the violation is actually resolved. Each fix is labelled `verified-resolved`, `partial`, `regression`, or `neutral`.
- **Bob IDE modes** — five custom modes (`hipaa-auditor`, `soc2-auditor`, `pci-auditor`, `phi-tracer`, `remediation-engineer`) that load directly into Bob IDE.

**Engine details:** the runtime LLM is Claude `claude-opus-4-7` (with adaptive thinking and prompt caching on the controls catalog); a local Bob Shell binary is a drop-in via `BOB_LIVE=1 SENTINEL_BOB_BIN=bob`. With neither configured, the deterministic mock runner still produces meaningful findings so the demo runs anywhere.

---

## What it does

| Command | Description |
|---|---|
| `sentinel scan --framework hipaa` | Scans a codebase, returns prioritised findings + a compliance score (0–100) |
| `sentinel scan --framework soc2` | Same for SOC 2 Trust Services Criteria |
| `sentinel scan --framework pci` | Same for PCI-DSS controls |
| `sentinel scan --framework gdpr` | Same for GDPR Article 32 controls |
| `sentinel watch --format json` | Scans only changed files in git diff (agentic CI mode) |
| `sentinel watch --format github-actions` | Emits findings as GitHub Actions annotations for inline PR comments |
| `sentinel watch --format markdown` | Generates a sticky PR comment body with findings summary |
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
│       ├── frameworks/    # HIPAA, SOC2, PCI, GDPR control definitions
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

**Bootstrap a new repo in under 10 minutes:**

```bash
# One-command installer — drops all Sentinel artefacts into your repo
npx sentinel init

# Answer 3 questions:
#   1. Which frameworks? (hipaa / soc2 / pci / gdpr)
#   2. Blocker level? (critical | high)
#   3. Install GitHub Actions workflow? (Y/n)

# Commit and push
git add . && git commit -m "Add Sentinel compliance scanning"
git push

# Open a PR — Sentinel scans it automatically and blocks non-compliant merges
```

**Or install from source:**

```bash
# Clone and build
git clone https://github.com/your-org/sentinel.git
cd sentinel
npm install
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

Sentinel detects violations across **30 compliance controls** spanning HIPAA Security Rule (16 controls), SOC 2 TSC (6 controls), PCI-DSS v4.0 (4 controls), and GDPR Article 32 (4 controls).

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
- **[GDPR Article 32](./docs/controls/gdpr/)** — 4 controls for security of personal data processing (pseudonymisation, CIA, testing, breach notification)

### Example controls

| Control ID | Title | Severity | What it detects |
|---|---|---|---|
| [164.312(a)(1)](./docs/controls/hipaa/164-312-a-1.md) | Access Control | High | PHI endpoints without authentication |
| [164.312(a)(2)(iv)](./docs/controls/hipaa/164-312-a-2-iv.md) | Encryption at Rest | Critical | Unencrypted PHI in database schemas |
| [CC6.6](./docs/controls/soc2/cc6-6.md) | Encryption in Transit | Critical | HTTP (non-TLS) external calls |
| [3.3.1](./docs/controls/pci/3-3-1.md) | CVV Storage Prohibited | Critical | Any storage of CVV/CVC codes |

| `BOB_LIVE=1` + `SENTINEL_BOB_BIN` | Optional: route runtime LLM calls through a local Bob Shell binary instead of the Anthropic API |
