"use client";

import { useEffect, useState } from "react";
import { Home, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNewProjectButton } from "./SidebarNewProjectButton";
import { SidebarCurrentProject } from "./SidebarCurrentProject";

const STORAGE_KEY = "ml-sizer:sidebar-collapsed";

interface SidebarProps {
  /** Slot for footer items (P7.7 theme toggle) */
  footer?: React.ReactNode;
}

export function Sidebar({ footer }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const isCollapsed = mounted && collapsed;

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[var(--bg-surface)] border-r border-[var(--border-default)] shrink-0 transition-[width] duration-150 ease-out",
        isCollapsed ? "w-[60px]" : "w-60"
      )}
    >
      <SidebarHeader collapsed={isCollapsed} onToggle={toggle} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col gap-1 px-2">
        {/* Primary CTA */}
        <div className="mb-1">
          <SidebarNewProjectButton collapsed={isCollapsed} />
        </div>

        {/* Global nav */}
        <SidebarNavItem
          href="/"
          icon={Home}
          label="All Projects"
          collapsed={isCollapsed}
          exact
        />
        <SidebarNavItem
          href="/onboarding"
          icon={BookOpen}
          label="How it works"
          collapsed={isCollapsed}
          exact
        />

        {/* Current project section — visible only on /project/[id]/* */}
        <div className="my-2 border-t border-[var(--border-muted)]" />
        <SidebarCurrentProject collapsed={isCollapsed} />
      </div>

      <div className="shrink-0 border-t border-[var(--border-default)] p-2">
        {footer}
      </div>
    </aside>
  );
}
