/**
 * safeJsonParse — handles truncated LLM JSON responses gracefully.
 *
 * Strategy (in order):
 * 1. Try bare JSON.parse — succeeds for well-formed responses.
 * 2. Detect common truncation signatures (unclosed string / array / object)
 *    and attempt auto-closing by appending the minimum required tokens.
 * 3. If auto-closing produces valid JSON, return it with truncated=true.
 * 4. If all repair attempts fail, return { data: null, truncated: true }.
 *
 * The caller decides how to handle truncated=true (show warning, retry, etc.).
 */

export interface SafeJsonResult {
  data: Record<string, unknown> | null;
  truncated: boolean;
}

/**
 * Count unmatched opening brackets of a given type in a JSON string.
 * Ignores occurrences inside quoted strings.
 */
function unmatchedOpeners(text: string, open: string, close: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (const ch of text) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === open)  depth++;
    if (ch === close) depth--;
  }
  return Math.max(0, depth);
}

/** True if the last non-whitespace char before a possible truncation is a comma or colon. */
function endsWithTrailingCommaOrColon(text: string): boolean {
  const trimmed = text.trimEnd();
  return trimmed.endsWith(",") || trimmed.endsWith(":");
}

/** Attempt to close a truncated JSON string. */
function attemptRepair(text: string): string {
  let repaired = text.trimEnd();

  // Remove trailing comma or colon (invalid before a closing bracket)
  if (endsWithTrailingCommaOrColon(repaired)) {
    repaired = repaired.slice(0, -1).trimEnd();
  }

  // If we appear to be mid-string value, close it
  let inString = false;
  let escape = false;
  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') inString = !inString;
  }
  if (inString) repaired += '"';

  // Close unmatched arrays and objects (in reverse open order)
  const unclosedArrays  = unmatchedOpeners(repaired, "[", "]");
  const unclosedObjects = unmatchedOpeners(repaired, "{", "}");

  // Heuristic: objects were opened after the last array in most LLM responses;
  // close objects first, then arrays.
  repaired += "}".repeat(unclosedObjects);
  repaired += "]".repeat(unclosedArrays);
  // The outermost object may still need closing
  repaired += "}".repeat(unmatchedOpeners(repaired, "{", "}"));

  return repaired;
}

export function safeJsonParse(text: string): SafeJsonResult {
  // 1. Try as-is
  try {
    return { data: JSON.parse(text) as Record<string, unknown>, truncated: false };
  } catch {
    // fall through to repair
  }

  // 2. Attempt repair
  try {
    const repaired = attemptRepair(text);
    return { data: JSON.parse(repaired) as Record<string, unknown>, truncated: true };
  } catch {
    // repair failed
  }

  return { data: null, truncated: true };
}
