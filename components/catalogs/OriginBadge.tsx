export function OriginBadge({ origin }: { origin: string }) {
  const styles =
    origin === "seed" ? "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-muted)]"
    : origin === "seed-edited" ? "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
    : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${styles}`}>
      {origin}
    </span>
  );
}
