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

## Compliance-as-CI for healthcare and fintech

> The **Bob-powered agent** that scans every pull request and **blocks merges** that ship a HIPAA / SOC 2 / PCI / GDPR violation.

<br>

> **$50K external audit + 6 months** → **$0 + 4 minutes per PR.**

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

## Three agentic surfaces, one Bob brain

| Surface | Lives at | Closes the loop by |
|---|---|---|
| 🤖 **Bob IDE skill pack** | Every developer's editor | `/audit-hipaa`, `/trace-phi`, `/remediate` inline |
| 🛡️ **GitHub Actions agent** | Every pull request | Sticky PR comment + **fails the check on critical findings** |
| ⚡ **CLI + dashboard** | Local + CI | Batch audit + auto-remediation patches |

> The middle row is the **DORA Gatekeeper move** — non-compliant code stops merging.
> Drop one YAML file into a repo → every PR is gated by a Bob-powered auditor.

---

## The ROI math

| Status quo | With Sentinel as CI gate |
|---|---|
| $50K × 2/yr in external audit fees | **$0** |
| 4 engineer-months/yr on audit follow-up | **< 1 engineer-day/yr** |
| Mean time to discover a HIPAA violation: months | **Before the PR merges** |
| Mean post-shipping fix cost: $10K–$50K | **0 — never shipped** |
| Per-PR Sentinel cost: | **$0.03 of API spend** |

> Net structural cost-out: **$100K+/year per repo**.
> Setup time: **10 minutes** — install one workflow + commit one YAML file.

---

## Built with Bob IDE — receipts

| Bob IDE task | Output | Cost |
|---|---|---|
| Audit run via `hipaa-auditor` mode | JSON findings + auditor notes | $0.17 |
| Add §164.310 control end-to-end | 4 files changed, demo violation seeded | $1.60 |
| Generate test suite | 679 LOC, 33 tests, 33 passing | $0.46 |
| Refactor dirty-tree no-op | Structured status across CLI + dashboard | $1.18 |
| Code-review catalog | False-positive / false-negative analysis | $0.13 |
| Generate per-control docs | **26 markdown pages** in `docs/controls/` | $3.06 |
| **Build `sentinel watch` agent** | **Diff-scoped scanner powering the PR-check workflow** | **$2.52** |
| **Stub GDPR (4th framework)** | **4 controls + docs — proves regime-agnostic** | **$3.26** |
| | **Total: $12.39 / 40 Bobcoins** | |

<div class="small">
All eight task histories + consumption summaries in <code>bob_sessions/</code>.
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
