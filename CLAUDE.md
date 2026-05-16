# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & development commands

```bash
# Build the CLI (TypeScript → dist/)
npm run build                          # from repo root — builds packages/cli only
npm run build --workspace=packages/cli # equivalent explicit form

# Type-check the dashboard without emitting
npx tsc --noEmit -p packages/dashboard/tsconfig.json

# Run the dashboard dev server (requires SENTINEL_TARGET env var or defaults to ./demo-clinic-app)
SENTINEL_TARGET=$(pwd)/demo-clinic-app npm run dashboard

# Run a HIPAA scan against the bundled demo app (requires npm run build first)
node packages/cli/dist/index.js scan --framework hipaa --path ./demo-clinic-app

# Run with live Claude analysis (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=sk-... node packages/cli/dist/index.js scan --framework hipaa --path ./demo-clinic-app

# Run with mock analysis (default when ANTHROPIC_API_KEY is absent)
node packages/cli/dist/index.js scan --framework hipaa --path ./demo-clinic-app --json

# Open the dashboard
node packages/cli/dist/index.js dashboard --path ./demo-clinic-app
```

There are no test suites yet. TypeScript strict-mode compilation is the primary correctness check.

## Architecture overview

Sentinel is a CLI + web dashboard monorepo (`packages/cli`, `packages/dashboard`). The CLI scans a target repo for compliance violations and writes results to `<target>/.sentinel/findings.json` and `remediations.json`; the dashboard reads those JSON files at request time.

### CLI (`packages/cli/src/`)

```
index.ts                  commander entry — 4 subcommands: scan, remediate, dashboard, init
types.ts                  shared interfaces: Finding, DataFlow, ScanRun, Control, *Response
frameworks/               control libraries (hipaa.ts, soc2.ts, pci.ts) + index.ts
  Control = { id, regex_prefilters, negative_filters, severity_default, bob_prompt_template }
orchestrator/
  bobRunner.ts            chooses live Claude vs. mock; exports runAudit / runPhiTrace / runRemediation
  claudeRunner.ts         Anthropic SDK integration — reads file contents, calls Claude with prompt caching
  mockBob.ts              regex-based mock that scans demo-clinic-app without an API key
  findingsStore.ts        SQLite persistence (better-sqlite3) + exportToJson()
  promptBuilder.ts        buildAuditPrompt / buildTracePrompt / buildRemediationPrompt
  outputParser.ts         extractJson() — strips markdown fences from LLM output
git/prGenerator.ts        creates sentinel/fix-* branches and applies RemediationEdit[]
commands/                 scan.ts, remediate.ts, dashboard.ts, init.ts
```

**Data flow for `sentinel scan`:**
1. `discoverFiles()` globs source files via globby
2. `runAudit()` → if `ANTHROPIC_API_KEY` present, calls `callClaudeAudit()` (claudeRunner); otherwise falls back to `runMockAudit()` (mockBob)
3. Findings inserted into SQLite via `FindingsStore`
4. For HIPAA, `runPhiTrace()` builds a PHI data-flow graph (stored as `data_flows` rows)
5. `store.exportToJson()` writes `.sentinel/findings.json` + `.sentinel/remediations.json`

**Mock vs. live Claude:**
- Default (no key): `mockBob.ts` uses regex prefilters from framework controls to locate real violations in whichever codebase is scanned — it reads actual files, not fixtures
- Live: `claudeRunner.ts` reads file contents (capped at 40 files / 80 KB), sends them to `claude-opus-4-7` with a structured system prompt and **prompt caching** on the system turn (controls list)
- The switching logic is in `bobRunner.ts` → `claudeAvailable()`

### Dashboard (`packages/dashboard/`)

Next.js 14 App Router, Tailwind, TypeScript. All pages are **server components** that call `loadSnapshot()` / `loadRemediations()` from `lib/data.ts` at render time — no React state for the data layer.

Three API routes in `app/api/`:
- `GET /api/snapshot` — re-reads `findings.json` and returns it
- `POST /api/scan` — spawns `sentinel scan` as a child process, returns its `--json` output
- `POST /api/remediate` — spawns `sentinel remediate --all --apply --json`, exports remediations

`SENTINEL_TARGET` env var tells the dashboard (and the CLI it spawns) where the target repo lives. Defaults to `../../demo-clinic-app` relative to `packages/dashboard/`.

Custom Tailwind tokens: `sentinel-bg`, `sentinel-panel`, `sentinel-border`, `sentinel-accent`.

`DataFlowGraph` is a `"use client"` component wrapping reactflow; every other component is server-rendered.

### Demo target (`demo-clinic-app/`)

A deliberately broken Express app with 8 seeded HIPAA violations across `src/routes/`, `src/auth/`, `src/db/`. Running `sentinel scan` against it always produces a meaningful report regardless of mock/live mode.

### Bob / Claude custom modes (`.bob/`)

`.bob/custom_modes.yaml` defines five Claude custom modes: `hipaa-auditor`, `phi-tracer`, `remediation-engineer`, `soc2-auditor`, `pci-auditor`. Each has a strict JSON output schema that matches the TypeScript interfaces in `types.ts`. `.bob/commands/` contains slash-command definitions used when running interactively inside Claude Code.

## Key conventions

- **Framework control definitions** are the single source of truth for what counts as a violation. Adding a new control means adding an entry to `frameworks/hipaa.ts` (or soc2/pci); the mock scanner, Claude prompt, and dashboard all consume the same object.
- **`exportToJson`** must be called at the end of every scan and remediation run so the dashboard can read results without loading the SQLite native binding.
- **Scoring**: `computeScore()` in `findingsStore.ts` — critical=−8, high=−4, medium=−2, low=−1, floored at 0.
- The CLI `--json` flag suppresses all progress output and writes a single JSON object to stdout; the dashboard API routes rely on this contract.
- Dashboard pages import from `lib/data.ts`; they never import from `packages/cli` (no SQLite in the Next.js process).
