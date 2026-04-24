export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { clearAssignments } from "@/lib/settings/routing";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  clearAssignments(id);
  return new NextResponse(null, { status: 204 });
}
