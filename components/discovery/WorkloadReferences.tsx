"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { WorkloadReferenceRow } from "@/lib/catalogs/index";

export function WorkloadReferences() {
  const [refs, setRefs] = useState<WorkloadReferenceRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/catalogs/workload-references")
      .then((r) => r.ok ? r.json() as Promise<{ refs: WorkloadReferenceRow[] }> : Promise.reject())
      .then((data) => setRefs(data.refs.filter((r) => !r.isDeprecated)))
      .catch(() => {});
  }, []);

  if (refs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {refs.map((r) => (
        <a
          key={r.id}
          href={r.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          title={r.description ?? undefined}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {r.label ?? r.url ?? r.id}
        </a>
      ))}
    </div>
  );
}
