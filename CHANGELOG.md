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

### Changed
- (nothing yet)

### Fixed
- .gitignore: moved `!.env.example` after `**/*.env*` so the negation takes effect
