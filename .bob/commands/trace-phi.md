---
description: Trace PHI/PII data flow across the codebase
argument-hint: [optional: starting file glob]
---

Switch to `phi-tracer` mode.

Starting points: every Express/Fastify route handler that references a
`patients`, `appointments`, `mrn`, `ssn`, `dob`, or `phi` symbol or
table. Also include every function parameter named `patient`, `phi`, or
`mrn`.

For each starting point, trace every reachable sink:
- logger calls (any level)
- DB writes (other than the original source table)
- HTTP/fetch calls to external URLs
- File system writes
- HTTP response bodies

Output JSON per the phi-tracer mode schema.
