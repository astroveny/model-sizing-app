"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/lib/store";
import { llmComplete } from "@/lib/llm/client";
import { EXTRACT_RFP_SYSTEM, buildExtractRfpPrompt } from "@/lib/llm/prompts/extract-rfp";
import { safeJsonParse } from "@/lib/llm/json";
import { Upload, Loader2, FileText } from "lucide-react";

export function RfpUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "extracting" | "done" | "error">("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const updateField = useProjectStore((s) => s.updateField);

  async function handleFile(file: File) {
    setFileName(file.name);
    setError(null);
    setStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    let extractedText: string;
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const data = (await res.json()) as { filename: string; extractedText: string };
      extractedText = data.extractedText;
      updateField("rfi.uploadedFilePath", data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
      return;
    }

    setStatus("extracting");
    try {
      const result = await llmComplete({
        system: EXTRACT_RFP_SYSTEM,
        messages: [{ role: "user", content: buildExtractRfpPrompt(extractedText) }],
        maxTokens: 8000,
        temperature: 0.1,
      });

      const { data: parsed, truncated } = safeJsonParse(result.text);
      if (!parsed) throw new Error("Could not parse extraction response — try a shorter document.");
      if (truncated) console.warn("[safeJsonParse] Response was truncated; partial data applied.");
      updateField("rfi.source", "uploaded");
      updateField("rfi.rawText", extractedText);
      updateField("rfi.extracted.requirements",       parsed.requirements       ?? []);
      updateField("rfi.extracted.timelines",          parsed.timelines          ?? []);
      updateField("rfi.extracted.evaluationCriteria", parsed.evaluationCriteria ?? []);
      updateField("rfi.extracted.mandatoryItems",     parsed.mandatoryItems     ?? []);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
      setStatus("error");
    }
  }

  const busy = status === "uploading" || status === "extracting";

  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-default)] p-8 gap-3 cursor-pointer hover:border-[var(--accent-primary)]/50 transition-colors"
      onClick={() => !busy && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {busy ? (
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
      ) : (
        <Upload className="h-8 w-8 text-[var(--text-secondary)]" />
      )}

      <div className="text-center">
        <p className="text-sm font-medium">
          {status === "uploading" && "Uploading…"}
          {status === "extracting" && "Extracting requirements…"}
          {status === "done" && <span className="text-[var(--success)]">Done — requirements extracted</span>}
          {status === "error" && <span className="text-[var(--danger)]">Upload failed</span>}
          {status === "idle" && "Drop PDF or DOCX here, or click to browse"}
        </p>
        {fileName && status !== "idle" && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1 justify-center">
            <FileText className="h-3 w-3" /> {fileName}
          </p>
        )}
        {error && <p className="text-xs text-[var(--danger)] mt-1 max-w-xs">{error}</p>}
        {status === "idle" && (
          <p className="text-xs text-[var(--text-secondary)] mt-1">PDF, DOCX, or plain text · max 10 MB</p>
        )}
      </div>
    </div>
  );
}
