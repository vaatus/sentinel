import type { Control } from "../types.js";

export const SOC2_CONTROLS: Control[] = [
  {
    id: "CC6.1",
    title: "Logical Access Controls",
    severity_default: "high",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /app\.(get|post|put|delete|patch)\(['"`][^'"`]*\/(admin|api)/i,
    ],
    bob_prompt_template:
      "Identify endpoints lacking authentication or authorization controls. CC6.1.",
  },
  {
    id: "CC6.2",
    title: "User Access Provisioning",
    severity_default: "medium",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /(password|secret|api[_-]?key)\s*[:=]\s*['"][^'"]+['"]/i,
    ],
    bob_prompt_template:
      "Identify hardcoded credentials or shared accounts. CC6.2.",
  },
  {
    id: "CC6.6",
    title: "Encryption in Transit",
    severity_default: "critical",
    detection_strategy: "regex_prefilter",
    regex_prefilters: [
      /fetch\(['"]http:\/\//i,
      /axios\.(get|post|put|delete)\(['"]http:\/\//i,
    ],
    bob_prompt_template: "Identify HTTP (non-TLS) external calls. CC6.6.",
  },
  {
    id: "CC7.2",
    title: "System Monitoring",
    severity_default: "medium",
    detection_strategy: "bob_semantic",
    regex_prefilters: [/console\.log\(/i],
    bob_prompt_template:
      "Identify production code paths that write to console.log instead of a structured monitoring sink. CC7.2.",
  },
  {
    id: "CC7.3",
    title: "Incident Detection",
    severity_default: "low",
    detection_strategy: "bob_semantic",
    regex_prefilters: [/catch\s*\([^)]*\)\s*\{\s*\}/],
    bob_prompt_template:
      "Identify empty catch blocks that swallow errors without alerting. CC7.3.",
  },
  {
    id: "CC8.1",
    title: "Change Management",
    severity_default: "low",
    detection_strategy: "bob_semantic",
    regex_prefilters: [/TODO|FIXME|XXX/],
    bob_prompt_template:
      "Identify TODO/FIXME markers in security-relevant paths. CC8.1.",
  },
];

export const SOC2_CONTROL_BY_ID: Record<string, Control> = Object.fromEntries(
  SOC2_CONTROLS.map((c) => [c.id, c]),
);
