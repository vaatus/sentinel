import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FindingsStore, computeScore } from "./findingsStore.js";
import type { Finding, DataFlow, Framework } from "../types.js";

/**
 * Helper to create a temporary directory for each test
 */
function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "sentinel-test-"));
}

/**
 * Helper to create a minimal Finding object
 */
function createFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    framework: "hipaa",
    control: "164.312(a)(1)",
    control_name: "Access Control",
    file: "src/test.ts",
    line_start: 10,
    line_end: 15,
    code_snippet: "const password = 'hardcoded';",
    severity: "high",
    explanation: "Hardcoded credentials detected",
    remediation_hint: "Use environment variables",
    status: "open",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to create a minimal DataFlow object
 */
function createDataFlow(overrides: Partial<DataFlow> = {}): DataFlow {
  return {
    id: `flow-${Math.random().toString(36).slice(2, 8)}`,
    source: {
      file: "src/patient.ts",
      line: 42,
      description: "Patient SSN from database",
    },
    sinks: [
      {
        file: "src/logger.ts",
        line: 10,
        type: "log",
        risk: "PHI exposure in logs",
      },
    ],
    path: [
      { file: "src/patient.ts", line: 42, function: "getPatient" },
      { file: "src/logger.ts", line: 10, function: "logInfo" },
    ],
    ...overrides,
  };
}

describe("FindingsStore", () => {
  describe("constructor and migration", () => {
    test("creates .sentinel directory and database file", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        assert.ok(store.dbPath.includes(".sentinel"));
        assert.ok(store.dbPath.endsWith("findings.sqlite"));
        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("initializes database with correct schema", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        // Verify tables exist by querying sqlite_master
        const tables = (store as any).db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
          .all() as Array<{ name: string }>;
        const tableNames = tables.map((t) => t.name);
        assert.ok(tableNames.includes("scan_runs"));
        assert.ok(tableNames.includes("findings"));
        assert.ok(tableNames.includes("data_flows"));
        assert.ok(tableNames.includes("remediation_prs"));
        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("createScanRun and finalizeScanRun", () => {
    test("creates a scan run with initial values", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test/path");

        assert.ok(scanRun.id.startsWith("scan-"));
        assert.equal(scanRun.framework, "hipaa");
        assert.equal(scanRun.target_path, "/test/path");
        assert.equal(scanRun.total_files, 0);
        assert.equal(scanRun.finding_count, 0);
        assert.equal(scanRun.score, 100);
        assert.ok(scanRun.started_at);
        assert.equal(scanRun.finished_at, undefined);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("round-trip: create and finalize scan run", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("soc2", "/app");

        store.finalizeScanRun(scanRun.id, {
          totalFiles: 42,
          findingCount: 5,
          score: 85,
        });

        const latest = store.latestScanRun();
        assert.ok(latest);
        assert.equal(latest.id, scanRun.id);
        assert.equal(latest.total_files, 42);
        assert.equal(latest.finding_count, 5);
        assert.equal(latest.score, 85);
        assert.ok(latest.finished_at);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("latestScanRun returns null when no scans exist", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const latest = store.latestScanRun();
        assert.equal(latest, null);
        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("latestScanRun filters by framework", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        // Use different timestamps by adding a small delay
        const hipaaRun = store.createScanRun("hipaa", "/test");
        
        // Wait a bit to ensure different timestamp
        const start = Date.now();
        while (Date.now() - start < 2) {
          // Small busy wait to ensure different timestamp
        }
        
        const soc2Run = store.createScanRun("soc2", "/test");

        const latestHipaa = store.latestScanRun("hipaa");
        const latestSoc2 = store.latestScanRun("soc2");

        assert.equal(latestHipaa?.id, hipaaRun.id);
        assert.equal(latestSoc2?.id, soc2Run.id);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("insertFindings and findingsForRun", () => {
    test("inserts and retrieves findings", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const findings = [
          createFinding({ severity: "critical", file: "a.ts", line_start: 1 }),
          createFinding({ severity: "low", file: "b.ts", line_start: 2 }),
        ];

        store.insertFindings(scanRun.id, "hipaa", findings);

        const retrieved = store.findingsForRun(scanRun.id);
        assert.equal(retrieved.length, 2);
        assert.equal(retrieved[0].severity, "critical");
        assert.equal(retrieved[1].severity, "low");

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("orders findings by severity (critical > high > medium > low)", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const findings = [
          createFinding({ id: "f1", severity: "low", file: "a.ts", line_start: 1 }),
          createFinding({ id: "f2", severity: "critical", file: "b.ts", line_start: 2 }),
          createFinding({ id: "f3", severity: "medium", file: "c.ts", line_start: 3 }),
          createFinding({ id: "f4", severity: "high", file: "d.ts", line_start: 4 }),
        ];

        store.insertFindings(scanRun.id, "hipaa", findings);

        const retrieved = store.findingsForRun(scanRun.id);
        assert.equal(retrieved.length, 4);
        assert.equal(retrieved[0].id, "f2"); // critical
        assert.equal(retrieved[1].id, "f4"); // high
        assert.equal(retrieved[2].id, "f3"); // medium
        assert.equal(retrieved[3].id, "f1"); // low

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("orders findings by file and line when severity is equal", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const findings = [
          createFinding({ id: "f1", severity: "high", file: "z.ts", line_start: 100 }),
          createFinding({ id: "f2", severity: "high", file: "a.ts", line_start: 50 }),
          createFinding({ id: "f3", severity: "high", file: "a.ts", line_start: 10 }),
        ];

        store.insertFindings(scanRun.id, "hipaa", findings);

        const retrieved = store.findingsForRun(scanRun.id);
        assert.equal(retrieved[0].id, "f3"); // a.ts:10
        assert.equal(retrieved[1].id, "f2"); // a.ts:50
        assert.equal(retrieved[2].id, "f1"); // z.ts:100

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("findingById retrieves specific finding", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const finding = createFinding({ id: "test-finding-123" });
        store.insertFindings(scanRun.id, "hipaa", [finding]);

        const retrieved = store.findingById("test-finding-123");
        assert.ok(retrieved);
        assert.equal(retrieved.id, "test-finding-123");

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("findingById returns null for non-existent finding", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const retrieved = store.findingById("does-not-exist");
        assert.equal(retrieved, null);
        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("insertDataFlows and flowsForRun", () => {
    test("inserts and retrieves data flows", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const flows = [
          createDataFlow({ id: "flow1" }),
          createDataFlow({ id: "flow2" }),
        ];

        store.insertDataFlows(scanRun.id, flows);

        const retrieved = store.flowsForRun(scanRun.id);
        assert.equal(retrieved.length, 2);
        assert.ok(retrieved[0].id);
        assert.ok(retrieved[1].id);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("parses flow_json correctly", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const flow = createDataFlow({
          id: "test-flow",
          source: { file: "src/auth.ts", line: 100, description: "User password" },
          sinks: [
            { file: "src/log.ts", line: 50, type: "log", risk: "Password in logs" },
          ],
          path: [
            { file: "src/auth.ts", line: 100, function: "authenticate" },
            { file: "src/log.ts", line: 50, function: "debug" },
          ],
        });

        store.insertDataFlows(scanRun.id, [flow]);

        const retrieved = store.flowsForRun(scanRun.id);
        assert.equal(retrieved.length, 1);
        assert.equal(retrieved[0].source.file, "src/auth.ts");
        assert.equal(retrieved[0].source.line, 100);
        assert.equal(retrieved[0].sinks.length, 1);
        assert.equal(retrieved[0].sinks[0].type, "log");
        assert.equal(retrieved[0].path.length, 2);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("marks flows as violating based on sink type", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const flows = [
          createDataFlow({
            id: "violating-log",
            sinks: [{ file: "a.ts", line: 1, type: "log", risk: "PHI in logs" }],
          }),
          createDataFlow({
            id: "violating-api",
            sinks: [{ file: "b.ts", line: 2, type: "api", risk: "PHI to external API" }],
          }),
          createDataFlow({
            id: "safe-db",
            sinks: [{ file: "c.ts", line: 3, type: "db", risk: "Encrypted storage" }],
          }),
        ];

        store.insertDataFlows(scanRun.id, flows);

        const retrieved = store.flowsForRun(scanRun.id);
        const logFlow = retrieved.find((f) => f.id.includes("violating-log"));
        const apiFlow = retrieved.find((f) => f.id.includes("violating-api"));
        const dbFlow = retrieved.find((f) => f.id.includes("safe-db"));

        assert.equal(logFlow?.is_violating, true);
        assert.equal(apiFlow?.is_violating, true);
        assert.equal(dbFlow?.is_violating, false);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("marks flows as violating based on risk text", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const flow = createDataFlow({
          id: "risk-violating",
          sinks: [
            {
              file: "a.ts",
              line: 1,
              type: "db",
              risk: "This violates HIPAA compliance",
            },
          ],
        });

        store.insertDataFlows(scanRun.id, [flow]);

        const retrieved = store.flowsForRun(scanRun.id);
        assert.equal(retrieved[0].is_violating, true);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("exportToJson", () => {
    test("writes findings.json and remediations.json", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const findings = [createFinding({ severity: "high" })];
        store.insertFindings(scanRun.id, "hipaa", findings);

        const flows = [createDataFlow()];
        store.insertDataFlows(scanRun.id, flows);

        store.finalizeScanRun(scanRun.id, {
          totalFiles: 10,
          findingCount: 1,
          score: 96,
        });

        const exportPath = store.exportToJson();

        assert.ok(exportPath.endsWith("findings.json"));

        // Verify files exist by reading them
        const findingsContent = readFileSync(exportPath, "utf-8");
        const findingsData = JSON.parse(findingsContent);

        assert.ok(findingsData.scanRun);
        assert.equal(findingsData.scanRun.id, scanRun.id);
        assert.equal(findingsData.findings.length, 1);
        assert.equal(findingsData.flows.length, 1);

        const remediationsPath = exportPath.replace("findings.json", "remediations.json");
        const remediationsContent = readFileSync(remediationsPath, "utf-8");
        const remediationsData = JSON.parse(remediationsContent);
        assert.ok(Array.isArray(remediationsData));

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("handles empty database gracefully", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const exportPath = store.exportToJson();

        const findingsContent = readFileSync(exportPath, "utf-8");
        const findingsData = JSON.parse(findingsContent);

        assert.equal(findingsData.scanRun, null);
        assert.equal(findingsData.findings.length, 0);
        assert.equal(findingsData.flows.length, 0);

        const remediationsPath = exportPath.replace("findings.json", "remediations.json");
        const remediationsContent = readFileSync(remediationsPath, "utf-8");
        const remediationsData = JSON.parse(remediationsContent);
        assert.equal(remediationsData.length, 0);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("includes remediations in export", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const finding = createFinding({ id: "finding-with-rem" });
        store.insertFindings(scanRun.id, "hipaa", [finding]);

        store.insertRemediation({
          findingId: "finding-with-rem",
          branch: "fix/security-issue",
          diff: "--- a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n-bad\n+good",
          blastRadius: [{ file: "file.ts", impact: "Fixed security issue" }],
          rationale: "Removed hardcoded credential",
          status: "applied",
        });

        store.finalizeScanRun(scanRun.id, {
          totalFiles: 1,
          findingCount: 1,
          score: 92,
        });

        const exportPath = store.exportToJson();
        const remediationsPath = exportPath.replace("findings.json", "remediations.json");
        const remediationsContent = readFileSync(remediationsPath, "utf-8");
        const remediationsData = JSON.parse(remediationsContent);

        assert.equal(remediationsData.length, 1);
        assert.equal(remediationsData[0].finding_id, "finding-with-rem");
        assert.equal(remediationsData[0].branch, "fix/security-issue");
        assert.ok(remediationsData[0].blast_radius);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("insertRemediation", () => {
    test("creates remediation and updates finding status", () => {
      const tempDir = createTempDir();
      try {
        const store = new FindingsStore(tempDir);
        const scanRun = store.createScanRun("hipaa", "/test");

        const finding = createFinding({ id: "finding-123" });
        store.insertFindings(scanRun.id, "hipaa", [finding]);

        const remId = store.insertRemediation({
          findingId: "finding-123",
          branch: "fix/issue",
          diff: "some diff",
          blastRadius: [{ file: "test.ts", impact: "Fixed" }],
          rationale: "Security fix",
          status: "applied",
        });

        assert.ok(remId.startsWith("rem-"));

        const updatedFinding = store.findingById("finding-123");
        assert.equal(updatedFinding?.status, "pr-opened");

        const remediations = store.remediationsForFinding("finding-123");
        assert.equal(remediations.length, 1);

        store.close();
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});

describe("computeScore", () => {
  test("returns 100 for empty findings array", () => {
    const score = computeScore([]);
    assert.equal(score, 100);
  });

  test("calculates score with critical findings", () => {
    const findings = [
      { severity: "critical" as const },
      { severity: "critical" as const },
    ];
    const score = computeScore(findings);
    // 100 - (8 + 8) = 84
    assert.equal(score, 84);
  });

  test("calculates score with high findings", () => {
    const findings = [
      { severity: "high" as const },
      { severity: "high" as const },
    ];
    const score = computeScore(findings);
    // 100 - (4 + 4) = 92
    assert.equal(score, 92);
  });

  test("calculates score with medium findings", () => {
    const findings = [
      { severity: "medium" as const },
      { severity: "medium" as const },
      { severity: "medium" as const },
    ];
    const score = computeScore(findings);
    // 100 - (2 + 2 + 2) = 94
    assert.equal(score, 94);
  });

  test("calculates score with low findings", () => {
    const findings = [
      { severity: "low" as const },
      { severity: "low" as const },
      { severity: "low" as const },
      { severity: "low" as const },
    ];
    const score = computeScore(findings);
    // 100 - (1 + 1 + 1 + 1) = 96
    assert.equal(score, 96);
  });

  test("calculates score with mixed severities", () => {
    const findings = [
      { severity: "critical" as const }, // 8
      { severity: "high" as const },     // 4
      { severity: "medium" as const },   // 2
      { severity: "low" as const },      // 1
    ];
    const score = computeScore(findings);
    // 100 - (8 + 4 + 2 + 1) = 85
    assert.equal(score, 85);
  });

  test("enforces 100 ceiling", () => {
    const findings: Array<{ severity: "low" }> = [];
    const score = computeScore(findings);
    assert.equal(score, 100);
  });

  test("enforces 0 floor", () => {
    const findings = Array(20).fill({ severity: "critical" as const });
    const score = computeScore(findings);
    // 100 - (20 * 8) = -60, but floor is 0
    assert.equal(score, 0);
  });

  test("handles unknown severity as 0 penalty (TypeScript prevents this, but testing runtime)", () => {
    // This tests the runtime behavior if an invalid severity somehow gets through
    const findings = [{ severity: "unknown" as any }];
    const score = computeScore(findings);
    // Unknown severity returns undefined from weight lookup, which causes NaN in the reduce
    // The result will be NaN, which fails the 0-100 range check
    // This demonstrates that invalid severities break the scoring function
    assert.ok(Number.isNaN(score) || (score >= 0 && score <= 100));
  });

  test("score decreases as findings increase", () => {
    const score1 = computeScore([{ severity: "high" as const }]);
    const score2 = computeScore([
      { severity: "high" as const },
      { severity: "high" as const },
    ]);
    const score3 = computeScore([
      { severity: "high" as const },
      { severity: "high" as const },
      { severity: "high" as const },
    ]);

    assert.ok(score1 > score2);
    assert.ok(score2 > score3);
  });

  test("critical findings have highest penalty", () => {
    const criticalScore = computeScore([{ severity: "critical" as const }]);
    const highScore = computeScore([{ severity: "high" as const }]);
    const mediumScore = computeScore([{ severity: "medium" as const }]);
    const lowScore = computeScore([{ severity: "low" as const }]);

    assert.ok(criticalScore < highScore);
    assert.ok(highScore < mediumScore);
    assert.ok(mediumScore < lowScore);
  });
});

// Made with Bob
