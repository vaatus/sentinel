# Bob IDE task session exports

This folder holds the **Bob IDE task session reports** required by the
IBM Bob Hackathon (see "Exporting Bob task session reports for judging"
in the official hackathon guide). Judges evaluate teams based on these
exports — not on runtime behaviour of the shipped code.

Every team member uploads their own sessions here.

---

## What goes in this folder

For **each Bob IDE task** that contributed to the project, drop in two
files side by side:

```
bob_sessions/
├── <kebab-case-task-slug>.md          # Exported task history (markdown)
└── <kebab-case-task-slug>.png         # Consumption summary screenshot
```

Naming: use the same slug for both files so the screenshot pairs with
the export. The slug should describe the task (e.g.
`audit-hipaa-controls.md` + `audit-hipaa-controls.png`).

## How to export from Bob IDE

1. Open Bob IDE (signed in to the hackathon-provisioned account — the
   one named `ibm-coding-challenge-xxx`, **not** your personal Bob
   account, to avoid spending Bobcoins from the wrong wallet).
2. In the chat panel, click **Views and More Actions → History**.
3. In **History**, confirm `Workspace: Current` shows the Sentinel
   workspace. Pick the task you want to export.
4. Open the task. Click the task header — the **task session
   consumption summary** appears (Context Length, Task Id, Tokens,
   Cache, API Cost, Size).
5. Screenshot that panel → save as `<slug>.png` in this folder.
6. Click the **Export task history** icon in the same panel → save the
   markdown file as `<slug>.md` in this folder.
7. Repeat for every task that meaningfully shaped the project.

## Suggested first sessions to run

The custom modes in [`.bob/custom_modes.yaml`](../.bob/custom_modes.yaml)
are the natural starting point — Bob IDE supports loading them
verbatim. Concretely:

- **`audit-hipaa-demo-clinic`** — switch Bob into the `hipaa-auditor`
  custom mode, point it at `demo-clinic-app/`, ask for findings. You
  get a real Bob session demonstrating compliance auditing.
- **`trace-phi-demo-clinic`** — same but in `phi-tracer` mode; produce
  a real PHI data-flow trace.
- **`review-controls-catalog`** — ask Bob to code-review
  `packages/cli/src/frameworks/hipaa.ts` for missing controls or weak
  regex prefilters.
- **`generate-tests-findings-store`** — ask Bob to write unit tests
  for `packages/cli/src/orchestrator/findingsStore.ts`.
- **`refactor-bob-runner`** — ask Bob to clean up the priority logic
  in `packages/cli/src/orchestrator/bobRunner.ts`.

Each of those produces a self-contained task history that judges can
read, plus a consumption summary screenshot proving the work happened
inside Bob IDE.

## Security checklist before committing

Per the guide, **any IBM Cloud / Bob credential** found in a public
repo causes immediate account suspension. Before staging exports:

- Open the markdown file and search for `sk-`, `apikey`, `Bearer `,
  `IBM_CLOUD_API_KEY`, the string `crn:v1:bluemix`, and any URL that
  embeds a token. Remove or redact everything that matches.
- Make sure no `.env`, `.envrc`, or credentials file is pasted into the
  conversation history.
- Don't commit screenshots that show your IBMid email or full account
  ID in the consumption summary header — crop them out.

When in doubt, do not commit. Rotate any value that *did* slip into a
public commit before pushing.
