"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles, AlertTriangle, Link2 } from "lucide-react";
import { getExplainEntry } from "@/lib/explain/loader";
import { useProjectStore } from "@/lib/store";

type Props = {
  fieldId: string;
  /** Optional inline label shown in the header if no title is in the catalog */
  label?: string;
};

export function ExplainBox({ fieldId, label }: Props) {
  const explainOverrides = useProjectStore(
    (s) => s.activeProject?.explainOverrides
  );

  const entry = getExplainEntry(fieldId, explainOverrides);

  const title = entry?.title ?? label ?? fieldId;

  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center gap-1.5 font-medium text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{title}</span>
      </div>

      {entry ? (
        <Tabs defaultValue="explain">
          <TabsList className="h-7 mb-2">
            <TabsTrigger value="explain" className="text-xs h-6 px-2">
              Explain
            </TabsTrigger>
            <TabsTrigger value="example" className="text-xs h-6 px-2">
              Example
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explain" className="mt-0 space-y-2">
            <p className="text-xs leading-relaxed text-foreground/80">
              {entry.explain}
            </p>

            {entry.customerFriendlyHint && (
              <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                {entry.customerFriendlyHint}
              </p>
            )}

            {entry.commonMistakes && entry.commonMistakes.length > 0 && (
              <div className="space-y-0.5">
                <p className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Common mistakes
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {entry.commonMistakes.map((m, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {entry.relatedFields && entry.relatedFields.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Link2 className="h-3 w-3 shrink-0" />
                See also:{" "}
                <span className="font-mono">
                  {entry.relatedFields.join(", ")}
                </span>
              </p>
            )}
          </TabsContent>

          <TabsContent value="example" className="mt-0">
            <p className="text-xs leading-relaxed text-foreground/80">
              {entry.example}
            </p>
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No explanation yet —{" "}
          <span className="font-mono text-[10px]">{fieldId}</span>
        </p>
      )}

      <div className="mt-2 border-t pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 text-xs text-muted-foreground"
          onClick={() => alert("Ask Claude coming in Phase 6 (P6.1)")}
        >
          <Sparkles className="h-3 w-3" />
          Ask Claude
        </Button>
      </div>
    </div>
  );
}
