export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { listModels, createModel } from "@/lib/settings/models";
import type { CreateModelInput } from "@/lib/settings/models";

export function GET() {
  const models = listModels();
  return NextResponse.json(models);
}

export async function POST(req: NextRequest) {
  let body: CreateModelInput;
  try {
    body = (await req.json()) as CreateModelInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.label || !body.provider || !body.providerConfig?.model) {
    return NextResponse.json({ error: "label, provider, and providerConfig.model are required" }, { status: 400 });
  }
  try {
    const model = createModel(body);
    return NextResponse.json(model, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
