import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

async function extractText(buffer: Buffer, mimeType: string, filename = ""): Promise<string> {
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType.includes("docx") ||
    mimeType.includes("wordprocessing")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text fallback
  return buffer.toString("utf-8");
}

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
    extractedText = await extractText(buffer, file.type, file.name);
    console.log(`[/api/upload] extracted ${extractedText.length} chars from ${file.name}`);
  } catch (err) {
    console.error(`[/api/upload] extraction failed for ${file.name} (type="${file.type}"):`, err);
    return NextResponse.json({ error: "Could not extract text from file" }, { status: 422 });
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
