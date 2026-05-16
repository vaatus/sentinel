import Database from "better-sqlite3";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Finding, DataFlow, ScanRun, Framework } from "../types.js";

export class FindingsStore {
  private db: Database.Database;
  readonly dbPath: string;
  readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    const sentinelDir = join(rootDir, ".sentinel");
    if (!existsSync(sentinelDir)) mkdirSync(sentinelDir, { recursive: true });
    this.dbPath = join(sentinelDir, "findings.sqlite");
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scan_runs (
        id TEXT PRIMARY KEY,
        framework TEXT NOT NULL,
        target_path TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        total_files INTEGER NOT NULL DEFAULT 0,
        finding_count INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        scan_run_id TEXT NOT NULL,
        framework TEXT NOT NULL,
        control TEXT NOT NULL,
        control_name TEXT NOT NULL,
        file TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        code_snippet TEXT NOT NULL,
        severity TEXT NOT NULL,
        explanation TEXT NOT NULL,
        remediation_hint TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        bob_session_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (scan_run_id) REFERENCES scan_runs(id)
      );
      CREATE TABLE IF NOT EXISTS data_flows (
        id TEXT PRIMARY KEY,
        scan_run_id TEXT NOT NULL,
        source_file TEXT NOT NULL,
        source_line INTEGER NOT NULL,
        source_description TEXT NOT NULL,
        flow_json TEXT NOT NULL,
        is_violating INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS remediation_prs (
        id TEXT PRIMARY KEY,
        finding_id TEXT NOT NULL,
        branch TEXT NOT NULL,
        diff TEXT NOT NULL,
        blast_radius_json TEXT NOT NULL,
        rationale TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (finding_id) REFERENCES findings(id)
      );
      CREATE INDEX IF NOT EXISTS idx_findings_scan ON findings(scan_run_id);
      CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
      CREATE INDEX IF NOT EXISTS idx_flows_scan ON data_flows(scan_run_id);
    `);
  }

  createScanRun(framework: Framework, targetPath: string): ScanRun {
    const id = `scan-${Date.now()}`;
    const startedAt = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO scan_runs (id, framework, target_path, started_at, total_files, finding_count, score)
         VALUES (?, ?, ?, ?, 0, 0, 100)`,
      )
      .run(id, framework, targetPath, startedAt);
    return {
      id,
      framework,
      target_path: targetPath,
      started_at: startedAt,
      total_files: 0,
      finding_count: 0,
      score: 100,
    };
  }

  finalizeScanRun(scanRunId: string, totals: { totalFiles: number; findingCount: number; score: number }) {
    this.db
      .prepare(
        `UPDATE scan_runs
         SET finished_at = ?, total_files = ?, finding_count = ?, score = ?
         WHERE id = ?`,
      )
      .run(new Date().toISOString(), totals.totalFiles, totals.findingCount, totals.score, scanRunId);
  }

  insertFindings(scanRunId: string, framework: Framework, items: Finding[]) {
    const stmt = this.db.prepare(`
      INSERT INTO findings
        (id, scan_run_id, framework, control, control_name, file, line_start, line_end,
         code_snippet, severity, explanation, remediation_hint, status, bob_session_id, created_at)
      VALUES (@id, @scan_run_id, @framework, @control, @control_name, @file, @line_start, @line_end,
              @code_snippet, @severity, @explanation, @remediation_hint, @status, @bob_session_id, @created_at)
    `);
    const insertMany = this.db.transaction((rows: any[]) => {
      for (const r of rows) stmt.run(r);
    });
    insertMany(
      items.map((f) => ({
        ...f,
        scan_run_id: scanRunId,
        framework,
        bob_session_id: f.bob_session_id ?? null,
      })),
    );
  }

  insertDataFlows(scanRunId: string, flows: DataFlow[]) {
    const stmt = this.db.prepare(`
      INSERT INTO data_flows (id, scan_run_id, source_file, source_line, source_description, flow_json, is_violating)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const runShort = scanRunId.replace(/[^a-z0-9]/gi, "").slice(-8);
    const insertMany = this.db.transaction((rows: DataFlow[]) => {
      for (const f of rows) {
        const isViolating = f.sinks.some(
          (s) => s.type === "log" || s.type === "api" || /violat/i.test(s.risk),
        );
        const id = `${runShort}-${f.id}`;
        stmt.run(
          id,
          scanRunId,
          f.source.file,
          f.source.line,
          f.source.description,
          JSON.stringify({ ...f, id }),
          isViolating ? 1 : 0,
        );
      }
    });
    insertMany(flows);
  }

  insertRemediation(args: {
    findingId: string;
    branch: string;
    diff: string;
    blastRadius: any[];
    rationale: string;
  }) {
    const id = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.db
      .prepare(
        `INSERT INTO remediation_prs (id, finding_id, branch, diff, blast_radius_json, rationale, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        args.findingId,
        args.branch,
        args.diff,
        JSON.stringify(args.blastRadius),
        args.rationale,
        new Date().toISOString(),
      );
    this.db.prepare(`UPDATE findings SET status = 'pr-opened' WHERE id = ?`).run(args.findingId);
    return id;
  }

  latestScanRun(framework?: Framework): ScanRun | null {
    const row = framework
      ? this.db
          .prepare(`SELECT * FROM scan_runs WHERE framework = ? ORDER BY started_at DESC LIMIT 1`)
          .get(framework)
      : this.db.prepare(`SELECT * FROM scan_runs ORDER BY started_at DESC LIMIT 1`).get();
    return (row as ScanRun) ?? null;
  }

  findingsForRun(scanRunId: string): Finding[] {
    return this.db
      .prepare(`SELECT * FROM findings WHERE scan_run_id = ? ORDER BY
                 CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
                 file ASC, line_start ASC`)
      .all(scanRunId) as Finding[];
  }

  findingById(id: string): Finding | null {
    return (this.db.prepare(`SELECT * FROM findings WHERE id = ?`).get(id) as Finding) ?? null;
  }

  flowsForRun(scanRunId: string): DataFlow[] {
    const rows = this.db
      .prepare(`SELECT flow_json, is_violating FROM data_flows WHERE scan_run_id = ?`)
      .all(scanRunId) as Array<{ flow_json: string; is_violating: number }>;
    return rows.map((r) => ({ ...JSON.parse(r.flow_json), is_violating: r.is_violating === 1 }));
  }

  remediationsForRun(scanRunId: string) {
    return this.db
      .prepare(
        `SELECT r.* FROM remediation_prs r
         JOIN findings f ON f.id = r.finding_id
         WHERE f.scan_run_id = ?
         ORDER BY r.created_at DESC`,
      )
      .all(scanRunId);
  }

  remediationsForFinding(findingId: string) {
    return this.db
      .prepare(`SELECT * FROM remediation_prs WHERE finding_id = ? ORDER BY created_at DESC`)
      .all(findingId);
  }

  exportToJson() {
    const exportPath = join(this.rootDir, ".sentinel", "findings.json");
    const remediationsPath = join(this.rootDir, ".sentinel", "remediations.json");
    mkdirSync(dirname(exportPath), { recursive: true });
    const scanRun = this.latestScanRun();
    if (!scanRun) {
      writeFileSync(exportPath, JSON.stringify({ scanRun: null, findings: [], flows: [] }, null, 2));
      writeFileSync(remediationsPath, JSON.stringify([], null, 2));
      return exportPath;
    }
    const findings = this.findingsForRun(scanRun.id);
    const flows = this.flowsForRun(scanRun.id);
    writeFileSync(exportPath, JSON.stringify({ scanRun, findings, flows }, null, 2));

    const remediations = (this.remediationsForRun(scanRun.id) as any[]).map((r) => ({
      id: r.id,
      finding_id: r.finding_id,
      branch: r.branch,
      diff: r.diff,
      blast_radius: JSON.parse(r.blast_radius_json ?? "[]"),
      rationale: r.rationale,
      created_at: r.created_at,
    }));
    writeFileSync(remediationsPath, JSON.stringify(remediations, null, 2));
    return exportPath;
  }

  close() {
    this.db.close();
  }
}

export function computeScore(findings: Pick<Finding, "severity">[]): number {
  const weight = { critical: 8, high: 4, medium: 2, low: 1 };
  const penalty = findings.reduce((acc, f) => acc + weight[f.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}
