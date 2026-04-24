export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { testModel } from "@/lib/settings/models";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await testModel(id);
  return NextResponse.json(result);
}
