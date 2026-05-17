# Live presentation script — Sentinel

**Duration:** 5 minutes if pacing the deck slide-by-slide. Trim or stretch as needed. Slide images live at `docs/PITCH_DECK_slide-*.png`; full deck at `docs/PITCH_DECK.pdf`.

> Tone: calm enterprise. You are not selling a hackathon hack — you are presenting an enterprise tool to a CTO. Speak in short, declarative sentences. Don't apologise. Don't over-explain Bob; let the receipts speak.

---

## Opening — before slide 1 (15 sec)

> *"I'm Taha. I built Sentinel — a compliance engineering copilot for healthcare and fintech, with IBM Bob IDE as my development partner. Five minutes, eight slides, one product."*

Click to slide 1.

---

## Slide 1 — Title (30 sec)

**On-screen:** Sentinel — Compliance-as-CI for healthcare and fintech. The Bob-powered agent that scans every pull request and blocks merges. $50K external audit + 6 months → $0 + 4 minutes per PR.

> *"Two numbers. Fifty-thousand dollars and six months — that's a single external HIPAA audit at a Fortune 500 hospital network. Zero dollars and four minutes — that's how long Sentinel takes on every pull request. Sentinel turns compliance from a periodic event into a daily habit."*

Pause. Then click.

---

## Slide 2 — The problem (40 sec)

**On-screen:** Compliance is *periodic*. Engineers chase PHI by hand for six months at a time. The violation gets shipped anyway.

> *"The problem isn't that compliance tooling doesn't exist. It's that it's periodic. Quarterly audits. Release-gate scans. A spreadsheet that loses to deadline pressure. By the time a finding lands in Jira, the engineer who wrote that line has moved on three sprints. The fix becomes someone else's problem — usually six months and fifty thousand dollars of external auditors later."*

> *"That feedback loop is broken. Sentinel fixes it."*

Click.

---

## Slide 3 — The insight (35 sec)

**On-screen:** Compliance is a **whole-repo reasoning** problem. `logger.info(patient)` is only a HIPAA violation when you trace it back to the route handler three files upstream that loaded the PHI.

> *"A regex sees a log line. A file-by-file AI sees a log line. An auditor's mental model sees the flow — patient data loaded by a route handler, then handed to a logger three files away. That's a Section 164.312(b) violation. And that flow-aware reasoning is exactly what Bob IDE's custom modes do."*

Click.

---

## Slide 4 — Three agentic surfaces, one Bob brain (50 sec)

**On-screen:** Bob IDE skill pack · GitHub Actions agent · CLI + dashboard. The middle row is the DORA Gatekeeper move.

> *"Sentinel ships in three coordinated surfaces. Each closes the loop at a different point in the dev flow."*

> *"Surface one — Bob IDE skill pack. Five custom modes — `hipaa-auditor`, `phi-tracer`, `remediation-engineer` and two more — that drop into any team's Bob IDE. The compliance auditor lives in every developer's editor."*

> *"Surface two — and this is the new one — a GitHub Actions agent. One YAML file. Every pull request gets scanned. A sticky comment appears. **The check fails on critical findings — the PR actually stops merging.** This is the DORA-Gatekeeper move that past IBM hackathon winners shared."*

> *"Surface three — the CLI and dashboard. The batch tool for when you need to audit a whole repo, generate fix patches, or run a quarterly score check."*

> *"Three surfaces. One Bob brain."*

Click.

---

## Slide 5 — The ROI math (40 sec)

**On-screen:** Status-quo vs Sentinel-as-CI gate table. **Net structural cost-out: $100K+/year per repo.**

> *"Here's the CFO math. A Fortune 500 hospital network runs two to four external compliance audits a year, at thirty to one-fifty thousand dollars each. Engineers burn two to six months per cycle reviewing findings. Per-incident HIPAA penalties run up to one-point-five million."*

> *"Sentinel's per-PR cost — three cents of Claude API spend. Two hundred dollars a year for a busy repo. The Bob IDE skill pack is free; it's a YAML file."*

> *"Net structural cost-out: a hundred thousand dollars per year per repo. Setup time: ten minutes. One command — `sentinel init` — and you're gated."*

Click.

---

## Slide 6 — Built with Bob IDE — the receipts (60 sec)

**On-screen:** Bob IDE task table — 12 sessions, $18.72 / 40 Bobcoins.

> *"This is what Bob IDE did. Twelve task sessions. Eighteen-seventy-two of Bobcoin spend — forty-seven percent of the hackathon allocation. Every line of code in this repo traces back to a specific Bob IDE task ID."*

> *"The high points: Bob designed the sixteenth HIPAA control end-to-end. Bob wrote the test suite — six-hundred-seventy-nine lines, thirty-three tests, all passing. Bob built `sentinel watch`, the agentic diff scanner that powers the CI gate. Bob added GDPR as a fourth framework in twenty minutes — that's the brief literally satisfied: 'reduce repetitive tasks.'"*

> *"And the one I'd call out specifically — the closed-loop verification step. After Sentinel generates a remediation patch, Bob re-audits the patched files and labels each fix `verified-resolved` or `regression`. The agent verifies its own work. Three dollars sixty-one cents of Bobcoin, and now no bad fix reaches a human reviewer."*

> *"All twelve sessions are in `bob_sessions/` — the markdown export and a screenshot of the consumption summary, paired one-to-one."*

Click.

---

## Slide 7 — Why this matters to IBM (35 sec)

**On-screen:** Compliance is the killer enterprise use case Bob IDE was built for.

> *"This isn't a hackathon demo. This is the enterprise use case Bob IDE was built for. Healthcare, fintech, gov — IBM's existing customer base — can't ship without HIPAA, PCI, FedRAMP, SOC 2. That's a fifty-billion-dollar-a-year industry spend."*

> *"Drop `.bob/custom_modes.yaml` into a customer's editor — they inherit a compliance auditor. No external auditors. No six-month cycles. No spreadsheets."*

> *"Sentinel makes Bob IDE the answer."*

Click.

---

## Slide 8 — Close (15 sec)

**On-screen:** Thank you. github.com/vaatus/sentinel.

> *"Sentinel. Compliance-as-CI for healthcare and fintech. Built with IBM Bob. Try it: clone the repo, `npm install`, `npm run demo`. Thank you."*

---

## If a judge asks…

| Question | Answer |
|---|---|
| *"How much of this is Bob vs you?"* | "Twelve task exports in `bob_sessions/` — every one has a Bob task ID and a consumption summary. The Bob IDE chat designed the §164.310 control, wrote the test suite, built `sentinel watch`, built the verification loop, and stubbed GDPR. I designed the product surface — the three-surface narrative, the framework catalog, the prompts. The split is roughly: I wrote the architecture, Bob wrote the code." |
| *"Is the runtime engine Bob or Claude?"* | "Bob IDE is the development partner per the mandatory hackathon requirement. The runtime engine of the shipped product is Claude Opus 4.7 with prompt caching — but every prompt template was designed inside Bob IDE, and the same templates load into Bob IDE as custom modes. There's no behavioural drift between the IDE and the CLI." |
| *"How do you know the verification actually works?"* | "Run `npm run demo`. The output shows each remediation labelled — currently mock patches return 'regression' because the mock doesn't generate real fixes. Run with `ANTHROPIC_API_KEY` and you see real `verified-resolved` labels. The fact that the mock honestly returns 'regression' is the proof — Sentinel doesn't blindly trust its own patches." |
| *"What if a team uses ISO 27001 or FedRAMP, not HIPAA?"* | "GDPR was the fourth framework Bob added — twenty minutes, twenty cents of Bobcoin spend. The framework definition is a single TypeScript file. Adding ISO or FedRAMP is the same shape: define the controls, register in `frameworks/index.ts`, and the CLI, dashboard, and Bob IDE modes all inherit it." |
| *"What's the limit on this?"* | "Live Claude has a forty-file, eighty-kilobyte budget per call — designed to fit a typical PR diff. For repo-wide scans, we chunk. The bigger limit is that compliance frameworks evolve — but the framework catalog is YAML-style, designed for non-engineers to extend." |
| *"What did Bob get wrong?"* | "In the verification session, Bob's first pass gated the verification on `pr.status === 'applied'`, which never fired on the working-tree-only path. I caught that in the brutal-assessment pass and fixed it — about a thirty-second edit. The receipts include that one too." |

---

## Backup talking points (if you have an extra minute)

- The `init` wizard makes the "ten minutes to install" claim literal — it's not aspirational; it's a real command.
- The CI workflow uses `sentinel watch` (diff-scoped) so PR check time stays under thirty seconds even on a large repo.
- Mock mode runs without an API key — judges can demo it without configuring secrets.
- The PHI tracer is the part where flow-aware reasoning earns its keep — it's the difference between "the logger call leaks PHI" and "the logger call on line 42 of routes/patients.ts is fed by the database fetch on line 17 of db/patient.ts."
- Past IBM hackathon winners — NexusGuardAI, Aegis Agent, DORA Gatekeeper — all won by being autonomous and CFO-quantified. Sentinel is both.
