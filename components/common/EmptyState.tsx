import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-24 text-center gap-3",
        className
      )}
    >
      {Icon && (
        <div className="rounded-full bg-[var(--bg-subtle)] p-4 mb-1">
          <Icon className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
      )}
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
