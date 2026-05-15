---
description: Generate a minimal patch for a specific compliance finding
argument-hint: <finding_id>
---

Switch to `remediation-engineer` mode.

Read the finding with ID `$ARG` from `.sentinel/findings.json`. Generate
a minimal patch that fixes the violation while preserving the public
API contract.

Compute the blast radius: find every caller of any symbol you modify,
every test that references it, every downstream service. List affected
files and the nature of the impact.

Output JSON per the remediation-engineer schema. Do NOT apply the
patch — output the unified diff. The orchestrator applies it.
