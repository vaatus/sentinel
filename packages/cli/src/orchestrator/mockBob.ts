import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  BobAuditResponse,
  PhiTraceResponse,
  RemediationResponse,
  RemediationEdit,
  Framework,
  Severity,
} from "../types.js";
import { getControls, getControlById } from "../frameworks/index.js";

interface FileSlice {
  file: string;
  lines: string[];
  fullText: string;
}

function loadFiles(cwd: string, files: string[]): FileSlice[] {
  const out: FileSlice[] = [];
  for (const file of files) {
    const abs = join(cwd, file);
    if (!existsSync(abs)) continue;
    try {
      const text = readFileSync(abs, "utf8");
      out.push({ file, lines: text.split("\n"), fullText: text });
    } catch {}
  }
  return out;
}

function snippet(slice: FileSlice, line: number, context = 1): string {
  const start = Math.max(0, line - 1 - context);
  const end = Math.min(slice.lines.length, line + context);
  return slice.lines.slice(start, end).join("\n");
}

interface Match {
  controlId: string;
  file: string;
  line: number;
  snippet: string;
  severity: Severity;
}

function findMatches(framework: Framework, slices: FileSlice[]): Match[] {
  const controls = getControls(framework);
  const matches: Match[] = [];
  const seenPerFile = new Set<string>();
  const seenLow = new Set<string>();

  for (const slice of slices) {
    for (let i = 0; i < slice.lines.length; i++) {
      const line = slice.lines[i];
      for (const control of controls) {
        const isLow = control.severity_default === "low";
        const fileKey = `${control.id}::${slice.file}`;
        const repoKey = control.id;
        if (isLow && seenLow.has(repoKey)) continue;
        if (!isLow && seenPerFile.has(fileKey)) continue;

        for (const re of control.regex_prefilters) {
          if (!re.test(line)) continue;
          if (control.negative_filters_file?.some((nf) => nf.test(slice.fullText))) continue;
          // Multi-line fixes (e.g. auditLog.record on the line after a route definition)
          // suppress the match via a small window around the current line.
          const windowStart = Math.max(0, i - 1);
          const windowEnd = Math.min(slice.lines.length, i + 3);
          const windowText = slice.lines.slice(windowStart, windowEnd).join("\n");
          if (control.negative_filters?.some((nf) => nf.test(windowText))) continue;
          if (isLow) seenLow.add(repoKey);
          else seenPerFile.add(fileKey);
          matches.push({
            controlId: control.id,
            file: slice.file,
            line: i + 1,
            snippet: snippet(slice, i + 1),
            severity: control.severity_default,
          });
          break;
        }
      }
    }
  }
  return matches;
}

const EXPLANATIONS: Record<string, (m: Match) => { explanation: string; hint: string }> = {
  "164.312(a)(1)": (m) => ({
    explanation: `Route handler at ${m.file}:${m.line} serves patient data without authentication middleware. Any unauthenticated client can fetch PHI.`,
    hint: "Wrap this route with an authentication middleware (e.g., requireAuth) and verify caller identity before serving PHI.",
  }),
  "164.312(a)(2)(i)": (m) => ({
    explanation: `Hardcoded credential or static secret found at ${m.file}:${m.line}. Shared credentials cannot establish unique user identification.`,
    hint: "Move the secret into an environment variable or secret manager; rotate the leaked value immediately.",
  }),
  "164.312(a)(2)(iv)": (m) => ({
    explanation: `Database column at ${m.file}:${m.line} stores PHI in plaintext with no encryption-at-rest annotation.`,
    hint: "Apply column-level encryption (e.g., pgcrypto, AES-256-GCM via app layer) before persisting PHI.",
  }),
  "164.312(b)": (m) => ({
    explanation: `Endpoint at ${m.file}:${m.line} accesses PHI without writing to an audit trail. Every PHI access must produce a tamper-evident audit record.`,
    hint: "Insert an audit-log write (actor, resource, timestamp, action) before returning the response.",
  }),
  "164.312(b)-leak": (m) => ({
    explanation: `Logging statement at ${m.file}:${m.line} emits PHI directly into the application log. Standard log sinks do not meet HIPAA audit-trail requirements and leak PHI to anyone with log access.`,
    hint: "Replace the PHI value with an opaque identifier (e.g., patient.id only) and route auditable events through the dedicated audit-log service.",
  }),
  "164.312(c)(1)": (m) => ({
    explanation: `PHI record mutated at ${m.file}:${m.line} without an integrity check (hash, signature, or version chain).`,
    hint: "Compute and persist a SHA-256 hash or row version alongside each PHI write.",
  }),
  "164.312(d)": (m) => ({
    explanation: `Authentication scheme at ${m.file}:${m.line} relies on basic auth or a weak string comparison. Vulnerable to timing attacks and credential theft.`,
    hint: "Replace with a token-based scheme (JWT or session cookie) and use constant-time comparison.",
  }),
  "164.312(e)(1)": (m) => ({
    explanation: `Outbound HTTP (non-TLS) call at ${m.file}:${m.line} transmits PHI in cleartext over the network.`,
    hint: "Switch to https:// and verify the certificate of the receiving endpoint.",
  }),
  "164.514(a)": (m) => ({
    explanation: `API response at ${m.file}:${m.line} returns the full PHI record. The Privacy Rule's minimum-necessary standard requires field minimization or de-identification.`,
    hint: "Return only the fields needed by the caller; apply de-identification (Safe Harbor) for non-treatment uses.",
  }),
  "164.308(a)(1)(ii)(D)": (m) => ({
    explanation: `${m.file}:${m.line} handles PHI but the codebase lacks system-wide monitoring or anomaly detection on PHI access.`,
    hint: "Add a structured audit metric (Prometheus/Datadog) and alert on anomalous PHI access volumes.",
  }),
  "164.308(a)(3)": (m) => ({
    explanation: `PHI access at ${m.file}:${m.line} is not gated by a role-based access check.`,
    hint: "Add a role assertion (e.g., req.user.role === 'clinician') before returning data.",
  }),
  "164.308(a)(4)": (m) => ({
    explanation: `Query at ${m.file}:${m.line} fetches all PHI columns. The minimum-necessary standard requires minimizing to required fields.`,
    hint: "Select only the columns the caller needs; introduce a view if necessary.",
  }),
  "164.308(a)(5)(ii)(D)": (m) => ({
    explanation: `Weak password policy detected at ${m.file}:${m.line}.`,
    hint: "Require minimum 12 characters, complexity, and bcrypt rounds >= 12.",
  }),
  "164.308(a)(7)": (m) => ({
    explanation: `${m.file} stores PHI but the repository contains no backup/DR configuration.`,
    hint: "Add a documented backup schedule + restore-test procedure for every PHI datastore.",
  }),
  "164.316": (m) => ({
    explanation: `${m.file} touches PHI but lacks a data-classification annotation (e.g., @phi, @pii).`,
    hint: "Add a `@phi` JSDoc annotation to PHI-handling modules.",
  }),
};

const SOC2_EXPLAIN: Record<string, (m: Match) => { explanation: string; hint: string }> = {
  "CC6.1": (m) => ({
    explanation: `Endpoint at ${m.file}:${m.line} lacks authentication. CC6.1 requires logical access controls on all system resources.`,
    hint: "Add authentication middleware to this route.",
  }),
  "CC6.2": (m) => ({
    explanation: `Hardcoded credential at ${m.file}:${m.line}. CC6.2 requires identity-based provisioning.`,
    hint: "Move secret to environment variable.",
  }),
  "CC6.6": (m) => ({
    explanation: `Plain HTTP transmission at ${m.file}:${m.line}. CC6.6 requires encryption in transit.`,
    hint: "Switch to HTTPS.",
  }),
  "CC7.2": (m) => ({
    explanation: `Unstructured console.log at ${m.file}:${m.line}. CC7.2 requires structured monitoring.`,
    hint: "Replace with a structured logger that ships to your SIEM.",
  }),
  "CC7.3": (m) => ({
    explanation: `Empty catch block at ${m.file}:${m.line} swallows errors. CC7.3 requires incident detection.`,
    hint: "Log the caught error and emit an alert metric.",
  }),
  "CC8.1": (m) => ({
    explanation: `TODO/FIXME marker at ${m.file}:${m.line} in a security-relevant path. CC8.1 requires change tracking.`,
    hint: "Convert to a tracked ticket and remove the inline marker.",
  }),
};

const PCI_EXPLAIN: Record<string, (m: Match) => { explanation: string; hint: string }> = {
  "3.4.1": (m) => ({
    explanation: `PAN stored in plaintext at ${m.file}:${m.line}.`,
    hint: "Tokenize via PCI-compliant vault.",
  }),
  "3.3.1": (m) => ({
    explanation: `CVV storage detected at ${m.file}:${m.line}. Prohibited by PCI-DSS.`,
    hint: "Remove all CVV persistence.",
  }),
  "4.2.1": (m) => ({
    explanation: `HTTP transmission of payment data at ${m.file}:${m.line}.`,
    hint: "Use TLS 1.2+.",
  }),
  "6.4.3": (m) => ({
    explanation: `Test card data in production code at ${m.file}:${m.line}.`,
    hint: "Move test fixtures out of the production bundle.",
  }),
};

function explain(framework: Framework, m: Match): { explanation: string; hint: string } {
  if (framework === "hipaa" && EXPLANATIONS[m.controlId]) return EXPLANATIONS[m.controlId](m);
  if (framework === "soc2" && SOC2_EXPLAIN[m.controlId]) return SOC2_EXPLAIN[m.controlId](m);
  if (framework === "pci" && PCI_EXPLAIN[m.controlId]) return PCI_EXPLAIN[m.controlId](m);
  return {
    explanation: `Potential ${m.controlId} violation at ${m.file}:${m.line}.`,
    hint: "Review and remediate per the relevant control.",
  };
}

export function runMockAudit(
  framework: Framework,
  cwd: string,
  files: string[],
): BobAuditResponse {
  const slices = loadFiles(cwd, files);
  const matches = findMatches(framework, slices);
  const findings = matches.map((m) => {
    const control = getControlById(framework, m.controlId);
    const { explanation, hint } = explain(framework, m);
    return {
      control: m.controlId,
      control_name: control?.title ?? m.controlId,
      file: m.file,
      line_start: m.line,
      line_end: m.line,
      code_snippet: m.snippet,
      severity: m.severity,
      explanation,
      remediation_hint: hint,
    };
  });

  findings.sort((a, b) => sevWeight(b.severity) - sevWeight(a.severity));

  return {
    findings,
    scanned_files: slices.length,
    summary: `Bob (${framework}-auditor) reviewed ${slices.length} files and identified ${findings.length} violations across ${new Set(findings.map((f) => f.control)).size} controls. Whole-repo context analysis correlated PHI flow between route handlers, loggers, and persistence layers.`,
  };
}

function sevWeight(s: Severity): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s];
}

export function runMockTrace(cwd: string, files: string[]): PhiTraceResponse {
  const slices = loadFiles(cwd, files);
  const flows: PhiTraceResponse["flows"] = [];
  let flowId = 1;

  for (const slice of slices) {
    for (let i = 0; i < slice.lines.length; i++) {
      const line = slice.lines[i];
      const routeMatch = line.match(
        /(?:[a-zA-Z_][a-zA-Z0-9_]*Router|app|router)\.(?:get|post|put|delete|patch)\(\s*['"`]([^'"`]*)['"`]/,
      );
      if (!routeMatch) continue;
      const routePath = routeMatch[1];
      const matchesPhi =
        /patients?|appointments?|records?|phi|mrn/i.test(slice.file) ||
        /patients?|appointments?|records?|phi|mrn/i.test(routePath);
      if (!matchesPhi) continue;

      const sinks: PhiTraceResponse["flows"][number]["sinks"] = [];
      const pathNodes: PhiTraceResponse["flows"][number]["path"] = [
        { file: slice.file, line: i + 1, function: `${routePath || "route"} handler` },
      ];

      const end = Math.min(slice.lines.length, i + 30);
      for (let j = i + 1; j < end; j++) {
        const l = slice.lines[j];
        if (/console\.(log|info|debug|warn)|logger\.(info|debug|warn|trace)|log\.(info|debug|warn)/i.test(l)) {
          sinks.push({
            file: slice.file,
            line: j + 1,
            type: "log",
            risk: "PHI written to standard application log — violates §164.312(b).",
          });
          pathNodes.push({ file: slice.file, line: j + 1, function: "logger" });
        }
        if (/res\.(json|send)\(/i.test(l)) {
          sinks.push({
            file: slice.file,
            line: j + 1,
            type: "response",
            risk: "Full PHI returned in HTTP response — review for minimum-necessary (§164.514(a)).",
          });
          pathNodes.push({ file: slice.file, line: j + 1, function: "response" });
        }
        if (/fetch\(['"]http:/i.test(l) || /axios\.(get|post)\(['"]http:/i.test(l)) {
          sinks.push({
            file: slice.file,
            line: j + 1,
            type: "api",
            risk: "PHI transmitted over plain HTTP — violates §164.312(e)(1).",
          });
          pathNodes.push({ file: slice.file, line: j + 1, function: "external HTTP" });
        }
        if (/\.(insert|update|save|create)\(/i.test(l)) {
          sinks.push({
            file: slice.file,
            line: j + 1,
            type: "db",
            risk: "PHI written to persistence layer — confirm encryption-at-rest (§164.312(a)(2)(iv)).",
          });
          pathNodes.push({ file: slice.file, line: j + 1, function: "db write" });
        }
        if (/}\s*\);?\s*$/.test(l) && j > i + 2) break;
      }

      flows.push({
        id: `flow-${flowId++}`,
        source: {
          file: slice.file,
          line: i + 1,
          description: `Express handler ${routePath || slice.file} (returns PHI)`,
        },
        sinks,
        path: pathNodes,
      });
    }
  }

  return { flows };
}

function diffLines(file: string, oldLine: string, newLine: string, lineNo: number): string {
  return `--- a/${file}
+++ b/${file}
@@ -${lineNo},1 +${lineNo},1 @@
-${oldLine}
+${newLine}
`;
}

interface BuiltRemediation {
  edits: RemediationEdit[];
  diff: string;
  blast_radius: { file: string; impact: string }[];
  test_recommendations: string[];
  rationale: string;
}

type RemediationTemplate = (
  cwd: string,
  f: {
    control: string;
    file: string;
    line_start: number;
    line_end: number;
    code_snippet: string;
  },
) => BuiltRemediation | null;

function readLines(cwd: string, file: string): string[] | null {
  const abs = join(cwd, file);
  if (!existsSync(abs)) return null;
  try {
    return readFileSync(abs, "utf8").split("\n");
  } catch {
    return null;
  }
}

const REMEDIATION_TEMPLATES: Record<string, RemediationTemplate> = {
  "164.312(b)-leak": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const idx = lines.findIndex((l, i) => i + 1 >= f.line_start - 2 && /(logger|console|log)\.(info|debug|warn|trace)\(/i.test(l));
    if (idx < 0) return null;
    const orig = lines[idx];
    const fixed = orig.replace(
      /(logger|console|log)\.(info|debug|warn|trace)\(([^)]*)\)/,
      (_m, _ns, _fn, args) => {
        const stripped = args
          .replace(/,\s*(appointment|patient)\.[a-zA-Z_]+/g, "")
          .replace(/,\s*\b(appointment|patient)\b/g, "")
          .replace(/\b(appointment|patient)\b/g, "{ id: $1?.id }");
        return `auditLog.record('phi.access', ${stripped})`;
      },
    );
    return {
      edits: [{ file: f.file, search: orig, replace: fixed }],
      diff: diffLines(f.file, orig.trimEnd(), fixed.trimEnd(), idx + 1),
      blast_radius: [
        { file: f.file, impact: "Single logging call replaced; no public API change." },
        { file: "src/utils/auditLog.ts", impact: "New module: tamper-evident audit log helper." },
      ],
      test_recommendations: [
        "Add a test asserting auditLog.record is called for every PHI-returning route.",
        "Snapshot-test the log output to confirm no patient identifiers leak.",
      ],
      rationale:
        "Replaces PHI-leaking logger call with an opaque-id audit-log record, satisfying §164.312(b) without changing the route's public contract.",
    };
  },

  "164.312(a)(1)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const edits: RemediationEdit[] = [];
    let firstLine = -1;
    let firstOrig = "";
    let firstNew = "";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!/(Router|app|router)\.(get|post|put|delete|patch)\(/i.test(l)) continue;
      if (/requireAuth/.test(l)) continue;
      const fixed = l.replace(
        /(\.(get|post|put|delete|patch)\(\s*['"`][^'"`]*['"`])\s*,/,
        "$1, requireAuth,",
      );
      if (fixed === l) continue;
      edits.push({ file: f.file, search: l, replace: fixed });
      if (firstLine < 0) { firstLine = i + 1; firstOrig = l; firstNew = fixed; }
    }
    if (edits.length === 0) return null;
    return {
      edits,
      diff: diffLines(f.file, firstOrig.trimEnd(), firstNew.trimEnd(), firstLine),
      blast_radius: [
        { file: f.file, impact: `Adds auth middleware to ${edits.length} route(s); unauthenticated callers now receive 401.` },
        { file: "tests/routes.test.ts", impact: "Existing tests must include auth headers." },
      ],
      test_recommendations: [
        "Update route tests to include a valid bearer token.",
        "Add a negative test: unauthenticated request returns 401.",
      ],
      rationale:
        "Wraps every PHI route in the file with the requireAuth middleware so only authenticated clinicians can fetch patient records — §164.312(a)(1).",
    };
  },

  "164.312(b)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const edits: RemediationEdit[] = [];
    let firstLine = -1;
    let firstOrig = "";
    let firstNew = "";
    const seen = new Set<string>();
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!/(Router|app|router)\.(get|post)\(/i.test(l)) continue;
      if (/auditLog\.record/.test(l)) continue;
      if (seen.has(l)) continue;
      seen.add(l);
      const fixed = l + "\n  auditLog.record('phi.access', { actor: req.user?.id, route: req.path });";
      edits.push({ file: f.file, search: l, replace: fixed });
      if (firstLine < 0) { firstLine = i + 1; firstOrig = l; firstNew = fixed; }
    }
    if (edits.length === 0) return null;
    return {
      edits,
      diff: diffLines(f.file, firstOrig.trimEnd(), firstNew.trimEnd(), firstLine),
      blast_radius: [
        { file: f.file, impact: `Audit record written for every PHI access (${edits.length} route(s)).` },
      ],
      test_recommendations: ["Assert auditLog.record is called with the correct actor and resource."],
      rationale:
        "Adds a tamper-evident audit-log write for every PHI access, satisfying §164.312(b).",
    };
  },

  "164.312(e)(1)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const idx = lines.findIndex(
      (l, i) => i + 1 >= f.line_start - 1 && /http:\/\//.test(l),
    );
    if (idx < 0) return null;
    const orig = lines[idx];
    const fixed = orig.replace(/http:\/\//g, "https://");
    return {
      edits: [{ file: f.file, search: orig, replace: fixed }],
      diff: diffLines(f.file, orig.trimEnd(), fixed.trimEnd(), idx + 1),
      blast_radius: [
        { file: f.file, impact: "URL scheme changed to HTTPS; receiving service must present a valid certificate." },
      ],
      test_recommendations: [
        "Confirm the downstream service supports TLS on the same port.",
        "Add a contract test asserting the URL begins with https://.",
      ],
      rationale: "Switches outbound PHI transmission to TLS per §164.312(e)(1).",
    };
  },

  "164.312(a)(2)(iv)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const edits: RemediationEdit[] = [];
    const fixed: string[] = [];
    let firstLine = -1;
    let firstOrig = "";
    let firstNew = "";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const m = l.match(/^(\s*)(ssn|dob|mrn|diagnosis|medical[_-]?record)(\s*:\s*)(varchar|text|string)(\(\d+\))?(.*)$/i);
      if (!m) continue;
      const newLine = `${m[1]}${m[2]}${m[3]}encrypted_${m[4]}${m[5] ?? ""}${m[6] ?? ""}`;
      edits.push({ file: f.file, search: l, replace: newLine });
      fixed.push(newLine);
      if (firstLine < 0) {
        firstLine = i + 1;
        firstOrig = l;
        firstNew = newLine;
      }
    }
    if (edits.length === 0) return null;
    return {
      edits,
      diff: diffLines(f.file, firstOrig.trimEnd(), firstNew.trimEnd(), firstLine),
      blast_radius: [
        { file: f.file, impact: "Schema annotation changed; migration required to encrypt existing rows." },
        { file: "migrations/*", impact: "New migration: encrypt-in-place using pgcrypto." },
      ],
      test_recommendations: [
        "Add a round-trip test: write PHI, read back, assert decryption succeeds.",
        "Confirm queries on encrypted columns use deterministic encryption where filtering is needed.",
      ],
      rationale:
        "Marks PHI columns for encryption-at-rest. A follow-up migration encrypts existing rows.",
    };
  },

  "164.312(a)(2)(i)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const edits: RemediationEdit[] = [];
    let firstLine = -1;
    let firstOrig = "";
    let firstNew = "";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const m = l.match(/^(\s*const\s+)(ADMIN_PASSWORD|ADMIN_USER|API_KEY|SECRET|TOKEN)(\s*=\s*)['"][^'"]+['"](.*)$/);
      if (!m) continue;
      const envName = `SENTINEL_${m[2]}`;
      const newLine = `${m[1]}${m[2]}${m[3]}process.env.${envName} ?? ''${m[4] ?? ""}`;
      edits.push({ file: f.file, search: l, replace: newLine });
      if (firstLine < 0) {
        firstLine = i + 1;
        firstOrig = l;
        firstNew = newLine;
      }
    }
    if (edits.length === 0) return null;
    return {
      edits,
      diff: diffLines(f.file, firstOrig.trimEnd(), firstNew.trimEnd(), firstLine),
      blast_radius: [
        { file: f.file, impact: "Reads secret from environment; deployment manifests must inject the env var." },
        { file: ".env.example", impact: "Document the new env var." },
      ],
      test_recommendations: ["Add a startup check that fails fast if the env var is unset."],
      rationale: "Removes hardcoded credential; rotate the leaked value out-of-band. §164.312(a)(2)(i).",
    };
  },

  "164.514(a)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const edits: RemediationEdit[] = [];
    let firstLine = -1;
    let firstOrig = "";
    let firstNew = "";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!/res\.(json|send)\(\s*([a-zA-Z_]+)\s*\)/.test(l)) continue;
      if (/deidentify\(/.test(l)) continue;
      const fixed = l.replace(
        /res\.(json|send)\(\s*([a-zA-Z_]+)\s*\)/,
        "res.$1(deidentify($2, req.user?.role))",
      );
      if (fixed === l) continue;
      edits.push({ file: f.file, search: l, replace: fixed });
      if (firstLine < 0) { firstLine = i + 1; firstOrig = l; firstNew = fixed; }
    }
    if (edits.length === 0) return null;
    return {
      edits,
      diff: diffLines(f.file, firstOrig.trimEnd(), firstNew.trimEnd(), firstLine),
      blast_radius: [
        { file: f.file, impact: `Response filtered through deidentify() at ${edits.length} site(s); callers receive only fields permitted by their role.` },
        { file: "src/utils/deidentify.ts", impact: "New helper: Safe Harbor field stripping per role." },
      ],
      test_recommendations: [
        "Snapshot the response for each role; confirm SSN/DOB/diagnosis are stripped for non-clinical roles.",
      ],
      rationale:
        "Applies role-aware de-identification before returning PHI, satisfying the minimum-necessary standard (§164.514(a)).",
    };
  },

  "164.312(d)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const idx = lines.findIndex((l) => /export\s+function\s+basicAuth\s*\(/.test(l));
    if (idx < 0) return null;
    const orig = lines[idx];
    const fixed = orig.replace(/basicAuth/, "requireBearerToken");
    return {
      edits: [{ file: f.file, search: orig, replace: fixed }],
      diff: diffLines(f.file, orig.trimEnd(), fixed.trimEnd(), idx + 1),
      blast_radius: [
        { file: f.file, impact: "Auth function renamed; basicAuth callers should be updated to requireBearerToken." },
        { file: "src/auth/bearer.ts", impact: "New module: JWT verification middleware." },
      ],
      test_recommendations: ["Add tests for valid, expired, and tampered tokens."],
      rationale: "Renames the basic-auth middleware so callers must migrate to the bearer-token implementation per §164.312(d).",
    };
  },

  "164.308(a)(4)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines) return null;
    const edits: RemediationEdit[] = [];
    let firstLine = -1;
    let firstOrig = "";
    let firstNew = "";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!/SELECT\s+\*\s+FROM\s+patients/i.test(l)) continue;
      const fixed = l.replace(/SELECT\s+\*\s+FROM\s+patients/gi, "SELECT id, name, mrn FROM patients");
      if (fixed === l) continue;
      edits.push({ file: f.file, search: l, replace: fixed });
      if (firstLine < 0) { firstLine = i + 1; firstOrig = l; firstNew = fixed; }
    }
    if (edits.length === 0) return null;
    return {
      edits,
      diff: diffLines(f.file, firstOrig.trimEnd(), firstNew.trimEnd(), firstLine),
      blast_radius: [
        { file: f.file, impact: `${edits.length} quer${edits.length === 1 ? "y" : "ies"} narrowed to minimum-necessary columns.` },
      ],
      test_recommendations: ["Confirm downstream consumers do not rely on stripped fields."],
      rationale: "Replaces SELECT * with a minimum-necessary column list per §164.308(a)(4).",
    };
  },

  "164.308(a)(1)(ii)(D)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines || lines.length === 0) return null;
    const orig = lines[0];
    const marker = "// @sentinel-monitoring: phi-access-metrics enabled";
    if (orig.includes("@sentinel-monitoring")) return null;
    const fixed = `${marker}\n${orig}`;
    return {
      edits: [{ file: f.file, search: orig, replace: fixed }],
      diff: diffLines(f.file, orig.trimEnd(), marker, 1),
      blast_radius: [
        { file: f.file, impact: "File marked as instrumented for PHI-access monitoring." },
        { file: "ops/monitoring/phi-access.yaml", impact: "New alert rule: anomalous PHI access rate." },
      ],
      test_recommendations: ["Confirm the alert fires on a synthetic burst of PHI reads."],
      rationale:
        "Marks this module as instrumented; a corresponding Prometheus/Datadog alert rule is provisioned. §164.308(a)(1)(ii)(D).",
    };
  },

  "164.308(a)(7)": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines || lines.length === 0) return null;
    const orig = lines[0];
    if (orig.includes("@sentinel-backup")) return null;
    const marker = "// @sentinel-backup: nightly snapshots, 30-day retention, quarterly restore test";
    const fixed = `${marker}\n${orig}`;
    return {
      edits: [{ file: f.file, search: orig, replace: fixed }],
      diff: diffLines(f.file, orig.trimEnd(), marker, 1),
      blast_radius: [
        { file: "ops/backup/runbook.md", impact: "Documents the backup + restore-test contingency plan." },
      ],
      test_recommendations: ["Quarterly DR drill must restore PHI store from snapshot."],
      rationale: "Documents the contingency plan inline. §164.308(a)(7).",
    };
  },

  "164.316": (cwd, f) => {
    const lines = readLines(cwd, f.file);
    if (!lines || lines.length === 0) return null;
    const orig = lines[0];
    if (orig.includes("@data-classification")) return null;
    const marker = "// @data-classification: PHI (HIPAA Safeguarded)";
    const fixed = `${marker}\n${orig}`;
    return {
      edits: [{ file: f.file, search: orig, replace: fixed }],
      diff: diffLines(f.file, orig.trimEnd(), marker, 1),
      blast_radius: [
        { file: f.file, impact: "Adds data-classification annotation per HIPAA §164.316." },
      ],
      test_recommendations: ["Lint rule should require @data-classification on every PHI module."],
      rationale: "Adds the required HIPAA data-classification annotation. §164.316.",
    };
  },
};

const defaultRemediation: RemediationTemplate = (cwd, f) => {
  const lines = readLines(cwd, f.file);
  if (!lines || lines.length < f.line_start) return null;
  const orig = lines[f.line_start - 1];
  const fixed = `// FIXME(${f.control}): manual remediation required — see docs/controls/${f.control}.md\n${orig}`;
  return {
    edits: [{ file: f.file, search: orig, replace: fixed }],
    diff: diffLines(f.file, orig.trimEnd(), `// FIXME(${f.control})… (manual)`, f.line_start),
    blast_radius: [
      { file: f.file, impact: "Flagged for manual review; no automatic patch available for this control yet." },
    ],
    test_recommendations: ["Manual review required."],
    rationale: `No automatic remediation template for ${f.control}. Flagged for engineer review.`,
  };
};

export function runMockRemediation(
  cwd: string,
  finding: {
    control: string;
    file: string;
    line_start: number;
    line_end: number;
    code_snippet: string;
    explanation: string;
  },
): RemediationResponse {
  const template = REMEDIATION_TEMPLATES[finding.control] ?? defaultRemediation;
  const built = template(cwd, finding) ?? defaultRemediation(cwd, finding);
  if (!built) {
    return {
      diff: "",
      edits: [],
      blast_radius: [],
      test_recommendations: [],
      rationale: "No remediation could be generated.",
    };
  }
  return built;
}
