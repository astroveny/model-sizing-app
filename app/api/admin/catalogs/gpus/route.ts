export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { listGpus } from "@/lib/catalogs/index";
import { createGpu } from "@/lib/catalogs/admin";
import type { GpuWriteInput } from "@/lib/catalogs/admin";

export function GET() {
  return NextResponse.json({ gpus: listGpus(true) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as GpuWriteInput;
    if (!body.model?.trim()) {
      return NextResponse.json({ error: "model is required" }, { status: 400 });
    }
    const id = createGpu(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
