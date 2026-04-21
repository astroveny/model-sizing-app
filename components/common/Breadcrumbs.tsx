"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useProjectStore } from "@/lib/store";

const SECTION_LABELS: Record<string, string> = {
  discovery: "Discovery",
  rfi: "RFI",
  build: "Build",
  export: "Export",
};

interface Crumb {
  label: string;
  href?: string;
}

function useBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const activeProject = useProjectStore((s) => s.activeProject);

  // Root and onboarding — no breadcrumbs
  if (pathname === "/" || pathname === "/onboarding") return [];

  const projectId = params?.id;
  if (!projectId) return [];

  const segments = pathname.split("/").filter(Boolean);
  // segments: ["project", id, section?]
  const section = segments[2];

  const projectName =
    activeProject?.id === projectId ? activeProject.name : "Project";

  const crumbs: Crumb[] = [
    { label: "All Projects", href: "/" },
    {
      label: projectName,
      href: section ? `/project/${projectId}/discovery` : undefined,
    },
  ];

  if (section && SECTION_LABELS[section]) {
    crumbs.push({ label: SECTION_LABELS[section] });
  }

  return crumbs;
}

export function Breadcrumbs() {
  const crumbs = useBreadcrumbs();

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-[var(--text-muted)] mb-6">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="hover:text-[var(--text-primary)] transition-colors duration-150"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "text-[var(--text-primary)] font-medium" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
