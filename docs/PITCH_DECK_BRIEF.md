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
    padding: 80px 90px;
    justify-content: center;
  }
  h1 {
    color: #38bdf8;
    font-size: 3em;
    margin-bottom: 0.1em;
    letter-spacing: -0.02em;
  }
  h2 {
    color: #f8fafc;
    font-size: 2em;
    border-bottom: 2px solid #1e293b;
    padding-bottom: 0.3em;
  }
  blockquote {
    border-left: 4px solid #38bdf8;
    color: #f1f5f9;
    font-size: 1.6em;
    font-weight: 400;
    line-height: 1.4;
    margin: 0.5em 0;
    padding: 0.4em 1em;
  }
  blockquote strong { color: #38bdf8; }
  table {
    font-size: 0.95em;
    margin-top: 0.5em;
  }
  th { color: #38bdf8; }
  code {
    background: #1e293b;
    color: #a5f3fc;
    padding: 0.1em 0.4em;
    border-radius: 4px;
  }
  section::after {
    color: #334155;
    font-weight: 600;
  }
  .big {
    font-size: 1.4em;
    color: #f1f5f9;
  }
  .small {
    font-size: 0.8em;
    color: #64748b;
  }
footer: "Sentinel · IBM Bob Hackathon · May 2026"
---

<!-- _paginate: false -->

# Sentinel

## Compliance-as-CI for healthcare and fintech

> **$50K + 6 months** → **$0 + 4 minutes per PR.**

<div class="small">
github.com/vaatus/sentinel · Built with IBM Bob IDE
</div>

---

## The problem

> Fortune 500 healthcare and fintech spend **$5M–$50M / year** on compliance audits.
>
> Engineers chase PHI by hand for **6 months**. The violation ships anyway.

<div class="big">

Compliance is **periodic**. Sentinel makes it **continuous**.

</div>

---

## Three surfaces, one Bob brain

| Surface | Closes the loop by |
|---|---|
| 🤖 **Bob IDE skill pack** | `/audit-hipaa` inline in every editor |
| 🛡️ **GitHub Actions agent** | **Fails the check** on critical findings — merge blocked |
| ⚡ **CLI + dashboard** | Batch audit + auto-remediation + closed-loop verification |

> One YAML file → every PR is gated by a Bob-powered auditor.

---

## ROI math

| Status quo | With Sentinel |
|---|---|
| $50K × 2 / yr external audits | **$0** |
| 4 engineer-months / yr | **< 1 engineer-day / yr** |
| Per-PR cost | **$0.03** |

<br>

> Net cost-out: **$100K+ / year per repo**. Install: **10 minutes.**

---

## Built with Bob IDE — receipts

> **12 task sessions · $18.72 / 40 Bobcoins · 47% utilization**

| Bob shipped | Cost |
|---|---|
| Six baseline sessions (audit, §164.310 control, tests, refactor, review, 26 docs) | $6.62 |
| `sentinel watch` agentic CI scanner | $2.52 |
| GDPR (4th framework) — 20-minute proof of extensibility | $3.26 |
| `sentinel init` interactive wizard | $1.11 |
| Multi-framework violations in demo app | $1.38 |
| **Closed-loop verification** — Bob verifies its own fixes | $3.61 |
| Live `hipaa-auditor` custom-mode audit + executive summary | $0.23 |

<div class="small">
All 12 task histories + consumption summaries in <code>bob_sessions/</code>.
</div>

---

## Why this matters to IBM

> **30 compliance controls · 4 frameworks · 1 product**
>
> HIPAA · SOC 2 · PCI · GDPR

<div class="big">

Drop `.bob/custom_modes.yaml` into any team's editor → every developer becomes a compliance auditor.

Sentinel makes Bob IDE the answer to a **$50B / year enterprise spend.**

</div>

---

<!-- _paginate: false -->

# Thank you.

<br>

> `github.com/vaatus/sentinel`
>
> Try it: `npm install && npm run demo`
>
> Built with IBM Bob IDE · May 2026
