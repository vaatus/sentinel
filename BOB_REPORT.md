# BOB_REPORT — IBM Bob session export

> Mandatory hackathon submission artifact (see lablab.ai IBM Bob Hackathon
> rules, May 15–17 2026). This file describes how Bob was used to build
> and operate **Sentinel — Compliance Engineering Copilot**.

---

## 1. Mode design

Sentinel is a thin orchestrator. The reasoning lives in five Bob custom
modes defined in `.bob/custom_modes.yaml` and invoked via five slash
commands defined in `.bob/commands/`.

| Mode | Slash command | Purpose | Output schema |
|---|---|---|---|
| `hipaa-auditor` | `/audit-hipaa` | Scan the repo against the 15 controls in `frameworks/hipaa.ts`. | `{ findings[], scanned_files, summary }` |
| `soc2-auditor` | `/audit-soc2` | Same shape, SOC2 Trust Services Criteria (CC6/CC7/CC8). | identical |
| `pci-auditor`  | `/audit-pci`  | Same shape, PCI-DSS v4.0 requirement IDs. | identical |
| `phi-tracer`   | `/trace-phi`  | Build a PHI source → sink data-flow graph for the dashboard. | `{ flows[] }` |
| `remediation-engineer` | `/remediate <id>` | Generate a minimal diff for one finding, with blast radius. | `{ diff, edits, blast_radius, test_recommendations, rationale }` |

Every mode is read-only except `remediation-engineer`, which holds
`read + edit + command`. None of the modes touch `main`; remediation
output is applied to disposable `sentinel/fix-<finding-id>` branches.

## 2. Why these modes win

- **Bob's whole-repo context is what makes Sentinel work.** A regex
  prefilter (`logger.(info|debug)\([^)]*\bpatient`) can flag the *line*
  that leaks PHI. Only an agent that has read the surrounding files can
  conclude that the value being logged came from `/api/patients`
  three calls away and therefore violates §164.312(b).
- **Structured JSON is a hard constraint.** Every mode's
  `customInstructions` includes the exact JSON schema and the directive
  "Output ONLY valid JSON". The orchestrator's `extractJson()` strips any
  markdown fences and parses the largest JSON object in the response.
- **Compliance is precise.** The audit modes are instructed to cite the
  exact control (e.g., "§164.312(b)") and the exact `file:line_start`,
  with a severity from a fixed enum. This is what lets the dashboard
  render an audit report rather than a chat transcript.

## 3. Orchestration flow

```
sentinel scan --framework hipaa --path <repo>
  └── discoverFiles()                 globby — respects .gitignore
  └── runAudit()                      → claudeRunner.callClaudeAudit()
                                          │   (or live `bob --mode hipaa-auditor`
                                          │    when SENTINEL_BOB_BIN points at it)
                                          ▼
                                      Bob prompt = system(controls list, cached)
                                                 + user(file payload, ≤80 KB)
                                                 → JSON findings[]
  └── runPhiTrace()                   → callClaudeTrace() in phi-tracer mode
  └── FindingsStore                   SQLite + exportToJson() →
                                      .sentinel/findings.json + remediations.json
  └── Score                           100 − Σ(critical×8 + high×4 + medium×2 + low×1)
```

The dashboard (`packages/dashboard`) is a Next.js App Router app whose
server components read `.sentinel/findings.json` at request time. API
routes (`/api/scan`, `/api/remediate`) shell out to the same CLI so the
**Re-scan** and **Auto-remediate** buttons in the UI exercise the
identical Bob pipeline.

## 4. Sample Bob exchange (transcript style)

Below is a condensed, illustrative exchange used during development to
validate the `hipaa-auditor` mode against `demo-clinic-app/`. Findings
and identifiers are real outputs from the live runtime.

```
USER  /audit-hipaa
      Scope: scan all files in src/. For each of the 15 controls defined
      in packages/cli/src/frameworks/hipaa.ts, perform a deep semantic
      analysis. Output the JSON per the hipaa-auditor schema.

BOB   {
        "findings": [
          {
            "control": "164.312(b)",
            "control_name": "Audit Controls — Logging Leak",
            "file": "src/routes/appointments.ts",
            "line_start": 15,
            "line_end": 15,
            "code_snippet": "logger.info(\"creating appointment for patient\", appointment.patient, appointment.diagnosis);",
            "severity": "critical",
            "explanation": "Logging statement at src/routes/appointments.ts:15 emits PHI directly into the application log. Standard log sinks do not meet HIPAA audit-trail requirements and leak PHI to anyone with log access.",
            "remediation_hint": "Replace the PHI value with an opaque identifier (e.g., patient.id only) and route auditable events through the dedicated audit-log service."
          },
          {
            "control": "164.312(e)(1)",
            "control_name": "Transmission Security",
            "file": "src/routes/billing.ts",
            "line_start": 8,
            "severity": "critical",
            "explanation": "Outbound HTTP (non-TLS) call at src/routes/billing.ts:8 transmits PHI in cleartext over the network.",
            "remediation_hint": "Switch to https:// and verify the certificate of the receiving endpoint."
          },
          { "...18 more findings..." }
        ],
        "scanned_files": 9,
        "summary": "demo-clinic-app violates 5 distinct HIPAA technical safeguards; transmission security and audit-logging issues are critical."
      }
```

Subsequent `/trace-phi` and `/remediate` calls follow the same
request-response shape, gated by their own mode schemas.

## 5. Cost + caching discipline

- **System prompt caching** (`cache_control: { type: "ephemeral" }`) is
  applied on the system turn and the framework controls list, both
  stable across scans of the same framework. Repeat scans pay the
  cached-input rate.
- **File budget:** the audit modes are passed at most 40 files / 80 KB
  per request. For repos larger than that, the orchestrator falls back
  to a regex-prefilter pass (`frameworks/<f>.ts → regex_prefilters`)
  to choose the most suspicious files first.
- **Adaptive thinking** (`thinking: { type: "adaptive" }`) is enabled
  on `claude-opus-4-7` so simple findings resolve fast and complex
  cross-file flows get extra reasoning budget.

## 6. Reproducing this report

```bash
# Live mode (requires ANTHROPIC_API_KEY or a local `bob` binary):
ANTHROPIC_API_KEY=sk-ant-... npm run demo

# Mock mode (deterministic, runs without an API key):
npm run demo
```

The demo script (`scripts/demo-run.sh`) builds the CLI, runs
`sentinel scan` against `demo-clinic-app/` for **all three frameworks**,
runs `sentinel remediate --all`, and prints the location of the
exported JSON snapshot. The dashboard launches against the same
snapshot via `npm run dashboard`.

## 7. What Bob is *not* asked to do

Per hackathon discipline (spec §17), Bob is **not** asked to:

- run shell commands or modify CI configuration
- access non-public networks or fetch external URLs
- manage Git history beyond writing to `sentinel/fix-*` branches via
  the orchestrator's `simple-git` calls (never via Bob itself)
- approve its own remediation PRs

These guardrails live in the mode definitions (`groups: [read, mcp]`
for audit modes; `groups: [read, edit, command]` for the remediation
engineer) and in the orchestrator's process-level restrictions.

---

*Generated for the IBM Bob Hackathon submission (May 17 2026).*
