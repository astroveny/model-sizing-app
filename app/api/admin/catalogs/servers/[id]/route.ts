export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { updateServer, deleteServer } from "@/lib/catalogs/admin";
import type { ServerGpuConfigInput } from "@/lib/catalogs/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json() as {
      vendor?: string | null;
      model?: string | null;
      cpu?: string | null;
      memoryGb?: number | null;
      storage?: string | null;
      network?: string | null;
      tdpWatts?: number | null;
      rackUnits?: number | null;
      releaseYear?: number | null;
      specSheetUrl?: string | null;
      notes?: string | null;
      gpuConfigs?: ServerGpuConfigInput[];
    };
    updateServer(id, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json({ error: msg }, { status: msg.includes("not found") ? 404 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    deleteServer(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json({ error: msg }, { status: msg.includes("not found") ? 404 : 400 });
  }
}
