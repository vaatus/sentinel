# Pitch deck — Sentinel

Five slides. Each is one big visual + one sentence.

Render to PDF with any markdown-to-slides tool (Marp, Slidev, Pandoc + reveal.js).

---

## Slide 1 — Title

> **Sentinel** — Compliance Engineering Copilot.
>
> *Powered by IBM Bob.*

*Visual:* large shield mark over a slate-900 background; tagline below.

---

## Slide 2 — The Problem

> The Fortune 500 spends **$5M–$50M per year, per company** on compliance audits.
>
> Healthcare and fintech engineers chase PHI through codebases by hand for **6 months at a time**.

*Visual:* split frame — left side an OpenEMR-sized repo tree; right side a stack of invoices labelled "external auditors".

---

## Slide 3 — The Insight

> Bob's **whole-repo context** is the unfair advantage.
>
> No regex tool, no file-by-file AI, can reason about cross-file PHI flow.

*Visual:* one PHI flow on screen — `/api/patients` → `logger.info()` → `app.log`, with a red **§164.312(b)** badge on the sink.

---

## Slide 4 — The Demo

> **30 / 100 → 96 / 100. Four minutes. One command.**

*Visual:* a single screenshot of the Sentinel dashboard showing the before-and-after score and the 8 auto-generated PRs.

---

## Slide 5 — Why this matters to IBM

> Compliance is the killer enterprise use case Bob was built for.
>
> Sentinel makes it **self-serve**.

*Visual:* a code review screen with a Sentinel comment ("⚠ This PR introduces a §164.312(e)(1) transmission-security violation") inline on a GitHub-style diff.

---

## Speaker notes

- Open by stating the price tag in slide 2 — that's the hook.
- On slide 3, point at the cross-file edge and say: "A regex sees the log line. A file-by-file AI sees the log line. Only Bob sees that the value being logged comes from a PHI source three files away."
- On slide 4, do not run the demo live during the pitch. The 2-minute video does that.
- Close with: "Bob is the only AI that can reason about your codebase the way an auditor does. Sentinel is the productized version of that capability." Cut.
