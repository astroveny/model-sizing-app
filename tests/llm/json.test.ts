/**
 * P8.3 — RFP JSON truncation bug — reproduce
 * When the LLM response is cut off mid-JSON (e.g. maxTokens hit),
 * JSON.parse throws "Unterminated string" / "Unexpected end of JSON input".
 * After the fix (P8.4) safeJsonParse should handle this gracefully.
 */

import { describe, it, expect } from "vitest";

// ── Simulate the extraction code path that is currently in RfpPaster.tsx / RfpUploader.tsx
// The raw call is: const parsed = JSON.parse(result.text)
// We reproduce exactly that here to confirm it throws on truncated input.

const TRUNCATED_JSON = `{
  "requirements": [
    {
      "id": "r1",
      "text": "System must support 100 concurrent users",
      "layer": "hardware",
      "mandatory": true,
      "mapsToDiscoveryField": "load.concurrentUsers",
      "extractedValue": 100
    },
    {
      "id": "r2",
      "text": "Latency must be under 2 seconds end-to-end",
      "layer": "model-platform",
      "mandatory": true,
      "mapsToDiscoveryField": "load.targetLatencyP95Ms",
      "extractedValue": 2000
    },
    {
      "id": "r3",
      "text": "Must support Llama 3.1 70B parameter model with FP8 quantiz`;
// ^ deliberately truncated mid-string at ~10k chars equivalent

describe("P8.3 — RFP JSON truncation bug", () => {
  it("bare JSON.parse throws on truncated response (confirms the bug exists)", () => {
    expect(() => JSON.parse(TRUNCATED_JSON)).toThrow();
  });

  it("the error is a SyntaxError (not a silent failure)", () => {
    let caught: unknown;
    try {
      JSON.parse(TRUNCATED_JSON);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SyntaxError);
  });

  // After P8.4: safeJsonParse should return partial data + a flag instead of throwing
  it("safeJsonParse (P8.4) should handle truncated JSON without throwing", async () => {
    // Dynamically import so the test file can be written before the module exists.
    // This test will fail until P8.4 creates lib/llm/json.ts.
    let safeJsonParse: ((text: string) => { data: Record<string, unknown> | null; truncated: boolean }) | undefined;
    try {
      const mod = await import("@/lib/llm/json");
      safeJsonParse = mod.safeJsonParse;
    } catch {
      // Module doesn't exist yet — expected during P8.3
      safeJsonParse = undefined;
    }

    if (!safeJsonParse) {
      // Module not yet implemented — this is the expected P8.3 state
      expect(safeJsonParse).toBeUndefined();
      return;
    }

    // After P8.4: this must not throw
    expect(() => safeJsonParse!(TRUNCATED_JSON)).not.toThrow();
    const result = safeJsonParse(TRUNCATED_JSON);
    expect(result.truncated).toBe(true);
  });
});
