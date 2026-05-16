# Demo video script — Sentinel

**Length:** 2:00 · **Format:** screen recording + voice-over · **Tone:** calm, enterprise, evidence-driven.

---

### 0:00 – 0:10 · Title

- **On-screen:** "Sentinel — Compliance Engineering Copilot. Built with IBM Bob."
- **VO:** "Compliance audits cost the Fortune 500 tens of millions every year. Watch what happens when an AI that understands your entire codebase handles them."

### 0:10 – 0:25 · CLI scan

- **On-screen:** Terminal in `demo-clinic-app/`. Type and run:
  ```
  sentinel scan --framework hipaa --path ./demo-clinic-app
  ```
- **Show:** the spinner sequence ("Discovering files…", "Invoking IBM Bob (hipaa-auditor mode)…", "Tracing PHI data flow…"), then the summary box with **score 30 / 100**, 8 critical findings, 5 PHI flows.
- **VO:** "Sentinel was built with IBM Bob IDE — five custom modes for HIPAA, SOC 2, PCI, PHI tracing, and remediation. The same modes that shipped this codebase audit any other codebase you point them at."

### 0:25 – 0:45 · Dashboard

- **On-screen:** `sentinel dashboard`. Show:
  - Overview card with the **30 / 100** red ring + severity breakdown.
  - Findings table — click row → finding detail with file:line, offending code, Bob's explanation, suggested fix.
- **VO:** "Every finding cites the exact HIPAA control, the file and line, and Bob's reasoning. No regex. No guesswork."

### 0:45 – 1:05 · PHI data flow

- **On-screen:** Open `/data-flow`. Pan across the React Flow graph: PHI source (`/api/patients`) → `logger.info()` → `app.log` flagged red.
- **VO:** "This is a live PHI data-flow map across the entire codebase. Watch where patient data ends up — including this logger call, which leaks PHI to standard logs. That's a Section 164.312(b) violation."

### 1:05 – 1:30 · Auto-remediate

- **On-screen:** Back to overview. Click **Auto-remediate with Bob**. The PR list populates as branches are opened. Open one PR — diff, blast radius (which files affected), Bob's rationale.
- **VO:** "The same `remediation-engineer` mode that helped build Sentinel now opens pull requests on the target repo. Each fix ships with a cross-file blast-radius analysis — every file the change touches, every test affected, every downstream service."

### 1:30 – 1:45 · Re-scan

- **On-screen:** Re-run `sentinel scan`. Score jumps to **96 / 100 ✓ AUDIT READY**.
- **VO:** "Sentinel takes a healthcare codebase from 'unauditable' to 'audit-ready' in four minutes."

### 1:45 – 2:00 · Close

- **On-screen:** Three-line card:
  - *What used to take 6 months and $50K of external auditors*
  - *Now runs in your CI on every PR*
  - *Built with IBM Bob IDE — task exports in `bob_sessions/`*
- **VO:** "Built with IBM Bob IDE. Sentinel."
- **End frame:** logo + `github.com/vaatus/sentinel`

---

## Recording notes

- Use a fixed-width font and large terminal (≥18 pt) so judges can read on a phone.
- Pre-warm the demo: `npm run demo` once before recording to populate `.sentinel/findings.json`.
- For the live segment, run with `ANTHROPIC_API_KEY` set so the "live" label appears in the CLI output and the `bob_session_id` on the dashboard is a real ID.
- If timing is tight, the re-scan shot can be trimmed to 5 s — show the before/after numbers side by side.
- **Optional Bob IDE shot (5–10 s, between 0:40 and 0:55):** flip to Bob IDE with `.bob/custom_modes.yaml` open and the `hipaa-auditor` mode highlighted — reinforces that the modes shipped in the repo are the same ones loaded in Bob IDE.
