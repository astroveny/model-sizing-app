/**
 * File text extraction utilities — separated from the API route so they
 * can be unit-tested without spinning up a Next.js server.
 */

/** Resolve effective MIME type using file extension as fallback for empty browser type. */
export function resolveType(mimeType: string, filename: string): string {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")  return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "txt")  return "text/plain";
  return mimeType;
}

/** True if the buffer starts with the PDF magic bytes %PDF-. */
export function looksLikePdf(buffer: Buffer): boolean {
  return buffer.slice(0, 5).toString("ascii") === "%PDF-";
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
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

  // Plain text — decode and validate
  const text = buffer.toString("utf-8");
  if (!text.trim()) {
    throw new Error("File is empty.");
  }
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
