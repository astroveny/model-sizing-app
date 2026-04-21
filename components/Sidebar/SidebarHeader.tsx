"use client";

import { ChevronLeft, ChevronRight, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarHeader({ collapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center h-14 px-3 border-b border-[var(--border-default)] shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}
    >
      {collapsed ? (
        <Cpu className="h-5 w-5 text-[var(--accent-primary)]" />
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="h-5 w-5 text-[var(--accent-primary)] shrink-0" />
          <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
            ML Sizer
          </span>
        </div>
      )}
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors duration-150",
          collapsed && "mt-2"
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
