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

> Compliance is a **whole-repo reasoning** problem.
>
> A single line of logging is only a violation when seen through the file three calls upstream that handed it PHI.

*Visual:* one PHI flow on screen — `/api/patients` → `logger.info()` → `app.log`, with a red **§164.312(b)** badge on the sink.

> *Built with Bob IDE — every control catalog, every prompt schema, every dashboard page has an exported task history in `bob_sessions/`.*

---

## Slide 4 — The Demo

> **30 / 100 → 96 / 100. Four minutes. One command.**

*Visual:* a single screenshot of the Sentinel dashboard showing the before-and-after score and the 8 auto-generated PRs.

---

## Slide 5 — Why this matters to IBM

> Compliance is the killer enterprise use case Bob IDE was built for.
>
> Sentinel makes it **self-serve** — load `.bob/custom_modes.yaml` and any team can audit their own codebase.

*Visual:* a code review screen with a Sentinel comment ("⚠ This PR introduces a §164.312(e)(1) transmission-security violation") inline on a GitHub-style diff.

---

## Speaker notes

- Open by stating the price tag in slide 2 — that's the hook.
- On slide 3, point at the cross-file edge and say: "A regex sees the log line. A file-by-file AI sees the log line. The auditor's mental model sees that the value being logged comes from a PHI source three files away — and that's what `phi-tracer` does."
- Mention Bob IDE on slide 3 by pointing at `bob_sessions/` in the repo: "Every prompt, every schema, every refactor in this repo has a Bob IDE task export. The build itself is the strongest evidence of how Bob IDE accelerates compliance work."
- On slide 4, do not run the demo live during the pitch. The 2-minute video does that.
- Close with: "Compliance is hard because it requires whole-repo reasoning. Bob IDE gives builders that reasoning at their fingertips. Sentinel is what falls out when you turn it on a compliance problem." Cut.
