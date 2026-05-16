import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface Finding {
  id: string;
  framework: string;
  control: string;
  control_name: string;
  file: string;
  line_start: number;
  line_end: number;
  code_snippet: string;
  severity: "critical" | "high" | "medium" | "low";
  explanation: string;
  remediation_hint: string;
  status: "open" | "pr-opened" | "fixed";
  bob_session_id?: string;
  created_at: string;
}

export interface DataFlow {
  id: string;
  source: { file: string; line: number; description: string };
  sinks: Array<{ file: string; line: number; type: string; risk: string }>;
  path: Array<{ file: string; line: number; function: string }>;
  is_violating?: boolean;
}

export interface ScanRun {
  id: string;
  framework: string;
  target_path: string;
  started_at: string;
  finished_at?: string;
  total_files: number;
  finding_count: number;
  score: number;
}

export interface Snapshot {
  scanRun: ScanRun | null;
  findings: Finding[];
  flows: DataFlow[];
}

export function getTargetPath(): string {
  const env = process.env.SENTINEL_TARGET;
  if (env) return env;
  // Fall back to ../../demo-clinic-app relative to the dashboard root.
  return join(process.cwd(), "..", "..", "demo-clinic-app");
}

export function loadSnapshot(): Snapshot {
  const path = join(getTargetPath(), ".sentinel", "findings.json");
  if (!existsSync(path)) {
    return { scanRun: null, findings: [], flows: [] };
  }
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return { scanRun: null, findings: [], flows: [] };
  }
}

export function loadRemediations(): Array<{
  id: string;
  finding_id: string;
  branch: string;
  diff: string;
  blast_radius: any[];
  rationale: string;
  created_at: string;
}> {
  const path = join(getTargetPath(), ".sentinel", "remediations.json");
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

export function severityColor(sev: string): string {
  switch (sev) {
    case "critical": return "bg-rose-500/15 text-rose-300 border-rose-500/40";
    case "high":     return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    case "medium":   return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    case "low":      return "bg-slate-500/15 text-slate-300 border-slate-500/40";
    default:         return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
}

export function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

export function scoreRing(score: number): string {
  if (score >= 85) return "stroke-emerald-400";
  if (score >= 60) return "stroke-amber-400";
  return "stroke-rose-400";
}

export function scoreVerdict(score: number): string {
  if (score >= 85) return "Audit Ready";
  if (score >= 60) return "Needs Work";
  return "Not Auditable";
}
