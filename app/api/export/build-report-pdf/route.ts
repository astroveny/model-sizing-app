export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { extractBuildReport } from "@/lib/export/build-report-extract";
import { buildServerCatalogSnapshot } from "@/lib/sizing/catalog";
import { BuildReportPdfDocument } from "@/lib/export/build-report-pdf";
import { writeAudit } from "@/lib/db/audit";
import { buildExportFilename } from "@/lib/export/filename";
import React from "react";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactPDF = require("@react-pdf/renderer") as typeof import("@react-pdf/renderer");

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const catalog = buildServerCatalogSnapshot();
  const report = extractBuildReport(project, catalog);
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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildExportFilename(project.name, "build-report", "pdf")}"`,
      },
    });
  } catch (err) {
    console.error("[/api/export/build-report-pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
