import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { buildBomExport } from "@/lib/export/build-bom-export";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const bom = buildBomExport(project);

  return new NextResponse(JSON.stringify(bom, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, "_")}_bom.json"`,
    },
  });
}
