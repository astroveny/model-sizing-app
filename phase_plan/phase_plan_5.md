# Phase Plan — File 5 of 5 (Phase 12 + Appendices)

> Index: [PHASE_PLAN.md](./PHASE_PLAN.md) · Prev: [phase_plan_4.md](./phase_plan_4.md)

## Legend

- ☐ = not started · ◐ = in progress · ☑ = done · ⊘ = skipped/deferred
- **Deliverable:** concrete artifact produced by the step
- **Verify:** how to confirm the step is complete
- **Refs:** links to PRD sections and other docs

---

## Phase 12 — Server & BoM Override

**Goal:** Discovery server SKU override + Build BoM per-line price/swap/reset. All 5 exports reflect overrides.

**Exit criteria:** Discovery has server selector; Build BoM allows per-line price + swap + reset; all 5 exports reflect overrides.

### ☑ P12.1 — Discovery schema: preferredServer
- **Action:** Add `discovery.hardware.preferredServer?: string` per PRD §5.1 (v0.4b). Update Zod schema + TypeScript types + `lib/discovery/field-meta.ts` (skippable, default = blank).
- **Deliverable:** schema + types
- **Refs:** PRD §5.1 (v0.4b)

### ☑ P12.2 — Server selector UI
- **Action:** `components/discovery/HardwareForm.tsx`: add server dropdown below preferred GPU. Filter by `preferredVendor` + GPU compatibility (`supported_gpu_ids` in `data/servers.json`). Optional (blank = auto-select). Zero-match helper text: "No servers match your GPU + vendor. Clear a filter." Add ExplainBox entry.
- **Deliverable:** dropdown + filter logic
- **Verify:** Vendor = Dell → Dell servers only; GPU = MI300X → AMD-capable only; Vendor = either → all
- **Refs:** PRD §5.1 (v0.4b)

### ☑ P12.3 — Sizing engine respects preferredServer
- **Action:** In `lib/sizing/index.ts` server selection: if `preferredServer` set AND GPU-compatible → use it. If incompatible → auto-select + engine note: "Preferred server '\<label\>' doesn't support \<gpu\>; auto-selected '\<actual\>'."
- **Deliverable:** engine update + note
- **Verify:** Unit test — preferred honored when compatible; warning issued when not
- **Refs:** PRD §5.1 (v0.4b)

### ☑ P12.4 — BoM overrides data model
- **Action:** Add `build.bomOverrides: Record<string, Partial<BomItem>>` to store (PRD §5.1 v0.4b). Wire into SQLite autosave.
- **Deliverable:** store slice + persistence
- **Refs:** PRD §5.1 (v0.4b)

### ☑ P12.5 — BoM table: editable unit price
- **Action:** Build page BoM table — each line's `unitPriceUsd` is an inline editable input. Change → save to `bomOverrides[itemId].unitPriceUsd`. Show "✎" icon + distinct background when overridden. Total capex recomputes.
- **Deliverable:** editable cell + state wiring
- **Verify:** Edit price → total updates immediately; reload → override persists
- **Refs:** PRD §6.4.x (v0.4b)

### ☑ P12.6 — BoM table: swap item dropdown
- **Action:** "Swap" dropdown per line — shows alternative catalog items of the same `category`. On select → save swapped item fields to `bomOverrides[itemId]`. Totals recompute.
- **Deliverable:** dropdown + swap logic
- **Verify:** Swap an item → total updates → exports reflect swap
- **Refs:** PRD §6.4.x (v0.4b)

### ☑ P12.7 — BoM table: Reset to catalog
- **Action:** "Reset" link per overridden line — removes `bomOverrides[itemId]`; line reverts to catalog.
- **Deliverable:** reset action
- **Verify:** Override a line → Reset → back to catalog
- **Refs:** PRD §6.4.x (v0.4b)

### ☑ P12.8 — Exports reflect overrides
- **Action:** Update all 5 export paths to read `build.bomOverrides` and merge before rendering. Include BoM header note "Prices/items overridden from catalog" when any overrides present.
- **Deliverable:** override merging in all 5 export routes
- **Verify:** Override a line → export all 5 formats → override visible in each
- **Refs:** PRD §6.4.y (v0.4b)

### ☑ P12.9 — Smoke test
- **Action:** End-to-end:
  1. Discovery: set GPU = H100 SXM + Server = Dell XE9680 (compatible). Then change GPU to MI300X. The Dell server stays in store but is now incompatible. Build → Engine Notes should show incompatibility warning.
  2. Change server back to "AMD / OEM MI300X 8-GPU Server" (compatible) → Build → no incompatibility warning.
  3. Export → BoM Summary: override GPU unit price. Swap server row (Swap column, server row only). Export all 5 formats → overrides present. Swap dropdown only appears on gpu/server rows.
  4. Reset one override (click "Reset" below the overridden price input) → price reverts to catalog.
  - Note: PDF exports (Proposal PDF + Build Report PDF) generate client-side via @react-pdf/renderer; DOCX and MD force-save to DB before hitting API route.
- **Deliverable:** CHANGELOG entry
- **Refs:** PRD §5.1, §6.4.x (v0.4b)

---

## Phase 13 — Dynamic Catalogs + UX Additions

**Goal:** Migrate static catalogs (gpus, servers, models) to DB-backed dynamic catalogs with admin UI. Add workload reference URLs, ExplainBox maximize, sidebar version display.

**Exit criteria:** All three catalogs editable via `/settings/catalogs/*`; URL-assisted extraction works for at least one catalog; all use sites read from DB; version visible in sidebar.

### ☑ P13.1 — Schema migration
- **Action:** Add the 5 tables from PRD §5.2 / §A.6 (servers, server_gpu_configs, gpus, llm_models, workload_references) via a new Drizzle migration.
- **Deliverable:** migration file + Drizzle types
- **Verify:** `npm run db:migrate`; all 5 tables exist; `npm run typecheck` passes
- **Refs:** PRD §5.2 (v0.5)

### ☑ P13.2 — Seed file structure + loader
- **Action:**
  - Create `data/seed/` directory
  - Convert existing static catalogs: `data/gpus.json` → `data/seed/gpus.seed.json`; `data/servers.json` → `data/seed/servers.seed.json` (split `server_gpu_configs` into nested structure); `data/models.json` → `data/seed/models.seed.json`
  - New file: `data/seed/workload-references.seed.json` with default references (HF leaderboard, LMSYS Arena, vendor model hubs)
  - Create `lib/catalogs/seed-loader.ts`: on boot, for each seed file, insert rows whose `id` doesn't already exist. Set `origin = 'seed'`. Idempotent.
  - Wire seed-loader into app startup (same hook used by DB migrations in `instrumentation.ts` or `lib/db/client.ts`)
  - Update `Dockerfile` to copy `data/seed/` instead of individual `data/*.json` files
- **Deliverable:** seed files + loader + boot wiring + Dockerfile update
- **Verify:** Fresh DB → boot → all catalog rows present with `origin='seed'`. Edit a row → boot again → row preserved (not re-seeded)
- **Refs:** PRD §8.6.1

### ☑ P13.3 — Catalog read API + caching
- **Action:** `lib/catalogs/index.ts` — export `listServers()`, `listGpus()`, `listLlmModels()`, `listWorkloadReferences()`. Each returns DB rows, sorted appropriately (by vendor+model, by family+params, etc.). Add a simple in-process module-level cache (invalidated on any catalog write) to avoid re-querying SQLite on every Discovery render.
- **Deliverable:** read module + unit tests
- **Refs:** PRD §8.6.7

### ☑ P13.4 — Migrate read sites
- **Action:** Replace every call that reads from the old static JSON files. Audit:
  ```bash
  grep -rn "data/gpus\.json\|data/servers\.json\|data/models\.json" --include="*.ts" --include="*.tsx" .
  ```
  Known sites: `lib/sizing/*.ts` (sizing engine), `components/discovery/HardwareForm.tsx` (dropdowns), `lib/quick-sizing/recommender.ts` (candidate models), export renderers that embed server names.
- **Deliverable:** all call sites migrated; grep returns zero matches outside `data/seed/` and the seed-loader
- **Verify:** Full smoke test — Discovery → Build → Export — functions identically to v0.4b. No JSON read errors in server logs.
- **Refs:** PRD §8.6.7

### ☑ P13.5 — Catalog write API
- **Action:** `lib/catalogs/admin.ts` — `createServer()`, `updateServer()`, `deprecateServer()`, `deleteServer()` (only `origin='user'` rows deletable; `seed` / `seed-edited` rows can only be deprecated). Same pattern for gpus, llm_models, workload_references. On any update to a `seed` row → set `origin='seed-edited'`. On reset-to-seed → restore values from seed file and set `origin='seed'`. Invalidate read cache on all writes.
- **Deliverable:** CRUD functions + tests for origin transitions
- **Refs:** PRD §8.6.1

### ☐ P13.6 — Settings catalogs index page
- **Action:** Create `app/settings/catalogs/page.tsx` — index with cards: Servers, GPUs, LLM Models, Workload References. Each card links to its admin page and shows row count + deprecated count.
- **Deliverable:** page
- **Refs:** PRD §8.6.5

### ☐ P13.7 — Servers admin page
- **Action:** Create `app/settings/catalogs/servers/page.tsx`. Table: vendor, model, GPU configs summary (e.g., "8×H100, 8×H200"), TDP, origin badge, actions. Search by vendor/model. Deprecated rows hidden by default with "Show deprecated" toggle. "Add Server" button.
- **Deliverable:** page + table component
- **Refs:** PRD §8.6.5

### ☐ P13.8 — Add/Edit Server dialog (manual)
- **Action:** Modal (shadcn Dialog) with form fields per §8.6.2. Nested editor for `server_gpu_configs` rows (add/remove). Validation. On submit → `createServer()` or `updateServer()`. "Reset to seed" button shown on `seed-edited` rows.
- **Deliverable:** dialog component
- **Refs:** PRD §8.6.6

### ☐ P13.9 — `catalog-extract` LLM feature wiring
- **Action:** Add `'catalog-extract'` to the `LlmFeatureId` union in `lib/store.ts` (or wherever the type lives). Verify it surfaces automatically in `/settings/llm` feature assignment UI (the existing per-feature checkbox mechanism). Run `npm run typecheck` — fix any exhaustive-match errors.
- **Deliverable:** type update + typecheck passing
- **Refs:** PRD §8.5 (v0.5)

### ☐ P13.10 — URL-assisted extraction (server)
- **Action:**
  - In Add Server dialog, add "Extract from URL" tab alongside "Manual entry"
  - User pastes URL → server-side fetch via new utility (`lib/catalogs/url-fetch.ts`): timeout 10s, redirect handling, user-agent set, max body 500KB
  - POST fetched HTML to LLM via `getLlmProviderForFeature('catalog-extract')` using prompt at `lib/llm/prompts/catalog-extract-server.ts`
  - LLM returns JSON matching server schema; pre-populate the manual form fields
  - User reviews, edits, saves
  - "Extract from URL" tab disabled when `catalog-extract` feature unassigned (tooltip to Settings)
- **Deliverable:** url-fetch utility + prompt + UI integration
- **Verify:** Paste a real Dell PowerEdge spec URL; extraction returns sensible fields for at least 5 of the server schema fields
- **Refs:** PRD §8.6.6

### ☐ P13.11 — GPUs admin page + dialogs
- **Action:** Apply P13.7–P13.10 patterns to GPUs catalog. URL extraction prompt: `lib/llm/prompts/catalog-extract-gpu.ts`. Key GPU fields to verify: `vram_gb`, `memory_bandwidth_gbps`, `fp16_tflops`, `tdp_watts`.
- **Deliverable:** page + dialogs + prompt
- **Refs:** PRD §8.6.3

### ☐ P13.12 — LLM models admin page + dialogs
- **Action:** Apply same patterns to LLM models. URL extraction prompt: `lib/llm/prompts/catalog-extract-llm-model.ts`. Common test source: Hugging Face model card pages (expose specs in structured meta). Key fields: `params_b`, `layers`, `hidden_size`, `num_kv_heads`, `head_dim`, `context_length_max`.
- **Deliverable:** page + dialogs + prompt
- **Refs:** PRD §8.6.4

### ☐ P13.13 — Workload references admin page (lightweight)
- **Action:** Create `app/settings/catalogs/workload-references/page.tsx`. Simpler than other catalogs — just `label`, `url`, `description`, `sort_order`. Manual entry only; no URL extraction needed.
- **Deliverable:** page + add/edit dialog
- **Refs:** PRD §6.1.z

### ☐ P13.14 — Workload tab references block
- **Action:** Create `components/discovery/WorkloadReferences.tsx`. Renders a horizontal flex row of link-buttons from `listWorkloadReferences()`. Each opens in a new tab. Tooltip shows `description`. Hidden entirely when no active references. Place at the top of `WorkloadForm.tsx` content area.
- **Deliverable:** component + integration in WorkloadForm
- **Refs:** PRD §6.1.z

### ☐ P13.15 — ExplainBox maximize button
- **Action:** Add maximize icon (`Maximize2` from lucide-react) to ExplainBox header. Clicking opens a shadcn Dialog with the same Explain + Example + Ask AI content. Dialog: `max-w-2xl`, `max-h-[80vh]`, scrollable body. Close: × button, Esc, click-outside. Body scroll-lock while open (shadcn Dialog handles this). On phone: full-screen per responsive-design.md §3.5.
- **Deliverable:** maximize trigger + modal mode in ExplainBox
- **Refs:** PRD §6.5.x

### ☐ P13.16 — ExplainBox routing parity in modal
- **Action:** Verify the Ask AI call path inside the maximize modal uses `getLlmProviderForFeature('explain-field')` (same fix as P8.20, not a separate call path). Confirm by integration test: maximize → click Ask AI → request goes to the assigned model's endpoint.
- **Deliverable:** verified by test
- **Refs:** P8.20, PRD §6.5.x

### ☐ P13.17 — Sidebar version footer component
- **Action:** Create `components/Sidebar/SidebarVersion.tsx`. Reads:
  - `process.env.NEXT_PUBLIC_BUILD_SHA` (set by P8.22)
  - `process.env.NEXT_PUBLIC_BUILD_DATE`
  - `package.json` `version` (import at build time via `import pkg from '../../package.json'`)
  Renders: expanded → `v{version}` text; collapsed → nothing visible. Both states: tooltip on hover showing `v{version} · build {sha} · built {date}`. Guard against undefined env vars (show "dev build" when running locally without the vars).
- **Deliverable:** component
- **Refs:** PRD §6.0.z

### ☐ P13.18 — Sidebar version integration
- **Action:** Place `<SidebarVersion>` in the Sidebar footer, above the collapse toggle. Confirm:
  - Hidden when sidebar is collapsed (no label visible; tooltip still works on hover)
  - Present and readable when expanded
  - Deployed build shows the correct SHA from P8.22 infrastructure
- **Deliverable:** integration + deployed smoke test
- **Refs:** PRD §6.0.z

### ☐ P13.19 — Smoke test
- **Action:** End-to-end:
  1. Fresh DB (or clear tables): boot → confirm all seed rows loaded for servers, GPUs, LLM models, workload references
  2. Workload tab: references block visible at top
  3. ExplainBox on any Discovery field: maximize → modal opens; tabs work; Ask AI works inside modal
  4. `/settings/catalogs/servers`: table renders; Add → Manual → form submits; Add → Extract from URL → extraction fills form (need `catalog-extract` feature assigned)
  5. `/settings/catalogs/gpus` and `/llm-models`: same flows
  6. Edit a seed row: origin badge changes to `seed-edited`; Reset → returns to `seed`; values revert
  7. Deprecate a server: disappears from Discovery dropdown; still shown with "Show deprecated" toggle in admin
  8. Sidebar: version visible with correct build SHA (only verifiable in a built container from P8.22)
  9. Discovery dropdowns: reflect any catalog edits within one render cycle (no page reload needed)
- **Deliverable:** CHANGELOG entry
- **Refs:** PRD §8.6.8

---

## Future phases (v2+)

Not assigned step IDs yet — will be enumerated when scoped.

- **Phase 14** — Fine-tuning workload module (LoRA, QLoRA, full FT sizing)
- **Phase 15** — MCP integrations (live catalog / pricing lookups)
- **Phase 16** — Additional accelerators (Intel Gaudi, AWS Trainium/Inferentia, Google TPU)
- **Phase 17** — IaC export (Terraform modules, Helm charts)
- **Phase 18** — RAG / vector DB sizing sub-module
- **Phase 19** — Multi-region & DR sizing

---

## Troubleshooting reference by step

If a step fails, document the failure here with the step ID. Example entries:

```
P0.9 — Dockerfile: alpine Node 20 missing build-tools for better-sqlite3
  Fix: use node:20-slim, add `apt-get install python3 make g++` in deps stage.
  Date: YYYY-MM-DD
```

This section grows as we build.

```
P8.1 — Interconnect preference bug
  Symptom: Discovery sets RoCE, BoM shows InfiniBand.
  Root cause: TBD during investigation — likely sharding.ts hardcodes
    'infiniband-400g' as default for inter-node without reading Discovery.
  Fix: see P8.2.
  Regression test: tests/sizing/sharding.test.ts (RoCE preserved).

P8.3 — RFP JSON extraction truncation
  Symptom: "Unterminated string in JSON at position 10703"
  Root cause: LLM output exceeded default maxTokens.
  Fix: see P8.4 (raise limit + safeJsonParse utility).

P8.5 — RFP file upload extraction failure
  Symptom: "could not extract from file"
  Root cause (P8.5 diagnosis, 2026-04-22): Two issues found:
    1. MIME type detection relies solely on file.type which browsers often report
       as "" for .pdf/.docx files dropped from some OS pickers or email clients.
       Empty MIME falls through to the plain-text path → garbled binary returned
       to the LLM, causing extraction to fail or produce nonsense.
    2. Error message returned to client is generic ("Could not extract text from
       file") with no detail about WHY it failed (encrypted PDF, scanned/image-only
       PDF, corrupted file, empty file, wrong extension). User has no actionable
       guidance.
    Non-issues: pdf-parse loads fine in Node.js runtime (not Edge); mammoth
    import works; 10MB size cap is correctly enforced.
  Fix: see P8.6 (extension-based MIME fallback + actionable error messages).

P8.12 — Hydration mismatch on <body>
  Symptom: "A tree hydrated but some attributes of the server rendered HTML
           didn't match the client properties"
  Root cause: browser extensions (Grammarly, etc.) inject attributes onto <body>
  Fix: add suppressHydrationWarning to <body> in app/layout.tsx
  Regression test: none (dev-only warning)

P8.13 — DOMMatrix not defined on PDF upload
  Symptom: Server throws "DOMMatrix is not defined"
  Root cause: pdfjs-dist assumes browser APIs not available in Node SSR
  Fix: swap to pdf-parse
  Regression test: tests/fixtures/rfp-samples/*.pdf

P8.14 — PDF download "site not available"
  Symptom: Client sees "site was not available" on PDF download
  Root cause: TBD — likely edge runtime or unhandled exception
  Fix: runtime='nodejs' + try/catch + structured error
  Regression test: integration test per export route

P8.15 — Build Report MD data mismatch
  Symptom: Hardware/Infra/etc tables have wrong or missing values
  Root cause: extractor reads wrong store paths
  Fix: repair mappings + regression test with fixture
  Regression test: tests/export/build-report.test.ts

P8.17 — Engine Notes missing from Build Report
  Symptom: Engine Notes section empty despite notes in Build page
  Root cause: extractor doesn't pull buildState.notes
  Fix: add to extractor + renderer
  Regression test: as P8.15

P8.18 — RFI Apply to Discovery broken
  Symptom: Clicking Apply on extracted requirement doesn't update Discovery
  Root cause: TBD
  Fix: wire Apply to store dispatch + integration test
  Regression test: tests/rfi/apply.test.ts

P8.20 — ExplainBox "Ask AI" not respecting configured model
  Symptom: changed model in Settings → LLM, ExplainBox still uses old model
  Root cause: ExplainBox call site uses getLlmProvider() instead of
              getLlmProviderForFeature('explain-field')
  Fix: migrate to per-feature routing; dynamic button label
  Regression test: tests/explainbox/routing.test.ts

P8.21 — DOMMatrix regression on PDF upload
  Symptom: "DOMMatrix is not defined" returned after P8.13 fix
  Root cause: pdfjs-dist reintroduced by a later change
  Fix: re-apply pdf-parse migration; add static check to prevent regression
  Regression test: package.json lint + tests/upload/pdf-parse.test.ts
```

---

## Revision log

| Version | Date | Changes |
|---|---|---|
| v0.1 | 2026-04-19 | Initial phase plan with P0–P6 steps |
| v0.3 | 2026-04-21 | Added Phase 7 (UX redesign: left-nav, themes, landing, autosave indicator), Phase 8 (bug fixes: interconnect, RFP JSON, RFP upload, BoM pricing audit), Phase 9 (Build Report export in PDF and Markdown). Renumbered old Phase 7–13 futures to Phase 10–16. Added prepopulated troubleshooting entries for P8.1, P8.3, P8.5. |
| v0.4a | 2026-04-22 | **Phase 8 extension (P8.12–P8.19):** hydration warning, DOMMatrix, PDF download crash, Build Report MD data, Node Pool table removed, Engine Notes restored, RFI Apply fixed, RFI confirm-before-apply. **Phase 11 (P11.1–P11.18):** text contrast, sidebar reorder + theme-toggle-to-top, ML Sizer home link, required field markers, skippable toggle + defaults, progress banner, Review Defaults modal, Quick Sizing flow (rule-based; LLM-assist stub), RFI Apply polish. Added prepopulated troubleshooting entries for P8.12–P8.18. |
| v0.4b | 2026-04-22 | **Phase 10 (P10.1–P10.17):** LLM Settings page, multi-model routing with exclusive feature assignment, encrypted credential storage, `.env` backward compat, Quick Sizing LLM-assist activation. **Phase 12 (P12.1–P12.9):** Discovery preferredServer override with GPU-compatibility filtering, Build BoM per-line price + swap + reset, all 5 exports reflect overrides. Removed Phase 10 + 12 from Future phases stub. |
| v0.4c | 2026-04-24 | Split PHASE_PLAN.md into 5 files (phase_plan_1.md … phase_plan_5.md). Corrected phase order: Phase 10 now precedes Phase 11 (they were built out of order). PHASE_PLAN.md is now an index. |
| v0.5 | 2026-04-26 | **Phase 8 extension (P8.20–P8.22):** ExplainBox routing regression fix, DOMMatrix regression fix, version display build infrastructure. **Phase 13 (P13.1–P13.19):** dynamic catalogs (servers + GPUs + LLM models + workload references) with hybrid seed + DB storage, append-only seed merge, admin UIs at `/settings/catalogs/*`, manual + URL-assisted entry via `catalog-extract` LLM feature, origin tracking, ExplainBox maximize, workload tab references block, sidebar version display. Former Phase 13 (fine-tuning) renumbered to Phase 14; phases 14–18 → 15–19. Troubleshooting entries added for P8.20 and P8.21. |
