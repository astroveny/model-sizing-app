export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { listLlmModels } from "@/lib/catalogs/index";
import { createLlmModel } from "@/lib/catalogs/admin";
import type { LlmModelWriteInput } from "@/lib/catalogs/admin";

export function GET() {
  return NextResponse.json({ models: listLlmModels(true) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as LlmModelWriteInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const id = createLlmModel(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
