import type { Control } from "../types.js";

export const GDPR_CONTROLS: Control[] = [
  {
    id: "Art32(1)(a)",
    title: "Pseudonymisation and Encryption",
    severity_default: "critical",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /(email|name|address|phone|user_id|customer_id)\s*:\s*(varchar|text|string)/i,
      /column\(['"](email|name|address|phone|user_id|customer_id)['"]/i,
    ],
    negative_filters: [/encrypted_|pseudonymized_/i],
    bob_prompt_template:
      "Identify database schema fields that store personal data (email, name, address, phone, user identifiers) as plaintext with no encryption or pseudonymisation annotation. GDPR Article 32(1)(a) requires appropriate technical measures including pseudonymisation and encryption of personal data.",
  },
  {
    id: "Art32(1)(b)",
    title: "Confidentiality, Integrity, Availability",
    severity_default: "high",
    detection_strategy: "bob_semantic",
    regex_prefilters: [
      /(users?|customers?|accounts?)Router\.(get|post|put|delete|patch)\(/i,
      /(app|router)\.(get|post|put|delete|patch)\(\s*['"`][^'"`]*\/(users?|customers?|accounts?)/i,
    ],
    negative_filters: [/requireAuth|requireBearerToken|authenticate/],
    bob_prompt_template:
      "Identify HTTP endpoints serving personal data without authentication middleware. Each unauthenticated route handling personal data violates GDPR Article 32(1)(b) which requires ensuring ongoing confidentiality, integrity, and availability of processing systems.",
  },
  {
    id: "Art32(1)(d)",
    title: "Regular Testing and Evaluation",
    severity_default: "medium",
    detection_strategy: "bob_semantic",
    regex_prefilters: [/(users?|customers?|personal)/i],
    negative_filters_file: [/@gdpr-tested|@security-tested/],
    bob_prompt_template:
      "Identify codebases handling personal data with no evidence of regular testing, assessment, or evaluation of security measures. GDPR Article 32(1)(d) requires a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures.",
  },
  {
    id: "Art33",
    title: "Notification of Personal Data Breach",
    severity_default: "high",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /console\.(log|info|debug|warn|error)\([^)]*\b(user|customer|email|password|token|session)/i,
      /logger\.(info|debug|warn|trace|error)\([^)]*\b(user|customer|email|password|token)/i,
      /log\.(info|debug|warn|error)\([^)]*\b(user|customer|email|password)/i,
    ],
    negative_filters: [/securityLog\.record|breachLog\.record/],
    bob_prompt_template:
      "Identify logging statements that emit personal data directly (user identifiers, emails, passwords, tokens, session IDs). These leak personal data to standard logs without proper breach detection mechanisms. GDPR Article 33 requires notification of personal data breaches to the supervisory authority within 72 hours, which requires proper logging and monitoring infrastructure.",
  },
];

export const GDPR_CONTROL_BY_ID: Record<string, Control> = Object.fromEntries(
  GDPR_CONTROLS.map((c) => [c.id, c]),
);

// Made with Bob
