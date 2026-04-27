export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { listWorkloadReferences } from "@/lib/catalogs/index";
import { createWorkloadReference } from "@/lib/catalogs/admin";
import type { WorkloadReferenceWriteInput } from "@/lib/catalogs/admin";

export function GET() {
  return NextResponse.json({ refs: listWorkloadReferences(true) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as WorkloadReferenceWriteInput;
    if (!body.label?.trim()) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }
    const id = createWorkloadReference(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
