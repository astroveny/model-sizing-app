# ML/GenAI Deployment Sizing Tool — Product Requirements Document

**Working name:** `ml-sizer`
**Status:** Draft v0.3 — living document
**Owner:** Project owner (solo → small team)
**Last updated:** 2026-04-21

---

## 1. Product Overview

### 1.1 What this is
A local-first desktop/browser tool that helps the owner (and later their team) size and architect ML/GenAI deployments across four stack layers — **Hardware**, **Infrastructure Platform**, **Model Platform**, and **Application** — during client engagements. The tool guides users through discovery, RFP/RFI analysis, and architecture build-out, producing a ready-to-share sizing proposal.

### 1.2 Why this exists
Sizing ML/GenAI deployments is currently ad-hoc: spreadsheet math, tribal knowledge, and manual proposal writing. This tool codifies sizing logic, keeps data consistent across project phases, and produces professional deliverables (PDF, Word, JSON BoM) in a fraction of the time.

### 1.3 Primary outcomes
1. Cut discovery-to-proposal time from days to hours.
2. Ensure sizing consistency (no forgotten KV cache, no wrong quantization math).
3. Give the owner a tool to *explain* concepts to customers new to model deployment — the tool is both internal and a discovery companion in client calls.
4. Produce deliverables that look professional enough to attach to an RFP response.

### 1.4 Non-goals (v1)
- Not a benchmarking tool. We consume published benchmarks; we don't run them.
- Not a deployment/provisioning tool. We output specs and BoMs, not Terraform.
- Not a multi-tenant SaaS product itself. Runs locally; exposed to the team via Docker.
- Not a cost optimizer/marketplace. We estimate cost; we don't shop cloud providers.

---

## 2. Users & Use Cases

### 2.1 Users
- **Phase 1:** Owner (solo).
- **Phase 2:** Small internal team (2–5 people), sharing a running instance via Docker on a shared host or individual local installs.
- **Not in scope:** External clients using the tool directly.

### 2.2 Primary use cases
1. **Discovery with a client.** Owner opens the tool during/after a call, captures requirements layer-by-layer, uses Explain & Example to teach the client as they go.
2. **RFP/RFI response.** Owner pastes or uploads an RFP, tool extracts requirements, pre-fills Discovery, scores qualification, supports drafting a response.
3. **Architecture build-out.** Once Discovery is complete, tool computes sizing across all four layers and presents an editable build with BoM and cost.
4. **Deliverable export.** Generate PDF proposal, Word doc, and JSON BoM for handoff.

### 2.3 Customer deployment patterns being sized for
The customer may ask us to size any of:
- **`internal-inference`** — internal employees consume models (e.g., RAG over internal docs)
- **`external-api`** — public API serving inference to external consumers
- **`gpuaas-multi-tenant`** — customer wants to *offer* GPU/model access to their own tenants (GPU-as-a-Service)
- **`saas-product`** — customer is building a full SaaS product with model inference as a component

Deployment pattern materially changes sizing (multi-tenancy overhead, isolation, metering, API gateway capacity, quota management).

---

## 3. Scope

### 3.1 In scope for v1
- Workload type: **Inference only**
- Layers: Hardware, Infra Platform, Model Platform, Application
- Deployment targets: **On-prem primary, cloud secondary**
- GPU catalog: **NVIDIA + AMD** (H100, H200, B200, A100, L40S, MI300X, MI325X)
- Sections: Discovery, RFI, Build, Export
- Explain & Example component across all sections
- LLM integration: Anthropic primary, OpenAI-compatible adapter for Gemma/Kimi/Nemotron
- Outputs: Dashboard view + PDF + Word + JSON BoM
- Distribution: Docker image + docker-compose for local/team use

### 3.2 Out of scope for v1 (roadmap)
- Training workload sizing
- Fine-tuning workload sizing (LoRA/QLoRA/full)
- Intel Gaudi, AWS Trainium/Inferentia, Google TPU
- MCP integrations (planned Phase 6+)
- Auth / multi-user / project sharing over network
- Live cloud pricing APIs (use static pricing tables for v1)
- Terraform/Helm output generation

### 3.3 v2+ considerations
- Training/fine-tuning modules with their own sizing math
- MCP servers for live catalog and pricing lookups
- Team collaboration (shared projects, comments)
- Additional accelerators (Gaudi, Trainium, TPU)
- IaC export (Terraform modules, Helm charts)
- RAG/vector-DB sizing sub-module

---

## 4. Architecture

### 4.1 Stack
| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Single codebase, reactive UI, API routes for LLM |
| State | Zustand | Cross-section reactivity; tiny, no boilerplate |
| DB | SQLite via Drizzle ORM | Single file, no server, type-safe |
| UI | Tailwind CSS + shadcn/ui | Professional look without custom CSS |
| Validation | Zod | Runtime + compile-time safety for sizing inputs |
| PDF export | `@react-pdf/renderer` | Component-based PDFs, React-native |
| Word export | `docx` npm library | Programmatic .docx generation |
| LLM | Provider abstraction → Anthropic SDK / OpenAI-compatible adapter | Pluggable providers |
| Container | Multi-stage Dockerfile + docker-compose | Portable, team-shareable |

### 4.2 High-level data flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Zustand Store (brain)                   │
│  { project, discovery, rfi, build, explainContent, ... }     │
└────┬──────────────┬─────────────┬──────────────┬────────────┘
     │              │             │              │
     ▼              ▼             ▼              ▼
┌─────────┐    ┌────────┐    ┌────────┐    ┌─────────┐
│Discovery│◄──►│  RFI   │◄──►│ Build  │◄──►│ Export  │
│ section │    │section │    │section │    │ section │
└────┬────┘    └───┬────┘    └───┬────┘    └────┬────┘
     │             │             │               │
     └─────┬───────┴─────┬───────┴───────────────┘
           ▼             ▼
    ┌──────────────┐  ┌──────────────┐
    │ Sizing Engine│  │ LLM Provider │
    │ (pure funcs) │  │ (Anthropic/  │
    │              │  │  OpenAI-     │
    │              │  │  compatible) │
    └──────┬───────┘  └──────────────┘
           │
    ┌──────▼───────┐
    │ SQLite (file)│
    └──────────────┘
```

Key properties:
- **One source of truth:** the Zustand store. Every section reads/writes there.
- **Derived state:** Build values are computed from Discovery; manual overrides stored separately.
- **Pure sizing engine:** `(discoveryState) → buildState` with no side effects. Unit-testable.
- **LLM calls go through an abstraction.** Swap providers via env var.

### 4.3 Docker topology
- One container runs the Next.js app on port 3000.
- SQLite DB file mounted on a volume (`./data` on host) for persistence.
- Uploaded RFP files mounted on a volume (`./uploads`).
- `.env` file mounted for API keys and provider selection.
- `docker compose up` starts everything; `docker compose down -v` cleans.

---

## 5. Data Model

### 5.1 Zustand store shape (TypeScript)

```ts
type Project = {
  id: string                      // uuid
  name: string
  customer: string
  createdAt: string               // ISO
  updatedAt: string

  workloadType: 'inference'       // v1: inference only
  deploymentPattern:
    | 'internal-inference'
    | 'external-api'
    | 'gpuaas-multi-tenant'
    | 'saas-product'
  deploymentTarget: 'on-prem' | 'cloud' | 'hybrid'

  discovery: DiscoveryState
  rfi: RfiState
  build: BuildState               // derived + overrides
  explainOverrides: Record<string, ExplainContent>  // optional per-field overrides
}

type DiscoveryState = {
  model: {
    family: string                // 'llama', 'mistral', 'qwen', 'custom'
    name: string                  // 'Llama-3.1-70B'
    params: number                // in billions
    quantization: 'FP32' | 'FP16' | 'BF16' | 'FP8' | 'INT8' | 'INT4'
    contextLength: number         // tokens
    architecture: 'dense' | 'moe'
    moeActiveParams?: number      // if MoE
  }
  load: {
    concurrentUsers: number
    requestsPerSecond: number
    targetLatencyP50Ms: number    // end-to-end
    targetLatencyP95Ms: number    // end-to-end
    targetTTFTMs: number          // time-to-first-token (prefill SLA)
    targetITLMs: number           // inter-token latency (decode SLA)
    avgInputTokens: number
    avgOutputTokens: number
    peakBurstMultiplier: number   // e.g., 2.5x
    uptimeSla: number             // percent, e.g., 99.9
    streaming: boolean
  }
  constraints: {
    budgetCapex?: number
    budgetOpexMonthly?: number
    powerBudgetKw?: number
    rackUnitsAvailable?: number
    region?: string
    compliance: string[]          // ['HIPAA','SOC2','air-gapped',...]
  }
  hardware: {
    preferredVendor: 'nvidia' | 'amd' | 'either'
    preferredGpu?: string         // e.g., 'H100-80GB'
    preferredServer?: string      // NEW v0.4b: server SKU id from data/servers.json
    cooling: 'air' | 'liquid' | 'either'
    networking: '25G' | '100G' | '400G' | 'infiniband'
  }
  infra: {
    orchestrator: 'kubernetes' | 'ray' | 'slurm' | 'nomad' | 'bare-metal'
    existingCluster: boolean
    airGapped: boolean
    gitops?: 'argocd' | 'flux' | 'none'
    observability: string[]       // ['prometheus','grafana','datadog',...]
  }
  modelPlatform: {
    inferenceServer: 'vllm' | 'tgi' | 'triton' | 'tensorrt-llm' | 'sglang'
    modelRegistry?: 'mlflow' | 'huggingface' | 's3' | 'custom'
    multiModelServing: boolean
    caching?: 'redis' | 'semantic' | 'none'
    abTesting: boolean
    optimizations: {
      speculativeDecoding: boolean
      prefixCaching: boolean
      fp8KvCache: boolean
      chunkedPrefill: boolean     // usually auto-on
      continuousBatching: boolean // usually auto-on
      flashAttention: boolean     // usually auto-on
    }
  }
  application: {
    apiGateway: 'kong' | 'apisix' | 'envoy' | 'cloud-native' | 'none'
    auth: 'oidc' | 'apikey' | 'mtls' | 'jwt' | 'none'
    rateLimiting: boolean
    uiRequired: boolean
    auditLogging: boolean
    metering: boolean             // required for gpuaas/saas patterns
  }
  _skipped: string[]              // NEW v0.4a: fieldIds where "Use default" is enabled
  _source: 'manual' | 'quick-sizing' | 'rfp-import'  // NEW v0.4a: creation source
}

type RfiState = {
  source: 'pasted' | 'uploaded' | 'none'
  rawText: string
  uploadedFilePath?: string
  extracted: {
    requirements: ExtractedRequirement[]
    timelines: { milestone: string; date?: string }[]
    evaluationCriteria: string[]
    mandatoryItems: string[]
  }
  qualification: {
    fitScore: number              // 0-100
    risks: string[]
    strengths: string[]
    winProbability: 'low' | 'medium' | 'high'
    goNoGo?: 'go' | 'no-go' | 'undecided'
  }
  draftResponse?: string          // LLM-drafted, user-editable
}

type ExtractedRequirement = {
  id: string
  text: string
  layer: 'hardware' | 'infra' | 'model-platform' | 'application' | 'general'
  mandatory: boolean
  mapsToDiscoveryField?: string   // e.g., 'discovery.load.concurrentUsers'
}

type BuildState = {
  derived: BuildDerived           // computed from discovery
  overrides: Partial<BuildDerived> // manual user overrides
  final: BuildDerived             // derived with overrides applied
  bom: BomItem[]
  bomOverrides: Record<string, Partial<BomItem>>  // NEW v0.4b: keyed by bom item id
  totals: {
    gpuCount: number
    serverCount: number
    powerKw: number
    rackUnits: number
    capexUsd: number
    opexMonthlyUsd: number
  }
  notes: string[]                 // engine-generated warnings/recommendations
}

type BuildDerived = {
  hardware: {
    gpu: { model: string; count: number; vramPerGpuGb: number }
    server: { model: string; count: number; gpusPerServer: number }
    cpu: { cores: number; memoryGb: number }
    storage: { type: 'nvme' | 'ssd'; capacityTb: number }
    networking: { fabric: string; linksPerNode: number }
  }
  infra: {
    orchestrator: string
    nodePools: { role: string; nodes: number }[]
    loadBalancer: string
    monitoring: string[]
  }
  modelPlatform: {
    server: string
    replicas: number
    tensorParallelism: number
    pipelineParallelism: number
    expertParallelism: number     // 1 for dense models
    kvCacheGb: number
    maxBatchSize: number
    latencyEstimates: {
      ttftMs: number              // prefill
      itlMs: number               // decode per token
      endToEndMs: number          // TTFT + outputTokens * ITL
      prefillTokensPerSec: number
      decodeTokensPerSec: number
    }
    interconnectRecommendation: {
      intraNode: 'nvlink' | 'infinity-fabric' | 'pcie'
      interNode: 'infiniband-400g' | 'infiniband-200g' | 'roce-100g' | 'ethernet-100g' | 'none'
    }
  }
  application: {
    gateway: string
    authMethod: string
    rateLimits: { rps: number; burst: number }
    metering: boolean
  }
}

type BomItem = {
  category: 'gpu' | 'server' | 'network' | 'storage' | 'software' | 'service'
  name: string
  quantity: number
  unitPriceUsd?: number
  totalPriceUsd?: number
  vendor?: string
  notes?: string
}

type ExplainContent = {
  fieldId: string                 // 'discovery.load.concurrentUsers'
  explain: string                 // markdown
  example: string                 // markdown
  customerFriendlyHint?: string   // plain-English for client-facing mode
}

// NEW v0.4b — LLM feature routing
type LlmFeatureId =
  | 'rfp-extract'           // RFI: extract requirements from RFP
  | 'rfi-draft-response'    // RFI: draft response per layer
  | 'explain-field'         // ExplainBox "Ask Claude"
  | 'explain-sizing'        // Build panels "Why this choice?"
  | 'build-report-summary'  // Export: narrative exec summary
  | 'quick-sizing-assist'   // Quick Sizing LLM recommendation
  | 'catalog-extract'       // NEW v0.5: extract structured fields from vendor spec page

type ConfiguredModel = {
  id: string
  label: string
  provider: 'anthropic' | 'openai-compatible'
  providerConfig: {
    apiKey?: string               // stored encrypted; never returned in plaintext
    baseUrl?: string              // openai-compatible only
    model: string                 // e.g. "claude-opus-4-7"
  }
  assignedFeatures: LlmFeatureId[]
  createdAt: string
  updatedAt: string
  isValid?: boolean
  lastValidatedAt?: string
}

// NEW v0.4b — top-level store slice (alongside Project[])
// settings: {
//   configuredModels: ConfiguredModel[]
//   featureRouting: Record<LlmFeatureId, string | null>  // featureId → modelId | null
// }
```

### 5.2 SQLite schema (Drizzle)

```
projects       (id, name, description, customer, created_at, updated_at, data_json)
rfp_uploads    (id, project_id, filename, path, uploaded_at)
explain_custom (id, project_id, field_id, explain, example)
audit_log      (id, project_id, event, payload_json, created_at)

-- NEW v0.4b
configured_models
  (id TEXT PRIMARY KEY,
   label TEXT NOT NULL,
   provider TEXT NOT NULL,                    -- 'anthropic' | 'openai-compatible'
   provider_config_encrypted TEXT NOT NULL,   -- AES-256-GCM encrypted JSON
   assigned_features_json TEXT NOT NULL,      -- JSON array of LlmFeatureId
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL,
   last_validated_at TEXT,
   is_valid INTEGER)                          -- 0/1/null

settings_kv
  (key TEXT PRIMARY KEY,
   value_json TEXT NOT NULL,
   updated_at TEXT NOT NULL)

-- NEW v0.5
servers
  (id TEXT PRIMARY KEY, vendor TEXT, model TEXT, cpu TEXT, memory_gb REAL,
   storage TEXT, network TEXT, tdp_watts INTEGER, rack_units INTEGER,
   release_year INTEGER, spec_sheet_url TEXT, notes TEXT,
   is_deprecated INTEGER DEFAULT 0,
   origin TEXT NOT NULL,             -- 'seed' | 'seed-edited' | 'user'
   created_at TEXT NOT NULL, updated_at TEXT NOT NULL)

server_gpu_configs
  (id TEXT PRIMARY KEY, server_id TEXT NOT NULL REFERENCES servers(id),
   gpu_id TEXT NOT NULL,             -- references gpus.id (loose; allows deprecated GPUs)
   gpu_count INTEGER NOT NULL, interconnect TEXT,
   list_price_usd REAL, is_default INTEGER DEFAULT 0)

gpus
  (id TEXT PRIMARY KEY, vendor TEXT, family TEXT, model TEXT,
   vram_gb REAL, memory_type TEXT, memory_bandwidth_gbps REAL,
   fp16_tflops REAL, bf16_tflops REAL, fp8_tflops REAL,
   int8_tops REAL, int4_tops REAL, tdp_watts INTEGER,
   interconnect_json TEXT,           -- nested obj as JSON
   supported_features_json TEXT,     -- string[]
   list_price_usd REAL, availability TEXT, notes TEXT, sources_json TEXT,
   origin TEXT NOT NULL,
   created_at TEXT NOT NULL, updated_at TEXT NOT NULL)

llm_models
  (id TEXT PRIMARY KEY, family TEXT, name TEXT,
   params_b REAL, architecture TEXT, active_params_b REAL,
   layers INTEGER, hidden_size INTEGER, num_kv_heads INTEGER, head_dim INTEGER,
   context_length_max INTEGER, quantizations_supported_json TEXT,
   release_date TEXT, huggingface_id TEXT, notes TEXT,
   is_deprecated INTEGER DEFAULT 0,
   origin TEXT NOT NULL,
   created_at TEXT NOT NULL, updated_at TEXT NOT NULL)

workload_references
  (id TEXT PRIMARY KEY, label TEXT, url TEXT, description TEXT,
   sort_order INTEGER, is_deprecated INTEGER DEFAULT 0,
   origin TEXT NOT NULL,
   created_at TEXT NOT NULL, updated_at TEXT NOT NULL)
```

`description` is nullable text (free-form project description / notes).

We serialize the full project state to `data_json` for simplicity in v1. If performance degrades, normalize later.

---

## 6. Feature Specifications

### 6.0 Navigation & Layout Model

The application uses a persistent **two-level left navigation sidebar** modeled on Claude.ai's layout.

#### 6.0.1 Sidebar structure

```
┌─────────────────────────┐
│  [Logo / ML Sizer]      │  ← header; clicking routes to /
│  🌙 / ☀️ Theme toggle   │  ← position 2 (moved from bottom)
│                         │
│  [+ New Project]        │  ← primary CTA
│  [+ Quick Sizing]       │  ← NEW v0.4a
│                         │
│  🏠  All Projects        │  ← global nav
│  📖  How it works        │  ← onboarding page
│  ⚙   Settings           │  ← NEW v0.4a placeholder (Settings page in v0.4b)
│                         │
│  ─── Current project ── │  ← visible only when inside /project/[id]
│  <project name>         │
│    Discovery            │
│    RFI                  │
│    Build                │
│    Export               │
│                         │
│  (flex spacer)          │
│                         │
│  ⟨ Collapse ⟩           │  ← pinned bottom (theme toggle moved to top)
└─────────────────────────┘
```

#### 6.0.x ML Sizer home link

Clicking "ML Sizer" in the sidebar header routes to `/`. Applies to both expanded and collapsed states (collapsed logo still clickable; `aria-label="Home"`). Keyboard focusable.

#### 6.0.z Version display

In the footer area of the sidebar (above or near the collapse toggle), render the running app version:

- **Expanded sidebar:** small text `v1.2.3` — on hover, tooltip shows full info (`v1.2.3 · build a3f2c81 · built 2026-04-25`)
- **Collapsed sidebar:** tooltip only on hover (no visible label when collapsed)

**Source of truth:**
- `package.json` `version` field (read at build time)
- Git short SHA injected at build time as `NEXT_PUBLIC_BUILD_SHA`
- Build date injected at build time as `NEXT_PUBLIC_BUILD_DATE`

**Build pipeline:** `bin/release.sh` passes `--build-arg BUILD_SHA` and `--build-arg BUILD_DATE`; Dockerfile exposes them as `ENV NEXT_PUBLIC_*` so they're embedded in the runtime image.

**Acceptance criteria:**
- [ ] Version visible in sidebar footer when expanded
- [ ] Tooltip shows full build info on hover
- [ ] Reflects the actually-running build (changes after each release)

#### 6.0.2 Collapse behavior

- Sidebar has two states: **expanded (240px)** and **collapsed (60px, icon-only)**
- User toggle button at bottom of sidebar
- State persists in `localStorage` key `ml-sizer:sidebar-collapsed`
- When collapsed, menu items show icon only with tooltip on hover
- Current project section collapses to icon + dot indicator

#### 6.0.3 Main content area

- Centered with max-width (`max-w-6xl`) and horizontal auto-margin
- Left-aligned at widths below `1280px` to avoid excessive margin
- Consistent `px-8 py-8` padding
- Breadcrumb at top when inside a project: `All Projects / <project name> / <section>`

#### 6.0.4 Project view sub-navigation

When inside a project, the Discovery/RFI/Build/Export sections are selected via the **left sidebar** (replaces the previous top-of-page tab bar). Inside Discovery, the layer sub-tabs (Workload, Hardware, Infra, Model Platform, Application) remain in the **content area** as horizontal tabs — they are section-internal, not application-level.

#### 6.0.5 Theme toggle

- Icon shows the *destination* state: moon icon in light mode (click → dark), sun icon in dark mode (click → light)
- System-preference option available via dropdown menu on icon long-press or secondary button (deferred — v1 is just light/dark cycle)

#### 6.0.6 Acceptance criteria

- [ ] Sidebar renders on every page at every breakpoint ≥ 1024px wide
- [ ] Collapse state persists across sessions
- [ ] "Current project" section appears only when inside a project
- [ ] Theme toggle flips icon to destination state
- [ ] Breadcrumbs navigate correctly
- [ ] Keyboard navigable (tab through sidebar items, enter to activate)

#### 6.0.7 Landing / Projects page (merged)

**Route:** `/` (root)

**Layout:**
- Left sidebar per §6.0.1 (collapsed or expanded)
- Main content:
  - Page header: "Projects" title + project count
  - Search + filter bar
  - Projects list (rectangular cards, stacked, sorted by modified date descending)

**Search + filter bar:**
- Free-text search across name and customer
- Filter dropdowns: workload type (inference/fine-tune/training — only inference enabled in v1), modified date range (last 7d / 30d / 90d / all time)
- "Clear filters" button visible when any filter is active
- Filter state preserved in URL query params for shareable links

**Project card:**
- Project name (large)
- Customer (subtle)
- Modified date/time in user's timezone with relative formatting ("2 hours ago", "Yesterday", "3 days ago", "Apr 15")
- Deployment pattern pill (e.g., "internal-inference")
- Delete icon (trash) on the right
  - Clicking opens a confirmation dialog: "Delete project '<name>'? This cannot be undone."
  - Requires explicit confirmation click (no typing-to-confirm for v1)
- Entire card clickable to navigate to project
- Hover state: subtle background lift

**Empty state:**
- If zero projects: "No projects yet. Create your first one to get started." + prominent "+ New Project" button
- If filters return zero: "No projects match these filters. Clear filters to see all."

**Acceptance criteria:**
- [ ] Search and filters work live (< 200ms response)
- [ ] Filter state encoded in URL (`?q=...&workload=inference&modified=30d`)
- [ ] Delete confirmation dialog shown before actual delete
- [ ] Timezone display correct for user locale
- [ ] Empty states render correctly
- [ ] Sorted by `updated_at DESC` by default

#### 6.0.8 Onboarding page (`/onboarding`)

**Route:** `/onboarding`

**Purpose:** Dedicated space for new users to understand each phase.

**Content structure:**
- Hero: "How this tool works" + 2-sentence summary
- Four sections (one per phase), each with:
  - Phase name (Discovery / RFI / Build / Export)
  - 2-paragraph explanation
  - Screenshot or diagram (placeholder boxes in v1; real screenshots added later)
  - Link: "Start by creating a project"
- Closing: "Ready? [+ Create your first project]"

**Linked from:**
- Left sidebar ("📖 How it works")
- First-run banner on empty-state landing page (dismissible; banner state in `localStorage`)
- Footer of every page (small link)

**Acceptance criteria:**
- [ ] Page renders at `/onboarding`
- [ ] Linked from sidebar and first-run banner
- [ ] Readable on mobile widths (even though app itself is not mobile-optimized for v1)

---

### 6.1 Discovery section

**Structure:** Horizontal tabs at the top of the Discovery page content (Workload / Hardware / Infra / Model Platform / Application). Left sidebar shows the section selector (Discovery/RFI/Build/Export); Discovery tabs are content-internal.

**Behavior:**
- Every input writes to Zustand store on change (debounced 300ms) → autosaves to SQLite
- A **"Saved · Xs ago"** indicator appears top-right of the Discovery content area
  - Shows "Saving…" during the debounce window
  - Shows "Saved · Xs ago" within 1s of successful persist
  - Turns to "Unsaved changes" if DB write fails; offers retry
- Changes immediately propagate to Build section (which auto-recomputes)
- Required fields flagged with red-border state when blurred-empty; banner at top of tab lists missing fields
- **"Import from RFP"** button pulls extracted values from RFI state (per §6.2)
- **No explicit Save button.** Autosave is authoritative.

**Acceptance criteria:**
- [ ] All fields in `DiscoveryState` are captured via forms
- [ ] Changing any field updates store within 300ms
- [ ] `<ExplainBox>` renders for every field with defined content
- [ ] "Saved · Xs ago" indicator present and accurate
- [ ] No user-visible Save button in Discovery
- [ ] Required-field banner appears when minimum set incomplete
- [ ] Values persist across browser refresh

#### 6.1.x Required fields + Skip toggle

Fields are classified into three categories:
- **Required** — must have a value before Build is accessible
- **Skippable required** — required by default, but has a sensible engine default; user can toggle "Use default" to skip entering
- **Optional** — no constraint; blank means "not specified"

Classification table:

| Field | Class | Default if skipped |
|---|---|---|
| `model.name` | Required | — |
| `model.params` | Required | — |
| `model.quantization` | Required | — |
| `model.contextLength` | Skippable | 8192 |
| `load.concurrentUsers` | Required | — |
| `load.avgInputTokens` | Skippable | 2000 |
| `load.avgOutputTokens` | Skippable | 500 |
| `load.targetLatencyP95Ms` | Skippable | 10000 |
| `load.targetTTFTMs` | Skippable | 1000 |
| `load.targetITLMs` | Skippable | 40 |
| `load.peakBurstMultiplier` | Skippable | 2.0 |
| `load.uptimeSla` | Optional | — |
| `load.streaming` | Optional (default false) | — |
| `constraints.*` | Optional | — |
| `hardware.preferredVendor` | Skippable | 'either' |
| `hardware.preferredGpu` | Optional (auto-select if blank) | — |
| `hardware.networking` | Skippable | '100g' |
| `hardware.cooling` | Skippable | 'either' |
| `infra.orchestrator` | Skippable | 'kubernetes' |
| `infra.airGapped` | Skippable | false |
| `modelPlatform.inferenceServer` | Skippable | 'vllm' |
| `modelPlatform.optimizations.*` | Optional | engine-sensible defaults |
| `application.apiGateway` | Skippable | 'cloud-native' |
| `application.auth` | Skippable | 'apikey' |

Note: `hardware.preferredServer` deferred to v0.4b (Phase 12).

UI rendering:
- **Required** fields: red asterisk
- **Skippable** fields: small "Use default: \<value\>" toggle; when on, input disabled and default used at sizing time
- **Optional** fields: unmarked

Defaults live in `lib/discovery/defaults.ts` — single source of truth.

#### 6.1.y Progress gating

Build section is usable when all **Required** fields have values AND all **Skippable required** fields either have values OR have "Use default" enabled. Optional fields never block.

Top-of-Discovery banner:
- 🔴 "Missing required fields: \<list\>" (incomplete)
- 🟡 "Ready to size — N defaults in use" (with "Review defaults" link)
- 🟢 "All fields filled" (no skips)

#### 6.1.z Workload tab — reference URLs

At the top of the Workload sub-tab, render a "Model References" block: a horizontal flex row of small button-like links pointing to up-to-date model directories.

**Default references (shipped in seed):**
- Hugging Face Open LLM Leaderboard
- LMSYS Chatbot Arena
- Vendor pages for major model families (Meta Llama, Mistral, Qwen, DeepSeek)

**Configuration:**
- URLs stored in `data/seed/workload-references.seed.json` using the same hybrid seed + DB pattern as catalogs (§8.6.1)
- Editable in `/settings/catalogs/workload-references`
- Per-project overrides deferred to v0.6+

**Rendering:** horizontal flex row, wraps on small screens. Each entry: short label + small external link icon. Tooltip on hover with full description. Empty block hidden when no active references.

**Acceptance criteria:**
- [ ] References block visible at top of Workload tab
- [ ] Each link opens in a new tab
- [ ] References editable via Settings

### 6.2 RFI section

**Structure:**
1. Input: paste text or upload file (PDF/Word/Text)
2. Extract: LLM parses requirements, timelines, criteria
3. Map: extracted requirements mapped to Discovery fields
4. Qualify: fit score, risks, strengths, go/no-go
5. Draft: optional LLM-drafted response sections per layer

**Behavior:**
- Extraction is an async LLM call; show progress state.
- User can edit any extracted item before mapping.
- "Apply to Discovery" button populates Discovery with mapped values.
- Qualification is computed deterministically from extracted requirements + Discovery completeness + constraints.

#### 6.2.x Apply flow (explicit user action required)

The app does **not** automatically populate Discovery from RFP extraction. User must explicitly apply.

Each extracted requirement has:
- **Apply** button → maps this one requirement to its Discovery field; Discovery updates immediately
- Status pill: **Unapplied** / **Applied** / **Conflict** (if Discovery already has a non-matching value)
- Conflict resolution dialog on Apply: "Discovery already has X; overwrite with Y?"

Bulk **"Apply All Unapplied"** button at top of requirements list.

**Acceptance criteria:**
- [ ] Can paste RFP text and get structured extraction
- [ ] Can upload PDF/DOCX and get structured extraction
- [ ] Each extracted requirement links to relevant Discovery field
- [ ] "Apply to Discovery" updates store without data loss for untouched fields
- [ ] Qualification score updates reactively as Discovery/RFI changes

#### 6.2.y Extraction uses assigned model (v0.4b)

RFP extraction (paste and upload) calls `getLlmProviderForFeature('rfp-extract')`. If the feature has no model assigned, the Extract button is disabled with tooltip: "Configure a model for RFP extraction in Settings."

Same pattern applies to draft response: `getLlmProviderForFeature('rfi-draft-response')`.

### 6.3 Build section

**Structure:** Four panels, one per layer, each showing:
- Derived sizing (read-only, auto-computed)
- Override fields (optional manual adjustments)
- Engine notes (warnings, alternative options, cost implications)

Plus a top-level summary: total GPUs, servers, power, rack units, capex, monthly opex.

**Behavior:**
- Re-computes whenever Discovery changes.
- Shows a "Comparison" view: NVIDIA solution vs AMD solution side-by-side when vendor preference is "either".
- Shows rack layout diagram (simple, auto-generated).
- Shows architecture diagram (layered boxes, auto-generated).

**Acceptance criteria:**
- [ ] Build auto-updates within 1s of any Discovery change
- [ ] NVIDIA vs AMD comparison renders when vendor = "either"
- [ ] Manual overrides persist and clearly marked vs derived values
- [ ] Engine notes surface at least: tensor parallelism strategy, KV cache sizing, replica count reasoning
- [ ] Total cost calculation matches BoM sum

### 6.4 Export section

**Outputs:**
1. **Proposal PDF** — executive summary + per-layer sizing + BoM + assumptions (existing)
2. **Proposal Word doc** — same content, editable (existing)
3. **JSON BoM** — machine-readable bill of materials (existing)
4. **Build Report PDF** — NEW: detailed build-only report with same sub-sections as the Build page (Hardware, Infra, Model Platform, Application, Summary Totals, Engine Notes). For internal review and architecture handoff.
5. **Build Report Markdown** — NEW: same content as Build Report PDF, but in `.md` format for wikis/docs/PRs.

**Build Report spec:**
- Cover page: project name, customer, date, deployment pattern
- Table of contents
- Section per layer (Hardware / Infra / Model Platform / Application) with:
  - Derived values (from sizing engine)
  - Overrides (if any), clearly marked
  - Engine notes for that layer
- Summary totals page
- Assumptions page: MFU, MBU, overhead factors, optimization settings active
- BoM table (copy of JSON BoM rendered as table)
- No executive summary or customer-facing framing (that's the Proposal)

**Acceptance criteria:**
- [ ] All 5 export formats available from the Export page
- [ ] Build Report PDF renders with ToC, all sections, assumptions
- [ ] Build Report MD is valid, renders in GitHub/GitLab preview
- [ ] Exports reflect current store state (no stale data)
- [ ] Export files named: `<project-name>-<export-type>-<YYYY-MM-DD>.<ext>`

#### 6.4.x BoM override UI (v0.4b)

In the Build page → BoM table, each line item has:
- **Editable `unitPriceUsd` input** inline; changes saved to `build.bomOverrides[itemId].unitPriceUsd`
- **"Swap item" dropdown** listing alternative catalog items in the same `category`; saves full replacement item fields to `build.bomOverrides[itemId]`
- **Override indicator** ("✎" icon + distinct background) when any override is active on that line
- **"Reset to catalog" link** per overridden line (reverts to catalog value)

#### 6.4.y Exports reflect overrides (v0.4b)

All five export outputs (Proposal PDF, Proposal Word, JSON BoM, Build Report PDF, Build Report MD) must:
- Render overridden values, not catalog defaults
- Include note in BoM table header when any override is active: "Prices/items overridden from catalog"

### 6.5 Explain & Example component

**`<ExplainBox fieldId="..." mode="compact|expanded" />`**

- Icon/button next to every field. Click/hover reveals panel with tabs: **Explain** / **Example** / **Ask Claude**.
- Content loaded from `/data/explain/{fieldId}.json` (one file per field or grouped).
- **Ask Claude** tab: sends field context + current Discovery state to LLM, returns a customer-tailored plain-English explanation. Editable by user before saving to `explainOverrides`.
- Content schema:

```json
{
  "fieldId": "discovery.load.concurrentUsers",
  "title": "Concurrent Users",
  "explain": "The number of users expected to make inference requests at the same moment. Unlike total users, this is the peak simultaneous load — the number that drives GPU count and replica count.",
  "example": "A 500-person company rolling out an internal chatbot might have 5,000 total users but only 50 concurrent at peak (lunchtime, Monday morning). A customer-facing API might see 500 concurrent at peak from a much larger user base.",
  "customerFriendlyHint": "Think of the busiest moment. How many people would be waiting for an answer at the same time?"
}
```

**Acceptance criteria:**
- [ ] Every Discovery field has an ExplainBox with defined content
- [ ] Content can be edited via a simple JSON file without code changes
- [ ] "Ask Claude" produces context-aware explanations within 5s
- [ ] Custom explanations persist per-project in SQLite

#### 6.5.x Maximize / popup view

ExplainBox header gets a new icon button: **"⛶" (maximize)**. Clicking it opens a centered modal with the full Explain + Example + Ask AI content at full width. Modal behavior:
- Close button ("×") top-right
- Esc key closes
- Click outside closes
- Body scroll-lock while open
- All ExplainBox functionality (tabs, "Ask AI") works the same inside the modal
- On phone: full-screen takeover per responsive design spec (§`docs/responsive-design.md` §3.5)

**Acceptance criteria:**
- [ ] Maximize icon present on every ExplainBox
- [ ] Modal: `max-w-2xl`, `max-h-[80vh]`, scrollable body
- [ ] Close via button, Esc, and outside-click all work
- [ ] Tabs and "Ask AI" function inside modal
- [ ] "Ask AI" inside modal respects `getLlmProviderForFeature('explain-field')` (parity with P8.20 fix)

### 6.6 Quick Sizing Mode

Accessible from sidebar ("+ Quick Sizing") or empty landing page state.

#### 6.6.1 Purpose
Fast project creation for demos, discovery-call starters, or rough-order-of-magnitude sizing. User answers 5 questions, app fills the rest with defaults. LLM-based model recommendation is a stub in v0.4a (rule-based only); activated in v0.4b.

#### 6.6.2 Flow

Step 1 — **Objective** (free-text): "What are you trying to do?"
Step 2 — **Model choice**: "I know the model" (fuzzy match against `data/models.json`) or "Let the app recommend" (rule-based v0.4a, LLM-assisted v0.4b)
Step 3 — **Scale**: concurrent users (number input + slider)
Step 4 — **Latency sensitivity**: Real-time chat (< 5s) / Responsive (< 15s) / Batch / no preference
Step 5 — **Deployment**: pattern (internal/external-api/gpuaas/saas) + target (on-prem/cloud/either)

#### 6.6.3 Output

On submit:
1. Create a new project
2. Determine candidate models:
   - If user picked a specific model → use it
   - If user chose "Let the app recommend":
     - If `quick-sizing-assist` feature has a configured model → call LLM with objective + scale + latency + deployment → get 1–3 candidates with rationale
     - Otherwise → fall back to rule-based recommender (v0.4a)
3. Apply model metadata to `discovery.model`
4. Apply defaults from `lib/discovery/defaults.ts` to all other fields; mark them in `_skipped`
5. Set `_source = 'quick-sizing'`
6. Navigate to Discovery with banner: "Quick Sizing applied with N defaults. Review defaults."

#### 6.6.4 Rule-based recommender (v0.4a)

Lives in `lib/quick-sizing/recommender.ts`. Pure function. Returns up to 3 candidates from `data/models.json` with plain-English rationale.

- < 50 concurrent + responsive/batch → 7B–13B class candidates
- 50–500 concurrent → 7B–70B based on latency sensitivity
- 500+ concurrent → smaller models favored, multi-replica
- Real-time latency → favor smaller models + stronger quantization

#### 6.6.5 LLM-assist recommender (v0.4b)

Lives in `lib/llm/prompts/quick-sizing.ts` with `PROMPT_VERSION`. Takes structured input (objective free-text, scale, latency, deployment) and returns JSON of up to 3 candidates with rationale. Uses the `quick-sizing-assist` feature's assigned model.

On LLM failure (rate limit, parse error, no response): silently fall back to rule-based. User experience is consistent regardless of path.

#### 6.6.6 Acceptance criteria
- [ ] Completes in < 60s end-to-end
- [ ] Works without any LLM configured (rule-based path)
- [ ] Every applied default traceable ("review defaults" banner links to list)
- [ ] Resulting project is a normal project (editable, deletable, exportable)
- [ ] LLM-assist active when `quick-sizing-assist` feature is assigned; falls back silently otherwise

---

## 7. Sizing Engine Specification

### 7.1 Core formulas (v1, inference)

Inference sizing is not a single calculation — it is the combination of **memory footprint**, **prefill phase**, **decode phase**, and **sharding strategy**. Each affects hardware choice differently.

#### 7.1.1 Memory footprint

**Model memory:**
```
bytes_per_param = {FP32:4, FP16:2, BF16:2, FP8:1, INT8:1, INT4:0.5}
vram_model_gb   = (params_billions * 1e9 * bytes_per_param) / 1e9
```

**KV cache per request:**
```
kv_cache_per_token_bytes = 2 * num_layers * hidden_size * bytes_per_param_kv
                           # bytes_per_param_kv may be lower if FP8 KV cache optimization is on
kv_cache_per_request_gb  = (kv_cache_per_token_bytes * context_length) / 1e9
```

**Total VRAM:**
```
vram_kv_total = kv_cache_per_request_gb * max_concurrent_in_flight
vram_overhead = 0.15 * (vram_model + vram_kv_total)  // activations, fragmentation
vram_total    = vram_model + vram_kv_total + vram_overhead
```

#### 7.1.2 Prefill phase (compute-bound)

Prefill processes the entire input prompt in one forward pass. It is **dominated by FLOPS** and determines **Time-To-First-Token (TTFT)**.

```
prefill_flops      = 2 * params * input_tokens
                     # 2 FLOPs per param per token for a forward pass (matmul-dominated)
mfu                = 0.3 to 0.5       # Model FLOPs Utilization, hardware-dependent
prefill_time_sec   = prefill_flops / (gpu_fp16_tflops * 1e12 * mfu * num_gpus_tp)
TTFT_ms            = (prefill_time_sec * 1000) + queueing_delay_ms
prefill_throughput = input_tokens / prefill_time_sec    # tokens/sec
```

Notes:
- If quantization is FP8, use `gpu_fp8_tflops` and adjust MFU downward slightly (~0.9x).
- Long contexts amplify prefill cost linearly. Chunked prefill spreads the cost over time to smooth latency.
- TTFT is the most customer-visible latency metric for chatbots.

#### 7.1.3 Decode phase (memory-bandwidth-bound)

Decode generates output tokens one at a time. Each token requires reading the full model weights **plus the full KV cache** from HBM. It is **dominated by memory bandwidth**, not FLOPS.

```
mbu                = 0.6 to 0.8       # Memory Bandwidth Utilization
bytes_per_tok_read = (params * bytes_per_param) + kv_cache_bytes_in_context
decode_time_per_tok_sec = bytes_per_tok_read /
                          (gpu_memory_bandwidth_Bps * mbu * num_gpus_tp)
ITL_ms             = decode_time_per_tok_sec * 1000   # Inter-Token Latency
decode_throughput  = 1 / decode_time_per_tok_sec      # tokens/sec per request
end_to_end_ms      = TTFT_ms + (output_tokens * ITL_ms)
```

**Why this matters for GPU selection:**
- Decode throughput scales with **memory bandwidth**, not just FLOPS.
- Example: MI300X (5.3 TB/s) and H200 (4.8 TB/s) decode noticeably faster than H100 (3.35 TB/s) at the same quantization — often more than the FLOPS comparison would suggest.
- A GPU choice optimal for prefill may be suboptimal for decode. The engine evaluates both.

**Batching changes the math:**
- Continuous batching amortizes weight reads across requests in the batch. As batch size grows, decode becomes more compute-bound and less bandwidth-bound.
- Effective decode throughput per replica = `sum(decode_throughput of all in-flight requests)` up to saturation.

#### 7.1.4 Model sharding (TP / PP / EP)

When a model does not fit on one GPU — or when lower latency requires splitting it — the engine chooses a sharding strategy.

**Three strategies:**

| Strategy | How it splits | Latency impact | Interconnect need | Scope |
|---|---|---|---|---|
| **Tensor Parallelism (TP)** | Each weight matrix split across GPUs | Low — all GPUs work on same token | Very high (NVLink / Infinity Fabric) | Intra-node only, practical limit = GPUs per node (typ. 8) |
| **Pipeline Parallelism (PP)** | Layers split into stages across GPU groups | Higher (pipeline bubble) | Moderate (InfiniBand / RoCE OK) | Inter-node capable |
| **Expert Parallelism (EP)** | Experts distributed (MoE only) | Routing-dependent | High during token routing | Intra + inter-node, usually combined with TP |

**Decision logic (auto-selected, user-overridable):**

```
1. Let min_gpus = ceil(vram_total / gpu_vram)
2. If min_gpus == 1:
     TP = 1, PP = 1, EP = 1
     No sharding needed.
3. If min_gpus <= gpus_per_node (typically 8):
     TP = min_gpus, PP = 1
     Required: NVLink / Infinity Fabric intra-node
4. If min_gpus > gpus_per_node:
     TP = gpus_per_node              # saturate intra-node NVLink
     PP = ceil(min_gpus / gpus_per_node)
     Required: high-bandwidth inter-node fabric (InfiniBand 400G or RoCE 100G+)
5. If model is MoE and active_params < total_params:
     Consider EP for experts + TP for shared layers
     Flag as advanced config; recommend vLLM or SGLang
```

**Sharding overhead penalties** (applied to throughput):

```
tp_overhead_factor = 1 - (0.08 * log2(TP))      # ~8% per doubling of TP
pp_overhead_factor = 1 - (0.05 * (PP - 1))      # ~5% per pipeline stage beyond 1
effective_throughput = base_throughput * tp_overhead_factor * pp_overhead_factor
```

These are conservative defaults from published benchmarks; engine notes flag them as estimates.

**Build outputs include a sharding reasoning note**, e.g.:
> "Llama-70B in FP16 (140 GB) exceeds single H100 (80 GB). Chose TP=2 within one node over NVLink. 2 GPUs per replica × 4 replicas = 8 H100s total. Inter-node fabric not required."

#### 7.1.5 Capacity: replicas and totals

**Replicas from throughput:**
```
required_tokens_per_sec = concurrent_users * (avg_output_tokens / target_end_to_end_sec)
replicas                = ceil(required_tokens_per_sec /
                               (decode_throughput_per_replica * effective_batch_size))
                          * peak_burst_multiplier
```

**Total GPU count:**
```
gpus_per_replica = TP * PP * EP
total_gpus       = gpus_per_replica * replicas
```

**Server/node count:**
```
gpus_per_server = server_catalog[chosen_server].max_gpus
servers         = ceil(total_gpus / gpus_per_server)
```

### 7.2 Reference sources

All formulas cite these at the source code level:

- **NVIDIA Inference Sizing Guide** & NIM documentation
- **Hugging Face — "LLM Inference in Production"** guide
- **vLLM** documentation (PagedAttention, memory accounting)
- **AMD ROCm / Instinct** deployment guides (for MI300X, MI325X)
- Cloud provider instance specs (AWS EC2, Azure ND, GCP A3) — secondary, on-prem-primary context
- **MLPerf Inference** published results for throughput lookups

Throughput lookup table (`data/throughput.json`) is curated from published benchmarks. Entries include `(gpu, model_family, model_size, quantization, batch_size) → tokens_per_sec`. Gaps filled with conservative estimates and flagged.

### 7.3 Deployment-pattern adjustments

Sizing multipliers applied after base calculation:

| Pattern | Adjustment |
|---|---|
| `internal-inference` | Base sizing, standard monitoring |
| `external-api` | +20% headroom, API gateway sized for rps, DDoS considerations |
| `gpuaas-multi-tenant` | +30% headroom, MIG/MPS partitioning, per-tenant quotas, metering layer required |
| `saas-product` | +25% headroom, full app stack (auth, billing, UI), multi-region consideration flagged |

### 7.4 GPU catalog (v1)

```
NVIDIA: H100-80GB, H100-SXM, H200-141GB, B200-192GB, A100-40GB, A100-80GB, L40S-48GB
AMD:    MI300X-192GB, MI325X-256GB
```

Each entry: `{ vram_gb, fp16_tflops, fp8_tflops, memory_bandwidth_gbps, tdp_watts, interconnect, list_price_usd }`.

### 7.5 Server catalog (v1, on-prem)

```
Dell PowerEdge XE9680 (8x H100/H200/MI300X)
HPE Cray XD670 (8x H100/H200)
Supermicro AS-8125GS-TNMR2 (8x MI300X)
NVIDIA DGX H100 / DGX H200
NVIDIA HGX B200 reference systems
```

Cloud instance catalog (secondary) includes AWS p5, Azure ND H100 v5, GCP A3.

### 7.6 Inference optimizations

Beyond raw sizing, several well-known optimizations materially affect the numbers. The engine models these as either **assumed on** (modern defaults) or **user opt-in** (toggled in Discovery → Model Platform → optimizations). Each optimization's effect is applied deterministically to the base formulas above.

| Optimization | Sizing effect | Default | Formula impact |
|---|---|---|---|
| **Quantization** (FP16 → FP8 / INT8 / INT4) | Reduces `bytes_per_param` → less VRAM, potentially higher throughput | User choice (model-level) | Changes `vram_model_gb` and decode `bytes_per_tok_read` |
| **KV cache quantization (FP8)** | ~2× effective KV cache capacity → supports larger batch or longer context | Off, user opt-in | `bytes_per_param_kv = 1` instead of 2 |
| **Continuous batching** | Higher GPU utilization, better throughput under load | Assumed on (vLLM/TGI default) | Raises `effective_batch_size` |
| **PagedAttention** | Reduces KV cache fragmentation ~2–3× | Assumed on with vLLM | Raises effective concurrent requests per VRAM budget |
| **Speculative decoding** | 1.5–3× decode throughput at cost of a small draft model | Off, user opt-in | Multiplies `decode_throughput` by 1.5–3.0 (conservative: 1.8) |
| **Prefix caching** | Reduces prefill for repeated/shared prompts | Off, user opt-in | Reduces effective `input_tokens` for TTFT (e.g., −60% for RAG with shared system prompt) |
| **Chunked prefill** | Smooths TTFT under high load, avoids head-of-line blocking | Assumed on | Does not change base throughput; affects P95 TTFT |
| **FlashAttention-3** | ~20% attention speedup, reduced activation memory | Assumed on for H100/H200/B200 | Improves `mfu` by ~0.05 |

**Interactions flagged by the engine:**
- FP8 KV cache + speculative decoding compound well — tool surfaces this combo.
- Prefix caching is especially valuable for RAG / shared-system-prompt workloads; if Discovery indicates RAG, tool recommends enabling it.
- Speculative decoding requires a draft model — tool notes additional ~10% VRAM overhead.

**Engine note output example:**
> "With FP8 KV cache enabled, the 70B model at 32k context supports ~2x the concurrent requests per H200. Combined with speculative decoding (est. 1.8x decode throughput), total replica count drops from 6 → 3. Net savings: ~16 GPUs."

### 7.7 Worked example (Llama 3.1 70B, FP16 inference)

To illustrate the full flow:

**Inputs (Discovery):**
- Model: Llama 3.1 70B (dense), 80 layers, hidden 8192, FP16
- Context length: 8192, avg input 2000 tokens, avg output 500 tokens
- Concurrent users: 50, target end-to-end 8s, target TTFT 500ms
- Preferred GPU: H100-80GB, preferred vendor either
- Burst multiplier 2.0

**Memory (§7.1.1):**
- `vram_model = 70 × 2 = 140 GB`
- `kv_cache_per_request ≈ 2 × 80 × 8192 × 2 × 8192 / 1e9 ≈ 21.5 GB`
- With 50 concurrent requests but PagedAttention, effective KV ≈ 30 GB
- `vram_total ≈ 140 + 30 + 25 (overhead) = 195 GB`

**Sharding (§7.1.4):**
- 195 GB > 80 GB → min_gpus = 3, round to TP = 4 within node (NVLink)
- PP = 1 (fits in one node)
- `gpus_per_replica = 4`

**Prefill (§7.1.2):**
- `prefill_flops = 2 × 70e9 × 2000 = 2.8e14 FLOPs`
- H100 FP16 ≈ 989 TFLOPS; with TP=4, MFU 0.4 → effective 1582 TFLOPS
- `prefill_time ≈ 2.8e14 / 1.582e15 = 0.177s → TTFT ≈ 180ms` ✓ meets 500ms target

**Decode (§7.1.3):**
- H100 bandwidth 3.35 TB/s; with TP=4, MBU 0.7 → 9.38 TB/s effective
- `bytes_per_tok ≈ 140 GB + ~20 GB KV = 160 GB`
- `ITL ≈ 160 / 9380 = 17 ms/token`
- `end_to_end = 180 + 500 × 17 = 8680 ms` → just over 8s target

**Optimization sweep (§7.6):**
- Enable FP8 KV cache + speculative decoding (1.8x) → effective ITL ≈ 9.5 ms
- New end-to-end: `180 + 500 × 9.5 = 4930 ms` ✓ comfortable

**Replicas (§7.1.5):**
- Tokens/sec needed: `50 × (500 / 8) = 3125 tok/s`
- Per-replica decode throughput (with optimizations + batching): ~800 tok/s
- `replicas = ceil(3125 / 800) × 2.0 = 8`

**Totals:**
- `total_gpus = 4 × 8 = 32 H100s`
- `servers = ceil(32 / 8) = 4` servers (e.g., Dell XE9680)
- Engine note: "Consider H200 or MI300X — higher bandwidth would reduce ITL further and potentially save 1 replica."

This worked example will live in `docs/sizing-math.md` alongside formula derivations.

---

## 8. LLM Provider Abstraction

### 8.1 Interface

```ts
interface LlmProvider {
  name: string
  complete(opts: {
    system?: string
    messages: { role: 'user' | 'assistant'; content: string }[]
    maxTokens?: number
    temperature?: number
    json?: boolean
  }): Promise<{ text: string; usage?: { inputTokens: number; outputTokens: number } }>
}
```

### 8.2 Implementations
- `AnthropicProvider` — uses official SDK
- `OpenAiCompatibleProvider` — configurable base URL + API key; covers Gemma (via vLLM/TGI endpoints), Kimi, Nemotron, local Ollama, etc.

### 8.3 Configuration (env vars)
```
LLM_PROVIDER=anthropic           # or 'openai-compatible'
ANTHROPIC_API_KEY=...
OPENAI_COMPATIBLE_BASE_URL=...
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_MODEL=...
```

### 8.4 Use cases for LLM in v1
1. RFP extraction (structured output)
2. "Ask Claude" in ExplainBox (customer-tailored explanations)
3. Draft RFI response sections
4. Explain sizing decisions ("why 4 H100s and not 2?")

### 8.5 LLM Settings & Multi-Model Routing (v0.4b)

Replaces the single-provider `.env` assumption. Multiple models are configurable simultaneously, each assigned to specific features.

#### 8.5.1 Configured models

See `ConfiguredModel` type in §5.1. Stored in `configured_models` table (§5.2) with API keys encrypted via AES-256-GCM (`MODEL_STORE_SECRET` env var).

#### 8.5.2 LLM features (routable)

Six features can be routed to a configured model (see `LlmFeatureId` in §5.1): `rfp-extract`, `rfi-draft-response`, `explain-field`, `explain-sizing`, `build-report-summary`, `quick-sizing-assist`.

#### 8.5.3 Exclusive assignment

A feature is assigned to **at most one model**. UI enforces this: checking a feature on Model A disables that checkbox on all other models. A feature with no model assigned is **disabled in the app** — relevant buttons grey out with tooltip "Configure a model for [feature] in Settings."

#### 8.5.4 Clear per model

Each model row has a "Clear assignments" button that releases all features assigned to it (they become unassigned).

#### 8.5.5 Provider credentials storage

- API keys stored encrypted with key derived from `MODEL_STORE_SECRET` (32+ chars). On first boot, if unset, app auto-generates and appends to `.env`, logs backup warning.
- Keys never returned to UI in plaintext — masked as `sk-...****`. Re-enter to change.
- If decryption fails: Settings shows "Stored credentials cannot be decrypted — re-enter them."

#### 8.5.6 Settings page (`/settings`)

Replaces v0.4a stub. Layout:
- "Configured Models" section — list with "+ Add Model" button
- Each model row (expandable): label, provider, model id, API key field, feature checkboxes, "Test Connection" + "Clear assignments" + Delete buttons
- "Feature Routing Summary" table at bottom: each feature → assigned model or "None — feature disabled"

**Test Connection** sends a minimal prompt (<10 tokens); reports success or error.

#### 8.5.7 Runtime routing

`getLlmProviderForFeature(feature: LlmFeatureId): LlmProvider | null` replaces `getLlmProvider()`. Callers must handle `null`. `getLlmProvider()` retained as deprecated shim reading `.env` for backward compat.

#### 8.5.8 Backward compatibility

On first boot after v0.4b upgrade: if `configured_models` is empty AND `.env` has `LLM_PROVIDER` set → auto-create a default `ConfiguredModel` from env and assign to all six features. Idempotent.

#### 8.5.x Disabled-state and dynamic button labels

The "Ask Claude" / "Ask AI" buttons throughout the app must reflect the **assigned model** for their feature:

- Feature has **no assigned model** → button **disabled** with tooltip: "Configure a model for [feature] in Settings → LLM" (links to `/settings/llm`)
- Feature has **a model assigned** → button label uses the model's `label` (e.g., "Ask Opus", "Ask Llama-Local"); fallback to "Ask AI" if label would overflow
- All call sites must use `getLlmProviderForFeature(feature)` — the deprecated `getLlmProvider()` must not be called from UI components

This fixes the v0.4b regression where ExplainBox "Ask Claude" ignored feature routing and always used the env-var provider.

---

## 8.6 Dynamic Catalogs (Servers, GPUs, LLM Models)

Replaces the v0.3 assumption that catalogs are static JSON files. From v0.5 onward, all three catalogs (servers, GPUs, LLM models) are **DB-backed and admin-editable**, with seed files providing curated defaults on first boot.

### 8.6.1 Storage model — hybrid seed + DB

Three catalogs follow the same pattern:

```
data/seed/servers.seed.json   →  servers + server_gpu_configs   →  Settings UI (CRUD)
data/seed/gpus.seed.json      →  gpus                            →  Settings UI (CRUD)
data/seed/models.seed.json    →  llm_models                      →  Settings UI (CRUD)
       (committed, append-only)         (mutable, per install)
```

**Seed loading on boot:**
- On every app boot, the seed loader runs as a startup task
- For each entry in a seed file, if no row with that `id` exists in the corresponding table → **insert it** with `origin = 'seed'`
- If a row with that `id` already exists → **leave it untouched** (user edits always win)
- To fix a seed entry a user may have edited: ship a new entry with a new id and deprecate the old one

**Origin tracking:** every catalog row has an `origin` column:
- `seed` — came from seed file, unmodified
- `seed-edited` — came from seed file, then edited by admin
- `user` — created by admin via UI

Origin drives UI affordances (e.g., "Reset to seed defaults" button only on `seed-edited` rows).

### 8.6.2 Servers catalog

**Fields per server:** `id`, `vendor` (`'dell' | 'hpe' | 'supermicro' | 'nvidia' | 'lenovo' | 'cisco' | 'other'`), `model`, `cpu`, `memory_gb`, `storage`, `network`, `tdp_watts`, `rack_units`, `release_year` (optional), `spec_sheet_url` (optional), `notes` (optional), `is_deprecated` (default false), `origin`, `created_at`, `updated_at`.

**Multiple GPU configurations** — child table `server_gpu_configs`:
`id`, `server_id` (FK → servers), `gpu_id` (loose ref to gpus.id), `gpu_count`, `interconnect` (`'nvlink' | 'infinity-fabric' | 'pcie' | 'none'`), `list_price_usd` (optional), `is_default` (one config per server marked default).

A single server (e.g., Dell XE9680) can have multiple configs (8×H100, 8×H200, 8×MI300X). Sizing engine selects the config matching Discovery's GPU preference.

### 8.6.3 GPUs catalog

Migrates `data/gpus.json` schema into `data/seed/gpus.seed.json`. Fields unchanged from `docs/adding-a-gpu.md`: `id`, `vendor`, `family`, `model`, `vram_gb`, `memory_type`, `memory_bandwidth_gbps`, `fp16_tflops`, `fp8_tflops`, `bf16_tflops`, `int8_tops`, `tdp_watts`, `interconnect` (as JSON), `supported_features`, `list_price_usd`, `availability`, `notes`, `sources`, `origin`.

### 8.6.4 LLM models catalog

Migrates `data/models.json`. Fields: `id`, `family`, `name`, `params_b`, `architecture` (`'dense' | 'moe'`), `active_params_b` (MoE only), `layers`, `hidden_size`, `num_kv_heads`, `head_dim`, `context_length_max`, `quantizations_supported` (JSON array), `release_date`, `huggingface_id`, `notes`, `is_deprecated`, `origin`.

This list is what Quick Sizing recommends from and what Discovery dropdowns populate from.

### 8.6.5 Catalog admin UI

New routes under `/settings`:

```
/settings/catalogs              — index page with cards for each catalog
/settings/catalogs/servers      — server catalog admin
/settings/catalogs/gpus         — GPU catalog admin
/settings/catalogs/llm-models   — LLM model catalog admin
/settings/catalogs/workload-references  — workload reference URLs (lightweight)
```

Each catalog admin page: search/filter bar, table view, "Add entry" button, per-row actions (Edit, Deprecate, Reset to seed if `seed-edited`, Delete for `user` rows only), origin badge.

### 8.6.6 Add/Edit dialog — manual + URL-assisted

**Option A — Manual entry:** form fields per catalog schema, user fills and submits.

**Option B — Extract from URL:**
1. User pastes a vendor spec sheet URL
2. App fetches the page server-side (with timeout, redirect handling, user-agent set, max body size)
3. App calls LLM via `getLlmProviderForFeature('catalog-extract')` with a structured-output prompt
4. LLM returns JSON matching the catalog schema; form is pre-filled
5. User reviews, edits any wrong values, saves

Disabled when `catalog-extract` feature has no assigned model; tooltip says "Configure a model for catalog extraction in Settings → LLM."

**Editing existing entries:** same form, with "Re-extract from URL" button if `spec_sheet_url` is set.

### 8.6.7 Use of catalogs in the app

After this phase, every code path that reads `data/gpus.json`, `data/servers.json`, or `data/models.json` is updated to read from the DB. The seed JSON files remain in the repo as the canonical defaults, loaded only by the seed loader on boot.

**Caching:** catalogs are queried frequently (every Discovery render, every Build compute). Use a request-scoped in-memory cache invalidated on any catalog-write event.

### 8.6.8 Acceptance criteria

- [ ] First boot loads all three seed files into DB
- [ ] Subsequent boots skip already-present entries (append-only; idempotent)
- [ ] Admin can add/edit/deprecate entries via UI
- [ ] URL extraction pre-fills form when `catalog-extract` model is assigned
- [ ] User edits to seed entries persist across app upgrades
- [ ] Discovery dropdowns and Quick Sizing recommender pull from DB, not JSON files
- [ ] Sizing engine reads server/GPU specs from DB

---

## 9. Phased Delivery Plan

Each phase is independently shippable and ends with a demo-able slice. After each phase, we revisit the PRD.

### Phase 0 — Scaffold & Dockerize (target: 1–2 days)
- Next.js + TypeScript + Tailwind + shadcn/ui initialized
- Zustand store skeleton with `Project` type
- Drizzle + SQLite wired up with migrations
- Dockerfile + docker-compose.yml
- README with local + docker run instructions
- Smoke test: create project, persist, reload, see it

**Exit criteria:** `docker compose up` starts the app; can create/save/load a project.

### Phase 1 — Discovery section (target: 2–3 days)
- All Discovery forms across five tabs (Workload, Hardware, Infra, Model Platform, Application)
- `<ExplainBox>` component with content loader
- Initial explain content for top ~15 critical fields
- Field validation
- Autosave to SQLite

**Exit criteria:** Can complete full Discovery for a sample Llama-70B inference project; ExplainBox works on every field; state persists.

### Phase 2 — Sizing engine (target: 2–3 days)
- `lib/sizing/inference.ts` with all formulas from §7
- GPU, server, instance catalogs as JSON
- Throughput lookup table
- Deployment-pattern multipliers
- Unit tests covering known scenarios (70B FP16, 7B INT4, MoE, etc.)
- Pure functional: `(discovery) → buildDerived`

**Exit criteria:** Given Discovery state, engine returns a BuildState matching hand-calculated expectations within 10% for 5 test scenarios.

### Phase 3 — Build section (target: 2 days)
- Four layer panels rendering derived state
- Override fields
- Top-level totals (GPUs, power, cost)
- NVIDIA vs AMD comparison view
- Engine notes surfaced in UI

**Exit criteria:** Changing any Discovery field reflects in Build within 1s; overrides persist; comparison view works.

### Phase 4 — RFI section (target: 3 days)
- Paste/upload RFP
- LLM extraction (Anthropic first)
- Requirements mapping UI
- "Apply to Discovery" flow
- Qualification scoring
- Draft response generator

**Exit criteria:** Paste a sample RFP, get structured requirements, map them to Discovery, generate a qualification score and draft response.

### Phase 5 — Export (target: 2 days)
- PDF template via `@react-pdf/renderer`
- Word template via `docx` library
- JSON BoM export + schema
- Export section UI with previews

**Exit criteria:** All three export formats produce complete, well-formatted documents reflecting current state.

### Phase 6 — Polish & LLM expansion (target: 2 days)
- OpenAI-compatible adapter (Gemma, Kimi, Nemotron)
- "Ask Claude" in ExplainBox
- "Explain this sizing decision" in Build
- Architecture diagram generation
- Rack layout diagram generation
- Error states, loading states, empty states
- Documentation pass

**Exit criteria:** Tool is demo-ready for internal team onboarding.

### Future phases (v2+)
- Phase 7: Fine-tuning workload module
- Phase 8: Training workload module
- Phase 9: MCP integration for live catalogs
- Phase 10: Additional accelerators (Gaudi, Trainium, TPU)
- Phase 11: IaC export (Terraform, Helm)

---

## 10. File & Folder Structure

```
ml-sizer/
├── PRD.md                          # this document
├── README.md                       # setup + run instructions
├── CHANGELOG.md                    # version history
├── Dockerfile                      # multi-stage build
├── docker-compose.yml              # local/team deployment
├── .env.example                    # required env vars
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
│
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # root layout, shell
│   ├── page.tsx                    # project list / create
│   ├── project/[id]/
│   │   ├── layout.tsx              # tab bar
│   │   ├── page.tsx                # project overview
│   │   ├── discovery/page.tsx
│   │   ├── rfi/page.tsx
│   │   ├── build/page.tsx
│   │   └── export/page.tsx
│   └── api/
│       ├── llm/route.ts            # LLM provider proxy
│       ├── export/pdf/route.ts     # PDF generation
│       ├── export/docx/route.ts    # Word generation
│       └── upload/route.ts         # RFP file upload
│
├── components/
│   ├── ui/                         # shadcn primitives
│   ├── ExplainBox.tsx              # explain & example
│   ├── discovery/
│   │   ├── WorkloadForm.tsx
│   │   ├── HardwareForm.tsx
│   │   ├── InfraForm.tsx
│   │   ├── ModelPlatformForm.tsx
│   │   └── ApplicationForm.tsx
│   ├── rfi/
│   │   ├── RfpUploader.tsx
│   │   ├── RequirementsList.tsx
│   │   ├── QualificationPanel.tsx
│   │   └── DraftResponse.tsx
│   ├── build/
│   │   ├── HardwarePanel.tsx
│   │   ├── InfraPanel.tsx
│   │   ├── ModelPlatformPanel.tsx
│   │   ├── ApplicationPanel.tsx
│   │   ├── SummaryTotals.tsx
│   │   ├── VendorComparison.tsx
│   │   └── diagrams/
│   │       ├── RackLayout.tsx
│   │       └── ArchitectureDiagram.tsx
│   └── export/
│       ├── PdfPreview.tsx
│       └── ExportButtons.tsx
│
├── lib/
│   ├── store.ts                    # Zustand store
│   ├── db/
│   │   ├── schema.ts               # Drizzle schema
│   │   ├── client.ts               # DB client
│   │   └── migrations/
│   ├── sizing/
│   │   ├── inference.ts            # core formulas
│   │   ├── gpus.ts                 # GPU catalog loader
│   │   ├── servers.ts              # server catalog loader
│   │   ├── instances.ts            # cloud instance catalog
│   │   ├── patterns.ts             # deployment pattern multipliers
│   │   └── index.ts                # public API
│   ├── llm/
│   │   ├── provider.ts             # abstraction
│   │   ├── anthropic.ts
│   │   ├── openai-compatible.ts
│   │   └── prompts/
│   │       ├── extract-rfp.ts
│   │       ├── explain-field.ts
│   │       ├── draft-response.ts
│   │       └── explain-sizing.ts
│   ├── export/
│   │   ├── pdf.tsx                 # @react-pdf components
│   │   ├── docx.ts                 # docx generator
│   │   └── bom-schema.ts           # JSON schema
│   └── utils/
│       ├── validation.ts           # Zod schemas
│       └── ids.ts                  # uuid helpers
│
├── data/
│   ├── gpus.json                   # GPU catalog
│   ├── servers.json                # server catalog
│   ├── instances.json              # cloud instances
│   ├── throughput.json             # benchmark lookup
│   ├── models.json                 # known model catalog
│   └── explain/                    # field explanations
│       ├── workload.json
│       ├── hardware.json
│       ├── infra.json
│       ├── model-platform.json
│       └── application.json
│
├── tests/
│   ├── sizing/
│   │   └── inference.test.ts
│   ├── llm/
│   │   └── provider.test.ts
│   └── fixtures/
│       └── sample-projects.json
│
└── docs/
    ├── sizing-math.md              # derivation of formulas + citations
    ├── adding-a-gpu.md             # how to extend catalog
    ├── adding-explain-content.md   # how to author explain content
    └── llm-provider-guide.md       # how to add a new provider
```

### Responsibility per key file

| File | Responsibility |
|---|---|
| `lib/store.ts` | Single Zustand store; all state lives here |
| `lib/sizing/inference.ts` | Pure `(discovery) → buildDerived` function |
| `lib/sizing/index.ts` | Public sizing API; orchestrates catalogs + formulas |
| `lib/llm/provider.ts` | Provider interface + factory |
| `lib/db/schema.ts` | Drizzle table definitions |
| `app/api/llm/route.ts` | Server-side LLM proxy (keeps keys out of client) |
| `components/ExplainBox.tsx` | Reusable explain/example component |
| `data/*.json` | Catalogs & content — edit without code changes |

### Phase 7+ additions

New components and pages introduced by Phase 7 (UX redesign) and Phase 9 (Build Report):

```
app/
├── layout.tsx                          # REPLACES: now wraps with Sidebar + ThemeProvider
├── onboarding/page.tsx                 # NEW: How it works
└── project/[id]/
    └── layout.tsx                      # REPLACES: no longer has top tab bar; delegates to sidebar

components/
├── Sidebar/
│   ├── Sidebar.tsx                     # NEW: main sidebar container
│   ├── SidebarHeader.tsx               # NEW: logo + collapse toggle
│   ├── SidebarNavItem.tsx              # NEW: reusable nav item
│   ├── SidebarCurrentProject.tsx       # NEW: shows current project + sections
│   └── SidebarThemeToggle.tsx          # NEW: moon/sun toggle
├── ProjectsList/
│   ├── ProjectsList.tsx                # NEW: main list component
│   ├── ProjectCard.tsx                 # NEW: single project card
│   ├── ProjectsSearchFilter.tsx        # NEW: search + filter bar
│   └── DeleteProjectDialog.tsx         # NEW: confirmation dialog
├── discovery/
│   └── SavedIndicator.tsx              # NEW: "Saved · Xs ago" badge
├── onboarding/
│   └── OnboardingSection.tsx           # NEW: per-phase section block
└── common/
    ├── Breadcrumbs.tsx                 # NEW: top-of-content breadcrumbs
    └── EmptyState.tsx                  # NEW: reusable empty state

lib/
├── theme/
│   ├── colors.ts                       # NEW: color token definitions
│   └── use-theme.ts                    # NEW: wrapper around next-themes
├── export/
│   ├── build-report-spec.ts            # NEW: BuildReport TypeScript type
│   ├── build-report-extract.ts         # NEW: (project) → BuildReport extractor
│   ├── build-report-md.ts              # NEW: BuildReport → Markdown string
│   ├── build-report-pdf.tsx            # NEW: React-PDF components for Build Report
│   └── filename.ts                     # NEW: export filename convention utility

app/globals.css                         # UPDATED: new theme tokens per §13 (Design System)

app/api/export/
├── build-report-pdf/route.ts           # NEW: Build Report PDF download endpoint
└── build-report-md/route.ts            # NEW: Build Report Markdown download endpoint
```

---

## 11. Docker Setup

### 11.1 Dockerfile outline (multi-stage)
1. **deps stage:** `node:20-alpine`, install deps
2. **build stage:** copy source, `npm run build`
3. **runtime stage:** `node:20-alpine`, copy built artifacts + `node_modules/.prod`, expose 3000, start

### 11.2 docker-compose.yml outline
```yaml
services:
  ml-sizer:
    build: .
    ports: ["3000:3000"]
    volumes:
      - ./data:/app/data         # SQLite + catalogs
      - ./uploads:/app/uploads   # uploaded RFPs
    env_file: .env
    restart: unless-stopped
```

### 11.3 Team sharing
For team access, one member runs the container on a shared host; others access via `http://<host>:3000`. No auth in v1 — add reverse proxy + basic auth if exposed beyond local network.

---

## 12. Open Questions & Future Considerations

### 12.1 Open questions (to resolve as we build)
1. Should projects be shareable as portable JSON bundles (export/import) in v1?
2. Is there a need for "templates" — canned discovery starting points (e.g., "internal chatbot 500 users")?
3. Should the Build section generate a rough network diagram, or is rack layout enough for v1?
4. Do we need a "what-if" compare mode (two builds side-by-side to trade off cost vs performance)?
5. How do we handle MoE models in throughput lookup (sparse activation)?

### 12.2 Explicit deferrals
- Authentication / user accounts → v2 if/when exposed beyond team LAN
- Live pricing APIs → v2
- Terraform / Helm output → v2
- Multi-region sizing → v2
- Training & fine-tuning modules → v2

### 12.3 Quality / non-functional
- All sizing calculations must cite source in code comments
- All LLM prompts live in `lib/llm/prompts/` with version strings
- Sizing engine must be 100% pure (no I/O, no randomness) for testability
- UI target: usable on 1440px+ screens; mobile not supported in v1

---

## 13. Design System

### 13.1 Color tokens

All colors defined as CSS custom properties in `app/globals.css` using Tailwind v4 `@theme` blocks.

**Light mode** (warm off-white, inspired by Notion/GitHub reading surfaces):

| Token | Hex | Purpose |
|---|---|---|
| `--bg-canvas` | `#faf8f3` | Page background (warm off-white) |
| `--bg-surface` | `#ffffff` | Cards, panels, elevated surfaces |
| `--bg-subtle` | `#f4f0e8` | Subtle surface (hover, zebra) |
| `--bg-overlay` | `rgba(26, 26, 26, 0.4)` | Modal overlay |
| `--border-default` | `#e8e3d8` | Default borders |
| `--border-muted` | `#f0ebe0` | Subtle dividers |
| `--text-primary` | `#1a1a1a` | Body text |
| `--text-secondary` | `#5a5a5a` | Labels, captions |
| `--text-muted` | `#8a8a8a` | Disabled, placeholders |
| `--accent-primary` | `#2f81f7` | Links, primary buttons, focus rings |
| `--accent-hover` | `#1e6fe0` | Hover on accent |
| `--success` | `#1a7f37` | Success states, "Saved" indicator |
| `--warning` | `#9a6700` | Warning states |
| `--danger` | `#cf222e` | Errors, delete actions |

**Dark mode** (GitHub-inspired):

| Token | Hex | Purpose |
|---|---|---|
| `--bg-canvas` | `#0d1117` | Page background (GitHub canvas.default) |
| `--bg-surface` | `#161b22` | Cards, panels (GitHub canvas.subtle) |
| `--bg-subtle` | `#1c2128` | Hover, zebra |
| `--bg-overlay` | `rgba(0, 0, 0, 0.6)` | Modal overlay |
| `--border-default` | `#30363d` | Default borders |
| `--border-muted` | `#21262d` | Subtle dividers |
| `--text-primary` | `#e6edf3` | Body text |
| `--text-secondary` | `#8b949e` | Labels, captions |
| `--text-muted` | `#6e7681` | Disabled, placeholders |
| `--accent-primary` | `#2f81f7` | Same as light for brand consistency |
| `--accent-hover` | `#58a6ff` | Hover on accent (brighter in dark) |
| `--success` | `#3fb950` | Success states |
| `--warning` | `#d29922` | Warning states |
| `--danger` | `#f85149` | Errors, delete actions |

### 13.2 Typography

- Body: `Inter` (sans-serif) via `next/font/google`
- Monospace: `JetBrains Mono` for code, numbers in BoM
- Base size: `16px`; line-height `1.5`
- Scale: use Tailwind's default type scale (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`)
- Headings: font-weight 600; avoid bold caps

### 13.3 Spacing

- Stick to Tailwind's 4px-based scale (`p-1`, `p-2`, `p-4`, `p-6`, `p-8`)
- Page padding: `px-8 py-8`
- Card padding: `p-6`
- Gap between stacked items: `gap-3` (12px) for list items, `gap-6` for sections

### 13.4 Elevation (shadows)

Four levels:
- `shadow-none` — flat surfaces
- `shadow-sm` — cards at rest (light mode only; dark mode uses borders)
- `shadow-md` — popovers, dropdowns
- `shadow-lg` — modals

Dark mode uses borders (`border-default`) instead of shadows for elevation.

### 13.5 Corners & radii

- Small controls (inputs, pills): `rounded-md` (6px)
- Cards and surfaces: `rounded-lg` (8px)
- Modals: `rounded-xl` (12px)

### 13.6 Motion

- Default transition: `transition-colors duration-150 ease-out`
- Theme switch: no transition on `html.dark` toggle (prevents flash)
- Hover interactions: 150ms color transition only

### 13.7 Icons

- `lucide-react` for all icons (already in stack via shadcn)
- Sidebar icons: 20px
- Inline icons (buttons, indicators): 16px
- Size via Tailwind: `h-5 w-5` (20px) and `h-4 w-4` (16px)

### 13.8 Accessibility

- All interactive elements have visible focus ring: `focus-visible:ring-2 ring-accent-primary ring-offset-2`
- Color contrast: all text ≥ 4.5:1 against its background (tokens above verified)
- Keyboard navigable throughout
- ARIA labels on icon-only buttons

### 13.9 Text color accessibility

The v0.3 spec's `--text-secondary` (`#5a5a5a` light, `#8b949e` dark) and `--text-muted` (`#8a8a8a` light, `#6e7681` dark) sometimes fail 4.5:1 WCAG AA contrast on `--bg-subtle` backgrounds.

**Rule:**
- `--text-secondary` is the minimum for any text carrying meaning (labels, helper text, captions)
- `--text-muted` is reserved for placeholder-only states (empty input placeholders, disabled controls)
- Never use `--text-muted` for labels, captions, or form descriptors

Minimum pairings:
- `--text-secondary` on `--bg-canvas`, `--bg-surface`, `--bg-subtle` — ≥ 4.5:1 (AA)
- `--text-muted` only on `--bg-surface` or `--bg-canvas` (never on `--bg-subtle`)

**Phase 11 audit task:** replace any existing `--text-muted` usage on labels/captions with `--text-secondary` globally.

---

## 14. Revision Log

| Version | Date | Author | Changes |
|---|---|---|---|
| v0.1 | 2026-04-18 | Claude + owner | Initial draft covering v1 scope, inference-only, on-prem primary, Docker distribution |
| v0.2 | 2026-04-19 | Claude + owner | §5.1: added TTFT/ITL targets, optimizations object, TP/PP/EP + latency estimates in BuildDerived. §5.2: added `description` column to projects table. §7.1: reorganized into memory footprint, prefill phase, decode phase, sharding strategy (TP/PP/EP), and capacity. §7.6: new "Inference Optimizations" section. §7.7: new worked example for Llama 3.1 70B. |
| v0.3 | 2026-04-21 | Claude + owner | UX redesign: two-level left nav (§6.0), merged landing/projects page (§6.0.7), onboarding page (§6.0.8), autosave indicator instead of save button (§6.1 revised), Build Report export in PDF + Markdown (§6.4 revised). New §10 Phase 7+ file-structure additions. New §13 Design System (color tokens, typography, spacing, motion, accessibility). Known bugs + BoM pricing audit queued for Phase 8. |
| v0.4a | 2026-04-22 | Claude + owner | §6.1 required/skippable/optional field classes with full classification table and defaults; §6.6 Quick Sizing mode with rule-based recommender (LLM-assist stub to be activated in v0.4b); §5.1 adds `_skipped`, `_source`; §6.0 sidebar reorder + ML Sizer home link; §6.2 explicit Apply flow for RFI; §13.9 accessible text rules |
| v0.4b | 2026-04-22 | Claude + owner | **§8.5 multi-model LLM routing** with per-feature exclusive assignment, encrypted credential storage, `/settings` page replacing v0.4a stub. **§5.1 adds** `hardware.preferredServer`, `build.bomOverrides`, `LlmFeatureId`, `ConfiguredModel`, `settings` store slice. **§5.2 adds** `configured_models`, `settings_kv` tables. **§6.4 adds** BoM override UI (§6.4.x) and export behavior (§6.4.y). **§6.6.3 updated** Quick Sizing step 2 for LLM-assist; **§6.6.5** LLM-assist recommender spec (activates v0.4a stub). **§6.2.y** routes RFI extraction through assigned model. |
| v0.5 | 2026-04-26 | Claude + owner | **§8.6 Dynamic Catalogs:** hybrid seed + DB storage for servers, GPUs, LLM models; append-only seed merge on boot; admin UI at `/settings/catalogs/*`; manual + URL-assisted entry with `catalog-extract` LLM feature; origin tracking (`seed` / `seed-edited` / `user`). **§5.2** adds 5 new tables (servers, server_gpu_configs, gpus, llm_models, workload_references). **§5.1 `LlmFeatureId`** adds `catalog-extract`. **§8.5.x** disabled-state + dynamic button labels (fixes "Ask Claude" routing regression). **§6.0.z** sidebar version display (build SHA + date from build-time env vars). **§6.1.z** Workload tab reference URLs block. **§6.5.x** ExplainBox maximize / modal view. |

---

**This PRD is a living document.** Update it as scope, architecture, or priorities evolve. Each phase completion should prompt a PRD review.
