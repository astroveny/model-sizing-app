"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, BookOpen } from "lucide-react";

const STORAGE_KEY = "ml-sizer:onboarded";

export function OnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/5 px-4 py-3 text-sm">
      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
      <p className="flex-1 text-[var(--text-secondary)]">
        New here?{" "}
        <Link
          href="/onboarding"
          className="font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)] underline underline-offset-2"
        >
          Learn how this tool works
        </Link>{" "}
        before creating your first project.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
