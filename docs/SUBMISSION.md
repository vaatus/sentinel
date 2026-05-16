# Lablab.ai submission copy — paste-ready

Paste each section into the matching field on the lablab.ai submission form.

---

## Project name

```
Sentinel — Compliance Engineering Copilot
```

## Tagline (≤ 140 chars)

```
A Bob IDE skill pack + CLI that turns HIPAA, SOC 2, and PCI compliance from a 6-month audit cycle into daily editor feedback.
```

## Category / Theme

```
Turn idea into impact faster — reduce repetitive tasks, generate documentation and tests
```

## Problem statement

```
The Fortune 500 spends $5M–$50M per company per year on compliance audits. In
regulated industries — healthcare, fintech, government — engineers chase PHI,
PAN, and access-control bugs through codebases by hand for six months at a
time. Then a release ships, the violation goes to production anyway, and the
audit cycle starts over.

The feedback loop is broken because compliance tooling is *periodic*. By the
time a finding lands in Jira, the engineer who wrote the violating line has
moved on three sprints. The fix becomes someone else's spreadsheet entry.
```

## Solution

```
Sentinel reframes compliance as a daily-work habit. It ships two surfaces:

1. A CLI + Next.js dashboard (`sentinel scan / remediate / dashboard`) for
   the periodic audit — useful, but the boring part.

2. A Bob IDE skill pack — five custom modes in `.bob/custom_modes.yaml`
   (`hipaa-auditor`, `soc2-auditor`, `pci-auditor`, `phi-tracer`,
   `remediation-engineer`). Drop the file into any team's Bob IDE and every
   developer's editor becomes HIPAA-aware. `/audit-hipaa` runs inline.
   `/trace-phi` flags a logger leak the moment it's typed. `/remediate <id>`
   opens a patch with cross-file blast-radius analysis.

The CLI runs the same prompt templates as the IDE modes, so behaviour is
consistent across the editor and the headless runtime. Sentinel detects
violations across 26 controls: 16 HIPAA Security Rule, 6 SOC 2 Trust Services
Criteria, 4 PCI-DSS v4.0.

Compliance stops being an event. It becomes a habit.
```

## How IBM Bob IDE was used

```
Bob IDE was the mandatory development partner — receipts in bob_sessions/.

Six task sessions, $6.06 of Bobcoin spend, six visible code outcomes:

- audit run via hipaa-auditor mode: produced structured JSON findings on
  demo-clinic-app + auditor notes ($0.10)
- added §164.310(a)(1) Facility Access Controls end-to-end: 4 files edited,
  demo violation seeded, control count refreshed in README and CLAUDE.md
  ($1.49)
- generated a node:test suite for findingsStore.ts: 679 LOC, 30 tests,
  30 passing ($0.39)
- refactored a silent dirty-tree no-op in the remediation runner: introduced
  a structured status field propagated across CLI + dashboard ($1.09)
- code-reviewed the HIPAA control catalog with false-positive /
  false-negative analysis per control ($0.07)
- generated docs/controls/ — 26 per-control reference markdown pages plus
  an index ($2.92)

Each task is preserved in bob_sessions/ as an exported markdown transcript
with the consumption summary screenshot beside it. Every file edited in this
repo can be traced back to a specific Bob IDE task ID.
```

## Business value

```
- Direct fit with IBM's enterprise customer base. Healthcare, fintech, and
  government can't ship without HIPAA, PCI, FedRAMP, SOC 2.
- HIPAA penalties run $50K–$1.5M per incident; SOC 2 audit fees run
  $30K–$100K per cycle. Sentinel attacks both.
- The .bob/custom_modes.yaml file is a deployable artifact: drop it into a
  customer's Bob IDE and they inherit Sentinel's auditor expertise without
  installing a separate tool. This is how Bob IDE becomes the answer to a
  $50B/year enterprise spend.
```

## Try it

```
git clone https://github.com/vaatus/sentinel && cd sentinel
npm install && npm run build
npm run demo                                    # mock mode — runs anywhere
ANTHROPIC_API_KEY=sk-... npm run demo           # live mode — real findings

# Then open the dashboard:
SENTINEL_TARGET=$(pwd)/demo-clinic-app npm run dashboard
```

## Links

```
GitHub repository:   https://github.com/vaatus/sentinel
Bob IDE sessions:    https://github.com/vaatus/sentinel/tree/main/bob_sessions
Pitch deck (PDF):    https://github.com/vaatus/sentinel/blob/main/docs/PITCH_DECK.pdf
Demo video:          <YouTube unlisted URL — fill in after recording>
Controls reference:  https://github.com/vaatus/sentinel/tree/main/docs/controls
```

## Team

```
vaatus (Taha Mersni) — solo build
```

---

## Pre-submission checklist

- [ ] Screenshots of consumption-summary panels added to `bob_sessions/`
      (filenames matching the .md slugs — e.g. `bob_task_may-16-2026_4-17-55-pm.png`)
- [ ] 2-minute demo video recorded per `docs/DEMO_SCRIPT.md` and uploaded to YouTube unlisted
- [ ] Video URL pasted into the "Links" block above
- [ ] `git push` so GitHub `main` matches what judges will clone
- [ ] All forms on lablab.ai filled with the copy above
- [ ] One last `npm run demo` from a fresh clone to confirm reproducibility
