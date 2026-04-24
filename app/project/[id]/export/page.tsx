"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/lib/store";
import { buildBomExport } from "@/lib/export/build-bom-export";
import { PdfPreview } from "@/components/export/PdfPreview";
import { BomTable } from "@/components/export/BomTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileCode2, FileJson, FileText, FileType, X } from "lucide-react";
import { useMemo, useState } from "react";
import { buildExportFilename } from "@/lib/export/filename";
import type { BomItem } from "@/lib/store";

function downloadUrl(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.activeProject);
  const setBomOverride = useProjectStore((s) => s.setBomOverride);
  const clearBomOverride = useProjectStore((s) => s.clearBomOverride);

  const [pricingDismissed, setPricingDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("ml-sizer:bom-pricing-dismissed") === "1";
  });

  function dismissPricing() {
    sessionStorage.setItem("ml-sizer:bom-pricing-dismissed", "1");
    setPricingDismissed(true);
  }

  const bom = useMemo(() => {
    if (!project) return null;
    return buildBomExport(project);
  }, [project]);

  const bomOverrides = useMemo<Record<string, Partial<BomItem>>>(() => {
    return (project?.build?.bomOverrides as Record<string, Partial<BomItem>>) ?? {};
  }, [project]);

  const hasOverrides = Object.keys(bomOverrides).length > 0;

  // GPU id used by the sizing engine — needed to filter compatible swap servers
  const currentGpuId = useMemo(() => {
    if (!project) return "h100-sxm";
    const hw = project.discovery.hardware;
    return hw.preferredGpu ?? (hw.preferredVendor === "amd" ? "mi300x" : "h100-sxm");
  }, [project]);

  if (!project || !bom) {
    return (
      <div className="p-8 text-[var(--text-secondary)]">
        No project loaded.
      </div>
    );
  }

  const slug = project.name;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-semibold">Export</h2>
        <p className="text-[var(--text-secondary)] mt-1">
          Download the sizing report in your preferred format.
        </p>
      </div>

      {/* Customer Deliverables */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Customer Deliverables</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Polished outputs suitable for sharing with the customer.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileType className="h-5 w-5 text-red-500" />
                Proposal PDF
              </CardTitle>
              <CardDescription className="text-xs">
                Formatted report with cover, sizing highlights, BoM, and disclaimers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => downloadUrl(`/api/export/pdf?projectId=${id}`, buildExportFilename(slug, "proposal", "pdf"))}
              >
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-blue-500" />
                Proposal Word
              </CardTitle>
              <CardDescription className="text-xs">
                Editable DOCX with the same sections as the PDF, ready for customisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => downloadUrl(`/api/export/docx?projectId=${id}`, buildExportFilename(slug, "proposal", "docx"))}
              >
                Download DOCX
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileJson className="h-5 w-5 text-green-500" />
                JSON BoM
              </CardTitle>
              <CardDescription className="text-xs">
                Structured bill of materials in JSON format for tooling and integrations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => downloadUrl(`/api/export/bom?projectId=${id}`, buildExportFilename(slug, "bom", "json"))}
              >
                Download JSON
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Internal Reports */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Internal Reports</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Detailed technical build reports for internal review, PRs, and handoff.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileType className="h-5 w-5 text-purple-500" />
                Build Report PDF
              </CardTitle>
              <CardDescription className="text-xs">
                Full technical report — cover, per-layer panels, assumptions, BoM, engine notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => downloadUrl(`/api/export/build-report-pdf?projectId=${id}`, buildExportFilename(slug, "build-report", "pdf"))}
              >
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCode2 className="h-5 w-5 text-purple-500" />
                Build Report Markdown
              </CardTitle>
              <CardDescription className="text-xs">
                GitHub-flavored Markdown with YAML frontmatter — attach to PRs or wikis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => downloadUrl(`/api/export/build-report-md?projectId=${id}`, buildExportFilename(slug, "build-report", "md"))}
              >
                Download MD
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview */}
      <Tabs defaultValue="pdf">
        <TabsList>
          <TabsTrigger value="pdf">PDF Preview</TabsTrigger>
          <TabsTrigger value="bom">BoM Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-4">
          <PdfPreview project={project} bom={bom} />
        </TabsContent>

        <TabsContent value="bom" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill of Materials</CardTitle>
              <CardDescription>
                {bom.items.length} items
                {hasOverrides && (
                  <span className="ml-2 text-[var(--accent-primary)] text-xs">(includes overrides)</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pricingDismissed && (
                <div className="flex items-start gap-2 rounded-md border border-[var(--warning)] bg-[var(--bg-subtle)] px-3 py-2 mb-4 text-sm text-[var(--warning)]">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="flex-1">
                    Indicative pricing only — confirm all figures with your vendor before committing to a budget.
                    Edit unit prices or swap items per row. All 5 export formats reflect your changes.
                  </span>
                  <button
                    onClick={dismissPricing}
                    aria-label="Dismiss pricing notice"
                    className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {bom.items.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Complete Discovery to generate the bill of materials.
                </p>
              ) : (
                <BomTable
                  bom={bom}
                  bomOverrides={bomOverrides}
                  currentGpuId={currentGpuId}
                  onSetOverride={setBomOverride}
                  onClearOverride={clearBomOverride}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
