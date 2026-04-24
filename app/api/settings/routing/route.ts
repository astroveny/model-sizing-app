export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getRouting, assign, unassign } from "@/lib/settings/routing";
import type { LlmFeatureId } from "@/lib/settings/routing";

export function GET() {
  return NextResponse.json(getRouting());
}

export async function POST(req: NextRequest) {
  const { feature, modelId } = (await req.json()) as { feature: LlmFeatureId; modelId: string };
  assign(feature, modelId);
  return NextResponse.json(getRouting());
}

export async function DELETE(req: NextRequest) {
  const { feature } = (await req.json()) as { feature: LlmFeatureId };
  unassign(feature);
  return NextResponse.json(getRouting());
}
