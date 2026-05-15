export function extractJson(stdout: string): any {
  const trimmed = stdout.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {}
  }

  const fence = stdout.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {}
  }

  const firstBrace = stdout.indexOf("{");
  const lastBrace = stdout.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = stdout.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  throw new Error("Could not extract JSON from Bob output");
}

export function extractSessionId(stdout: string): string {
  const match = stdout.match(/session[_-]?id[:\s]+([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : `bob-${Date.now()}`;
}
