import { simpleGit, type SimpleGit } from "simple-git";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Finding, RemediationResponse, RemediationEdit } from "../types.js";

export type RemediationStatus =
  | "applied"
  | "skipped:dirty-tree"
  | "skipped:not-a-repo"
  | "applied:working-tree-only";

export interface AppliedPatch {
  branch: string;
  filesChanged: string[];
  patchPath: string;
  status: RemediationStatus;
}

export function applyEdits(repoRoot: string, edits: RemediationEdit[]): string[] {
  const changed = new Set<string>();
  // Group by file to avoid repeated disk reads.
  const byFile = new Map<string, RemediationEdit[]>();
  for (const e of edits) {
    if (!byFile.has(e.file)) byFile.set(e.file, []);
    byFile.get(e.file)!.push(e);
  }
  for (const [file, fileEdits] of byFile) {
    const abs = join(repoRoot, file);
    if (!existsSync(abs)) continue;
    let content = readFileSync(abs, "utf8");
    for (const edit of fileEdits) {
      if (edit.search && content.includes(edit.search)) {
        content = content.replace(edit.search, edit.replace);
        changed.add(file);
      }
    }
    writeFileSync(abs, content);
  }
  return Array.from(changed);
}

export async function openLocalPr(args: {
  repoRoot: string;
  finding: Finding;
  remediation: RemediationResponse;
  applyToWorkingTree?: boolean;
}): Promise<AppliedPatch> {
  const branch = `sentinel/fix-${args.finding.id}`;
  const patchPath = join(args.repoRoot, ".sentinel", "patches", `${args.finding.id}.patch`);
  mkdirSync(dirname(patchPath), { recursive: true });
  writeFileSync(patchPath, args.remediation.diff);

  // Apply-mode: write fixes directly to the working tree, no branch dance.
  if (args.applyToWorkingTree) {
    const filesChanged = applyEdits(args.repoRoot, args.remediation.edits);
    return { branch, filesChanged, patchPath, status: "applied:working-tree-only" };
  }

  // PR-mode: create a sentinel/fix-* branch with just this fix; restore base branch.
  const git: SimpleGit = simpleGit(args.repoRoot);
  const isRepo = await git.checkIsRepo().catch(() => false);
  
  if (!isRepo) {
    // Not a git repo - patch written but can't create branch
    return { branch, filesChanged: [], patchPath, status: "skipped:not-a-repo" };
  }

  try {
    const status = await git.status();
    if (status.files.length > 0) {
      // Working tree dirty — skip branch creation to avoid carrying noise into the fix branch.
      // Patch is already written above, so developer can apply manually.
      return { branch, filesChanged: [], patchPath, status: "skipped:dirty-tree" };
    }
    
    const baseBranch = status.current ?? "main";
    let filesChanged: string[] = [];
    
    try {
      await git.checkoutLocalBranch(branch);
    } catch {
      await git.checkout(branch);
    }
    filesChanged = applyEdits(args.repoRoot, args.remediation.edits);
    if (filesChanged.length > 0) {
      await git.add(filesChanged);
      await git.commit(
        `Sentinel: fix ${args.finding.control} in ${args.finding.file}\n\n${args.remediation.rationale}`,
      );
    }
    // Reset to clean state and return to base.
    try {
      await git.reset(["--hard", "HEAD"]);
    } catch {}
    await git.checkout(baseBranch);
    
    return { branch, filesChanged, patchPath, status: "applied" };
  } catch {
    // Best-effort - if we fail, patch is still written
    return { branch, filesChanged: [], patchPath, status: "skipped:not-a-repo" };
  }
}
