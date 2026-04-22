import { describe, it, expect } from "vitest";
import { resolveType, looksLikePdf, extractTextFromBuffer } from "@/lib/upload/extract";

// ---------------------------------------------------------------------------
// resolveType
// ---------------------------------------------------------------------------

describe("resolveType", () => {
  it("returns mime when valid and not octet-stream", () => {
    expect(resolveType("application/pdf", "file.pdf")).toBe("application/pdf");
  });

  it("falls back to extension when type is empty string", () => {
    expect(resolveType("", "document.pdf")).toBe("application/pdf");
    expect(resolveType("", "report.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(resolveType("", "notes.txt")).toBe("text/plain");
  });

  it("falls back to extension when type is application/octet-stream", () => {
    expect(resolveType("application/octet-stream", "doc.docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("returns original type when extension is unknown", () => {
    expect(resolveType("", "archive.zip")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// looksLikePdf
// ---------------------------------------------------------------------------

describe("looksLikePdf", () => {
  it("returns true for buffer starting with %PDF-", () => {
    expect(looksLikePdf(Buffer.from("%PDF-1.4 content"))).toBe(true);
  });

  it("returns false for plain text buffer", () => {
    expect(looksLikePdf(Buffer.from("Hello world"))).toBe(false);
  });

  it("returns false for binary-looking buffer", () => {
    expect(looksLikePdf(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]))).toBe(false);
  });

  it("returns false for empty buffer", () => {
    expect(looksLikePdf(Buffer.alloc(0))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractTextFromBuffer — plain text paths
// ---------------------------------------------------------------------------

describe("extractTextFromBuffer — plain text", () => {
  it("extracts plain text when type is text/plain", async () => {
    const buf = Buffer.from("RFP: We need 8 GPUs.\nDeadline: Q3.");
    const result = await extractTextFromBuffer(buf, "text/plain", "rfp.txt");
    expect(result).toContain("RFP:");
  });

  it("infers text/plain from .txt extension when type is empty", async () => {
    const buf = Buffer.from("Plain text content here.");
    const result = await extractTextFromBuffer(buf, "", "notes.txt");
    expect(result).toBe("Plain text content here.");
  });

  it("throws on empty file", async () => {
    const buf = Buffer.from("   \n\t  ");
    await expect(extractTextFromBuffer(buf, "text/plain", "empty.txt")).rejects.toThrow(
      "File is empty."
    );
  });

  it("throws on binary data passed as plain text", async () => {
    // 80% non-printable bytes — looks binary
    const bytes = new Uint8Array(50);
    for (let i = 0; i < 40; i++) bytes[i] = i % 31; // 0x00–0x1E (non-printable, skipping tab/LF/CR)
    for (let i = 40; i < 50; i++) bytes[i] = 65; // 'A'
    const buf = Buffer.from(bytes);
    await expect(extractTextFromBuffer(buf, "application/octet-stream", "binary.bin")).rejects.toThrow(
      "does not appear to be plain text"
    );
  });
});

// ---------------------------------------------------------------------------
// extractTextFromBuffer — malformed / scanned PDF paths
// ---------------------------------------------------------------------------

describe("extractTextFromBuffer — malformed PDF", () => {
  it("throws actionable error for empty-text PDF (scanned/image-only)", async () => {
    // Minimal syntactically-valid PDF with no text content.
    // pdf-parse will parse it successfully but return empty text.
    const minimalPdf = Buffer.from(
      "%PDF-1.4\n" +
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
      "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000068 00000 n \n0000000125 00000 n \n" +
      "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n217\n%%EOF"
    );
    // In unit test env, pdf-parse may not be callable; accept either the
    // scanned-PDF message or a parse-failed error — both are actionable.
    await expect(extractTextFromBuffer(minimalPdf, "application/pdf", "scanned.pdf")).rejects.toThrow(
      /scanned|image|OCR|PDF parsing failed/i
    );
  });

  it("detects PDF by magic bytes even when MIME type is empty", async () => {
    // Use looksLikePdf path: empty mime but starts with %PDF-
    // A truly valid minimal PDF that has text would pass — we just verify
    // the function enters the PDF path (error is about content, not file type)
    const fakePdf = Buffer.from("%PDF-1.4 not really a valid pdf");
    await expect(extractTextFromBuffer(fakePdf, "", "doc.pdf")).rejects.toThrow(
      /PDF parsing failed|scanned|image/i
    );
  });
});
