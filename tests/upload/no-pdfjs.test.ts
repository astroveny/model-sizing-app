/**
 * Static guard: ensure pdfjs-dist is never re-imported in server-side code.
 * pdfjs-dist requires DOMMatrix (browser-only) and will crash in Node/Next
 * server routes. Use pdf-parse instead (P8.13 fix).
 */
import { execSync } from "child_process";
import { describe, it, expect } from "vitest";

describe("pdfjs-dist import guard", () => {
  it("should not import pdfjs-dist anywhere in app/lib source", () => {
    const result = execSync(
      `grep -rn "pdfjs-dist" --include="*.ts" --include="*.tsx" app/ lib/ 2>/dev/null || true`,
      { cwd: process.cwd(), encoding: "utf-8" }
    ).trim();

    expect(result, `pdfjs-dist found in server source:\n${result}`).toBe("");
  });
});
