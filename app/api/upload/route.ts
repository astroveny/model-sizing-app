export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { extractTextFromBuffer } from "@/lib/upload/extract";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file in request" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  console.log(`[/api/upload] received: name=${file.name} size=${file.size} type="${file.type}"`);

  let extractedText: string;
  try {
    extractedText = await extractTextFromBuffer(buffer, file.type, file.name);
    console.log(`[/api/upload] extracted ${extractedText.length} chars from ${file.name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not extract text from file";
    console.error(`[/api/upload] extraction failed for ${file.name} (type="${file.type}"):`, err);
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Persist file to uploads/
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${uuid()}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json({ filename, extractedText, originalName: file.name });
  } catch (err) {
    console.error("[/api/upload] write error:", err);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
