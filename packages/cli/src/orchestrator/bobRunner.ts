import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { globby } from "globby";
import type {
  BobAuditResponse,
  PhiTraceResponse,
  RemediationResponse,
  Framework,
} from "../types.js";
import { extractJson, extractSessionId } from "./outputParser.js";
import { getControls } from "../frameworks/index.js";
import { runMockAudit, runMockTrace, runMockRemediation } from "./mockBob.js";

const BOB_BIN = process.env.SENTINEL_BOB_BIN ?? "bob";
const BOB_LIVE = process.env.BOB_LIVE === "1";

export type BobMode =
  | "hipaa-auditor"
  | "soc2-auditor"
  | "pci-auditor"
  | "phi-tracer"
  | "remediation-engineer";

export interface BobRunArgs {
  mode: BobMode;
  command: string;
  cwd: string;
  contextFiles?: string[];
  prompt?: string;
}

export interface BobRunResult<T> {
  json: T;
  rawStdout: string;
  bobSessionId: string;
  source: "live" | "mock";
}

function bobAvailable(): boolean {
  if (!BOB_LIVE) return false;
  try {
    const proc = require("node:child_process").spawnSync(BOB_BIN, ["--version"], {
      stdio: "ignore",
      timeout: 2000,
    });
    return proc.status === 0;
  } catch {
    return false;
  }
}

async function runLiveBob<T>(args: BobRunArgs): Promise<BobRunResult<T>> {
  return new Promise((resolve, reject) => {
    const ctx = (args.contextFiles ?? []).map((f) => `@${f}`).join(" ");
    const fullPrompt = (args.prompt ?? `${args.command} ${ctx}`).trim();

    const proc = spawn(
      BOB_BIN,
      ["--mode", args.mode, "--non-interactive", "--prompt", fullPrompt, "--json"],
      {
        cwd: args.cwd,
        env: { ...process.env, BOB_OUTPUT_FORMAT: "json" },
      },
    );

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`Bob exited ${code}: ${stderr}`));
      }
      try {
        const json = extractJson(stdout) as T;
        resolve({
          json,
          rawStdout: stdout,
          bobSessionId: extractSessionId(stdout),
          source: "live",
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function runAudit(args: {
  framework: Framework;
  cwd: string;
  files: string[];
  prompt: string;
}): Promise<BobRunResult<BobAuditResponse>> {
  const mode = `${args.framework}-auditor` as BobMode;
  if (bobAvailable()) {
    return runLiveBob<BobAuditResponse>({
      mode,
      command: `/audit-${args.framework}`,
      cwd: args.cwd,
      contextFiles: args.files,
      prompt: args.prompt,
    });
  }

  const mock = runMockAudit(args.framework, args.cwd, args.files);
  return {
    json: mock,
    rawStdout: JSON.stringify(mock, null, 2),
    bobSessionId: `mock-${args.framework}-${Date.now()}`,
    source: "mock",
  };
}

export async function runPhiTrace(args: {
  cwd: string;
  files: string[];
  prompt: string;
}): Promise<BobRunResult<PhiTraceResponse>> {
  if (bobAvailable()) {
    return runLiveBob<PhiTraceResponse>({
      mode: "phi-tracer",
      command: "/trace-phi",
      cwd: args.cwd,
      contextFiles: args.files,
      prompt: args.prompt,
    });
  }
  const mock = runMockTrace(args.cwd, args.files);
  return {
    json: mock,
    rawStdout: JSON.stringify(mock, null, 2),
    bobSessionId: `mock-phi-${Date.now()}`,
    source: "mock",
  };
}

export async function runRemediation(args: {
  cwd: string;
  findingId: string;
  finding: {
    control: string;
    file: string;
    line_start: number;
    line_end: number;
    code_snippet: string;
    explanation: string;
  };
  prompt: string;
}): Promise<BobRunResult<RemediationResponse>> {
  if (bobAvailable()) {
    return runLiveBob<RemediationResponse>({
      mode: "remediation-engineer",
      command: `/remediate ${args.findingId}`,
      cwd: args.cwd,
      prompt: args.prompt,
    });
  }
  const mock = runMockRemediation(args.cwd, args.finding);
  return {
    json: mock,
    rawStdout: JSON.stringify(mock, null, 2),
    bobSessionId: `mock-rem-${Date.now()}`,
    source: "mock",
  };
}

export async function discoverFiles(cwd: string): Promise<string[]> {
  const files = await globby(
    [
      "**/*.{ts,tsx,js,jsx,mjs,cjs}",
      "**/*.{py,go,rb,java}",
      "**/*.{sql,yaml,yml,json}",
    ],
    {
      cwd,
      gitignore: true,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/.sentinel/**",
        "**/package-lock.json",
      ],
    },
  );
  return files;
}

export function readFileSafe(cwd: string, file: string): string | null {
  const abs = join(cwd, file);
  if (!existsSync(abs)) return null;
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}
