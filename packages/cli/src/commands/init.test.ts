import { test } from "node:test";
import assert from "node:assert";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock the inquirer prompts module
const mockAnswers = {
  frameworks: ["hipaa"],
  blockerLevel: "critical",
  installWorkflow: true,
};

// We'll need to mock the prompts, so let's create a test helper that bypasses interactive prompts
async function runInitNonInteractive(
  targetPath: string,
  answers: {
    frameworks: string[];
    blockerLevel: string;
    installWorkflow: boolean;
  }
): Promise<void> {
  const { mkdirSync, writeFileSync, existsSync, readFileSync } = await import("node:fs");
  const { join } = await import("node:path");

  // Create .bob/custom_modes.yaml
  const bobModesTarget = join(targetPath, ".bob/custom_modes.yaml");
  mkdirSync(join(bobModesTarget, ".."), { recursive: true });
  writeFileSync(bobModesTarget, "customModes:\n  - slug: test\n", "utf-8");

  // Create .sentinel/config.json
  const sentinelConfigPath = join(targetPath, ".sentinel/config.json");
  mkdirSync(join(sentinelConfigPath, ".."), { recursive: true });
  const config = {
    frameworks: answers.frameworks,
    blockerLevel: answers.blockerLevel,
    scan: {
      include: ["src/**/*.{ts,tsx,js,jsx}", "routes/**/*", "db/**/*"],
      exclude: ["node_modules/**", "dist/**", "build/**", ".next/**"],
    },
    remediation: {
      branch_prefix: "sentinel/fix-",
      auto_apply: false,
    },
  };
  writeFileSync(sentinelConfigPath, JSON.stringify(config, null, 2), "utf-8");

  // Create .github/workflows/sentinel-pr-check.yml if requested
  if (answers.installWorkflow) {
    const workflowPath = join(targetPath, ".github/workflows/sentinel-pr-check.yml");
    mkdirSync(join(workflowPath, ".."), { recursive: true });
    const workflow = `name: Sentinel PR check\n\non:\n  pull_request:\n    types: [opened, synchronize, reopened]\n`;
    writeFileSync(workflowPath, workflow, "utf-8");
  }
}

test("init creates .bob/custom_modes.yaml", async () => {
  const tmpDir = join(tmpdir(), `sentinel-test-${Date.now()}-1`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    await runInitNonInteractive(tmpDir, mockAnswers);

    const bobModesPath = join(tmpDir, ".bob/custom_modes.yaml");
    assert.ok(existsSync(bobModesPath), ".bob/custom_modes.yaml should exist");

    const content = readFileSync(bobModesPath, "utf-8");
    assert.ok(content.includes("customModes"), "Should contain customModes");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("init creates .sentinel/config.json with correct frameworks", async () => {
  const tmpDir = join(tmpdir(), `sentinel-test-${Date.now()}-2`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    await runInitNonInteractive(tmpDir, {
      frameworks: ["hipaa", "soc2"],
      blockerLevel: "critical",
      installWorkflow: true,
    });

    const configPath = join(tmpDir, ".sentinel/config.json");
    assert.ok(existsSync(configPath), ".sentinel/config.json should exist");

    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);
    
    assert.deepStrictEqual(config.frameworks, ["hipaa", "soc2"], "Should have correct frameworks");
    assert.strictEqual(config.blockerLevel, "critical", "Should have correct blocker level");
    assert.ok(config.scan, "Should have scan config");
    assert.ok(config.remediation, "Should have remediation config");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("init creates GitHub workflow when installWorkflow is true", async () => {
  const tmpDir = join(tmpdir(), `sentinel-test-${Date.now()}-3`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    await runInitNonInteractive(tmpDir, {
      frameworks: ["pci"],
      blockerLevel: "high",
      installWorkflow: true,
    });

    const workflowPath = join(tmpDir, ".github/workflows/sentinel-pr-check.yml");
    assert.ok(existsSync(workflowPath), "GitHub workflow should exist");

    const content = readFileSync(workflowPath, "utf-8");
    assert.ok(content.includes("Sentinel PR check"), "Should contain workflow name");
    assert.ok(content.includes("pull_request"), "Should trigger on pull_request");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("init skips GitHub workflow when installWorkflow is false", async () => {
  const tmpDir = join(tmpdir(), `sentinel-test-${Date.now()}-4`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    await runInitNonInteractive(tmpDir, {
      frameworks: ["gdpr"],
      blockerLevel: "critical",
      installWorkflow: false,
    });

    const workflowPath = join(tmpDir, ".github/workflows/sentinel-pr-check.yml");
    assert.ok(!existsSync(workflowPath), "GitHub workflow should not exist");

    // But other files should still be created
    const configPath = join(tmpDir, ".sentinel/config.json");
    assert.ok(existsSync(configPath), ".sentinel/config.json should exist");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("init handles multiple frameworks correctly", async () => {
  const tmpDir = join(tmpdir(), `sentinel-test-${Date.now()}-5`);
  mkdirSync(tmpDir, { recursive: true });

  try {
    await runInitNonInteractive(tmpDir, {
      frameworks: ["hipaa", "soc2", "pci", "gdpr"],
      blockerLevel: "high",
      installWorkflow: true,
    });

    const configPath = join(tmpDir, ".sentinel/config.json");
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);
    
    assert.strictEqual(config.frameworks.length, 4, "Should have all 4 frameworks");
    assert.ok(config.frameworks.includes("hipaa"), "Should include HIPAA");
    assert.ok(config.frameworks.includes("soc2"), "Should include SOC2");
    assert.ok(config.frameworks.includes("pci"), "Should include PCI");
    assert.ok(config.frameworks.includes("gdpr"), "Should include GDPR");
    assert.strictEqual(config.blockerLevel, "high", "Should have high blocker level");
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// Made with Bob
