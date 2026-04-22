# Changelog

All notable changes to this project will be documented here. Follow [Keep a Changelog](https://keepachangelog.com/) conventions.

## [Unreleased]

### Added
- PRD, README, docs/, PHASE_PLAN.md
- Project skeleton
- P0.1–P0.3: Next.js + core deps + shadcn/ui bootstrap
- P0.4–P0.5: folder structure, Drizzle + SQLite schema and client
- P0.6–P0.7: Zustand store skeleton + project persistence (CRUD + autosave)
- P0.8: project list, "New Project" flow, project detail shell with tab bar
- P0.8b: light/dark/system theme toggle (next-themes)
- P0.9: multi-stage Dockerfile (node:20-slim, standalone output)
- P0.10: docker-compose.yml with volume mounts and health check
- P0.11: .env.example with all LLM provider vars and DATABASE_PATH
- P0.12: .gitignore covering node_modules, .next, DB files, uploads, secrets; fixed .env.example negation ordering so it is tracked by git
- P0.13: smoke test passed — docker compose up, create project, restart, project persists
- P1.1: full DiscoveryState Zod schemas + validateDiscoveryRequired() gate
- P1.2: ExplainBox component with Explain/Example tabs, Ask Claude placeholder, missing-entry fallback
- P1.3: Discovery page with 5 underline-style tabs (Workload/Hardware/Infra/Model Platform/Application)
- P1.4–P1.8: all five Discovery forms wired to Zustand store with sticky ExplainBox sidebar
- P1.9: 48 ExplainBox entries across 5 JSON files covering every Discovery field
- P1.10: discovery progress bar (15-field tracking) + Build gate with missing-field list
- P1.11: Ask Claude button deferred to P6.1 (alert placeholder)
- P1.12: sample fixture at tests/fixtures/sample-projects.json; production build passes
- P2.1–P2.15: full sizing engine (memory, prefill, decode, sharding, optimizations, patterns, capacity, notes); 22-test suite green; vitest config with @/* alias
- P3.1–P3.14: Build page with HardwarePanel, InfraPanel, ModelPlatformPanel, ApplicationPanel, SummaryTotals, VendorComparison, EngineNotes, RackLayout SVG, ArchitectureDiagram SVG; override mechanism; .gitignore fix for components/build/
- P4.1–P4.13: RFI section with LLM provider abstraction (Anthropic + OpenAI-compatible), retry/backoff, RFP paste+upload, extraction prompt, RequirementsList with Apply actions, QualificationPanel, DraftResponse; Claude 4 temperature deprecation fix
- P5.1–P5.7: Export section — JSON BoM schema + route, PDF (react-pdf/renderer), DOCX (docx library), export API routes, export page with PDF preview (dynamic PDFViewer) and BoM summary table; typecheck clean
- P6.1: "Ask Claude" in ExplainBox — LLM call with project context, result persisted to explainOverrides, AI badge + Reset button
- P6.2: "Why this choice?" ExplainSizingButton on Hardware and Model Platform panels; explain-sizing prompt
- P6.3: Improved ArchitectureDiagram — color-bar layers, data-flow arrows with labels, 3 detail rows per layer
- P6.4: Improved RackLayout — unit number column, per-rack stats, power labels, free-space indicator
- P6.5: Loading spinners on all LLM interactions (ExplainBox, ExplainSizingButton, RFI components)
- P6.6: Sonner toasts installed + Toaster in root layout; inline error messages on all LLM call sites
- P6.7: Improved empty state on project list (icon + CTA)
- P6.8: README updated for Ask Claude and Why this choice features; docs/demo-script.md authored
- P6.9: lib/db/audit.ts with writeAudit(); wired into /api/llm, /api/export/pdf, /api/export/docx
- P6.10: docs/demo-script.md — 15-minute demo walkthrough for team onboarding
- P7.1: Design System tokens added to globals.css (light + dark, --bg-*, --text-*, --border-*, --accent-*, --success/warning/danger)
- P7.2: ThemeProvider component; root layout wraps children with it; no flash-of-wrong-theme
- P7.3: Inter (body) + JetBrains Mono (code) fonts via next/font; CSS variable wiring
- P7.4–P7.7: Sidebar component — expanded (240px) / collapsed (60px), localStorage persistence, SidebarHeader with collapse toggle, SidebarNavItem with active state + tooltips, SidebarThemeToggle moon/sun flip (resolvedTheme)
- P7.8: Root layout rewritten — flex h-full with Sidebar + main content area; Breadcrumbs slot
- P7.9: Breadcrumbs component — "All Projects / <name> / Section" on project pages
- P7.10: Landing/Projects page rebuilt — Projects header, ProjectCard with relative date + pattern pill + delete icon
- P7.11: ProjectsSearchFilter — debounced text search, date-range Select, "Clear filters", URL state via useSearchParams
- P7.12: DeleteProjectDialog — server action + useTransition + router.refresh(); destructive confirm
- P7.13: EmptyState shared component; ProjectsList uses it for both "no projects" and "filter empty" variants
- P7.14: Project layout simplified — top-tab TabBar removed; section navigation via sidebar only
- P7.15: SavedIndicator component; useAutosave now returns {status, savedAt}; shows "Saving…" → "Saved · Xs ago" in Discovery progress bar
- P7.16: Audit confirmed no explicit Save buttons in Discovery; nothing to remove
- P7.17: /onboarding page — hero, four phase sections (Discovery/RFI/Build/Export) with icons + screenshot placeholders + "Go to Projects" CTA; OnboardingSection component
- P7.18: OnboardingBanner — shown on empty project list when ml-sizer:onboarded not set; dismiss writes key to localStorage
- P7.19: Design System token audit across 18 Phase 1–6 components — all text-muted-foreground, text-foreground, bg-muted, bg-card, border-border, dark:* variants, and status colors replaced with --text-muted/primary/secondary, --bg-subtle/surface, --border-default, --success/warning/danger
- P7.20: Phase 7 smoke test — production build clean; all routes render (/onboarding static); sidebar navigation verified; TabBar.tsx orphaned but harmless
- P8.1–P8.2: Interconnect preference bug — failing test added; sharding.ts fixed to read networkingPreference from SizingInput; engine note emitted when user choice may be undersized; SizingInput and ShardingResult types updated; useBuildDerived threads preference through
- P8.3–P8.4: RFP JSON truncation bug — failing test added; safeJsonParse utility (lib/llm/json.ts) with auto-repair strategy; maxTokens raised to 8000 in extract-rfp, RfpPaster, RfpUploader; safeJsonParse wired into both RFP components
- P8.5–P8.6: RFP file upload bug — root causes diagnosed (empty MIME type + generic errors); app/api/upload/route.ts rewritten with extension-based MIME fallback, magic-byte PDF detection, and actionable error messages (encrypted PDF, scanned PDF, binary data, empty file)
- P8.7: lib/upload/extract.ts extraction utility factored out; upload route deduped to import from it; tests/upload/extract.test.ts — 14 tests covering resolveType, looksLikePdf, and extractTextFromBuffer edge cases; all pass
- P8.8: pricing_source field added to all 9 GPU entries (vendor-estimate) and all 7 server entries (vendor-estimate or indicative) in data/gpus.json and data/servers.json
- P8.9: Amber pricing disclaimer banner added to BoM Summary tab on Export page; dismissible per session via sessionStorage
- P8.10: Per-row unit price override inputs added to BoM table; overrides stored in build.overrides["bom:price:<name>"]; overridden rows highlighted in accent color with reset button; total CapEx recalculates live
- P8.11: Phase 8 smoke test — typecheck clean; 42/42 tests passing (4 test files: sizing ×2, llm/json, upload/extract); all three bugs confirmed fixed via test coverage; BoM disclaimer and price overrides verified via code review. Date: 2026-04-22
- P9.1: lib/export/build-report-spec.ts — BuildReport type with sub-types for all 8 sections + BUILD_REPORT_FIXTURE (Llama-70B Acme example)
- P9.2: lib/export/build-report-extract.ts — pure (Project) → BuildReport | null extractor; threads BoM price overrides, assumptions with source tags, engine notes; 14 tests in tests/export/build-report-extract.test.ts
- P9.3: lib/export/build-report-md.ts — GitHub-flavored Markdown renderer; YAML frontmatter, TOC with anchors, GFM tables for all sections, pricing disclaimer, override asterisks; 13 tests in tests/export/build-report-md.test.ts
- P9.4: lib/export/build-report-pdf.tsx — BuildReportPdfDocument (5 pages: cover, summary+hardware+MP, infra+app+notes, BoM, assumptions+disclaimers); alternating-row tables, pricing warning box, override markers
- P9.5: app/api/export/build-report-pdf/route.ts + build-report-md/route.ts — server-side render routes; 422 on incomplete Discovery; audit log wired; AuditEvent union extended
- P9.6: Export page sectioned into "Customer Deliverables" (PDF/DOCX/BoM) and "Internal Reports" (Build Report PDF/MD); outline-button style for internal reports
- P9.7: lib/export/filename.ts — slugifyName + buildExportFilename utility; all 5 routes + Export page buttons use canonical pattern <slug>-<type>-<YYYY-MM-DD>.<ext>; 9 tests in tests/export/filename.test.ts
- P9.8: Phase 9 smoke test — typecheck clean; 78/78 tests passing (7 test files); Build Report PDF/MD content verified to match via shared fixture. Date: 2026-04-22

### Changed
- app/project/[id]/layout.tsx: removed header breadcrumb and TabBar; layout is now ProjectHydrator + children
- app/globals.css: Design System token blocks added; --font-mono fixed

### Fixed
- .gitignore: moved `!.env.example` after `**/*.env*` so the negation takes effect
