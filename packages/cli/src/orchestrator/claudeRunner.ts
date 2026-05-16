import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { BobAuditResponse, PhiTraceResponse, RemediationResponse, Framework } from "../types.js";
import { getControls } from "../frameworks/index.js";
import { extractJson } from "./outputParser.js";

const MODEL = "claude-opus-4-7";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export function claudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function readFiles(cwd: string, files: string[]): string {
  const MAX_FILES = 40;
  const MAX_CHARS = 80_000;
  let total = 0;
  const parts: string[] = [];
  for (const f of files.slice(0, MAX_FILES)) {
    const abs = join(cwd, f);
    if (!existsSync(abs)) continue;
    try {
      const content = readFileSync(abs, "utf8");
      const part = `\n\n### FILE: ${f}\n\`\`\`\n${content}\n\`\`\``;
      total += part.length;
      if (total > MAX_CHARS) break;
      parts.push(part);
    } catch {
      // skip unreadable files
    }
  }
  return parts.join("");
}

export async function callClaudeAudit(
  framework: Framework,
  cwd: string,
  files: string[],
): Promise<{ json: BobAuditResponse; bobSessionId: string }> {
  const client = getClient();
  const controls = getControls(framework);
  const controlList = controls
    .map((c) => `  - ${c.id} (${c.title}, severity: ${c.severity_default}): ${c.bob_prompt_template}`)
    .join("\n");

  const systemPrompt = `You are a senior compliance engineer auditing a codebase for ${framework.toUpperCase()} Security Rule violations.
Analyze source code with precision, identifying real violations — not theoretical ones.
Output ONLY a raw JSON object with NO markdown fences, NO preamble, NO trailing text:
{
  "findings": [
    {
      "control": "<control id e.g. 164.312(a)(1)>",
      "control_name": "<control title>",
      "file": "<relative file path>",
      "line_start": <integer>,
      "line_end": <integer>,
      "code_snippet": "<offending code, 1-5 lines>",
      "severity": "<critical|high|medium|low>",
      "explanation": "<why this is a violation, 1-2 sentences>",
      "remediation_hint": "<specific fix, 1-2 sentences>"
    }
  ],
  "scanned_files": <integer>,
  "summary": "<overall compliance posture, 2-3 sentences>"
}`;

  const fileContent = readFiles(cwd, files);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: systemPrompt,
        // Cache the stable system prompt + controls across scans of the same framework
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Audit these source files for ${framework.toUpperCase()} compliance violations.

Controls to evaluate:
${controlList}

Source files (${files.length} total, showing first ${Math.min(files.length, 40)}):
${fileContent}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJson(text) as BobAuditResponse;
  return { json, bobSessionId: `claude-${framework}-${Date.now()}` };
}

export async function callClaudeTrace(
  cwd: string,
  files: string[],
): Promise<{ json: PhiTraceResponse; bobSessionId: string }> {
  const client = getClient();

  const systemPrompt = `You are a data-flow security analyst tracing Protected Health Information (PHI) through a healthcare codebase.
For each PHI source (a route handler, DB query, or function returning patient data), follow the data to every reachable sink.
Sinks include: logger calls, DB writes, HTTP/fetch calls, file-system writes, and HTTP response bodies.
Output ONLY a raw JSON object with NO markdown fences, NO preamble:
{
  "flows": [
    {
      "id": "<short slug e.g. flow-1>",
      "source": {"file": "<path>", "line": <int>, "description": "<what PHI is here>"},
      "sinks": [
        {"file": "<path>", "line": <int>, "type": "log|db|api|file|response", "risk": "<risk description>"}
      ],
      "path": [
        {"file": "<path>", "line": <int>, "function": "<function name>"}
      ]
    }
  ]
}
Be conservative — only trace flows you can verify from the code.`;

  const fileContent = readFiles(cwd, files);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Trace PHI data flows in these source files:
${fileContent}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJson(text) as PhiTraceResponse;
  return { json, bobSessionId: `claude-phi-${Date.now()}` };
}

export async function callClaudeRemediation(
  cwd: string,
  finding: {
    control: string;
    file: string;
    line_start: number;
    line_end: number;
    code_snippet: string;
    explanation: string;
  },
): Promise<{ json: RemediationResponse; bobSessionId: string }> {
  const client = getClient();

  const abs = join(cwd, finding.file);
  let fullFileContent = "";
  if (existsSync(abs)) {
    try {
      fullFileContent = readFileSync(abs, "utf8");
    } catch {
      // ignore
    }
  }

  const systemPrompt = `You are a security engineer generating minimal, safe, reviewable code patches to fix compliance violations.
Preserve existing API contracts and coding style. Compute blast radius: which other files import the changed symbols, which tests exercise them.
Output ONLY a raw JSON object with NO markdown fences, NO preamble:
{
  "diff": "<unified diff string>",
  "edits": [
    {"file": "<relative path>", "search": "<exact string to find>", "replace": "<replacement string>"}
  ],
  "blast_radius": [
    {"file": "<path>", "impact": "<description of impact>"}
  ],
  "test_recommendations": ["<test to add or update>"],
  "rationale": "<why this fix addresses the control violation, 2-3 sentences>"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Fix this compliance violation:

Control: ${finding.control}
File: ${finding.file}:${finding.line_start}
Issue: ${finding.explanation}

Offending code:
\`\`\`
${finding.code_snippet}
\`\`\`

Full file content:
\`\`\`
${fullFileContent.slice(0, 8_000)}
\`\`\``,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJson(text) as RemediationResponse;
  return { json, bobSessionId: `claude-rem-${Date.now()}` };
}
