import type { Framework, Control } from "../types.js";
import { getControls } from "../frameworks/index.js";

export function buildAuditPrompt(framework: Framework, files: string[]): string {
  const controls = getControls(framework);
  const fileList = files.slice(0, 100).map((f) => `@${f}`).join(" ");
  const controlList = controls
    .map((c, i) => `  ${i + 1}. ${c.id} — ${c.title}`)
    .join("\n");

  const commandName = `/audit-${framework}`;

  return `${commandName}

Scope: scan all listed files. Skip node_modules, dist, build, .next.

Controls to evaluate:
${controlList}

Context files:
${fileList}

Output JSON exactly per the ${framework}-auditor mode schema. No
preamble, no markdown fences — pure JSON.`;
}

export function buildTracePrompt(files: string[]): string {
  const fileList = files.slice(0, 100).map((f) => `@${f}`).join(" ");
  return `/trace-phi

Starting points: every Express/Fastify route handler in the listed
files that references a patients/appointments table, or any function
parameter named patient, phi, or mrn.

For each starting point, trace every reachable sink. Sinks include:
- logger calls (any level)
- DB writes (other than the original source table)
- HTTP/fetch calls to external URLs
- File system writes
- HTTP response bodies

Context files:
${fileList}

Output JSON per the phi-tracer mode schema.`;
}

export function buildRemediationPrompt(findingId: string, finding: {
  control: string;
  file: string;
  line_start: number;
  code_snippet: string;
  explanation: string;
}): string {
  return `/remediate ${findingId}

Finding context:
- Control: ${finding.control}
- File: ${finding.file}:${finding.line_start}
- Code:
\`\`\`
${finding.code_snippet}
\`\`\`
- Issue: ${finding.explanation}

Generate a minimal patch. Compute blast radius by finding every caller
of any symbol you modify. Output JSON per the remediation-engineer
schema. Do NOT apply the patch — output the diff.`;
}

export function controlsForPrefilter(framework: Framework): Control[] {
  return getControls(framework).filter(
    (c) => c.regex_prefilters && c.regex_prefilters.length > 0,
  );
}
