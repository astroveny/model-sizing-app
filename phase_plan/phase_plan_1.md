# Phase Plan — File 1 of 5 (Phases 0–2)

> Index: [PHASE_PLAN.md](./PHASE_PLAN.md) · Next: [phase_plan_2.md](./phase_plan_2.md)

## Legend

- ☐ = not started · ◐ = in progress · ☑ = done · ⊘ = skipped/deferred
- **Deliverable:** concrete artifact produced by the step
- **Verify:** how to confirm the step is complete
- **Refs:** links to PRD sections and other docs

---

## Phase 0 — Scaffold & Dockerize

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

### ☑ P1.7 — Model Platform tab form
- **Action:** `components/discovery/ModelPlatformForm.tsx`: inference server, model registry, multi-model serving, caching, A/B testing, optimizations (speculative, prefix caching, FP8 KV, chunked prefill, continuous batching, FlashAttention).
- **Deliverable:** component
- **Verify:** as P1.4
- **Refs:** PRD §5.1

### ☑ P1.8 — Application tab form
- **Action:** `components/discovery/ApplicationForm.tsx`: API gateway, auth, rate limiting, UI required, audit logging, metering.
- **Deliverable:** component
- **Verify:** as P1.4
- **Refs:** PRD §5.1

### ☑ P1.9 — Seed ExplainBox content (round 1)
- **Action:** Author `data/explain/workload.json`, `hardware.json`, `infra.json`, `model-platform.json`, `application.json` with entries for **every** field. Minimum: `explain` + `example`. Target: full schema per `docs/adding-explain-content.md`.
- **Deliverable:** 5 JSON files, ~40–60 entries total
- **Verify:** Every field in Discovery shows populated ExplainBox
- **Refs:** docs/adding-explain-content.md

### ☑ P1.10 — Required-field validation gate
- **Action:** Discovery progress bar; Build section disabled until Zod validation passes on the minimum required set (model.name, model.params, model.quantization, load.concurrentUsers, load.avgInputTokens, load.avgOutputTokens, load.targetEndToEnd).
- **Deliverable:** validation hook + UI gate
- **Verify:** Build tab shows "Complete Discovery first" banner when required fields missing
- **Refs:** PRD §6.1 acceptance criteria

### ☑ P1.11 — Defer "Ask Claude" button (placeholder)
- **Action:** Button renders but calls `alert('Coming in P6')`. Full wiring deferred to Phase 6.
- **Deliverable:** placeholder hookup
- **Verify:** clicking button shows deferred message
- **Refs:** PRD §6.5

### ☑ P1.12 — Phase 1 integration test
- **Action:** Fill out a complete sample project (Llama 70B, 50 concurrent, FP16, on-prem, vLLM, K8s, Kong, OIDC). Confirm all five tabs, all fields editable, all ExplainBoxes render. Close/reopen — state intact.
- **Deliverable:** noted in CHANGELOG + `tests/fixtures/sample-projects.json` entry
- **Verify:** as described
- **Refs:** PRD §9 Phase 1 exit

---

## Phase 2 — Sizing Engine

**Goal:** Pure functional `(discovery) → buildDerived` sizing engine with hand-verified test fixtures.

**Exit criteria:** Engine returns BuildState matching hand-calculated expectations within 10% for 5 representative scenarios.

### ☑ P2.1 — GPU catalog data
- **Action:** Author `data/gpus.json` per `docs/adding-a-gpu.md` schema. Include: H100-SXM, H100-PCIe, H200, B200, A100-40GB, A100-80GB, L40S, MI300X, MI325X.
- **Deliverable:** `data/gpus.json` with 9+ entries
- **Verify:** loader parses; each entry has required fields
- **Refs:** docs/adding-a-gpu.md, PRD §7.4

### ☑ P2.2 — Server catalog data
- **Action:** Author `data/servers.json`: Dell XE9680, HPE Cray XD670, SMC AS-8125GS-TNMR2, NVIDIA DGX H100, NVIDIA DGX H200, NVIDIA HGX B200 reference. Fields: max_gpus, supported_gpu_ids[], rack_units, tdp_watts, list_price_usd.
- **Deliverable:** `data/servers.json` with 6+ entries
- **Verify:** loader + type check
- **Refs:** PRD §7.5

### ☑ P2.3 — Cloud instance catalog data
- **Action:** Author `data/instances.json`: AWS p5.48xlarge (8×H100), Azure ND H100 v5, GCP A3 High, AWS p4de, Azure ND A100 v4.
- **Deliverable:** `data/instances.json`
- **Verify:** loader + type check
- **Refs:** PRD §3.1

### ☑ P2.4 — Throughput lookup table
- **Action:** Author `data/throughput.json` keyed by `(gpu_id, model_size_bucket, quantization, batch_size) → tokens_per_sec`. Source from published benchmarks (NVIDIA, MLPerf, vLLM). Buckets: 7B, 13B, 34B, 70B, 140B, 405B. Flag gaps with `null` + `confidence: "low"`.
- **Deliverable:** `data/throughput.json`
- **Verify:** coverage report: at least 60% of bucket combinations populated for H100, H200, MI300X
- **Refs:** PRD §7.2, docs/sizing-math.md §4

### ☑ P2.5 — Model catalog data
- **Action:** Author `data/models.json` with known-model metadata: Llama 3.1 (8B/70B/405B), Mistral 7B, Mixtral 8x7B/8x22B, Qwen 2.5 (7B/32B/72B), Gemma 2 (9B/27B), DeepSeek-V3. Per entry: params, layers, hidden_size, num_kv_heads, head_dim, architecture (dense/moe), active_params.
- **Deliverable:** `data/models.json`
- **Verify:** loader + at least 10 models
- **Refs:** docs/sizing-math.md §2.2 (GQA math depends on accurate kv_heads)

### ☑ P2.6 — Memory footprint calculator
- **Action:** `lib/sizing/memory.ts`: implements §7.1.1 formulas — `vramModel`, `kvCachePerRequest` (with GQA awareness), `vramTotal`. Pure function.
- **Deliverable:** `lib/sizing/memory.ts` + unit tests
- **Verify:** Test fixtures: Llama 70B FP16 ≈ 140 GB model; Mixtral 8x22B active math correct; FP8 KV halves cache.
- **Refs:** docs/sizing-math.md §2

### ☑ P2.7 — Prefill calculator
- **Action:** `lib/sizing/prefill.ts`: implements §7.1.2 — prefill FLOPS, TTFT, MFU application, FP8 adjustments.
- **Deliverable:** `lib/sizing/prefill.ts` + tests
- **Verify:** Llama 70B with 2000-token prefill on H100 TP=4 returns TTFT in ~180ms ± 20ms (per PRD §7.7 worked example)
- **Refs:** docs/sizing-math.md §3

### ☑ P2.8 — Decode calculator
- **Action:** `lib/sizing/decode.ts`: implements §7.1.3 — bytes-per-token read, ITL, MBU application, batching-aware overrides via throughput table.
- **Deliverable:** `lib/sizing/decode.ts` + tests
- **Verify:** Llama 70B on H100 TP=4 returns ITL ~17ms ± 3ms (per PRD §7.7)
- **Refs:** docs/sizing-math.md §4

### ☑ P2.9 — Sharding decision logic
- **Action:** `lib/sizing/sharding.ts`: implements §7.1.4 — TP/PP/EP decision tree, overhead factors, interconnect recommendation.
- **Deliverable:** `lib/sizing/sharding.ts` + tests
- **Verify:** 70B on 80GB H100 → TP=4 PP=1; 405B on 80GB H100 → TP=8 PP=2; 70B on MI300X 192GB → TP=1.
- **Refs:** docs/sizing-math.md §5

### ☑ P2.10 — Capacity calculator (replicas + totals)
- **Action:** `lib/sizing/capacity.ts`: §7.1.5 — replicas from throughput, total GPUs, server count, rack units, power.
- **Deliverable:** `lib/sizing/capacity.ts` + tests
- **Verify:** 50 concurrent users, 500 output tokens, 8s target → sensible replica count for reference worked example
- **Refs:** docs/sizing-math.md §6

### ☑ P2.11 — Optimization modifiers
- **Action:** `lib/sizing/optimizations.ts`: applies §7.6 multipliers — speculative decoding throughput boost, FP8 KV cache size, prefix caching prefill reduction, etc.
- **Deliverable:** `lib/sizing/optimizations.ts` + tests
- **Verify:** enabling FP8 KV halves `vram_kv_total`; enabling spec decoding multiplies decode throughput by ~1.8
- **Refs:** PRD §7.6

### ☑ P2.12 — Deployment-pattern adjustments
- **Action:** `lib/sizing/patterns.ts`: applies §7.3 multipliers per deployment pattern (internal 1.0, external API 1.2, GPUaaS 1.3, SaaS 1.25) plus flags extra subsystems (metering, MIG, etc.).
- **Deliverable:** `lib/sizing/patterns.ts` + tests
- **Refs:** PRD §7.3, docs/sizing-math.md §7

### ☑ P2.13 — Public sizing API
- **Action:** `lib/sizing/index.ts` exports `computeBuild(discovery): BuildDerived`. Orchestrates memory → sharding → prefill → decode → optimizations → patterns → capacity. Returns `BuildDerived` + engine notes.
- **Deliverable:** `lib/sizing/index.ts`
- **Verify:** End-to-end test matching PRD §7.7 worked example within 10%
- **Refs:** PRD §7.1

### ☑ P2.14 — Unit test suite
- **Action:** `tests/sizing/*.test.ts` with 5 end-to-end scenarios hand-calculated:
  1. Llama 3.1 70B FP16 on H100 (PRD §7.7 worked example)
  2. Mistral 7B INT4 on L40S (edge low-end)
  3. Llama 3.1 405B FP16 on H200 (requires PP)
  4. Mixtral 8x22B FP8 on MI300X (MoE)
  5. 7B FP16 on H100 with GPUaaS pattern (metering overhead)
- **Deliverable:** 5 test files
- **Verify:** `npm test` all green
- **Refs:** PRD §9 Phase 2 exit criteria

### ☑ P2.15 — Engine notes generator
- **Action:** Notes surfaced during sizing: "chose TP=4 because...", "MI300X would save N GPUs...", "consider FP8 KV cache to double concurrent capacity".
- **Deliverable:** `lib/sizing/notes.ts`
- **Verify:** 5 test scenarios each produce at least 2 useful notes
- **Refs:** PRD §6.3
