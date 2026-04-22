// Ref: PRD §6.4 (revised) — export filename convention
// Pattern: <project-name-slugified>-<export-type>-<YYYY-MM-DD>.<ext>
// Example: acme-llm-proposal-2026-04-21.pdf

export type ExportType =
  | "proposal"
  | "bom"
  | "build-report";

/**
 * Slugify a project name: lowercase, collapse non-alphanumeric runs to a
 * single hyphen, strip leading/trailing hyphens, truncate to 48 chars.
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Build a canonical export filename.
 *
 * @param projectName  Raw project name (will be slugified)
 * @param exportType   One of the ExportType values
 * @param ext          File extension without leading dot (e.g. "pdf", "md")
 * @param date         Optional ISO date string; defaults to today (YYYY-MM-DD)
 */
export function buildExportFilename(
  projectName: string,
  exportType: ExportType,
  ext: string,
  date?: string
): string {
  const d = (date ?? new Date().toISOString()).slice(0, 10);
  const slug = slugifyName(projectName) || "project";
  return `${slug}-${exportType}-${d}.${ext}`;
}
