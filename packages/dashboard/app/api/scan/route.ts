import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
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
  const framework = process.env.SENTINEL_FRAMEWORK ?? "hipaa";

  return new Promise<NextResponse>((resolveRes) => {
    const proc = spawn("node", [cli, "scan", "--framework", framework, "--path", target, "--json"], {
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolveRes(NextResponse.json({ error: `scan exited ${code}: ${stderr}` }, { status: 500 }));
        return;
      }
      try {
        const data = JSON.parse(stdout);
        resolveRes(NextResponse.json(data));
      } catch (e: any) {
        resolveRes(NextResponse.json({ error: `parse error: ${e.message}` }, { status: 500 }));
      }
    });
  });
}
