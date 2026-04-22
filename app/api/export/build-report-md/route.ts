import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { extractBuildReport } from "@/lib/export/build-report-extract";
import { buildReportToMarkdown } from "@/lib/export/build-report-md";
import { writeAudit } from "@/lib/db/audit";
import { buildExportFilename } from "@/lib/export/filename";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const report = extractBuildReport(project);
  if (!report) {
    return NextResponse.json(
      { error: "Discovery incomplete — fill in model parameters and concurrent users first." },
      { status: 422 }
    );
  }

  const markdown = buildReportToMarkdown(report);
  writeAudit("export.build-report-md", { projectId: id }, id);

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildExportFilename(project.name, "build-report", "md")}"`,
    },
  });
}
