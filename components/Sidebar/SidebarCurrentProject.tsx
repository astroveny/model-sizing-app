"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Search, FileText, Wrench, Download, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/lib/store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SECTIONS = [
  { key: "discovery", label: "Discovery", icon: Search },
  { key: "rfi",       label: "RFI",       icon: FileText },
  { key: "build",     label: "Build",      icon: Wrench },
  { key: "export",    label: "Export",     icon: Download },
] as const;

interface SidebarCurrentProjectProps {
  collapsed: boolean;
}

export function SidebarCurrentProject({ collapsed }: SidebarCurrentProjectProps) {
  const params = useParams<{ id?: string }>();
  const pathname = usePathname();
  const activeProject = useProjectStore((s) => s.activeProject);

  const projectId = params?.id;
  if (!projectId) return null;

  const projectName = activeProject?.id === projectId
    ? activeProject.name
    : null;

  const sectionLink = (key: string, label: string, Icon: React.ElementType) => {
    const href = `/project/${projectId}/${key}`;
    const isActive = pathname.startsWith(href);

    const inner = (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-md py-1.5 text-sm transition-colors duration-150",
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]",
          isActive && "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium",
          collapsed ? "justify-center px-2" : "px-3"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={key} delay={200}>
          <Tooltip>
            <TooltipTrigger render={<div />}>{inner}</TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <div key={key}>{inner}</div>;
  };

  return (
    <div className="flex flex-col gap-0.5">
      {/* Project name header */}
      {collapsed ? (
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<div className="flex justify-center py-1" />}>
              <div className="relative">
                <FolderOpen className="h-5 w-5 text-[var(--text-muted)]" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {projectName ?? "Current project"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <p className="px-3 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide truncate">
          {projectName ?? "Current project"}
        </p>
      )}

      {/* Section links */}
      {SECTIONS.map(({ key, label, icon }) => sectionLink(key, label, icon))}
    </div>
  );
}
