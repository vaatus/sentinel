import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import Database from "better-sqlite3";
import { getTargetPath } from "../../../lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function locateCliEntry(): string | null {
  const candidates = [
    resolve(process.cwd(), "..", "cli", "dist", "index.js"),
    resolve(process.cwd(), "..", "..", "packages", "cli", "dist", "index.js"),
    resolve(process.cwd(), "packages", "cli", "dist", "index.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export async function POST() {
  const cli = locateCliEntry();
  if (!cli) {
    return NextResponse.json(
      { error: "CLI not built. Run `npm run build` at the repo root." },
      { status: 500 },
    );
  }
  const target = getTargetPath();

  return new Promise<NextResponse>((resolveRes) => {
    const proc = spawn("node", [cli, "remediate", "--path", target, "--all", "--apply", "--json"], {
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolveRes(NextResponse.json({ error: `remediate exited ${code}: ${stderr}` }, { status: 500 }));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        // Export remediations to JSON so the /prs page can read without the SQLite native binding.
        exportRemediations(target);
        resolveRes(NextResponse.json(data));
      } catch (e: any) {
        resolveRes(NextResponse.json({ error: `parse error: ${e.message}` }, { status: 500 }));
      }
    });
  });
}

function exportRemediations(target: string) {
  const dbPath = join(target, ".sentinel", "findings.sqlite");
  if (!existsSync(dbPath)) return;
  const out = join(target, ".sentinel", "remediations.json");
  try {
    const db = new Database(dbPath, { readonly: true });
    const rows = db
      .prepare(
        `SELECT id, finding_id, branch, diff, blast_radius_json, rationale, created_at
         FROM remediation_prs ORDER BY created_at DESC`,
      )
      .all() as any[];
    db.close();
    const json = rows.map((r) => ({
      id: r.id,
      finding_id: r.finding_id,
      branch: r.branch,
      diff: r.diff,
      blast_radius: JSON.parse(r.blast_radius_json ?? "[]"),
      rationale: r.rationale,
      created_at: r.created_at,
    }));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(json, null, 2));
  } catch {
    // Best-effort.
  }
}
