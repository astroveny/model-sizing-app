# Phase Plan — File 2 of 5 (Phases 3–5)

> Index: [PHASE_PLAN.md](./PHASE_PLAN.md) · Prev: [phase_plan_1.md](./phase_plan_1.md) · Next: [phase_plan_3.md](./phase_plan_3.md)

## Legend

- ☐ = not started · ◐ = in progress · ☑ = done · ⊘ = skipped/deferred
- **Deliverable:** concrete artifact produced by the step
- **Verify:** how to confirm the step is complete
- **Refs:** links to PRD sections and other docs

---

## Phase 3 — Build Section

**Goal:** Auto-computed sizing visible in UI, updates reactively, allows overrides, shows vendor comparison.

**Exit criteria:** Changing any Discovery field reflects in Build within 1s; overrides persist; NVIDIA vs AMD comparison renders.

### ☑ P3.1 — Build page shell
- **Action:** `app/project/[id]/build/page.tsx` with 4 layer panels + summary totals + engine notes area.
- **Deliverable:** page
- **Verify:** page renders with empty panels when Discovery incomplete
- **Refs:** PRD §6.3

### ☑ P3.2 — Derived state subscription
- **Action:** Hook: `useBuildDerived()` subscribes to Discovery state and calls `computeBuild()`. Memoized; recomputes only on relevant change.
- **Deliverable:** `lib/hooks/useBuildDerived.ts`
- **Verify:** changing Discovery field updates Build within 500ms
- **Refs:** PRD §6.3 acceptance

### ☑ P3.3 — Hardware panel
- **Action:** `components/build/HardwarePanel.tsx`: GPU model + count, server model + count, CPU + RAM, storage, networking. Override inputs beside each derived field.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.hardware

### ☑ P3.4 — Infra panel
- **Action:** `components/build/InfraPanel.tsx`: orchestrator, node pools, load balancer, monitoring stack.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.infra

### ☑ P3.5 — Model Platform panel
- **Action:** `components/build/ModelPlatformPanel.tsx`: server, replicas, TP/PP/EP, KV cache, max batch, latency estimates (TTFT, ITL, end-to-end), interconnect recommendation.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.modelPlatform

### ☑ P3.6 — Application panel
- **Action:** `components/build/ApplicationPanel.tsx`: gateway, auth, rate limits, metering (conditional on GPUaaS/SaaS).
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.application

### ☑ P3.7 — Summary totals
- **Action:** `components/build/SummaryTotals.tsx`: total GPUs, servers, power kW, rack units, capex, monthly opex. Positioned at top.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildState.totals

### ☑ P3.8 — Override handling
- **Action:** Overrides stored in `BuildState.overrides`. When present, take precedence over derived. UI shows override badge.
- **Deliverable:** override mechanism; persists to SQLite
- **Verify:** override a value, reload, override persists, derived re-computes when inputs change but override holds.
- **Refs:** PRD §6.3 acceptance

### ☑ P3.9 — Vendor comparison view
- **Action:** When Discovery `hardware.preferredVendor === 'either'`, show NVIDIA-best vs AMD-best side-by-side with deltas (GPU count, cost, power, decode throughput).
- **Deliverable:** `components/build/VendorComparison.tsx`
- **Verify:** toggle preferredVendor to "either"; comparison renders; toggle to "nvidia"; comparison hides
- **Refs:** PRD §6.3

### ☑ P3.10 — Engine notes surface
- **Action:** Notes rendered in an expandable card per panel. Category pills (info/warning/recommendation).
- **Deliverable:** notes component integrated into each panel
- **Refs:** PRD §6.3

### ☑ P3.11 — BoM generation
- **Action:** `lib/sizing/bom.ts`: transforms BuildDerived into `BomItem[]` with pricing from catalogs. Total capex = sum of unit prices × qty.
- **Deliverable:** `lib/sizing/bom.ts` + tests
- **Verify:** BoM sum matches SummaryTotals.capexUsd
- **Refs:** PRD §5.1 BomItem

### ☑ P3.12 — Rack layout diagram (basic)
- **Action:** `components/build/diagrams/RackLayout.tsx`: simple SVG showing N servers × rack units. No 3D, just boxes.
- **Deliverable:** component
- **Refs:** PRD §6.3

### ☑ P3.13 — Architecture diagram (basic)
- **Action:** `components/build/diagrams/ArchitectureDiagram.tsx`: four stacked boxes (App → Model Platform → Infra → Hardware) with labels from current Build.
- **Deliverable:** component
- **Refs:** PRD §6.3

### ☑ P3.14 — Phase 3 integration test
- **Action:** Using Phase 1 sample project, go to Build, verify everything renders, change 3 Discovery values, watch Build update, override 2 values, reload, state intact.
- **Deliverable:** recorded in CHANGELOG
- **Refs:** PRD §9 Phase 3 exit

---

## Phase 4 — RFI Section

**Goal:** Paste or upload RFP → LLM extracts requirements → map to Discovery → qualify → optionally draft response.

**Exit criteria:** Paste a sample RFP, get structured requirements, map to Discovery, get qualification score, generate draft response.

### ☑ P4.1 — RFI page shell
- **Action:** `app/project/[id]/rfi/page.tsx` with 4 zones: Input → Extracted → Mapping → Qualification/Response.
- **Deliverable:** page
- **Refs:** PRD §6.2

### ☑ P4.2 — LLM provider abstraction
- **Action:** `lib/llm/provider.ts` interface per `docs/llm-provider-guide.md`. `lib/llm/anthropic.ts` implementation. Factory in `getLlmProvider()`.
- **Deliverable:** abstraction + Anthropic impl
- **Verify:** smoke test: `getLlmProvider().complete({messages:[{role:'user',content:'hi'}]})` returns text
- **Refs:** docs/llm-provider-guide.md, PRD §8

### ☑ P4.3 — LLM API route
- **Action:** `app/api/llm/route.ts`: server-side proxy (keeps keys off client). Accepts `{system, messages, maxTokens, temperature, json}`. Calls `getLlmProvider()`.
- **Deliverable:** route + client helper in `lib/llm/client.ts`
- **Verify:** browser can POST to `/api/llm` and get response
- **Refs:** PRD §8

### ☑ P4.4 — RFP paste flow
- **Action:** Textarea component; "Extract" button triggers LLM call with the extraction prompt.
- **Deliverable:** `components/rfi/RfpPaster.tsx`
- **Refs:** PRD §6.2

### ☑ P4.5 — RFP upload flow
- **Action:** File upload endpoint `app/api/upload/route.ts`; supports PDF and DOCX; extracts text server-side (pdf-parse, mammoth); stores file path in `rfp_uploads` table.
- **Deliverable:** `components/rfi/RfpUploader.tsx` + upload route
- **Verify:** upload a PDF, text extracted and displayed
- **Refs:** PRD §6.2

### ☑ P4.6 — Extraction prompt
- **Action:** `lib/llm/prompts/extract-rfp.ts` with `PROMPT_VERSION`. Returns structured JSON: requirements[], timelines[], evaluationCriteria[], mandatoryItems[]. Each requirement has layer and maps to Discovery fieldId.
- **Deliverable:** prompt file
- **Refs:** docs/llm-provider-guide.md §6

### ☑ P4.7 — Extraction result UI
- **Action:** `components/rfi/RequirementsList.tsx`: editable list of extracted requirements with layer tags and mandatory flags.
- **Deliverable:** component
- **Refs:** PRD §6.2

### ☑ P4.8 — Mapping + Apply to Discovery
- **Action:** For each extracted requirement with `mapsToDiscoveryField`, show "Apply" button. Bulk "Apply all" button.
- **Deliverable:** mapping action in store
- **Verify:** apply populates Discovery; navigating to Discovery shows values
- **Refs:** PRD §6.2 acceptance

### ☑ P4.9 — Qualification panel
- **Action:** `components/rfi/QualificationPanel.tsx`: fit score (0–100), strengths, risks, win probability, go/no-go toggle. Deterministic scoring from completeness + constraints.
- **Deliverable:** component + `lib/sizing/qualification.ts`
- **Refs:** PRD §6.2

### ☑ P4.10 — Draft response generator
- **Action:** `components/rfi/DraftResponse.tsx`: section per layer (Hardware, Infra, Model Platform, Application, Executive Summary). Uses LLM with `lib/llm/prompts/draft-response.ts`.
- **Deliverable:** component + prompt
- **Verify:** generates reasonable draft for sample project
- **Refs:** PRD §6.2

### ☑ P4.11 — OpenAI-compatible adapter (Gemma/Kimi/Nemotron)
- **Action:** `lib/llm/openai-compatible.ts`. Supports `OPENAI_COMPATIBLE_BASE_URL/API_KEY/MODEL`. Tested with at least one real endpoint (Ollama is easiest for local test).
- **Deliverable:** adapter
- **Verify:** switch `LLM_PROVIDER=openai-compatible`, extraction still works
- **Refs:** docs/llm-provider-guide.md §3.2

### ☑ P4.12 — Retry + error handling
- **Action:** `lib/llm/retry.ts` with exponential backoff on `LlmTransientError`; `LlmRateLimitError` respects `retryAfterMs`.
- **Deliverable:** retry utility + wired into API route
- **Refs:** docs/llm-provider-guide.md §8

### ☑ P4.13 — Phase 4 integration test
- **Action:** Paste a realistic sample RFP (prepared fixture). Verify extraction, mapping, qualification, response draft all work end-to-end.
- **Deliverable:** `tests/fixtures/sample-rfp.txt`; test result in CHANGELOG
- **Refs:** PRD §9 Phase 4 exit

---

## Phase 5 — Export

**Goal:** PDF, Word, JSON BoM exports of the completed sizing.

**Exit criteria:** All three formats produce complete documents reflecting current state.

### ☑ P5.1 — Export page shell
- **Action:** `app/project/[id]/export/page.tsx` with 3 export buttons + preview pane.
- **Deliverable:** page
- **Refs:** PRD §6.4

### ☑ P5.2 — JSON BoM schema + export
- **Action:** `lib/export/bom-schema.ts` (JSON Schema definition), `app/api/export/bom/route.ts` returning BoM JSON.
- **Deliverable:** schema + route
- **Verify:** download; validate against schema with ajv
- **Refs:** PRD §6.4

### ☑ P5.3 — PDF components
- **Action:** `lib/export/pdf.tsx` with `@react-pdf/renderer`. Sections: cover, exec summary, per-layer sizing, BoM table, assumptions, appendix.
- **Deliverable:** PDF component tree
- **Refs:** PRD §6.4

### ☑ P5.4 — PDF export route
- **Action:** `app/api/export/pdf/route.ts`: renders PDF server-side, returns as download.
- **Deliverable:** route
- **Verify:** download works, PDF renders properly in Preview/Acrobat
- **Refs:** PRD §6.4

### ☑ P5.5 — Word (DOCX) export
- **Action:** `lib/export/docx.ts` using `docx` npm library. Same sections as PDF. `app/api/export/docx/route.ts`.
- **Deliverable:** generator + route
- **Verify:** open in Microsoft Word; sections are editable; styles applied
- **Refs:** PRD §6.4

### ☑ P5.6 — PDF preview in UI
- **Action:** `components/export/PdfPreview.tsx`: client-side preview using same components as server-side render (via `<PDFViewer>` from `@react-pdf/renderer`).
- **Deliverable:** component
- **Refs:** PRD §6.4

### ☑ P5.7 — Phase 5 integration test
- **Action:** Export all 3 formats from the sample project. Verify content matches current state; no stale data.
- **Deliverable:** noted in CHANGELOG
- **Refs:** PRD §9 Phase 5 exit
