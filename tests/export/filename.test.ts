import { describe, it, expect } from "vitest";
import { slugifyName, buildExportFilename } from "@/lib/export/filename";

describe("slugifyName", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugifyName("Acme LLM Platform")).toBe("acme-llm-platform");
  });

  it("collapses consecutive non-alphanumeric into one hyphen", () => {
    expect(slugifyName("My  Project -- 2026")).toBe("my-project-2026");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugifyName("  hello world  ")).toBe("hello-world");
  });

  it("truncates to 48 characters", () => {
    const long = "a".repeat(60);
    expect(slugifyName(long).length).toBe(48);
  });

  it("returns 'project' for empty/blank input", () => {
    expect(buildExportFilename("", "proposal", "pdf")).toMatch(/^project-proposal-/);
  });
});

describe("buildExportFilename", () => {
  const FIXED_DATE = "2026-04-22";

  it("produces canonical pattern slug-type-date.ext", () => {
    expect(buildExportFilename("Acme LLM", "proposal", "pdf", FIXED_DATE))
      .toBe("acme-llm-proposal-2026-04-22.pdf");
  });

  it("handles bom type with json ext", () => {
    expect(buildExportFilename("My Project", "bom", "json", FIXED_DATE))
      .toBe("my-project-bom-2026-04-22.json");
  });

  it("handles build-report type with md ext", () => {
    expect(buildExportFilename("Foo Bar", "build-report", "md", FIXED_DATE))
      .toBe("foo-bar-build-report-2026-04-22.md");
  });

  it("defaults date to today when omitted", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(buildExportFilename("X", "proposal", "pdf")).toContain(today);
  });
});
