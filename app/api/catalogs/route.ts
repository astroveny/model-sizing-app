export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { listGpus, listServers, listLlmModels } from "@/lib/catalogs/index";

export async function GET() {
  return NextResponse.json({
    gpus: listGpus(),
    servers: listServers(),
    llmModels: listLlmModels(),
  });
}
