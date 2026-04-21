"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Project } from "@/lib/store";

const PATTERN_LABELS: Record<string, string> = {
  "internal-inference":  "Internal inference",
  "external-api":        "External API",
  "gpuaas-multi-tenant": "GPU-as-a-Service",
  "saas-product":        "SaaS product",
};

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1) return "Yesterday";
  if (days < 7)   return `${days} days ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(iso).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

interface ProjectCardProps {
  project: Project;
  /** Injected by P7.12 — delete confirmation dialog trigger */
  onDeleteClick?: (e: React.MouseEvent) => void;
}

export function ProjectCard({ project, onDeleteClick }: ProjectCardProps) {
  const router = useRouter();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/project/${project.id}/discovery`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/project/${project.id}/discovery`)}
      className="group flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--text-primary)] truncate">{project.name}</p>
        {project.customer && (
          <p className="text-sm text-[var(--text-secondary)] truncate mt-0.5">{project.customer}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center rounded-md border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
            {PATTERN_LABELS[project.deploymentPattern] ?? project.deploymentPattern}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {formatRelativeDate(project.updatedAt)}
          </span>
        </div>
      </div>

      <button
        aria-label={`Delete ${project.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick?.(e);
        }}
        className="ml-4 shrink-0 p-1.5 rounded-md text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] hover:bg-[var(--bg-subtle)] transition-all duration-150"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
