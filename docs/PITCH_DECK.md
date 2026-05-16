---
marp: true
theme: default
size: 16:9
paginate: true
backgroundColor: "#0f172a"
color: "#e2e8f0"
style: |
  section {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    padding: 70px 80px;
  }
  h1 {
    color: #38bdf8;
    font-size: 2.4em;
    margin-bottom: 0.2em;
    letter-spacing: -0.02em;
  }
  h2 {
    color: #f8fafc;
    font-size: 1.6em;
    border-bottom: 2px solid #1e293b;
    padding-bottom: 0.3em;
  }
  blockquote {
    border-left: 4px solid #38bdf8;
    color: #f1f5f9;
    font-size: 1.4em;
    font-weight: 400;
    line-height: 1.4;
    margin: 0.6em 0;
    padding: 0.4em 1em;
  }
  blockquote strong { color: #38bdf8; }
  em { color: #94a3b8; }
  code {
    background: #1e293b;
    color: #a5f3fc;
    padding: 0.1em 0.4em;
    border-radius: 4px;
    font-size: 0.9em;
  }
  footer {
    color: #475569;
    font-size: 0.7em;
  }
  section::after {
    color: #334155;
    font-weight: 600;
  }
  .lead {
    font-size: 1.1em;
    color: #cbd5e1;
    line-height: 1.5;
  }
  .small {
    font-size: 0.75em;
    color: #64748b;
  }
footer: "Sentinel · IBM Bob Hackathon · May 2026"
---

<!-- _paginate: false -->
<!-- _backgroundColor: "#0f172a" -->

# Sentinel

## Compliance Engineering Copilot

> Built with **IBM Bob IDE**.
> Turns HIPAA, SOC 2, and PCI from a periodic audit into a **daily-work habit**.

<br>

<div class="small">
github.com/vaatus/sentinel · IBM Bob Hackathon · May 2026
</div>

---

## The problem

> Fortune 500 healthcare and fintech spend **$5M–$50M per company per year** on compliance audits.
>
> Engineers chase PHI through codebases by hand for **6 months at a time** — and the violation gets shipped anyway.

<div class="lead">

Compliance is *periodic*. A quarterly audit. A release-gate scan. By the time a finding hits a Jira ticket, the engineer who wrote the violating line has moved on three sprints. The feedback loop is broken.

</div>

---

## The insight

> Compliance is a **whole-repo reasoning** problem.
>
> A `logger.info(patient)` is only a HIPAA violation when seen through the route handler three files upstream that loaded the PHI.

<div class="lead">

- A regex sees the log line.
- A file-by-file AI sees the log line.
- An auditor's mental model sees the **flow** — and that's what `phi-tracer` mode does.

</div>

---

## The product — two surfaces

| Surface | What it is | When it runs |
|---|---|---|
| **CLI + dashboard** | `sentinel scan / remediate / dashboard` | CI, release gate, audit prep |
| **Bob IDE skill pack** | `.bob/custom_modes.yaml` — 5 custom modes | **Every keystroke** in your editor |

> Drop the modes into any team's Bob IDE → `/audit-hipaa` works inline as they code.
> Compliance stops being an event. It becomes a habit.

---

## The demo

> **30 / 100 → 96 / 100. Four minutes. One command.**

<div class="lead">

`sentinel scan` flags 19 HIPAA violations across 9 files (5 PHI data flows, 3 critical findings).

`sentinel remediate --all` opens 19 patch branches with cross-file blast-radius analysis.

Re-scan: green. Audit-ready.

</div>

<div class="small">
Full 2-minute demo video: linked in submission · live demo on stage: don't.
</div>

---

## Built with Bob IDE — receipts

| Bob IDE task | Output | Cost |
|---|---|---|
| Audit run via `hipaa-auditor` mode | JSON findings + auditor notes | $0.10 |
| Add §164.310 control end-to-end | 4 files changed, demo violation seeded | $1.49 |
| Generate test suite | 679 LOC, 30 tests, 30 passing | $0.39 |
| Refactor dirty-tree no-op | Structured status across CLI + dashboard | $1.09 |
| Code-review catalog | False-positive / false-negative analysis | $0.07 |
| Generate per-control docs | **26 markdown pages** in `docs/controls/` | $2.92 |
| | **Total: $6.06 / 40 Bobcoins** | |

<div class="small">
All six task histories + consumption summaries in <code>bob_sessions/</code>.
</div>

---

## Why this matters to IBM

> Compliance is the killer enterprise use case Bob IDE was built for.
>
> Healthcare, fintech, gov: IBM's existing customer base. They can't ship without HIPAA, PCI, FedRAMP.

<div class="lead">

**Sentinel makes Bob IDE the answer to a $50B/year enterprise spend.**

Drop `.bob/custom_modes.yaml` into any project → every developer becomes a compliance-aware coder. No external auditors. No six-month cycles. No spreadsheets.

</div>

---

<!-- _paginate: false -->

# Thank you.

<br>

> `github.com/vaatus/sentinel`
>
> Built with IBM Bob IDE · May 2026

<div class="small">
Try it: <code>git clone … && npm install && npm run demo</code>
</div>
