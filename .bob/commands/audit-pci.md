---
description: Run a PCI-DSS v4.0 compliance scan on the current repository
argument-hint: [optional: file glob to scope]
---

Switch to `pci-auditor` mode.

Scan the repository against PCI-DSS v4.0 requirements defined in
`packages/cli/src/frameworks/pci.ts`. Return JSON per the schema in
your mode definition.

Sort by severity (critical first).
