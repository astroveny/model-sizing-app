"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarThemeToggleProps {
  collapsed: boolean;
}

export function SidebarThemeToggle({ collapsed }: SidebarThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Render a stable placeholder before mount to avoid hydration mismatch
  if (!mounted) {
    return <div className={cn("h-9", collapsed ? "w-9" : "w-full")} />;
  }

  const isDark = resolvedTheme === "dark";
  // Icon shows destination: moon = "click to go dark", sun = "click to go light"
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Switch to light" : "Switch to dark";

  const inner = (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      className={cn(
        "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-colors duration-150",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider delay={200}>
        <Tooltip>
          <TooltipTrigger render={<div />}>{inner}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return inner;
}
