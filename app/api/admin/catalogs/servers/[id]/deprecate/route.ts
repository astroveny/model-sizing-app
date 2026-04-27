export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { deprecateServer } from "@/lib/catalogs/admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deprecateServer(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
