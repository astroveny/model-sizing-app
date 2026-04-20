import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { buildBomExport } from "@/lib/export/build-bom-export";
import { buildDocx } from "@/lib/export/docx";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("projectId");
  if (!id) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const bom = buildBomExport(project);

  try {
    const docxBuffer = await buildDocx(project, bom);

    return new NextResponse(new Uint8Array(docxBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9]/gi, "_")}_sizing.docx"`,
      },
    });
  } catch (err) {
    console.error("[/api/export/docx]", err);
    return NextResponse.json({ error: "DOCX generation failed" }, { status: 500 });
  }
}
