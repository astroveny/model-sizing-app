"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "./SidebarHeader";

const STORAGE_KEY = "ml-sizer:sidebar-collapsed";

interface SidebarProps {
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sidebar({ children, footer }: SidebarProps) {
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {children}
      </div>

      <div className="shrink-0 border-t border-[var(--border-default)] p-2">
        {footer}
      </div>
    </aside>
  );
}
