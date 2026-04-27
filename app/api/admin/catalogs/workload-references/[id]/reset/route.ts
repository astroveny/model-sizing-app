export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { resetWorkloadReferenceToSeed } from "@/lib/catalogs/admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    resetWorkloadReferenceToSeed(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json({ error: msg }, { status: msg.includes("not found") ? 404 : 500 });
  }
}
