import type { Control } from "../types.js";

export const HIPAA_CONTROLS: Control[] = [
  {
    id: "164.312(a)(1)",
    title: "Access Control",
    severity_default: "high",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /(patients?|appointments?|records?|phi|mrn|billing)Router\.(get|post|put|delete|patch)\(/i,
      /(app|router)\.(get|post|put|delete|patch)\(\s*['"`][^'"`]*\/(patients?|appointments?|records?|phi)/i,
    ],
    negative_filters: [/requireAuth|requireBearerToken/],
    bob_prompt_template:
      "Identify HTTP endpoints serving PHI without authentication middleware. Each unauthenticated route handling patient data is a violation of §164.312(a)(1).",
  },
  {
    id: "164.312(a)(2)(i)",
    title: "Unique User Identification",
    severity_default: "high",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /const\s+(ADMIN_PASSWORD|ADMIN_USER|API_KEY|SECRET|TOKEN)\s*=\s*['"][^'"]{3,}['"]/,
      /(password|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"]{4,}['"]/i,
      /BasicAuth\(['"](admin|user|root)['"]/i,
    ],
    negative_filters: [/process\.env/],
    bob_prompt_template:
      "Identify hardcoded credentials, shared accounts, or static API keys. Each is a §164.312(a)(2)(i) violation.",
  },
  {
    id: "164.312(a)(2)(iv)",
    title: "Encryption at Rest",
    severity_default: "critical",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /(ssn|dob|mrn|diagnosis|medical[_-]?record)\s*:\s*(varchar|text|string)/i,
      /column\(['"](ssn|dob|mrn|diagnosis)['"]/i,
    ],
    negative_filters: [/encrypted_/i],
    bob_prompt_template:
      "Identify database schema fields that store PHI (SSN, DOB, MRN, diagnosis codes, etc.) as plaintext with no encryption annotation. §164.312(a)(2)(iv).",
  },
  {
    id: "164.312(b)",
    title: "Audit Controls",
    severity_default: "high",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /(patients?|appointments?)Router\.(get|post)\(/i,
      /(app|router)\.(get|post)\(\s*['"`][^'"`]*\/(patients?|appointments?)/i,
    ],
    negative_filters: [/auditLog\.record/],
    bob_prompt_template:
      "Identify endpoints that access PHI but do not write to an audit trail. Every PHI access must be logged to a tamper-evident audit log per §164.312(b).",
  },
  {
    id: "164.312(b)-leak",
    title: "Audit Logging Leak",
    severity_default: "critical",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /console\.(log|info|debug|warn)\([^)]*\b(patient|ssn|dob|mrn|diagnosis)/i,
      /logger\.(info|debug|warn|trace)\([^)]*\b(patient|ssn|dob|mrn|diagnosis)/i,
      /log\.(info|debug|warn)\([^)]*\b(patient|ssn|dob|mrn)/i,
    ],
    negative_filters: [/auditLog\.record/],
    bob_prompt_template:
      "Identify logging statements that emit PHI directly (patient identifiers, medical record numbers, SSNs, DOBs, diagnosis codes). These leak PHI to standard logs and violate §164.312(b).",
  },
  {
    id: "164.312(c)(1)",
    title: "Integrity",
    severity_default: "medium",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /update.*patient/i,
      /save.*record/i,
    ],
    bob_prompt_template:
      "Identify PHI records that are mutated without a hash, signature, or version chain. §164.312(c)(1).",
  },
  {
    id: "164.312(d)",
    title: "Person or Entity Authentication",
    severity_default: "high",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /export\s+function\s+basicAuth\b/,
      /basic-auth/i,
      /req\.headers\.authorization\s*===?\s*['"]/i,
    ],
    negative_filters: [/requireBearerToken/],
    bob_prompt_template:
      "Identify endpoints using basic auth, no auth, or weak token comparison. §164.312(d) requires strong authentication for PHI access.",
  },
  {
    id: "164.312(e)(1)",
    title: "Transmission Security",
    severity_default: "critical",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /fetch\(['"]http:\/\//i,
      /axios\.(get|post|put|delete)\(['"]http:\/\//i,
      /http\.(get|request)\(\{[^}]*protocol:\s*['"]http:/i,
      /['"]http:\/\/[^'"`\s]+\/(patients?|billing|records?)/i,
    ],
    negative_filters: [/https:\/\//],
    bob_prompt_template:
      "Identify HTTP (non-TLS) clients or servers transmitting PHI. §164.312(e)(1) requires TLS for PHI in transit.",
  },
  {
    id: "164.514(a)",
    title: "De-identification",
    severity_default: "high",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /res\.json\(\s*(patient|patients|appointment)/i,
    ],
    negative_filters: [/deidentify\(/],
    bob_prompt_template:
      "Identify API responses that return full PHI records without de-identification or field minimization. §164.514(a).",
  },
  {
    id: "164.308(a)(1)(ii)(D)",
    title: "Information System Activity Review",
    severity_default: "medium",
    detection_strategy: "bob_semantic",
    regex_prefilters: [/patients/i],
    negative_filters_file: [/@sentinel-monitoring/],
    bob_prompt_template:
      "Identify codebases with no monitoring, alerting, or anomaly detection on PHI access patterns. §164.308(a)(1)(ii)(D).",
  },
  {
    id: "164.308(a)(3)",
    title: "Workforce Security",
    severity_default: "high",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /req\.user\.(role|isAdmin)/i,
      /requireAuth\(/i,
    ],
    bob_prompt_template:
      "Identify PHI endpoints that do not enforce role-based access (RBAC). §164.308(a)(3).",
  },
  {
    id: "164.308(a)(4)",
    title: "Information Access Management",
    severity_default: "medium",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /SELECT\s+\*\s+FROM\s+patients/i,
      /\.findAll\(\s*\)/i,
    ],
    bob_prompt_template:
      "Identify queries that over-fetch PHI fields (SELECT *) rather than minimizing to required columns. §164.308(a)(4).",
  },
  {
    id: "164.308(a)(5)(ii)(D)",
    title: "Password Management",
    severity_default: "medium",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /password\.length\s*[<>]=?\s*[1-7]\b/i,
      /minLength:\s*[1-7]\b/i,
      /bcrypt\.hash\([^,]+,\s*[1-7]\)/i,
    ],
    bob_prompt_template:
      "Identify weak password policies (short minimums, low bcrypt rounds, no complexity rules). §164.308(a)(5)(ii)(D).",
  },
  {
    id: "164.308(a)(7)",
    title: "Contingency Plan",
    severity_default: "low",
    detection_strategy: "bob_semantic",
    regex_prefilters: [/patients/i],
    negative_filters_file: [/@sentinel-backup/],
    bob_prompt_template:
      "Identify PHI storage layers with no backup/DR configuration. §164.308(a)(7).",
  },
  {
    id: "164.316",
    title: "Policies and Documentation",
    severity_default: "low",
    detection_strategy: "bob_semantic",
    regex_prefilters: [/patients/i],
    negative_filters_file: [/@data-classification/],
    bob_prompt_template:
      "Identify PHI-handling modules with no data classification annotation. §164.316.",
  },
];

export const HIPAA_CONTROL_BY_ID: Record<string, Control> = Object.fromEntries(
  HIPAA_CONTROLS.map((c) => [c.id, c]),
);
