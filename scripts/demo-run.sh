#!/usr/bin/env bash
#
# End-to-end Sentinel demo: builds the CLI, scans the bundled demo-clinic-app
# against all three frameworks, runs auto-remediation, and prints a summary.
#
# Usage:
#   npm run demo                       # mock mode (no API key required)
#   ANTHROPIC_API_KEY=sk-... npm run demo   # live Claude mode
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${SENTINEL_DEMO_TARGET:-$REPO_ROOT/demo-clinic-app}"
CLI="$REPO_ROOT/packages/cli/dist/index.js"

cyan() { printf "\033[1;36m%s\033[0m\n" "$1"; }
dim()  { printf "\033[2m%s\033[0m\n" "$1"; }
ok()   { printf "\033[1;32m%s\033[0m\n" "$1"; }

cyan "── Sentinel demo ─────────────────────────────────────"
dim  "  target:    $TARGET"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  dim "  mode:      live (claude-opus-4-7)"
else
  dim "  mode:      mock  (set ANTHROPIC_API_KEY for live Claude)"
fi
echo

if [ ! -f "$CLI" ]; then
  cyan "Building CLI…"
  (cd "$REPO_ROOT" && npm run build --silent)
fi

for fw in hipaa soc2 pci; do
  cyan "▸ scan --framework $fw"
  node "$CLI" scan --framework "$fw" --path "$TARGET"
  echo
done

cyan "▸ remediate --all"
node "$CLI" remediate --all --path "$TARGET" || true
echo

SNAPSHOT="$TARGET/.sentinel/findings.json"
if [ -f "$SNAPSHOT" ]; then
  ok "✓ Demo complete. Snapshot at $SNAPSHOT"
  dim "  Launch the dashboard:  SENTINEL_TARGET=$TARGET npm run dashboard"
else
  echo "no snapshot produced — something went wrong" >&2
  exit 1
fi
