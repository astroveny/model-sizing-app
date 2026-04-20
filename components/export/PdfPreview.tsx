"use client";

import dynamic from "next/dynamic";
import type { Project } from "@/lib/store";
import type { BomExport } from "@/lib/export/bom-schema";

interface Props {
  project: Project;
  bom: BomExport;
}

// Both PDFViewer and SizingPdfDocument must load together from the same
// @react-pdf/renderer instance — separate dynamic() calls break PDFViewer's
// child type check and produce "X is not a function" at runtime.
const PdfPreviewInner = dynamic(
  async () => {
    const { PDFViewer } = await import("@react-pdf/renderer");
    const { SizingPdfDocument } = await import("@/lib/export/pdf");

    function Inner({ project, bom }: Props) {
      return (
        <PDFViewer width="100%" height={700} className="rounded border border-border">
          <SizingPdfDocument project={project} bom={bom} />
        </PDFViewer>
      );
    }
    return Inner;
  },
  { ssr: false, loading: () => <div className="h-[700px] rounded border border-border flex items-center justify-center text-sm text-muted-foreground">Loading preview…</div> }
);

export function PdfPreview({ project, bom }: Props) {
  return <PdfPreviewInner project={project} bom={bom} />;
}
