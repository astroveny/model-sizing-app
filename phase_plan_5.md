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

### ☐ P12.9 — Smoke test
- **Action:** End-to-end:
  1. Discovery: vendor = AMD + preferredServer = Dell XE9680 (incompatible) → engine note flags mismatch
  2. Change to Supermicro SMC (compatible) → honored, no warning
  3. Build BoM: override 2 lines (one price, one swap) → export all 5 formats → overrides present
  4. Reset one override → catalog returns
- **Deliverable:** CHANGELOG entry
- **Refs:** PRD §5.1, §6.4.x (v0.4b)

---

## Future phases (v2+)

Not assigned step IDs yet — will be enumerated when scoped.

- **Phase 13** — Fine-tuning workload module (LoRA, QLoRA, full FT sizing)
- **Phase 14** — MCP integrations (live catalog / pricing lookups)
- **Phase 15** — Additional accelerators (Intel Gaudi, AWS Trainium/Inferentia, Google TPU)
- **Phase 16** — IaC export (Terraform modules, Helm charts)
- **Phase 17** — RAG / vector DB sizing sub-module
- **Phase 18** — Multi-region & DR sizing

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
