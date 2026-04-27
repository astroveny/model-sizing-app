export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { listServers, listGpus } from "@/lib/catalogs/index";
import { createServer } from "@/lib/catalogs/admin";
import type { ServerGpuConfigInput } from "@/lib/catalogs/admin";

export function GET() {
  return NextResponse.json({
    servers: listServers(true),
    gpus: listGpus(true),
  });
}

export async function POST(req: Request) {
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
    if (!body.model?.trim()) {
      return NextResponse.json({ error: "model is required" }, { status: 400 });
    }
    const id = createServer(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
