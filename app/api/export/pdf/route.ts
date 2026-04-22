import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { buildBomExport } from "@/lib/export/build-bom-export";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactPDF = require("@react-pdf/renderer") as typeof import("@react-pdf/renderer");
import { SizingPdfDocument } from "@/lib/export/pdf";
import { writeAudit } from "@/lib/db/audit";
import { buildExportFilename } from "@/lib/export/filename";
import React from "react";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const bom = buildBomExport(project);

  try {
    const pdfBuffer = await ReactPDF.renderToBuffer(
      React.createElement(SizingPdfDocument, { project, bom }) as Parameters<typeof ReactPDF.renderToBuffer>[0]
    );

    writeAudit("export.pdf", { projectId: id }, id);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildExportFilename(project.name, "proposal", "pdf")}"`,
      },
    });
  } catch (err) {
    console.error("[/api/export/pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
