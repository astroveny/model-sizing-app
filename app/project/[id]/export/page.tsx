"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/lib/store";
import { buildBomExport } from "@/lib/export/build-bom-export";
import { PdfPreview } from "@/components/export/PdfPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileCode2, FileJson, FileText, FileType, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";

const BOM_PRICE_PREFIX = "bom:price:";

function downloadUrl(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.activeProject);
  const setBuildOverride = useProjectStore((s) => s.setBuildOverride);
  const clearBuildOverride = useProjectStore((s) => s.clearBuildOverride);

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

  // Read per-item price overrides from build.overrides (key = "bom:price:<name>")
  const priceOverrides = useMemo<Record<string, number>>(() => {
    if (!project) return {};
    const raw = project.build.overrides as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith(BOM_PRICE_PREFIX) && typeof v === "number") {
        result[k.slice(BOM_PRICE_PREFIX.length)] = v;
      }
    }
    return result;
  }, [project]);

  // Apply overrides to compute effective items + totals
  const effectiveItems = useMemo(() => {
    if (!bom) return [];
    return bom.items.map((item) => {
      const overridePrice = priceOverrides[item.name];
      if (overridePrice !== undefined) {
        return {
          ...item,
          unitPriceUsd: overridePrice,
          totalPriceUsd: overridePrice * item.quantity,
          overridden: true,
        };
      }
      return { ...item, overridden: false };
    });
  }, [bom, priceOverrides]);

  const effectiveCapex = useMemo(
    () => effectiveItems.reduce((sum, i) => sum + (i.totalPriceUsd ?? 0), 0),
    [effectiveItems]
  );

  function handlePriceChange(itemName: string, raw: string) {
    const val = parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (!isNaN(val) && val >= 0) {
      setBuildOverride(`${BOM_PRICE_PREFIX}${itemName}`, val);
    }
  }

  function handlePriceReset(itemName: string) {
    clearBuildOverride(`${BOM_PRICE_PREFIX}${itemName}`);
  }

  if (!project || !bom) {
    return (
      <div className="p-8 text-[var(--text-muted)]">
        No project loaded.
      </div>
    );
  }

  const slug = project.name.replace(/[^a-z0-9]/gi, "_");

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-semibold">Export</h2>
        <p className="text-[var(--text-muted)] mt-1">
          Download the sizing report in your preferred format.
        </p>
      </div>

      {/* Customer Deliverables */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Customer Deliverables</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
                onClick={() => downloadUrl(`/api/export/pdf?projectId=${id}`, `${slug}_sizing.pdf`)}
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
                onClick={() => downloadUrl(`/api/export/docx?projectId=${id}`, `${slug}_sizing.docx`)}
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
                onClick={() => downloadUrl(`/api/export/bom?projectId=${id}`, `${slug}_bom.json`)}
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
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
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
                onClick={() => {
                  const date = new Date().toISOString().slice(0, 10);
                  downloadUrl(`/api/export/build-report-pdf?projectId=${id}`, `${slug}-build-report-${date}.pdf`);
                }}
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
                onClick={() => {
                  const date = new Date().toISOString().slice(0, 10);
                  downloadUrl(`/api/export/build-report-md?projectId=${id}`, `${slug}-build-report-${date}.md`);
                }}
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
                {effectiveItems.length} items · Est. CapEx{" "}
                {effectiveCapex > 0 ? `$${effectiveCapex.toLocaleString()}` : "—"}
                {effectiveItems.some((i) => i.overridden) && (
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
                    You can override unit prices per row below.
                  </span>
                  <button
                    onClick={dismissPricing}
                    aria-label="Dismiss pricing notice"
                    className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {effectiveItems.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Complete Discovery to generate the bill of materials.
                </p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-muted)]">
                        <th className="pb-2 pr-4 font-medium">Item</th>
                        <th className="pb-2 pr-4 font-medium">Category</th>
                        <th className="pb-2 pr-4 font-medium text-right">Qty</th>
                        <th className="pb-2 pr-4 font-medium text-right">Unit Price</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveItems.map((item, i) => (
                        <tr key={i} className="border-b border-[var(--border-muted)] last:border-0">
                          <td className="py-2 pr-4">{item.name}</td>
                          <td className="py-2 pr-4 text-[var(--text-muted)] capitalize">{item.category}</td>
                          <td className="py-2 pr-4 text-right">{item.quantity}</td>
                          <td className="py-2 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {item.overridden && (
                                <button
                                  onClick={() => handlePriceReset(item.name)}
                                  title="Reset to catalog price"
                                  className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </button>
                              )}
                              <input
                                type="text"
                                defaultValue={item.unitPriceUsd?.toLocaleString() ?? ""}
                                placeholder="—"
                                onBlur={(e) => handlePriceChange(item.name, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                }}
                                className={[
                                  "w-24 text-right bg-transparent border rounded px-1.5 py-0.5 text-sm",
                                  "focus:outline-none focus:border-[var(--accent-primary)]",
                                  item.overridden
                                    ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                                    : "border-[var(--border-muted)] hover:border-[var(--border-default)]",
                                ].join(" ")}
                              />
                            </div>
                          </td>
                          <td className="py-2 text-right font-medium">
                            {item.totalPriceUsd ? `$${item.totalPriceUsd.toLocaleString()}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} className="pt-3 font-semibold text-right pr-4">
                          Total CapEx (Est.)
                        </td>
                        <td className="pt-3 font-semibold text-right">
                          {effectiveCapex > 0 ? `$${effectiveCapex.toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
