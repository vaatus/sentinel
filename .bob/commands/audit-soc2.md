---
description: Run a SOC2 Type II compliance scan on the current repository
argument-hint: [optional: file glob to scope]
---

Switch to `soc2-auditor` mode.

Scan the repository against the SOC2 Common Criteria controls (CC6
access control, CC7 system operations, CC8 change management) defined
in `packages/cli/src/frameworks/soc2.ts`. Return JSON per the schema
in your mode definition.

Sort by severity (critical first).
