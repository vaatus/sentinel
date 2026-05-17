# Video recording — day-of checklist

Everything below is pre-verified. Run the commands as written.

---

## Before you hit record (5 minutes of setup)

### 1. Environment

```bash
cd /Users/taha.mersni/sentinel
git checkout -- demo-clinic-app/src/    # restore demo to seeded-violations state
rm -rf demo-clinic-app/.sentinel        # wipe old scan artefacts
npm run build                            # ensure dist/ matches latest source
```

### 2. The `sentinel` command is global

Already done — `npm link` from `packages/cli` was run. Verify:

```bash
which sentinel    # → /Users/taha.mersni/.local/state/.../bin/sentinel
sentinel --version    # → 0.1.0
```

So in the recording you just type `sentinel scan ...`, not the ugly `node packages/cli/dist/index.js`.

### 3. Free port 3000 (or use 3001)

```bash
lsof -ti:3000 | xargs -r kill    # kill anything already on 3000
```

If you skip this, the dashboard will fall back to `:3001` — also fine, just don't be surprised by the URL.

### 4. Fresh repo for the `sentinel init` scene

Already created at `/tmp/sentinel-init-demo`. It's a clean git repo with one dummy file:

```bash
ls /tmp/sentinel-init-demo
# README.md  src/
```

If it's gone (e.g. machine reboot), recreate:

```bash
rm -rf /tmp/sentinel-init-demo
mkdir -p /tmp/sentinel-init-demo && cd /tmp/sentinel-init-demo
git init --quiet
echo "# my-clinic-api" > README.md
mkdir -p src && echo "console.log('hi')" > src/index.js
git add . && git commit -m "Initial commit" --quiet
```

### 5. Open these three terminal windows + one browser tab

| Window | What's in it |
|---|---|
| **Terminal A** (the "demo terminal") | `cd /Users/taha.mersni/sentinel` — for scans + remediate |
| **Terminal B** (the "init wizard terminal") | `cd /tmp/sentinel-init-demo` — for the install scene |
| **Terminal C** (background) | `SENTINEL_TARGET=$(pwd)/demo-clinic-app npm run dashboard` (from sentinel repo) — leave running |
| **Browser tab** | `http://localhost:3000` (or 3001) — kept warm |

All three terminals should be **≥ 18 pt font**, dark theme, monospace (Menlo / Fira Code / JetBrains Mono).

### 6. Bob IDE in a second window (for the 0:45 cutaway)

- Open `.bob/custom_modes.yaml` in Bob IDE → put cursor on the `hipaa-auditor` block.
- Have the chat side-panel open, ready to type `/audit-hipaa` (don't actually run — it costs Bobcoins; just show the autocomplete).

### 7. Screen-recording tool ready

macOS: `Cmd+Shift+5` → Record Selected Portion → choose the demo-terminal area.
Or use OBS / QuickTime / Loom. **Recommend recording at 1920×1080** so YouTube doesn't upscale.

---

## Scene-by-scene commands

Each scene's exact key-strokes are below. **Wait for spinner output to finish before talking over it** — your voice-over comes between commands, not on top of them.

### 🎬 Scene 1 — Title (0:00–0:10)
Static title card. Edit in post — no terminal action needed.

### 🎬 Scene 2 — `sentinel init` (0:10–0:25)
**Terminal B** (`/tmp/sentinel-init-demo`):

```bash
ls    # show empty repo
sentinel init --path .
```

When the wizard prompts:
1. **Frameworks?** → press Space on `hipaa`, `soc2`, `pci`, `gdpr` → Enter
2. **Blocker level?** → keep `critical` → Enter
3. **Install GitHub Actions workflow?** → Enter (Yes)

Then:
```bash
ls -la    # show .bob/, .github/, .sentinel/ all appeared
cat .sentinel/config.json
```

### 🎬 Scene 3 — Four framework scans (0:25–0:45)
**Terminal A** (`/Users/taha.mersni/sentinel`):

```bash
sentinel scan --framework hipaa --path ./demo-clinic-app
sentinel scan --framework soc2  --path ./demo-clinic-app
sentinel scan --framework pci   --path ./demo-clinic-app
sentinel scan --framework gdpr  --path ./demo-clinic-app
```

Expected scores: **HIPAA 4** · **SOC 2 76** · **PCI 68** · **GDPR 76**.

### 🎬 Scene 4 — Bob IDE cutaway (0:45–0:55)
Switch to Bob IDE window. Slowly mouse across the `hipaa-auditor` block in `.bob/custom_modes.yaml`. Type `/audit-hipaa` into the chat box but **don't press Enter** — just show the autocomplete and the mode picker. (Costs nothing.)

### 🎬 Scene 5 — Dashboard (0:55–1:15)
Switch to browser. URL should already be loaded.

1. **Overview page** — point at the score ring (HIPAA 4/100 if you scanned hipaa last; otherwise whichever was last). Severity breakdown chart visible.
2. **Findings page** → click any row → finding detail with code snippet + Bob's remediation hint.
3. **`/data-flow`** → PHI flow graph. Zoom in on one PHI-source-to-sink edge.

### 🎬 Scene 6 — Remediate + verification (1:15–1:40)
**Terminal A:**

```bash
sentinel remediate --all --path ./demo-clinic-app --apply
```

Watch each remediation roll past. Each one shows:
```
✔ Applied to working tree  sentinel/fix-<id>  • neutral  (blast radius: 1 files)
```

> **Important to know:** In mock mode (no `ANTHROPIC_API_KEY`), Bob's mock patches don't actually fix the violations, so verification correctly returns `regression` (red). **That's the demo gold** — the agent honestly flags its own bad patches. Lead with this in the VO.

Then **back to browser → `/prs` page** → show the verification badges next to each PR row.

### 🎬 Scene 7 — PR gate on GitHub (1:40–1:55)
Open `https://github.com/vaatus/sentinel/pulls` in a new tab. If there's no open PR right now, you'll need one:

```bash
# Create a throwaway branch + push it to trigger the workflow
git checkout -b demo-bad-pr-$(date +%s)
echo 'logger.info(`patient ${name}`);' >> demo-clinic-app/src/server.ts
git add demo-clinic-app/src/server.ts && git commit -m "Add demo violation"
git push -u origin HEAD
gh pr create --title "Demo: add patient logger" --body "Recording shot for the video" --base claude/sentinel-compliance-auditor-OKV5U
```

Wait ~60 seconds for the workflow to run. Then **show the sticky comment + the red failing check on the PR.**

(After recording: close the PR, delete the branch — `gh pr close --delete-branch <num>`.)

### 🎬 Scene 8 — Close (1:55–2:00)
Static end card with logo + URL + tagline. Edit in post.

---

## Pre-flight final checks (60 seconds before recording)

```bash
# Run this exact block — if anything errors, fix before rolling
cd /Users/taha.mersni/sentinel
git checkout -- demo-clinic-app/src/
rm -rf demo-clinic-app/.sentinel
sentinel scan --framework hipaa --path ./demo-clinic-app > /dev/null && echo "✓ scan works"
curl -fs http://localhost:3000 > /dev/null 2>&1 || curl -fs http://localhost:3001 > /dev/null 2>&1 && echo "✓ dashboard up" || echo "✗ DASHBOARD DOWN — start it"
ls /tmp/sentinel-init-demo/.git > /dev/null && echo "✓ init demo repo ready" || echo "✗ init demo repo missing"
```

---

## After recording

1. Trim to 2:00 max.
2. Bump VO levels to around −12 dB. No music.
3. Add subtitles (YouTube auto-captions are fine if your audio is clean).
4. Upload as **Unlisted** to YouTube.
5. Title: `Sentinel — Compliance-as-CI built with IBM Bob IDE`.
6. Paste URL into `docs/SUBMISSION.md` under "Demo video".
7. Close any throwaway PRs from Scene 7.
8. Delete the recording target: `rm -rf /tmp/sentinel-init-demo`.
9. Commit final state + push.

---

## Backup plan (if a scene fails on-camera)

| Failure | Recovery |
|---|---|
| `sentinel init` hangs | Press Ctrl-C, re-run. The wizard is idempotent. |
| Dashboard shows stale data | `rm -rf demo-clinic-app/.sentinel`, re-run a scan, browser refresh. |
| Workflow on GitHub hasn't run yet | Skip the GitHub scene; replace with `sentinel watch --base HEAD~1 --format markdown` in Terminal A — produces the same PR-comment body locally. |
| Remediate produces 0 fixes | You haven't scanned first. Run `sentinel scan ...` then re-run remediate. |
| Bob IDE chat is empty | Open `.bob/custom_modes.yaml` in any editor — same visual story. |

---

## File index for the video description

Copy this block into the YouTube video description:

```
Sentinel — Compliance-as-CI for healthcare and fintech.
Built with IBM Bob IDE for the IBM Bob Hackathon (May 2026).

Repo:           https://github.com/vaatus/sentinel
Bob sessions:   https://github.com/vaatus/sentinel/tree/main/bob_sessions
Pitch deck:     https://github.com/vaatus/sentinel/blob/main/docs/PITCH_DECK.pdf
Brief deck:     https://github.com/vaatus/sentinel/blob/main/docs/PITCH_DECK_BRIEF.pptx

12 Bob IDE task sessions · $18.72 / 40 Bobcoins · 30 compliance controls
across 4 frameworks (HIPAA, SOC 2, PCI, GDPR).
```
