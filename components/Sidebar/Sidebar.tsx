"use client";

import { useEffect, useState } from "react";
import { Home, BookOpen, Zap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarNewProjectButton } from "./SidebarNewProjectButton";
import { SidebarCurrentProject } from "./SidebarCurrentProject";
import { SidebarThemeToggle } from "./SidebarThemeToggle";
import { SidebarVersion } from "./SidebarVersion";

const STORAGE_KEY = "ml-sizer:sidebar-collapsed";

export function Sidebar() {
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
        {/* Position 2: Theme toggle */}
        <SidebarThemeToggle collapsed={isCollapsed} />

        {/* Position 3: New Project */}
        <div className="mt-1">
          <SidebarNewProjectButton collapsed={isCollapsed} />
        </div>

        {/* Position 4: Quick Sizing */}
        <SidebarNavItem
          href="/quick-sizing"
          icon={Zap}
          label="Quick Sizing"
          collapsed={isCollapsed}
          exact
        />

        <div className="my-1 border-t border-[var(--border-muted)]" />

        {/* Position 5: All Projects */}
        <SidebarNavItem
          href="/"
          icon={Home}
          label="All Projects"
          collapsed={isCollapsed}
          exact
        />

        {/* Position 6: How it works */}
        <SidebarNavItem
          href="/onboarding"
          icon={BookOpen}
          label="How it works"
          collapsed={isCollapsed}
          exact
        />

        {/* Position 7: Settings (stub) */}
        <SidebarNavItem
          href="/settings"
          icon={Settings}
          label="Settings"
          collapsed={isCollapsed}
          exact
        />

        {/* Current project section — visible only on /project/[id]/* */}
        <div className="my-2 border-t border-[var(--border-muted)]" />
        <SidebarCurrentProject collapsed={isCollapsed} />
      </div>

      <SidebarVersion collapsed={isCollapsed} />
    </aside>
  );
}
