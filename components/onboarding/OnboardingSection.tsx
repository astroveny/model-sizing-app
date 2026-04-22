import { type LucideIcon } from "lucide-react";

interface OnboardingSectionProps {
  step: number;
  icon: LucideIcon;
  title: string;
  paragraphs: [string, string];
}

export function OnboardingSection({
  step,
  icon: Icon,
  title,
  paragraphs,
}: OnboardingSectionProps) {
  return (
    <div className="flex gap-6">
      {/* Step number + icon */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
          <Icon className="h-5 w-5 text-[var(--accent-primary)]" />
        </div>
        <div className="w-px flex-1 bg-[var(--border-default)]" />
      </div>

      {/* Content */}
      <div className="pb-10 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Phase {step}
          </span>
          <span className="text-xs text-[var(--border-default)]">—</span>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>

        {/* Screenshot placeholder */}
        <div className="mb-4 h-36 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-center">
          <span className="text-xs text-[var(--text-secondary)]">Screenshot coming soon</span>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
          {paragraphs[0]}
        </p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {paragraphs[1]}
        </p>
      </div>
    </div>
  );
}
