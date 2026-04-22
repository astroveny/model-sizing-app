import { describe, it, expect } from "vitest";
import { buildReportToMarkdown } from "@/lib/export/build-report-md";
import { BUILD_REPORT_FIXTURE } from "@/lib/export/build-report-spec";

describe("buildReportToMarkdown", () => {
  it("starts with YAML frontmatter block", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("title:");
    expect(md).toContain("date:");
    expect(md).toContain("---\n");
  });

  it("includes H1 title with project name", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md).toContain("# Acme LLM Platform — Build Report");
  });

  it("includes all required H2 section headings", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    for (const heading of ["Summary", "Hardware", "Infrastructure", "Model Platform", "Application", "Bill of Materials", "Assumptions", "Engine Notes"]) {
      expect(md).toContain(`## ${heading}`);
    }
  });

  it("includes a Table of Contents with anchor links", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md).toContain("## Table of Contents");
    expect(md).toContain("[Summary](#summary)");
    expect(md).toContain("[Hardware](#hardware)");
  });

  it("renders GFM tables with pipe separators", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    // Every table must have a separator row with ---
    const separatorRows = md.split("\n").filter((l) => /^\| --- \|/.test(l) || /^\| ---/.test(l));
    expect(separatorRows.length).toBeGreaterThan(0);
  });

  it("includes GPU model in Hardware section", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md).toContain("H100 SXM5");
  });

  it("includes TTFT estimate in Model Platform section", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md).toContain("180 ms");
  });

  it("includes BoM pricing disclaimer", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md).toContain("Indicative pricing");
  });

  it("includes engine notes as list items", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md).toContain("- TP=4 chosen");
  });

  it("shows Total CapEx row in BoM", () => {
    const md = buildReportToMarkdown(BUILD_REPORT_FIXTURE);
    expect(md).toContain("Total CapEx (Est.)");
  });

  it("marks overridden BoM rows with asterisk", () => {
    const reportWithOverride = {
      ...BUILD_REPORT_FIXTURE,
      bom: BUILD_REPORT_FIXTURE.bom.map((r, i) =>
        i === 0 ? { ...r, overridden: true } : r
      ),
    };
    const md = buildReportToMarkdown(reportWithOverride);
    expect(md).toContain("\\*");
    expect(md).toContain("Price overridden by user");
  });

  it("produces valid output for empty BoM", () => {
    const report = { ...BUILD_REPORT_FIXTURE, bom: [] };
    const md = buildReportToMarkdown(report);
    expect(md).toContain("No items");
  });

  it("produces valid output for empty engine notes", () => {
    const report = { ...BUILD_REPORT_FIXTURE, engineNotes: [] };
    const md = buildReportToMarkdown(report);
    expect(md).toContain("No notes generated");
  });
});
