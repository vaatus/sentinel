export type Severity = "critical" | "high" | "medium" | "low";

export type Framework = "hipaa" | "soc2" | "pci" | "gdpr";

export interface Finding {
  id: string;
  framework: Framework;
  control: string;
  control_name: string;
  file: string;
  line_start: number;
  line_end: number;
  code_snippet: string;
  severity: Severity;
  explanation: string;
  remediation_hint: string;
  status: "open" | "pr-opened" | "fixed";
  bob_session_id?: string;
  created_at: string;
}

export interface BobAuditResponse {
  findings: Omit<Finding, "id" | "framework" | "status" | "created_at">[];
  scanned_files: number;
  summary: string;
}

export interface DataFlowNode {
  file: string;
  line: number;
  function: string;
}

export interface DataFlowSink {
  file: string;
  line: number;
  type: "log" | "db" | "api" | "file" | "response";
  risk: string;
}

export interface DataFlow {
  id: string;
  source: { file: string; line: number; description: string };
  sinks: DataFlowSink[];
  path: DataFlowNode[];
  is_violating?: boolean;
}

export interface PhiTraceResponse {
  flows: DataFlow[];
}

export interface BlastRadiusEntry {
  file: string;
  impact: string;
}

export interface RemediationEdit {
  file: string;
  search: string;
  replace: string;
}

export interface RemediationResponse {
  diff: string;
  edits: RemediationEdit[];
  blast_radius: BlastRadiusEntry[];
  test_recommendations: string[];
  rationale: string;
}

export type VerificationStatus =
  | "verified-resolved"
  | "partial"
  | "regression"
  | "neutral";

export interface VerificationResult {
  status: VerificationStatus;
  new_findings: Omit<Finding, "id" | "framework" | "status" | "created_at">[];
  original_finding_present: boolean;
  new_high_severity_count: number;
}

export interface RemediationResult {
  finding_id: string;
  branch: string;
  files_changed: string[];
  status: string;
  verification?: VerificationResult;
}

export interface Control {
  id: string;
  title: string;
  severity_default: Severity;
  detection_strategy: "bob_semantic" | "regex_prefilter";
  regex_prefilters: RegExp[];
  negative_filters?: RegExp[];
  negative_filters_file?: RegExp[];
  bob_prompt_template: string;
}

export interface ScanRun {
  id: string;
  framework: Framework;
  target_path: string;
  started_at: string;
  finished_at?: string;
  total_files: number;
  finding_count: number;
  score: number;
}
