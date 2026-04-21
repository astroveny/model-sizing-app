import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Resolve effective MIME type using file extension as fallback for empty browser type. */
function resolveType(mimeType: string, filename: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")  return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "txt")  return "text/plain";
  return mimeType;
}

/** Check PDF magic bytes (%PDF-) to detect whether the buffer is really a PDF. */
function looksLikePdf(buffer: Buffer): boolean {
  return buffer.slice(0, 5).toString("ascii") === "%PDF-";
}

async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const effectiveType = resolveType(mimeType, filename);

  if (effectiveType.includes("pdf") || looksLikePdf(buffer)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

    let result: { text: string; numpages: number };
    try {
      result = await pdfParse(buffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypt")) {
        throw new Error("Encrypted PDF — remove the password protection before uploading.");
      }
      throw new Error(`PDF parsing failed: ${msg}`);
    }

    const text = result.text.trim();
    if (!text) {
      throw new Error(
        `No text found in PDF (${result.numpages} page${result.numpages !== 1 ? "s" : ""}). ` +
        "This may be a scanned/image-only PDF. OCR is not supported in v1 — " +
        "copy and paste the text manually instead."
      );
    }
    return text;
  }

  if (
    effectiveType.includes("docx") ||
    effectiveType.includes("wordprocessingml") ||
    effectiveType.includes("wordprocessing")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    if (!result.value.trim()) {
      throw new Error("DOCX appears to be empty or contains only images — no text could be extracted.");
    }
    return result.value;
  }

  // Plain text — decode and validate it's readable
  const text = buffer.toString("utf-8");
  if (!text.trim()) {
    throw new Error("File is empty.");
  }
  // Heuristic: if more than 20% of chars are non-printable, it's likely binary
  const nonPrintable = [...text].filter((c) => {
    const code = c.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13;
  }).length;
  if (nonPrintable / text.length > 0.2) {
    throw new Error(
      "File does not appear to be plain text. Supported formats: PDF, DOCX, TXT. " +
      `Detected type: "${effectiveType || "unknown"}".`
    );
  }
  return text;
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
