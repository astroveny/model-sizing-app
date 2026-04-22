import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { extractBuildReport } from "@/lib/export/build-report-extract";
import { BuildReportPdfDocument } from "@/lib/export/build-report-pdf";
import { writeAudit } from "@/lib/db/audit";
import React from "react";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactPDF = require("@react-pdf/renderer") as typeof import("@react-pdf/renderer");

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

  try {
    const pdfBuffer = await ReactPDF.renderToBuffer(
      React.createElement(BuildReportPdfDocument, { report }) as Parameters<typeof ReactPDF.renderToBuffer>[0]
    );

    writeAudit("export.build-report-pdf", { projectId: id }, id);

    const slug = project.name.replace(/[^a-z0-9]/gi, "_");
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-build-report-${date}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[/api/export/build-report-pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
