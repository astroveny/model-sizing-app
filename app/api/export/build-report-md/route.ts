import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { extractBuildReport } from "@/lib/export/build-report-extract";
import { buildReportToMarkdown } from "@/lib/export/build-report-md";
import { writeAudit } from "@/lib/db/audit";

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

  const slug = project.name.replace(/[^a-z0-9]/gi, "_");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-build-report-${date}.md"`,
    },
  });
}
