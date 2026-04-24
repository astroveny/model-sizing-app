export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getModel, updateModel, deleteModel } from "@/lib/settings/models";
import type { UpdateModelInput } from "@/lib/settings/models";

export function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const model = getModel(id);
    if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(model);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: UpdateModelInput;
  try { body = (await req.json()) as UpdateModelInput; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  try {
    const updated = updateModel(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteModel(id);
  return new NextResponse(null, { status: 204 });
}
