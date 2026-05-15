---
description: Run a full HIPAA compliance scan on the current repository
argument-hint: [optional: file glob to scope, e.g., "src/**/*.ts"]
---

Switch to `hipaa-auditor` mode.

Scan the repository (or the files matching the provided glob, if any)
against the 15 HIPAA controls defined in
`packages/cli/src/frameworks/hipaa.ts`. For each finding, return JSON
per the schema in your mode definition. Do not skip any control even if
you find nothing — return an empty array for that control.

Group findings by control. Sort by severity (critical first).
