"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/lib/store";
import { buildBomExport } from "@/lib/export/build-bom-export";
import { PdfPreview } from "@/components/export/PdfPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileJson, FileText, FileType } from "lucide-react";
import { useMemo } from "react";

function downloadUrl(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore((s) => s.activeProject);

  const bom = useMemo(() => {
    if (!project) return null;
    return buildBomExport(project);
  }, [project]);

  if (!project || !bom) {
    return (
      <div className="p-8 text-muted-foreground">
        No project loaded.
      </div>
    );
  }

  const slug = project.name.replace(/[^a-z0-9]/gi, "_");

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-semibold">Export</h2>
        <p className="text-muted-foreground mt-1">
          Download the sizing report in your preferred format.
        </p>
      </div>

      {/* Download cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileType className="h-5 w-5 text-red-500" />
              PDF Report
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
              Word Document
            </CardTitle>
            <CardDescription className="text-xs">
              Editable DOCX with the same sections as the PDF, styled for editing.
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
                {bom.items.length} items · Est. CapEx{" "}
                {bom.totals.capexUsd > 0
                  ? `$${bom.totals.capexUsd.toLocaleString()}`
                  : "—"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bom.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Complete Discovery to generate the bill of materials.
                </p>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Item</th>
                        <th className="pb-2 pr-4 font-medium">Category</th>
                        <th className="pb-2 pr-4 font-medium text-right">Qty</th>
                        <th className="pb-2 pr-4 font-medium text-right">Unit Price</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.items.map((item, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-4">{item.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground capitalize">{item.category}</td>
                          <td className="py-2 pr-4 text-right">{item.quantity}</td>
                          <td className="py-2 pr-4 text-right">
                            {item.unitPriceUsd ? `$${item.unitPriceUsd.toLocaleString()}` : "—"}
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
                          {bom.totals.capexUsd > 0
                            ? `$${bom.totals.capexUsd.toLocaleString()}`
                            : "—"}
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
