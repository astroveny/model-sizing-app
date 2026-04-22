"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODIFIED_OPTIONS = [
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

interface ProjectsSearchFilterProps {
  hasActiveFilters: boolean;
}

export function ProjectsSearchFilter({ hasActiveFilters }: ProjectsSearchFilterProps) {
  const router     = useRouter();
  const pathname   = usePathname();
  const params     = useSearchParams();

  const q        = params.get("q") ?? "";
  const modified = params.get("modified") ?? "all";

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (!val || val === "all") next.delete(key);
        else next.set(key, val);
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ q: value }), 200);
  }

  function handleModified(value: string | null) {
    updateParams({ modified: value ?? "all" });
  }

  function clearAll() {
    router.push(pathname, { scroll: false });
  }

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
        <Input
          defaultValue={q}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search projects…"
          className="pl-9 bg-[var(--bg-surface)] border-[var(--border-default)]"
        />
      </div>

      <Select value={modified} onValueChange={handleModified}>
        <SelectTrigger className="w-36 bg-[var(--bg-surface)] border-[var(--border-default)]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODIFIED_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}
