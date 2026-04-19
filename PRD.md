# ML/GenAI Deployment Sizing Tool — Product Requirements Document

**Working name:** `ml-sizer`
**Status:** Draft v0.2 — living document
**Owner:** Project owner (solo → small team)
**Last updated:** 2026-04-19

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
```

### 5.2 SQLite schema (Drizzle)

```
projects       (id, name, description, customer, created_at, updated_at, data_json)
rfp_uploads    (id, project_id, filename, path, uploaded_at)
explain_custom (id, project_id, field_id, explain, example)
audit_log      (id, project_id, event, payload_json, created_at)
```

`description` is nullable text (free-form project description / notes).

We serialize the full project state to `data_json` for simplicity in v1. If performance degrades, normalize later.

---

## 6. Feature Specifications

### 6.1 Discovery section

**Structure:** Tabs per layer (Hardware, Infra, Model Platform, Application) + a **Workload** tab (model + load) at the top. Within each tab, grouped form fields with the `<ExplainBox>` component next to each.

**Behavior:**
- Every input writes to Zustand store on change (debounced ~300ms).
- Changes immediately propagate to Build section (which may already show derived values).
- Required fields flagged; Build section disabled until minimum set is complete.
- "Import from RFP" button pulls extracted values from RFI state where applicable.

**Acceptance criteria:**
- [ ] All fields in `DiscoveryState` are captured via forms
- [ ] Changing any field updates store within 500ms
- [ ] `<ExplainBox>` renders for every field with content defined
- [ ] Required-field validation prevents progress when incomplete
- [ ] Values persist across browser refresh (via SQLite autosave)

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

**Acceptance criteria:**
- [ ] Can paste RFP text and get structured extraction
- [ ] Can upload PDF/DOCX and get structured extraction
- [ ] Each extracted requirement links to relevant Discovery field
- [ ] "Apply to Discovery" updates store without data loss for untouched fields
- [ ] Qualification score updates reactively as Discovery/RFI changes

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
1. **PDF proposal** — executive summary + per-layer sizing + BoM + assumptions
2. **Word doc** — same content, editable format for customer review
3. **JSON BoM** — machine-readable bill of materials for procurement/IaC

**Acceptance criteria:**
- [ ] PDF generates and downloads in < 10s
- [ ] Word doc contains all sections with editable styles
- [ ] JSON BoM validates against a published schema
- [ ] Exports reflect current store state (no stale data)

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

## 13. Revision Log

| Version | Date | Author | Changes |
|---|---|---|---|
| v0.1 | 2026-04-18 | Claude + owner | Initial draft covering v1 scope, inference-only, on-prem primary, Docker distribution |
| v0.2 | 2026-04-19 | Claude + owner | §5.1: added TTFT/ITL targets, optimizations object, TP/PP/EP + latency estimates in BuildDerived. §5.2: added `description` column to projects table. §7.1: reorganized into memory footprint, prefill phase, decode phase, sharding strategy (TP/PP/EP), and capacity. §7.6: new "Inference Optimizations" section. §7.7: new worked example for Llama 3.1 70B. |

---

**This PRD is a living document.** Update it as scope, architecture, or priorities evolve. Each phase completion should prompt a PRD review.
