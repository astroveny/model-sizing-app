export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { buildBomExport } from "@/lib/export/build-bom-export";
import { buildServerCatalogSnapshot } from "@/lib/sizing/server-catalog";
import { buildExportFilename } from "@/lib/export/filename";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const catalog = buildServerCatalogSnapshot();
  const bom = buildBomExport(project, catalog);

  return new NextResponse(JSON.stringify(bom, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${buildExportFilename(project.name, "bom", "json")}"`,
    },
  });
}
