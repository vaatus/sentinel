import { test } from "node:test";
import assert from "node:assert";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { runWatch } from "./watch.js";

// Helper to create a temporary git repo with a diff
function createTestRepo(tmpDir: string): void {
  mkdirSync(tmpDir, { recursive: true });
  
  // Initialize git repo
  execSync("git init", { cwd: tmpDir });
  execSync('git config user.email "test@example.com"', { cwd: tmpDir });
  execSync('git config user.name "Test User"', { cwd: tmpDir });
  
  // Create initial commit with a clean file
  const cleanFile = join(tmpDir, "clean.ts");
  writeFileSync(cleanFile, `
export function safeFunction() {
  return "This is safe";
}
`);
  execSync("git add .", { cwd: tmpDir });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir });
  
  // Create a new file with a HIPAA violation
  const violationFile = join(tmpDir, "violation.ts");
  writeFileSync(violationFile, `
import express from 'express';

const app = express();

// HIPAA violation: PHI endpoint without authentication
app.get('/api/patients/:id', (req, res) => {
  const patientData = {
    ssn: '123-45-6789',
    diagnosis: 'Type 2 Diabetes'
  };
  res.json(patientData);
});
`);
  
  execSync("git add .", { cwd: tmpDir });
  execSync('git commit -m "Add violation"', { cwd: tmpDir });
}

test("watch: scans only changed files", async () => {
  const tmpDir = join("/tmp", `sentinel-test-${Date.now()}`);
  
  try {
    createTestRepo(tmpDir);
    
    // Capture stdout
    let jsonOutput = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: any) => {
      const str = chunk.toString();
      // Only capture JSON output (starts with { or [)
      if (str.trim().startsWith("{") || str.trim().startsWith("[")) {
        jsonOutput += str;
      }
      return true;
    }) as any;
    
    await runWatch({
      framework: "hipaa",
      path: tmpDir,
      base: "HEAD~1",
      format: "json",
    });
    
    process.stdout.write = originalWrite;
    
    const result = JSON.parse(jsonOutput);
    
    // Should have findings since we added a violation
    assert.ok(result.findings.length > 0, "Should detect findings in changed files");
    
    // All findings should be from the violation.ts file (not clean.ts)
    for (const finding of result.findings) {
      assert.ok(finding.file.includes("violation.ts"), `Finding should be in violation.ts, got ${finding.file}`);
    }
    
    assert.ok(result.score < 100, "Score should be less than 100 with violations");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("watch: returns empty findings when no files changed", async () => {
  const tmpDir = join("/tmp", `sentinel-test-${Date.now()}`);
  
  try {
    mkdirSync(tmpDir, { recursive: true });
    execSync("git init", { cwd: tmpDir });
    execSync('git config user.email "test@example.com"', { cwd: tmpDir });
    execSync('git config user.name "Test User"', { cwd: tmpDir });
    
    const file = join(tmpDir, "test.ts");
    writeFileSync(file, "export const x = 1;");
    execSync("git add .", { cwd: tmpDir });
    execSync('git commit -m "Initial"', { cwd: tmpDir });
    
    let jsonOutput = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: any) => {
      const str = chunk.toString();
      // Only capture JSON output (starts with { or [)
      if (str.trim().startsWith("{") || str.trim().startsWith("[")) {
        jsonOutput += str;
      }
      return true;
    }) as any;
    
    await runWatch({
      framework: "hipaa",
      path: tmpDir,
      base: "HEAD",
      format: "json",
    });
    
    process.stdout.write = originalWrite;
    
    const result = JSON.parse(jsonOutput);
    assert.strictEqual(result.findings.length, 0, "Should have no findings when no files changed");
    assert.strictEqual(result.score, 100, "Score should be 100 with no findings");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("watch: github-actions format outputs annotations", async () => {
  const tmpDir = join("/tmp", `sentinel-test-${Date.now()}`);
  
  try {
    createTestRepo(tmpDir);
    
    let output = "";
    const originalLog = console.log.bind(console);
    console.log = (...args: any[]) => {
      output += args.join(" ") + "\n";
    };
    
    await runWatch({
      framework: "hipaa",
      path: tmpDir,
      base: "HEAD~1",
      format: "github-actions",
    });
    
    console.log = originalLog;
    
    // Should contain GitHub Actions annotation format
    assert.ok(output.includes("::error") || output.includes("::warning") || output.includes("::notice"), 
      "Should output GitHub Actions annotations");
    
    if (output.trim().length > 0) {
      assert.ok(output.includes("file="), "Annotations should include file parameter");
      assert.ok(output.includes("line="), "Annotations should include line parameter");
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("watch: markdown format outputs PR comment", async () => {
  const tmpDir = join("/tmp", `sentinel-test-${Date.now()}`);
  
  try {
    createTestRepo(tmpDir);
    
    let output = "";
    const originalLog = console.log.bind(console);
    console.log = (...args: any[]) => {
      output += args.join(" ") + "\n";
    };
    
    await runWatch({
      framework: "hipaa",
      path: tmpDir,
      base: "HEAD~1",
      format: "markdown",
    });
    
    console.log = originalLog;
    
    // Should contain markdown comment marker
    assert.ok(output.includes("<!-- sentinel-watch-comment -->"), "Should include comment marker");
    assert.ok(output.includes("## 🛡️ Sentinel compliance report"), "Should include header");
    assert.ok(output.includes("**Score:**"), "Should include score");
    assert.ok(output.includes("| Severity | Count |"), "Should include severity table");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("watch: falls back to HEAD~1 when base ref doesn't exist", async () => {
  const tmpDir = join("/tmp", `sentinel-test-${Date.now()}`);
  
  try {
    createTestRepo(tmpDir);
    
    let jsonOutput = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: any) => {
      const str = chunk.toString();
      // Only capture JSON output (starts with { or [)
      if (str.trim().startsWith("{") || str.trim().startsWith("[")) {
        jsonOutput += str;
      }
      return true;
    }) as any;
    
    // Use a non-existent base ref
    await runWatch({
      framework: "hipaa",
      path: tmpDir,
      base: "origin/nonexistent",
      format: "json",
    });
    
    process.stdout.write = originalWrite;
    
    const result = JSON.parse(jsonOutput);
    
    // Should still work by falling back to HEAD~1
    assert.ok(result.findings !== undefined, "Should return findings with fallback");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Made with Bob
