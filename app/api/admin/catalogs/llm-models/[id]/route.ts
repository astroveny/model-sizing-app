export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { updateLlmModel, deleteLlmModel } from "@/lib/catalogs/admin";
import type { LlmModelWriteInput } from "@/lib/catalogs/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json() as Omit<LlmModelWriteInput, "id">;
    updateLlmModel(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json({ error: msg }, { status: msg.includes("not found") ? 404 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteLlmModel(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json({ error: msg }, { status: msg.includes("not found") ? 404 : 400 });
  }
}
