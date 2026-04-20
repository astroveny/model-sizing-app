"use client";

import dynamic from "next/dynamic";
import type { Project } from "@/lib/store";
import type { BomExport } from "@/lib/export/bom-schema";

// PDFViewer is browser-only — load it dynamically with no SSR
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);
const SizingPdfDocumentDynamic = dynamic(
  () => import("@/lib/export/pdf").then((mod) => mod.SizingPdfDocument),
  { ssr: false }
);

interface Props {
  project: Project;
  bom: BomExport;
}

export function PdfPreview({ project, bom }: Props) {
  return (
    <PDFViewer width="100%" height={700} className="rounded border border-border">
      <SizingPdfDocumentDynamic project={project} bom={bom} />
    </PDFViewer>
  );
}
