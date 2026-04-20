# Phase Plan — model-sizing-app
- [Phase Plan — model-sizing-app](#phase-plan--model-sizing-app)
  - [Legend](#legend)
  - [Phase 0 — Scaffold \& Dockerize](#phase-0--scaffold--dockerize)
    - [P0.1 — Initialize Next.js project](#p01--initialize-nextjs-project)
    - [P0.2 — Install core dependencies](#p02--install-core-dependencies)
    - [P0.3 — Install shadcn/ui](#p03--install-shadcnui)
    - [P0.4 — Create folder structure](#p04--create-folder-structure)
    - [P0.5 — Set up Drizzle + SQLite](#p05--set-up-drizzle--sqlite)
    - [P0.6 — Zustand store skeleton](#p06--zustand-store-skeleton)
    - [P0.7 — Project persistence wiring](#p07--project-persistence-wiring)
    - [P0.8 — Minimal UI: project list + create + detail shell](#p08--minimal-ui-project-list--create--detail-shell)
    - [P0.8b — Light/dark mode theming](#p08b--lightdark-mode-theming)
    - [P0.9 — Dockerfile (multi-stage)](#p09--dockerfile-multi-stage)
    - [P0.10 — docker-compose.yml](#p010--docker-composeyml)
    - [P0.11 — Environment template](#p011--environment-template)
    - [P0.12 — Git hygiene](#p012--git-hygiene)
    - [P0.13 — Smoke test](#p013--smoke-test)
  - [Phase 1 — Discovery Section](#phase-1--discovery-section)
    - [P1.1 — Discovery types + Zod schemas](#p11--discovery-types--zod-schemas)
    - [P1.2 — ExplainBox component](#p12--explainbox-component)
    - [P1.3 — Discovery layout \& tab navigation](#p13--discovery-layout--tab-navigation)
    - [P1.4 — Workload tab form](#p14--workload-tab-form)
    - [P1.5 — Hardware tab form](#p15--hardware-tab-form)
    - [P1.6 — Infra tab form](#p16--infra-tab-form)
    - [P1.7 — Model Platform tab form](#p17--model-platform-tab-form)
    - [P1.8 — Application tab form](#p18--application-tab-form)
    - [P1.9 — Seed ExplainBox content (round 1)](#p19--seed-explainbox-content-round-1)
    - [P1.10 — Required-field validation gate](#p110--required-field-validation-gate)
    - [P1.11 — Defer "Ask Claude" button (placeholder)](#p111--defer-ask-claude-button-placeholder)
    - [P1.12 — Phase 1 integration test](#p112--phase-1-integration-test)
  - [Phase 2 — Sizing Engine](#phase-2--sizing-engine)
    - [P2.1 — GPU catalog data](#p21--gpu-catalog-data)
    - [P2.2 — Server catalog data](#p22--server-catalog-data)
    - [P2.3 — Cloud instance catalog data](#p23--cloud-instance-catalog-data)
    - [P2.4 — Throughput lookup table](#p24--throughput-lookup-table)
    - [P2.5 — Model catalog data](#p25--model-catalog-data)
    - [P2.6 — Memory footprint calculator](#p26--memory-footprint-calculator)
    - [P2.7 — Prefill calculator](#p27--prefill-calculator)
    - [P2.8 — Decode calculator](#p28--decode-calculator)
    - [P2.9 — Sharding decision logic](#p29--sharding-decision-logic)
    - [P2.10 — Capacity calculator (replicas + totals)](#p210--capacity-calculator-replicas--totals)
    - [P2.11 — Optimization modifiers](#p211--optimization-modifiers)
    - [P2.12 — Deployment-pattern adjustments](#p212--deployment-pattern-adjustments)
    - [P2.13 — Public sizing API](#p213--public-sizing-api)
    - [P2.14 — Unit test suite](#p214--unit-test-suite)
    - [P2.15 — Engine notes generator](#p215--engine-notes-generator)
  - [Phase 3 — Build Section](#phase-3--build-section)
    - [P3.1 — Build page shell](#p31--build-page-shell)
    - [P3.2 — Derived state subscription](#p32--derived-state-subscription)
    - [P3.3 — Hardware panel](#p33--hardware-panel)
    - [P3.4 — Infra panel](#p34--infra-panel)
    - [P3.5 — Model Platform panel](#p35--model-platform-panel)
    - [P3.6 — Application panel](#p36--application-panel)
    - [P3.7 — Summary totals](#p37--summary-totals)
    - [P3.8 — Override handling](#p38--override-handling)
    - [P3.9 — Vendor comparison view](#p39--vendor-comparison-view)
    - [P3.10 — Engine notes surface](#p310--engine-notes-surface)
    - [P3.11 — BoM generation](#p311--bom-generation)
    - [P3.12 — Rack layout diagram (basic)](#p312--rack-layout-diagram-basic)
    - [P3.13 — Architecture diagram (basic)](#p313--architecture-diagram-basic)
    - [P3.14 — Phase 3 integration test](#p314--phase-3-integration-test)
  - [Phase 4 — RFI Section](#phase-4--rfi-section)
    - [P4.1 — RFI page shell](#p41--rfi-page-shell)
    - [P4.2 — LLM provider abstraction](#p42--llm-provider-abstraction)
    - [P4.3 — LLM API route](#p43--llm-api-route)
    - [P4.4 — RFP paste flow](#p44--rfp-paste-flow)
    - [P4.5 — RFP upload flow](#p45--rfp-upload-flow)
    - [P4.6 — Extraction prompt](#p46--extraction-prompt)
    - [P4.7 — Extraction result UI](#p47--extraction-result-ui)
    - [P4.8 — Mapping + Apply to Discovery](#p48--mapping--apply-to-discovery)
    - [P4.9 — Qualification panel](#p49--qualification-panel)
    - [P4.10 — Draft response generator](#p410--draft-response-generator)
    - [P4.11 — OpenAI-compatible adapter (Gemma/Kimi/Nemotron)](#p411--openai-compatible-adapter-gemmakiminemotron)
    - [P4.12 — Retry + error handling](#p412--retry--error-handling)
    - [P4.13 — Phase 4 integration test](#p413--phase-4-integration-test)
  - [Phase 5 — Export](#phase-5--export)
    - [P5.1 — Export page shell](#p51--export-page-shell)
    - [P5.2 — JSON BoM schema + export](#p52--json-bom-schema--export)
    - [P5.3 — PDF components](#p53--pdf-components)
    - [P5.4 — PDF export route](#p54--pdf-export-route)
    - [P5.5 — Word (DOCX) export](#p55--word-docx-export)
    - [P5.6 — PDF preview in UI](#p56--pdf-preview-in-ui)
    - [P5.7 — Phase 5 integration test](#p57--phase-5-integration-test)
  - [Phase 6 — Polish \& LLM Expansion](#phase-6--polish--llm-expansion)
    - [P6.1 — "Ask Claude" in ExplainBox](#p61--ask-claude-in-explainbox)
    - [P6.2 — "Explain this sizing" in Build](#p62--explain-this-sizing-in-build)
    - [P6.3 — Improved architecture diagram](#p63--improved-architecture-diagram)
    - [P6.4 — Improved rack diagram](#p64--improved-rack-diagram)
    - [P6.5 — Loading states](#p65--loading-states)
    - [P6.6 — Error states](#p66--error-states)
    - [P6.7 — Empty states](#p67--empty-states)
    - [P6.8 — Documentation sweep](#p68--documentation-sweep)
    - [P6.9 — Audit log hookup](#p69--audit-log-hookup)
    - [P6.10 — Phase 6 demo dry-run](#p610--phase-6-demo-dry-run)
  - [Future phases (v2+)](#future-phases-v2)
  - [Troubleshooting reference by step](#troubleshooting-reference-by-step)
  - [Revision log](#revision-log)



> **Purpose:** Step-by-step build plan with stable numeric identifiers. Reference any step as `P{phase}.{step}` (e.g., `P2.4`) when editing, updating, or troubleshooting.
> **Companion docs:** [PRD.md](./PRD.md) §9 (phased delivery), [README.md](./README.md) (user-facing), [docs/sizing-math.md](./docs/sizing-math.md).
> **Status:** Living document. Steps can be re-ordered within a phase but IDs remain stable once assigned.

---

## Legend

- ☐ = not started · ◐ = in progress · ☑ = done · ⊘ = skipped/deferred
- **Deliverable:** concrete artifact produced by the step
- **Verify:** how to confirm the step is complete
- **Refs:** links to PRD sections and other docs

---

## Phase 0 — Scaffold & Dockerize
[Back to ToC](#phase-plan--model-sizing-app)

**Goal:** Empty but runnable Next.js app with SQLite + Docker. Creating a project and seeing it persist across restarts.

**Exit criteria:** `docker compose up` starts the app; can create a project, refresh the browser, see it in the list.

### ☑ P0.1 — Initialize Next.js project
- **Action:** `npx create-next-app@latest ml-sizer --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*"`
- **Deliverable:** `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, base `app/` directory
- **Verify:** `npm run dev` serves the default page at :3000
- **Refs:** PRD §4.1

### ☑ P0.2 — Install core dependencies
- **Action:** Install:
  - `zustand` (state)
  - `drizzle-orm` + `better-sqlite3` + `drizzle-kit` (DB)
  - `zod` (validation)
  - `@anthropic-ai/sdk` (LLM)
  - `uuid`, `clsx`, `tailwind-merge`
- **Deliverable:** updated `package.json` + lockfile
- **Verify:** `npm install` completes without errors; `npm run typecheck` passes
- **Refs:** PRD §4.1

### ☑ P0.3 — Install shadcn/ui
- **Action:** `npx shadcn@latest init`; add initial primitives: `button`, `input`, `card`, `tabs`, `dialog`, `label`, `select`, `textarea`, `switch`, `tooltip`
- **Deliverable:** `components/ui/*` populated; `components.json`
- **Verify:** import a Button in `app/page.tsx` and render it
- **Refs:** PRD §4.1

### ☑ P0.4 — Create folder structure
- **Action:** Create empty directories matching PRD §10:
  ```
  app/project/[id]/{discovery,rfi,build,export}/
  app/api/{llm,export,upload}/
  components/{discovery,rfi,build,export,ui}/
  components/build/diagrams/
  lib/{sizing,llm,db,export,utils}/
  lib/llm/prompts/
  lib/db/migrations/
  data/explain/
  tests/{sizing,llm,fixtures}/
  ```
- **Deliverable:** full directory tree with `.gitkeep` in empty folders
- **Verify:** `tree -d` matches PRD §10
- **Refs:** PRD §10

### ☑ P0.5 — Set up Drizzle + SQLite
- **Action:** Create `lib/db/schema.ts` with tables from PRD §5.2 (`projects`, `rfp_uploads`, `explain_custom`, `audit_log`). Include `description` column on `projects`. Create `lib/db/client.ts` instantiating the DB connection against `data/ml-sizer.db`. Configure `drizzle.config.ts`.
- **Deliverable:** schema file, client, config, `npm run db:migrate` script in package.json
- **Verify:** `npm run db:migrate` creates tables; inspect with `npm run db:studio`
- **Refs:** PRD §5.2

### ☑ P0.6 — Zustand store skeleton
- **Action:** Create `lib/store.ts` with the `Project` type from PRD §5.1 (types only, empty default state). Expose `useProjectStore`, `loadProject`, `saveProject`, `updateField`.
- **Deliverable:** `lib/store.ts` with typed store
- **Verify:** `npm run typecheck` passes; store can be imported and used in a test component
- **Refs:** PRD §5.1

### ☑ P0.7 — Project persistence wiring
- **Action:** Implement CRUD for projects: `createProject`, `listProjects`, `loadProject`, `saveProject` in `lib/db/projects.ts`. Autosave Zustand store to SQLite (debounced 500ms) when any field changes.
- **Deliverable:** `lib/db/projects.ts`; autosave hook in store
- **Verify:** Create a project, change a field, reload browser, field value persists
- **Refs:** PRD §6.1

### ☑ P0.8 — Minimal UI: project list + create + detail shell
- **Action:**
  - `app/page.tsx` — project list with "New Project" button
  - `app/project/[id]/layout.tsx` — tab bar (Discovery / RFI / Build / Export)
  - `app/project/[id]/page.tsx` — placeholder overview page
- **Deliverable:** two pages, one layout
- **Verify:** Can create project, navigate into it, see tab bar
- **Refs:** PRD §6

### ☑ P0.8b — Light/dark mode theming
- **Action:**
  - Install `next-themes`
  - Wrap `app/layout.tsx` with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`
  - Create `components/ThemeToggle.tsx` — icon button (sun/moon from `lucide-react`) that cycles light → dark → system
  - Place toggle in the top-right of the root layout header so it's visible on every page
  - Extend `tailwind.config.ts` with `darkMode: 'class'` and dark-mode color tokens
  - Verify all shadcn/ui primitives already added in P0.3 render correctly in both modes
- **Deliverable:** `components/ThemeToggle.tsx`, themed root layout, updated Tailwind config
- **Verify:**
  - Toggle cycles through light / dark / system
  - Preference persists across reloads (next-themes handles this via localStorage)
  - No flash-of-wrong-theme on page load
  - All pages (project list, project detail, Discovery/RFI/Build/Export shells from P0.8) respect the theme
- **Refs:** shadcn/ui theming docs; next-themes README

### ☑ P0.9 — Dockerfile (multi-stage)
- **Action:** Create `Dockerfile` with three stages (deps → build → runtime) on `node:20-alpine`. Expose 3000. Start with `npm run start`.
- **Deliverable:** `Dockerfile`
- **Verify:** `docker build -t ml-sizer .` succeeds; image is < 500 MB
- **Refs:** PRD §11.1

### ☑ P0.10 — docker-compose.yml
- **Action:** Create `docker-compose.yml` with single `ml-sizer` service, volume mounts for `./data` and `./uploads`, env_file `.env`, restart policy.
- **Deliverable:** `docker-compose.yml`, `.env.example`
- **Verify:** `docker compose up` starts the app reachable at localhost:3000
- **Refs:** PRD §11.2

### ☑ P0.11 — Environment template
- **Action:** Create `.env.example` with all vars from PRD §8.3 (LLM_PROVIDER, ANTHROPIC_API_KEY, ANTHROPIC_MODEL, OpenAI-compatible alternatives). Add `NEXT_PUBLIC_APP_NAME`. Comment explanations.
- **Deliverable:** `.env.example`
- **Verify:** `cp .env.example .env`; fill in; app starts
- **Refs:** PRD §8.3

### ☑ P0.12 — Git hygiene
- **Action:** `.gitignore` (node_modules, .next, data/*.db, data/*.db-journal, uploads/*, .env). Initial commit.
- **Deliverable:** `.gitignore`, initial commit with scaffold
- **Verify:** `git status` clean after build; no secrets committed
- **Refs:** —

### ☑ P0.13 — Smoke test
- **Action:** Manual walkthrough: fresh `docker compose up -d`, open browser, create project named "Smoke Test", add description, stop/start container, confirm project still visible.
- **Deliverable:** passed smoke test (noted in CHANGELOG)
- **Verify:** as described
- **Refs:** PRD §9 Phase 0 exit criteria

---

## Phase 1 — Discovery Section
[Back to ToC](#phase-plan--model-sizing-app)


**Goal:** All Discovery fields capturable, validated, persisted; ExplainBox renders for every field.

**Exit criteria:** Complete full Discovery for a sample Llama-70B inference project; every field has working ExplainBox content; state persists.

### ☑ P1.1 — Discovery types + Zod schemas
- **Action:** Expand `lib/store.ts` with full `DiscoveryState` type from PRD §5.1. Create `lib/utils/validation.ts` with Zod schemas matching every field (required/optional, ranges).
- **Deliverable:** types + validators
- **Verify:** `npm run typecheck`; unit test validates rejection of bad input
- **Refs:** PRD §5.1

### ☑ P1.2 — ExplainBox component
- **Action:** Build `components/ExplainBox.tsx` with:
  - `fieldId` prop
  - Two tabs: Explain / Example (shadcn Tabs)
  - "Ask Claude" placeholder button (wired in P1.11)
  - Content loader from `data/explain/*.json` (merged)
  - Renders "[Author this field]" when missing
- **Deliverable:** `components/ExplainBox.tsx`, `lib/explain/loader.ts`
- **Verify:** Place `<ExplainBox fieldId="test" />` on a page; see placeholder
- **Refs:** PRD §6.5, docs/adding-explain-content.md

### ☑ P1.3 — Discovery layout & tab navigation
- **Action:** `app/project/[id]/discovery/page.tsx` with five tabs: Workload, Hardware, Infra, Model Platform, Application.
- **Deliverable:** page + tab component
- **Verify:** All five tabs reachable; empty state shown per tab
- **Refs:** PRD §6.1

### ☑ P1.4 — Workload tab form
- **Action:** `components/discovery/WorkloadForm.tsx`: model fields (family, name, params, quantization, context, architecture, MoE active params) + load fields (concurrent users, rps, TTFT target, ITL target, end-to-end P50/P95, avg input/output tokens, burst multiplier, uptime SLA, streaming).
- **Deliverable:** component; fields wired to store
- **Verify:** Change a value, reload, value persists
- **Refs:** PRD §5.1 DiscoveryState.model/load

### ☑ P1.5 — Hardware tab form
- **Action:** `components/discovery/HardwareForm.tsx`: preferred vendor, preferred GPU, cooling, networking, plus constraint fields (power budget kW, rack units, budget capex/opex).
- **Deliverable:** component
- **Verify:** as P1.4
- **Refs:** PRD §5.1

### ☑ P1.6 — Infra tab form
- **Action:** `components/discovery/InfraForm.tsx`: orchestrator, existing cluster, air-gapped, GitOps, observability.
- **Deliverable:** component
- **Verify:** as P1.4
- **Refs:** PRD §5.1

### P1.7 — Model Platform tab form
- **Action:** `components/discovery/ModelPlatformForm.tsx`: inference server, model registry, multi-model serving, caching, A/B testing, optimizations (speculative, prefix caching, FP8 KV, chunked prefill, continuous batching, FlashAttention).
- **Deliverable:** component
- **Verify:** as P1.4
- **Refs:** PRD §5.1

### P1.8 — Application tab form
- **Action:** `components/discovery/ApplicationForm.tsx`: API gateway, auth, rate limiting, UI required, audit logging, metering.
- **Deliverable:** component
- **Verify:** as P1.4
- **Refs:** PRD §5.1

### P1.9 — Seed ExplainBox content (round 1)
- **Action:** Author `data/explain/workload.json`, `hardware.json`, `infra.json`, `model-platform.json`, `application.json` with entries for **every** field. Minimum: `explain` + `example`. Target: full schema per `docs/adding-explain-content.md`.
- **Deliverable:** 5 JSON files, ~40–60 entries total
- **Verify:** Every field in Discovery shows populated ExplainBox
- **Refs:** docs/adding-explain-content.md

### P1.10 — Required-field validation gate
- **Action:** Discovery progress bar; Build section disabled until Zod validation passes on the minimum required set (model.name, model.params, model.quantization, load.concurrentUsers, load.avgInputTokens, load.avgOutputTokens, load.targetEndToEnd).
- **Deliverable:** validation hook + UI gate
- **Verify:** Build tab shows "Complete Discovery first" banner when required fields missing
- **Refs:** PRD §6.1 acceptance criteria

### P1.11 — Defer "Ask Claude" button (placeholder)
- **Action:** Button renders but calls `alert('Coming in P6')`. Full wiring deferred to Phase 6.
- **Deliverable:** placeholder hookup
- **Verify:** clicking button shows deferred message
- **Refs:** PRD §6.5

### P1.12 — Phase 1 integration test
- **Action:** Fill out a complete sample project (Llama 70B, 50 concurrent, FP16, on-prem, vLLM, K8s, Kong, OIDC). Confirm all five tabs, all fields editable, all ExplainBoxes render. Close/reopen — state intact.
- **Deliverable:** noted in CHANGELOG + `tests/fixtures/sample-projects.json` entry
- **Verify:** as described
- **Refs:** PRD §9 Phase 1 exit

---

## Phase 2 — Sizing Engine
[Back to ToC](#phase-plan--model-sizing-app)


**Goal:** Pure functional `(discovery) → buildDerived` sizing engine with hand-verified test fixtures.

**Exit criteria:** Engine returns BuildState matching hand-calculated expectations within 10% for 5 representative scenarios.

### P2.1 — GPU catalog data
- **Action:** Author `data/gpus.json` per `docs/adding-a-gpu.md` schema. Include: H100-SXM, H100-PCIe, H200, B200, A100-40GB, A100-80GB, L40S, MI300X, MI325X.
- **Deliverable:** `data/gpus.json` with 9+ entries
- **Verify:** loader parses; each entry has required fields
- **Refs:** docs/adding-a-gpu.md, PRD §7.4

### P2.2 — Server catalog data
- **Action:** Author `data/servers.json`: Dell XE9680, HPE Cray XD670, SMC AS-8125GS-TNMR2, NVIDIA DGX H100, NVIDIA DGX H200, NVIDIA HGX B200 reference. Fields: max_gpus, supported_gpu_ids[], rack_units, tdp_watts, list_price_usd.
- **Deliverable:** `data/servers.json` with 6+ entries
- **Verify:** loader + type check
- **Refs:** PRD §7.5

### P2.3 — Cloud instance catalog data
- **Action:** Author `data/instances.json`: AWS p5.48xlarge (8×H100), Azure ND H100 v5, GCP A3 High, AWS p4de, Azure ND A100 v4.
- **Deliverable:** `data/instances.json`
- **Verify:** loader + type check
- **Refs:** PRD §3.1

### P2.4 — Throughput lookup table
- **Action:** Author `data/throughput.json` keyed by `(gpu_id, model_size_bucket, quantization, batch_size) → tokens_per_sec`. Source from published benchmarks (NVIDIA, MLPerf, vLLM). Buckets: 7B, 13B, 34B, 70B, 140B, 405B. Flag gaps with `null` + `confidence: "low"`.
- **Deliverable:** `data/throughput.json`
- **Verify:** coverage report: at least 60% of bucket combinations populated for H100, H200, MI300X
- **Refs:** PRD §7.2, docs/sizing-math.md §4

### P2.5 — Model catalog data
- **Action:** Author `data/models.json` with known-model metadata: Llama 3.1 (8B/70B/405B), Mistral 7B, Mixtral 8x7B/8x22B, Qwen 2.5 (7B/32B/72B), Gemma 2 (9B/27B), DeepSeek-V3. Per entry: params, layers, hidden_size, num_kv_heads, head_dim, architecture (dense/moe), active_params.
- **Deliverable:** `data/models.json`
- **Verify:** loader + at least 10 models
- **Refs:** docs/sizing-math.md §2.2 (GQA math depends on accurate kv_heads)

### P2.6 — Memory footprint calculator
- **Action:** `lib/sizing/memory.ts`: implements §7.1.1 formulas — `vramModel`, `kvCachePerRequest` (with GQA awareness), `vramTotal`. Pure function.
- **Deliverable:** `lib/sizing/memory.ts` + unit tests
- **Verify:** Test fixtures: Llama 70B FP16 ≈ 140 GB model; Mixtral 8x22B active math correct; FP8 KV halves cache.
- **Refs:** docs/sizing-math.md §2

### P2.7 — Prefill calculator
- **Action:** `lib/sizing/prefill.ts`: implements §7.1.2 — prefill FLOPS, TTFT, MFU application, FP8 adjustments.
- **Deliverable:** `lib/sizing/prefill.ts` + tests
- **Verify:** Llama 70B with 2000-token prefill on H100 TP=4 returns TTFT in ~180ms ± 20ms (per PRD §7.7 worked example)
- **Refs:** docs/sizing-math.md §3

### P2.8 — Decode calculator
- **Action:** `lib/sizing/decode.ts`: implements §7.1.3 — bytes-per-token read, ITL, MBU application, batching-aware overrides via throughput table.
- **Deliverable:** `lib/sizing/decode.ts` + tests
- **Verify:** Llama 70B on H100 TP=4 returns ITL ~17ms ± 3ms (per PRD §7.7)
- **Refs:** docs/sizing-math.md §4

### P2.9 — Sharding decision logic
- **Action:** `lib/sizing/sharding.ts`: implements §7.1.4 — TP/PP/EP decision tree, overhead factors, interconnect recommendation.
- **Deliverable:** `lib/sizing/sharding.ts` + tests
- **Verify:** 70B on 80GB H100 → TP=4 PP=1; 405B on 80GB H100 → TP=8 PP=2; 70B on MI300X 192GB → TP=1.
- **Refs:** docs/sizing-math.md §5

### P2.10 — Capacity calculator (replicas + totals)
- **Action:** `lib/sizing/capacity.ts`: §7.1.5 — replicas from throughput, total GPUs, server count, rack units, power.
- **Deliverable:** `lib/sizing/capacity.ts` + tests
- **Verify:** 50 concurrent users, 500 output tokens, 8s target → sensible replica count for reference worked example
- **Refs:** docs/sizing-math.md §6

### P2.11 — Optimization modifiers
- **Action:** `lib/sizing/optimizations.ts`: applies §7.6 multipliers — speculative decoding throughput boost, FP8 KV cache size, prefix caching prefill reduction, etc.
- **Deliverable:** `lib/sizing/optimizations.ts` + tests
- **Verify:** enabling FP8 KV halves `vram_kv_total`; enabling spec decoding multiplies decode throughput by ~1.8
- **Refs:** PRD §7.6

### P2.12 — Deployment-pattern adjustments
- **Action:** `lib/sizing/patterns.ts`: applies §7.3 multipliers per deployment pattern (internal 1.0, external API 1.2, GPUaaS 1.3, SaaS 1.25) plus flags extra subsystems (metering, MIG, etc.).
- **Deliverable:** `lib/sizing/patterns.ts` + tests
- **Refs:** PRD §7.3, docs/sizing-math.md §7

### P2.13 — Public sizing API
- **Action:** `lib/sizing/index.ts` exports `computeBuild(discovery): BuildDerived`. Orchestrates memory → sharding → prefill → decode → optimizations → patterns → capacity. Returns `BuildDerived` + engine notes.
- **Deliverable:** `lib/sizing/index.ts`
- **Verify:** End-to-end test matching PRD §7.7 worked example within 10%
- **Refs:** PRD §7.1

### P2.14 — Unit test suite
- **Action:** `tests/sizing/*.test.ts` with 5 end-to-end scenarios hand-calculated:
  1. Llama 3.1 70B FP16 on H100 (PRD §7.7 worked example)
  2. Mistral 7B INT4 on L40S (edge low-end)
  3. Llama 3.1 405B FP16 on H200 (requires PP)
  4. Mixtral 8x22B FP8 on MI300X (MoE)
  5. 7B FP16 on H100 with GPUaaS pattern (metering overhead)
- **Deliverable:** 5 test files
- **Verify:** `npm test` all green
- **Refs:** PRD §9 Phase 2 exit criteria

### P2.15 — Engine notes generator
- **Action:** Notes surfaced during sizing: "chose TP=4 because...", "MI300X would save N GPUs...", "consider FP8 KV cache to double concurrent capacity".
- **Deliverable:** `lib/sizing/notes.ts`
- **Verify:** 5 test scenarios each produce at least 2 useful notes
- **Refs:** PRD §6.3

---

## Phase 3 — Build Section
[Back to ToC](#phase-plan--model-sizing-app)


**Goal:** Auto-computed sizing visible in UI, updates reactively, allows overrides, shows vendor comparison.

**Exit criteria:** Changing any Discovery field reflects in Build within 1s; overrides persist; NVIDIA vs AMD comparison renders.

### P3.1 — Build page shell
- **Action:** `app/project/[id]/build/page.tsx` with 4 layer panels + summary totals + engine notes area.
- **Deliverable:** page
- **Verify:** page renders with empty panels when Discovery incomplete
- **Refs:** PRD §6.3

### P3.2 — Derived state subscription
- **Action:** Hook: `useBuildDerived()` subscribes to Discovery state and calls `computeBuild()`. Memoized; recomputes only on relevant change.
- **Deliverable:** `lib/hooks/useBuildDerived.ts`
- **Verify:** changing Discovery field updates Build within 500ms
- **Refs:** PRD §6.3 acceptance

### P3.3 — Hardware panel
- **Action:** `components/build/HardwarePanel.tsx`: GPU model + count, server model + count, CPU + RAM, storage, networking. Override inputs beside each derived field.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.hardware

### P3.4 — Infra panel
- **Action:** `components/build/InfraPanel.tsx`: orchestrator, node pools, load balancer, monitoring stack.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.infra

### P3.5 — Model Platform panel
- **Action:** `components/build/ModelPlatformPanel.tsx`: server, replicas, TP/PP/EP, KV cache, max batch, latency estimates (TTFT, ITL, end-to-end), interconnect recommendation.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.modelPlatform

### P3.6 — Application panel
- **Action:** `components/build/ApplicationPanel.tsx`: gateway, auth, rate limits, metering (conditional on GPUaaS/SaaS).
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildDerived.application

### P3.7 — Summary totals
- **Action:** `components/build/SummaryTotals.tsx`: total GPUs, servers, power kW, rack units, capex, monthly opex. Positioned at top.
- **Deliverable:** component
- **Refs:** PRD §5.1 BuildState.totals

### P3.8 — Override handling
- **Action:** Overrides stored in `BuildState.overrides`. When present, take precedence over derived. UI shows override badge.
- **Deliverable:** override mechanism; persists to SQLite
- **Verify:** override a value, reload, override persists, derived re-computes when inputs change but override holds.
- **Refs:** PRD §6.3 acceptance

### P3.9 — Vendor comparison view
- **Action:** When Discovery `hardware.preferredVendor === 'either'`, show NVIDIA-best vs AMD-best side-by-side with deltas (GPU count, cost, power, decode throughput).
- **Deliverable:** `components/build/VendorComparison.tsx`
- **Verify:** toggle preferredVendor to "either"; comparison renders; toggle to "nvidia"; comparison hides
- **Refs:** PRD §6.3

### P3.10 — Engine notes surface
- **Action:** Notes rendered in an expandable card per panel. Category pills (info/warning/recommendation).
- **Deliverable:** notes component integrated into each panel
- **Refs:** PRD §6.3

### P3.11 — BoM generation
- **Action:** `lib/sizing/bom.ts`: transforms BuildDerived into `BomItem[]` with pricing from catalogs. Total capex = sum of unit prices × qty.
- **Deliverable:** `lib/sizing/bom.ts` + tests
- **Verify:** BoM sum matches SummaryTotals.capexUsd
- **Refs:** PRD §5.1 BomItem

### P3.12 — Rack layout diagram (basic)
- **Action:** `components/build/diagrams/RackLayout.tsx`: simple SVG showing N servers × rack units. No 3D, just boxes.
- **Deliverable:** component
- **Refs:** PRD §6.3

### P3.13 — Architecture diagram (basic)
- **Action:** `components/build/diagrams/ArchitectureDiagram.tsx`: four stacked boxes (App → Model Platform → Infra → Hardware) with labels from current Build.
- **Deliverable:** component
- **Refs:** PRD §6.3

### P3.14 — Phase 3 integration test
- **Action:** Using Phase 1 sample project, go to Build, verify everything renders, change 3 Discovery values, watch Build update, override 2 values, reload, state intact.
- **Deliverable:** recorded in CHANGELOG
- **Refs:** PRD §9 Phase 3 exit

---

## Phase 4 — RFI Section
[Back to ToC](#phase-plan--model-sizing-app)


**Goal:** Paste or upload RFP → LLM extracts requirements → map to Discovery → qualify → optionally draft response.

**Exit criteria:** Paste a sample RFP, get structured requirements, map to Discovery, get qualification score, generate draft response.

### P4.1 — RFI page shell
- **Action:** `app/project/[id]/rfi/page.tsx` with 4 zones: Input → Extracted → Mapping → Qualification/Response.
- **Deliverable:** page
- **Refs:** PRD §6.2

### P4.2 — LLM provider abstraction
- **Action:** `lib/llm/provider.ts` interface per `docs/llm-provider-guide.md`. `lib/llm/anthropic.ts` implementation. Factory in `getLlmProvider()`.
- **Deliverable:** abstraction + Anthropic impl
- **Verify:** smoke test: `getLlmProvider().complete({messages:[{role:'user',content:'hi'}]})` returns text
- **Refs:** docs/llm-provider-guide.md, PRD §8

### P4.3 — LLM API route
- **Action:** `app/api/llm/route.ts`: server-side proxy (keeps keys off client). Accepts `{system, messages, maxTokens, temperature, json}`. Calls `getLlmProvider()`.
- **Deliverable:** route + client helper in `lib/llm/client.ts`
- **Verify:** browser can POST to `/api/llm` and get response
- **Refs:** PRD §8

### P4.4 — RFP paste flow
- **Action:** Textarea component; "Extract" button triggers LLM call with the extraction prompt.
- **Deliverable:** `components/rfi/RfpPaster.tsx`
- **Refs:** PRD §6.2

### P4.5 — RFP upload flow
- **Action:** File upload endpoint `app/api/upload/route.ts`; supports PDF and DOCX; extracts text server-side (pdf-parse, mammoth); stores file path in `rfp_uploads` table.
- **Deliverable:** `components/rfi/RfpUploader.tsx` + upload route
- **Verify:** upload a PDF, text extracted and displayed
- **Refs:** PRD §6.2

### P4.6 — Extraction prompt
- **Action:** `lib/llm/prompts/extract-rfp.ts` with `PROMPT_VERSION`. Returns structured JSON: requirements[], timelines[], evaluationCriteria[], mandatoryItems[]. Each requirement has layer and maps to Discovery fieldId.
- **Deliverable:** prompt file
- **Refs:** docs/llm-provider-guide.md §6

### P4.7 — Extraction result UI
- **Action:** `components/rfi/RequirementsList.tsx`: editable list of extracted requirements with layer tags and mandatory flags.
- **Deliverable:** component
- **Refs:** PRD §6.2

### P4.8 — Mapping + Apply to Discovery
- **Action:** For each extracted requirement with `mapsToDiscoveryField`, show "Apply" button. Bulk "Apply all" button.
- **Deliverable:** mapping action in store
- **Verify:** apply populates Discovery; navigating to Discovery shows values
- **Refs:** PRD §6.2 acceptance

### P4.9 — Qualification panel
- **Action:** `components/rfi/QualificationPanel.tsx`: fit score (0–100), strengths, risks, win probability, go/no-go toggle. Deterministic scoring from completeness + constraints.
- **Deliverable:** component + `lib/sizing/qualification.ts`
- **Refs:** PRD §6.2

### P4.10 — Draft response generator
- **Action:** `components/rfi/DraftResponse.tsx`: section per layer (Hardware, Infra, Model Platform, Application, Executive Summary). Uses LLM with `lib/llm/prompts/draft-response.ts`.
- **Deliverable:** component + prompt
- **Verify:** generates reasonable draft for sample project
- **Refs:** PRD §6.2

### P4.11 — OpenAI-compatible adapter (Gemma/Kimi/Nemotron)
- **Action:** `lib/llm/openai-compatible.ts`. Supports `OPENAI_COMPATIBLE_BASE_URL/API_KEY/MODEL`. Tested with at least one real endpoint (Ollama is easiest for local test).
- **Deliverable:** adapter
- **Verify:** switch `LLM_PROVIDER=openai-compatible`, extraction still works
- **Refs:** docs/llm-provider-guide.md §3.2

### P4.12 — Retry + error handling
- **Action:** `lib/llm/retry.ts` with exponential backoff on `LlmTransientError`; `LlmRateLimitError` respects `retryAfterMs`.
- **Deliverable:** retry utility + wired into API route
- **Refs:** docs/llm-provider-guide.md §8

### P4.13 — Phase 4 integration test
- **Action:** Paste a realistic sample RFP (prepared fixture). Verify extraction, mapping, qualification, response draft all work end-to-end.
- **Deliverable:** `tests/fixtures/sample-rfp.txt`; test result in CHANGELOG
- **Refs:** PRD §9 Phase 4 exit

---

## Phase 5 — Export
[Back to ToC](#phase-plan--model-sizing-app)


**Goal:** PDF, Word, JSON BoM exports of the completed sizing.

**Exit criteria:** All three formats produce complete documents reflecting current state.

### P5.1 — Export page shell
- **Action:** `app/project/[id]/export/page.tsx` with 3 export buttons + preview pane.
- **Deliverable:** page
- **Refs:** PRD §6.4

### P5.2 — JSON BoM schema + export
- **Action:** `lib/export/bom-schema.ts` (JSON Schema definition), `app/api/export/bom/route.ts` returning BoM JSON.
- **Deliverable:** schema + route
- **Verify:** download; validate against schema with ajv
- **Refs:** PRD §6.4

### P5.3 — PDF components
- **Action:** `lib/export/pdf.tsx` with `@react-pdf/renderer`. Sections: cover, exec summary, per-layer sizing, BoM table, assumptions, appendix.
- **Deliverable:** PDF component tree
- **Refs:** PRD §6.4

### P5.4 — PDF export route
- **Action:** `app/api/export/pdf/route.ts`: renders PDF server-side, returns as download.
- **Deliverable:** route
- **Verify:** download works, PDF renders properly in Preview/Acrobat
- **Refs:** PRD §6.4

### P5.5 — Word (DOCX) export
- **Action:** `lib/export/docx.ts` using `docx` npm library. Same sections as PDF. `app/api/export/docx/route.ts`.
- **Deliverable:** generator + route
- **Verify:** open in Microsoft Word; sections are editable; styles applied
- **Refs:** PRD §6.4

### P5.6 — PDF preview in UI
- **Action:** `components/export/PdfPreview.tsx`: client-side preview using same components as server-side render (via `<PDFViewer>` from `@react-pdf/renderer`).
- **Deliverable:** component
- **Refs:** PRD §6.4

### P5.7 — Phase 5 integration test
- **Action:** Export all 3 formats from the sample project. Verify content matches current state; no stale data.
- **Deliverable:** noted in CHANGELOG
- **Refs:** PRD §9 Phase 5 exit

---

## Phase 6 — Polish & LLM Expansion
[Back to ToC](#phase-plan--model-sizing-app)

**Goal:** Wire up the LLM-powered "Ask Claude" feature, improve diagrams, error/loading states, documentation polish.

**Exit criteria:** Tool is demo-ready for internal team onboarding.

### P6.1 — "Ask Claude" in ExplainBox
- **Action:** Wire the button from P1.11. `lib/llm/prompts/explain-field.ts`. Returns customer-tailored explanation using current project context (workload, customer, industry). Editable result saved to `explainOverrides`.
- **Deliverable:** feature complete
- **Refs:** PRD §6.5, docs/adding-explain-content.md §8

### P6.2 — "Explain this sizing" in Build
- **Action:** Button on each Build panel: "Why this choice?" Sends Discovery + Build derived state + panel focus to LLM. Returns natural-language explanation.
- **Deliverable:** component + `lib/llm/prompts/explain-sizing.ts`
- **Refs:** PRD §8.4

### P6.3 — Improved architecture diagram
- **Action:** Replace basic boxes with a proper layered diagram: gateway → model platform → sharding topology → hardware. Show data flow arrows.
- **Deliverable:** enhanced `ArchitectureDiagram.tsx`
- **Refs:** PRD §6.3

### P6.4 — Improved rack diagram
- **Action:** Proper rack visualization with servers stacked correctly, labels, power draw.
- **Deliverable:** enhanced `RackLayout.tsx`
- **Refs:** PRD §6.3

### P6.5 — Loading states
- **Action:** Every async action (LLM calls, exports, autosave) has a spinner or skeleton. No blank screens.
- **Deliverable:** loading states audit
- **Refs:** UX

### P6.6 — Error states
- **Action:** LLM failure, DB failure, export failure — all handled with a user-facing message + retry.
- **Deliverable:** error boundary + toast system (e.g., sonner)
- **Refs:** UX

### P6.7 — Empty states
- **Action:** "No projects yet" screen with a CTA. "Complete Discovery to see sizing" in Build. "Upload an RFP or paste text" in RFI.
- **Deliverable:** empty-state components
- **Refs:** UX

### P6.8 — Documentation sweep
- **Action:** Update README with any drift; verify all docs/ links work; add GIFs or screenshots to README.
- **Deliverable:** updated docs
- **Refs:** all docs

### P6.9 — Audit log hookup
- **Action:** Every LLM call + project mutation writes to `audit_log` table. Simple Admin page to view (Phase 6 or later).
- **Deliverable:** `lib/db/audit.ts`
- **Refs:** PRD §5.2

### P6.10 — Phase 6 demo dry-run
- **Action:** Full end-to-end walkthrough: create project, import RFP, complete Discovery, review Build, export PDF. Notes for any friction.
- **Deliverable:** demo script in `docs/demo-script.md`
- **Refs:** PRD §9 Phase 6 exit

---

## Future phases (v2+)
[Back to ToC](#phase-plan--model-sizing-app)

Not assigned step IDs yet — will be enumerated when scoped.

- **Phase 7** — Fine-tuning workload module (LoRA, QLoRA, full FT sizing)
- **Phase 8** — Training workload module (multi-node training, gradient sizing)
- **Phase 9** — MCP integrations (live catalog / pricing lookups)
- **Phase 10** — Additional accelerators (Intel Gaudi, AWS Trainium/Inferentia, Google TPU)
- **Phase 11** — IaC export (Terraform modules, Helm charts)
- **Phase 12** — RAG / vector DB sizing sub-module
- **Phase 13** — Multi-region & DR sizing

---

## Troubleshooting reference by step

If a step fails, document the failure here with the step ID. Example entries:

```
P0.9 — Dockerfile: alpine Node 20 missing build-tools for better-sqlite3
  Fix: use node:20-slim, add `apt-get install python3 make g++` in deps stage.
  Date: YYYY-MM-DD
```

This section grows as we build.

---

## Revision log

| Version | Date | Changes |
|---|---|---|
| v0.1 | 2026-04-19 | Initial phase plan with P0–P6 steps |
