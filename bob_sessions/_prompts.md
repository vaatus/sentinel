# Bob IDE prompts — paste these verbatim

Run these in **Bob IDE** signed into the `ibm-coding-challenge-xxx`
account, one task per session. After each task: screenshot the
consumption summary, export the task history, and save both into
`bob_sessions/` with the slug listed under each prompt.

Order matters — later prompts assume earlier ones produced files.

---

## 1 · `audit-hipaa-demo-clinic` — run the hipaa-auditor mode end-to-end

**Mode:** switch to `hipaa-auditor` (loaded from `.bob/custom_modes.yaml`).

**Paste:**

```
/audit-hipaa

Scope: scan every file under @demo-clinic-app/src/. Apply each of the 15
controls defined in @packages/cli/src/frameworks/hipaa.ts. For each
finding, use the exact JSON schema in your hipaa-auditor mode
definition — no preamble, no markdown fences.

After the JSON, add a short prose section titled "Auditor notes" that
explains which two controls were the highest-leverage to detect (why
they matter clinically, not just legally) and which one you found
hardest to detect from code alone.
```

**Expected output:** JSON `{ findings: [...], scanned_files, summary }`
with ~15–20 findings, plus the prose. Save as
`bob_sessions/audit-hipaa-demo-clinic.{md,png}`.

---

## 2 · `add-164-310-control` — add a real HIPAA control end-to-end

**Mode:** default `Code` mode.

**Paste:**

```
Add a 16th HIPAA control to this codebase: §164.310(a)(1) — Facility
Access Controls. The detection idea: flag any code that opens or binds
a network listener on 0.0.0.0 or all interfaces without an explicit
allow-list, or any HTTP server with no rate-limit / IP-restriction
middleware, when the same module also touches PHI.

Concretely:

1. Add the new control to @packages/cli/src/frameworks/hipaa.ts
   following the existing Control type — id "164.310(a)(1)",
   appropriate severity_default, regex_prefilters that catch
   `app.listen(`, `server.listen(`, `0.0.0.0`, and `host:`, and a
   well-written bob_prompt_template.

2. Add a mock detection branch in
   @packages/cli/src/orchestrator/mockBob.ts so a scan without an
   ANTHROPIC_API_KEY still finds this violation in
   @demo-clinic-app/src/server.ts.

3. Seed the violation in @demo-clinic-app/src/server.ts if it isn't
   already a clear violation — adjust the existing listen call so the
   new control fires.

4. Update @CLAUDE.md and @README.md control counts if they cite a
   number.

5. Run a dry trace in your head of what `node packages/cli/dist/index.js
   scan --framework hipaa --path ./demo-clinic-app --json` will now
   return and tell me how many findings the demo will produce after
   this change.

Show me the unified diff for each file before applying, then apply.
```

**Expected output:** real edits to 3–4 files, a working new control,
an explanation of the new finding count. **This is the most defensible
single artifact for judging** — it's a concrete code change that
visibly came out of a Bob task.

Save as `bob_sessions/add-164-310-control.{md,png}`. After applying,
commit the change with a message referencing this session.

---

## 3 · `tests-findings-store` — generate a real test suite

**Mode:** default `Code` mode.

**Paste:**

```
@packages/cli/src/orchestrator/findingsStore.ts has no tests today, but
it's the persistence + scoring backbone of the CLI. Build a real test
suite for it.

Constraints:
- Use Node's built-in test runner (node:test + node:assert/strict) so
  we don't introduce a new dependency.
- Tests live at packages/cli/src/orchestrator/findingsStore.test.ts and
  are runnable via `node --test --import tsx`. Update
  @packages/cli/package.json with an npm "test" script and add tsx to
  devDependencies.
- Cover: createScanRun + finalizeScanRun round-trip, insertFindings +
  findingsForRun ordering by severity, insertDataFlows + flowsForRun
  parsing, exportToJson writing both findings.json and remediations.json,
  and computeScore — including the 100-floor and 0-floor.
- Each test creates its own temp directory (node:fs/mkdtempSync) so
  tests don't share a SQLite file.
- Add at least one failing-input test (e.g., scoring an empty array
  returns 100; an unknown severity throws or is treated as 0).

Show me the test file in full, the package.json diff, and a paragraph
about coverage gaps you didn't address.
```

**Expected output:** a new test file (~150–250 LOC), package.json
diff, and a coverage-gaps paragraph. Save as
`bob_sessions/tests-findings-store.{md,png}`.

---

## 4 · `refactor-bob-runner-dirty-tree` — fix a real bug

**Mode:** default `Code` mode.

**Paste:**

```
@packages/cli/src/git/prGenerator.ts lines 58–63 silently no-op when the
working tree is dirty — `filesChanged` returns as []. This is the bug
that made `sentinel remediate --all` look like it succeeded but produce
zero file changes in earlier scans.

Refactor this so:

1. The function still never commits onto a dirty branch (preserve the
   safety guarantee).
2. But it now (a) returns a structured result that includes a `status`
   field — one of `applied`, `skipped:dirty-tree`, `skipped:not-a-repo`,
   `applied:working-tree-only` — and (b) writes the would-be patch to
   .sentinel/patches/<finding-id>.patch even when it skips, so the
   developer has something to apply manually.
3. @packages/cli/src/commands/remediate.ts surfaces the new status
   prominently when --json is off (use chalk like the rest of the file)
   and includes the status in the JSON output when --json is on.
4. @packages/dashboard/app/prs/page.tsx renders a yellow "needs manual
   apply" badge for any remediation whose status is not `applied` —
   add a new `status` field to the remediation JSON written by
   @packages/cli/src/orchestrator/findingsStore.ts and surface it in
   the dashboard.

Show me each diff, then apply. Tell me what tests in the suite from the
previous task should be extended to cover this.
```

**Expected output:** edits across 4 files, a real bug fix, an
integration-with-tests recommendation. Save as
`bob_sessions/refactor-bob-runner-dirty-tree.{md,png}`.

---

## 5 · `controls-catalog-review` — code review the heart of the project

**Mode:** default `Ask` mode (read-only review).

**Paste:**

```
Review @packages/cli/src/frameworks/hipaa.ts as if you were an
experienced HIPAA Security Rule auditor seeing it for the first time.

Be specific:

1. List every control where the regex_prefilters would produce
   significant false positives in a real healthcare codebase. For each,
   propose a tighter regex AND a negative_filter (negative-look-behind
   or excluded path glob) that would suppress the common false hit.

2. List every control where the regex_prefilters would *miss* a real
   violation. For each, give a concrete code snippet that should fire
   the control but doesn't.

3. Is anything in this catalog that isn't actually a HIPAA Security
   Rule violation (e.g., a Privacy Rule §164.502 issue mis-labeled as
   §164.312)? Call it out by ID.

4. What two controls are the highest-impact additions we could make in
   under 30 minutes of work? Don't write the code — just describe the
   prefilter + prompt for each.

End with a one-paragraph summary of whether this catalog is
defensible in front of a real auditor today, and what specifically
would need to change before it is.
```

**Expected output:** a structured code review with specific
filename:line references and concrete code snippets. This is a pure
*reasoning* session — judges love these for "Bob explains logic with
clarity". Save as `bob_sessions/controls-catalog-review.{md,png}`.

---

## 6 · `generate-control-docs` — repetitive doc work, automated

**Mode:** default `Code` mode.

**Paste:**

```
Generate per-control reference documentation. For every control in
@packages/cli/src/frameworks/hipaa.ts, @packages/cli/src/frameworks/soc2.ts,
and @packages/cli/src/frameworks/pci.ts, create a markdown file at
docs/controls/<framework>/<control-id-slug>.md with this shape:

  # <control id> — <title>
  **Framework:** HIPAA Security Rule | SOC2 TSC | PCI-DSS v4.0
  **Severity default:** <severity>

  ## What this control requires
  <2–3 sentences in plain English — what is the regulator asking for?>

  ## How Sentinel detects it
  <Explain the regex_prefilters and what the bob_prompt_template asks
   the auditor mode to check. Quote the regex patterns inline.>

  ## Example violation
  ```ts
  <a 3–6 line code snippet that the detector would fire on>
  ```

  ## Example remediation
  ```ts
  <the corrected version of the snippet>
  ```

  ## Related controls
  <bullet list of other controls in the same framework that often
   co-occur with this one>

Generate ALL of them — don't ask me which subset to do. After
generating, add a docs/controls/README.md that links to every file
grouped by framework.

Then update @README.md to add a "Control reference" section that
points to docs/controls/.
```

**Expected output:** ~25 new markdown files, a docs index, and a
README update. This is the **"reduce effort on repetitive tasks"**
brief example, demonstrated concretely. Save as
`bob_sessions/generate-control-docs.{md,png}`.

---

## 7 · `add-watch-mode` — the agentic upgrade (highest-leverage)

**Mode:** default `Code` mode.

**Why this one matters:** the existing CLI is invocation-driven (a developer types `sentinel scan`). Past IBM hackathon winners — NexusGuardAI, the Aegis Agent, DORA Gatekeeper — all won by being **autonomous**: the agent watches and acts. This task closes Sentinel's biggest gap by adding a diff-scoped, autonomous scan mode that the GitHub Actions workflow (`.github/workflows/sentinel-pr-check.yml`) calls on every PR.

**Paste:**

```
Add a new subcommand: `sentinel watch`. It is the agentic mode of
Sentinel — it scans only the files changed in a git diff and emits the
result in three formats designed for autonomous use in CI, in editors,
and in chat.

Concretely:

1. Add a new file @packages/cli/src/commands/watch.ts that exports
   runWatch({ path, base, framework, format }) where:
   - path:     target repo (default: cwd)
   - base:     git ref to diff against (default: "origin/main", with a
               fallback to "HEAD~1" if origin/main isn't reachable)
   - framework: same as scan (default: hipaa)
   - format:   "json" | "github-actions" | "markdown"  (default: "json")

2. Inside runWatch:
   - Use simple-git to list files that differ between HEAD and base.
   - Filter to the same extensions that discoverFiles() handles.
   - Call the same runAudit() pipeline scan.ts uses, but on the
     diffed file list only — do NOT re-scan the whole repo.
   - Compute the score across just those findings.

3. Format outputs:
   - "json" -> the same shape as `sentinel scan --json`.
   - "github-actions" -> one line per finding in the form
     `::error file=<file>,line=<line>,title=<control>::<explanation>`
     (use ::warning:: for medium, ::notice:: for low). This is the
     format GitHub Actions consumes natively to annotate the PR diff.
   - "markdown" -> a sticky-comment-style block with a summary table
     and a bulleted list of findings, suitable for posting back as a
     PR comment via gh api.

4. Wire the command into @packages/cli/src/index.ts following the
   existing commander pattern. Update the @README.md "What this gets
   you" section to mention `sentinel watch`.

5. Update @.github/workflows/sentinel-pr-check.yml to call
   `sentinel watch --format github-actions` for the inline diff
   annotations and `sentinel watch --format markdown` for the sticky
   comment body — so the workflow uses the diff-scoped scan path
   instead of scanning the whole repo on every PR.

6. Add a 3–5 case test in
   @packages/cli/src/orchestrator/findingsStore.test.ts (or a new
   file) that exercises runWatch against a fixture git repo using the
   mock runner — confirm that only diffed files are scanned and that
   each format renders the expected output.

Tell me the diff for every file, then apply. Show me the test output
afterwards.
```

**Expected output:** new `watch.ts` file (~150-250 LOC), commander
wiring, updated workflow, tests, ~$0.80-$1.50 Bobcoin spend. Save as
`bob_sessions/add-watch-mode.{md,png}`.

**This becomes the new strongest single piece of evidence** for the
submission — it's the agentic feature, built by Bob, that lifts
Sentinel from "scanner" to "agent."

---

## 8 · `gdpr-stub` — prove the extensibility claim (low-cost)

**Mode:** default `Code` mode.

**Paste:**

```
Sentinel claims to be "extensible to any compliance regime." Prove it
by stubbing a 4th framework: GDPR Article 32 (security of processing).

Concretely:

1. Add @packages/cli/src/frameworks/gdpr.ts following the existing
   pattern in @packages/cli/src/frameworks/hipaa.ts. Include 4
   controls minimum:
     - Article 32(1)(a) — Pseudonymisation and encryption
     - Article 32(1)(b) — Confidentiality, integrity, availability
     - Article 32(1)(d) — Regular testing & evaluation
     - Article 33     — Notification of personal data breach
   Each needs a Control object with id, title, severity_default,
   regex_prefilters, and bob_prompt_template.

2. Register gdpr in @packages/cli/src/frameworks/index.ts and update
   the Framework type in @packages/cli/src/types.ts.

3. Add one mockBob detection branch for any one control in
   @packages/cli/src/orchestrator/mockBob.ts so a mock-mode scan
   still finds at least one GDPR violation in demo-clinic-app.

4. Update @packages/cli/src/index.ts to accept "gdpr" as a valid
   --framework value.

5. Generate per-control docs at docs/controls/gdpr/*.md following
   the existing format. Update docs/controls/README.md and the
   @README.md "Control reference" section with the new framework.

6. Confirm that `node packages/cli/dist/index.js scan --framework
   gdpr --path ./demo-clinic-app --json` runs cleanly and produces
   at least one finding.

Show me the diff for each file, then apply. Run the scan at the end
and report the finding count.
```

**Expected output:** new framework + 4 control docs + scan that
produces real findings, ~$0.50-$1.00 Bobcoin spend. Save as
`bob_sessions/gdpr-stub.{md,png}`.

**Why it matters:** judges will ask "what about GDPR / FedRAMP / ISO?"
This is the 30-minute receipt that Sentinel actually extends.

---

## After all eight tasks

1. Run `npm test` (if task 3 added a test script). Paste the output as a
   final session — `verify-test-suite-passes.{md,png}` — so judges see
   that Bob-generated code actually runs.
2. Run `npm run build` and `npm run build:dashboard` to confirm the
   refactor from task 4 didn't break anything. If it did, run a fix
   session and export that too.
3. Stage every Bob-edited file plus `bob_sessions/`, commit, push.
4. Write the final commit message as:

   ```
   Add Bob IDE task session exports + Bob-generated changes

   Six task sessions in bob_sessions/ document the Bob IDE work that
   produced the changes in this commit:
     - audit-hipaa-demo-clinic    : ran the hipaa-auditor custom mode
     - add-164-310-control        : added a 16th HIPAA control end-to-end
     - tests-findings-store       : generated the unit-test suite
     - refactor-bob-runner-dirty  : fixed the dirty-tree no-op bug
     - controls-catalog-review    : reviewed the control catalog
     - generate-control-docs      : authored per-control reference docs
   ```

## Credential hygiene reminder

Before staging any export:

- Open each `.md` file and search for `sk-`, `Bearer `, `apikey`,
  `IBM_CLOUD_API_KEY`, `crn:v1:bluemix`. Redact or delete.
- Crop screenshots so your IBMid email and full Task ID don't leak.
