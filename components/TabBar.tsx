"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Discovery", segment: "discovery" },
  { label: "RFI", segment: "rfi" },
  { label: "Build", segment: "build" },
  { label: "Export", segment: "export" },
] as const;

export function TabBar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex border-b border-border bg-background">
      {TABS.map(({ label, segment }) => {
        const href = `/project/${projectId}/${segment}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={segment}
            href={href}
            className={cn(
              "px-5 py-3 text-sm font-medium transition-colors",
              active
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
