"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  exact?: boolean;
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  collapsed,
  exact = false,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  const inner = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]",
        isActive && "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
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
