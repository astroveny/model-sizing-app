# Model Sizing App

- [Model Sizing App](#model-sizing-app)
  - [Intro](#intro)
  - [Why this exists](#why-this-exists)
  - [Features (v1)](#features-v1)
    - [Sizing coverage (v1)](#sizing-coverage-v1)
  - [Requirements](#requirements)
  - [Quick start — Docker (recommended)](#quick-start--docker-recommended)
    - [Sharing with your team](#sharing-with-your-team)
    - [Data persistence](#data-persistence)
    - [Common Docker commands](#common-docker-commands)
  - [Quick start — Local Node.js (for development)](#quick-start--local-nodejs-for-development)
  - [Configuration](#configuration)
    - [LLM provider](#llm-provider)
    - [Storage paths (Docker only)](#storage-paths-docker-only)
  - [Project structure](#project-structure)
  - [Usage walkthrough](#usage-walkthrough)
    - [1. Create a project](#1-create-a-project)
    - [2. Discovery](#2-discovery)
    - [3. (Optional) Import an RFP](#3-optional-import-an-rfp)
    - [4. Build](#4-build)
    - [5. Export](#5-export)
  - [Extending the tool](#extending-the-tool)
    - [Add a new GPU to the catalog](#add-a-new-gpu-to-the-catalog)
    - [Add Explain \& Example content for a field](#add-explain--example-content-for-a-field)
    - [Add a new LLM provider](#add-a-new-llm-provider)
    - [Add a new server SKU](#add-a-new-server-sku)
  - [Development](#development)
    - [Running tests](#running-tests)
  - [Roadmap](#roadmap)
  - [Troubleshooting](#troubleshooting)
  - [Contributing](#contributing)
  - [License](#license)
  - [Links](#links)


## Intro
[Back to ToC](#model-sizing-app)

**A local-first tool for sizing and architecting ML/GenAI deployments.**

Guides you through discovery, RFP/RFI analysis, and architecture build-out across four stack layers — Hardware, Infrastructure Platform, Model Platform, and Application — and produces a shareable sizing proposal (PDF, Word, JSON BoM).

> 📄 See [PRD.md](./PRD.md) for the full product requirements, data model, sizing formulas, and phased delivery plan.

---

## Why this exists

Sizing ML/GenAI deployments is usually ad-hoc: spreadsheet math, tribal knowledge, and manual proposal writing. `ml-sizer` codifies sizing logic, keeps data consistent across project phases, and produces professional deliverables in a fraction of the time.

It's designed for:
- Solution architects running discovery calls with enterprise clients
- Pre-sales / SA teams responding to RFPs
- Internal use by a small team (via Docker, on a shared host)

It is **not** a deployment tool, a benchmarking suite, or a cloud marketplace. It outputs specs and BoMs — you procure and deploy.

---

## Features (v1)
[Back to ToC](#model-sizing-app)

- **Discovery section** — capture client requirements across all four layers, with an Explain & Example component next to every field to help clients new to model deployment
- **RFI section** — paste or upload an RFP, extract requirements with an LLM, map them to discovery, score qualification, draft response sections
- **Build section** — auto-computed sizing across Hardware, Infra, Model Platform, and Application layers; manual overrides; NVIDIA vs AMD side-by-side comparison
- **Export** — PDF proposal, Word doc, JSON Bill-of-Materials
- **Reactive state** — change a value anywhere, all sections update instantly
- **Docker-first** — `docker compose up` and you're running; easy to share with your team

### Sizing coverage (v1)

- **Workload:** Inference (training & fine-tuning are on the v2 roadmap)
- **Deployment targets:** On-prem primary, cloud secondary
- **GPUs:** NVIDIA (H100, H200, B200, A100, L40S) + AMD (MI300X, MI325X)
- **Deployment patterns:** internal inference, external API, GPUaaS multi-tenant, full SaaS product
- **Formulas:** memory footprint, prefill (compute-bound) + decode (bandwidth-bound), sharding (TP/PP/EP), replicas & totals
- **Optimizations modeled:** quantization, FP8 KV cache, continuous batching, PagedAttention, speculative decoding, prefix caching, chunked prefill, FlashAttention

---

## Requirements
[Back to ToC](#model-sizing-app)

Pick one of:

**Option A — Docker (recommended)**
- Docker Desktop or Docker Engine 24+
- Docker Compose v2
- ~2 GB disk, ~1 GB RAM for the container

**Option B — Local Node.js**
- Node.js 20 LTS or later
- npm 10+ (or pnpm/yarn)
- ~1 GB disk

An LLM API key is optional but strongly recommended for the RFI extraction and "Ask Claude" features:
- **Anthropic** API key (default), or
- An **OpenAI-compatible** endpoint (Gemma via vLLM, Kimi, Nemotron, local Ollama, etc.)

---

## Quick start — Docker (recommended)

```bash
git clone <repo-url> ml-sizer
cd ml-sizer
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY (or configure an OpenAI-compatible provider)
docker compose up -d
```

Open **http://localhost:3000**.

### Sharing with your team

Run the container on a shared host (a Linux box on your LAN, a small VM, etc.) and your team reaches it at `http://<host-ip>:3000`. No auth in v1 — if you expose it beyond a trusted network, put a reverse proxy with basic auth in front.

### Data persistence

Two volumes are mounted from the host so your data survives container restarts:
- `./data` — SQLite database + static catalogs (GPUs, servers, instances, throughput tables)
- `./uploads` — uploaded RFP files

Back these up to preserve your projects.

### Common Docker commands

```bash
docker compose up -d              # start in background
docker compose logs -f            # follow logs
docker compose restart            # restart after .env changes
docker compose down               # stop (keeps data)
docker compose down -v            # stop and wipe volumes (destructive)
docker compose pull && docker compose up -d   # update to latest image
```

---

## Quick start — Local Node.js (for development)
[Back to ToC](#model-sizing-app)

```bash
git clone <repo-url> ml-sizer
cd ml-sizer
cp .env.example .env
# edit .env and set your API key
npm install
npm run db:migrate                # initialize SQLite
npm run dev                       # start Next.js dev server
```

Open **http://localhost:3000**.

For a production-style run locally:
```bash
npm run build
npm run start
```

---

## Configuration
[Back to ToC](#model-sizing-app)

All configuration is done via `.env` (copy from `.env.example`).

### LLM provider

```env
# Choose one provider
LLM_PROVIDER=anthropic              # or 'openai-compatible'

# Anthropic (default)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-7     # or whichever you prefer

# OpenAI-compatible (Gemma, Kimi, Nemotron, Ollama, vLLM, TGI, etc.)
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_MODEL=gemma-4-27b
```

Switching providers is a matter of editing `.env` and restarting. The app uses a provider abstraction under the hood — see `lib/llm/provider.ts`.

### Storage paths (Docker only)

By default the container mounts `./data` and `./uploads` from the repo root. To change:
```yaml
# docker-compose.yml
volumes:
  - /my/custom/data:/app/data
  - /my/custom/uploads:/app/uploads
```

---

## Project structure
[Back to ToC](#model-sizing-app)
```
ml-sizer/
├── PRD.md                  # product requirements (living document — read this)
├── README.md               # this file
├── Dockerfile              # multi-stage build
├── docker-compose.yml      # local/team deployment
├── app/                    # Next.js App Router (pages, API routes)
├── components/             # React components (Discovery, RFI, Build, Export, ExplainBox)
├── lib/
│   ├── store.ts            # Zustand store — single source of truth
│   ├── sizing/             # pure sizing engine (memory, prefill, decode, sharding)
│   ├── llm/                # provider abstraction (Anthropic, OpenAI-compatible)
│   ├── db/                 # Drizzle + SQLite
│   └── export/             # PDF / Word / JSON BoM generation
├── data/                   # GPU/server/instance/throughput catalogs, explain content
├── tests/                  # unit tests for sizing engine
└── docs/                   # deeper docs (sizing-math.md, how to extend catalogs)
```

See PRD.md §10 for the full file-level responsibility breakdown.

---

## Usage walkthrough

### 1. Create a project
Click **New Project**. Give it a name, description, and customer. Choose workload type (inference for v1), deployment pattern (internal / external API / GPUaaS / SaaS), and deployment target (on-prem / cloud / hybrid).

### 2. Discovery
Fill in the five tabs — Workload, Hardware, Infra, Model Platform, Application. Click the **?** next to any field for an Explain & Example panel. Use **Ask Claude** for a customer-tailored explanation based on the project context you've captured so far.

### 3. (Optional) Import an RFP
Paste the RFP text or upload a PDF/DOCX. The LLM extracts requirements, maps them to Discovery fields, and shows a qualification score. Click **Apply to Discovery** to populate fields automatically.

### 4. Build
The Build section auto-computes sizing across all four layers. You see:
- GPU model + count
- Sharding strategy (TP/PP/EP) with reasoning
- Server model + count, interconnect recommendation
- Inference server config, replicas, KV cache, max batch
- API gateway, auth, metering (especially for GPUaaS/SaaS patterns)
- Total power, rack units, capex, monthly opex
- NVIDIA vs AMD side-by-side (when vendor preference is "either")

Override any derived value if you want to force a different choice.

### 5. Export
Generate:
- **PDF** — executive proposal with sizing, BoM, assumptions
- **Word** — same content, editable for customer review
- **JSON BoM** — machine-readable for procurement / IaC pipelines

---

## Extending the tool
[Back to ToC](#model-sizing-app)
### Add a new GPU to the catalog
Edit `data/gpus.json`. Each entry needs `vram_gb`, `fp16_tflops`, `fp8_tflops`, `memory_bandwidth_gbps`, `tdp_watts`, `interconnect`, `list_price_usd`. Sizing formulas pick it up automatically.

See [`docs/adding-a-gpu.md`](./docs/adding-a-gpu.md).

### Add Explain & Example content for a field
Edit the relevant file in `data/explain/` (one per layer). Each entry has `fieldId`, `title`, `explain`, `example`, and optional `customerFriendlyHint`.

See [`docs/adding-explain-content.md`](./docs/adding-explain-content.md).

### Add a new LLM provider
Implement the `LlmProvider` interface in `lib/llm/provider.ts`. See [`docs/llm-provider-guide.md`](./docs/llm-provider-guide.md).

### Add a new server SKU
Edit `data/servers.json`. Each entry needs `max_gpus`, supported GPU models, `rack_units`, `tdp_watts`, `list_price_usd`.

---

## Development

```bash
npm run dev           # Next.js dev server with hot reload
npm run build         # production build
npm run start         # run production build locally
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # run sizing engine unit tests
npm run db:migrate    # apply Drizzle migrations
npm run db:studio     # open Drizzle Studio to inspect SQLite
```

### Running tests

The sizing engine is pure-functional, so tests are fast and deterministic:
```bash
npm test
npm test -- --watch
```

Test fixtures in `tests/fixtures/sample-projects.json` cover Llama 70B, Mistral 7B, Mixtral 8x22B, and other scenarios. See PRD §9 Phase 2 for the exit criteria.

---

## Roadmap
[Back to ToC](#model-sizing-app)
Current scope is v1 (see PRD §3). On the roadmap:

- **v2** — training & fine-tuning workload modules
- **v2** — MCP integrations for live catalog / pricing lookups
- **v2** — Intel Gaudi, AWS Trainium/Inferentia, Google TPU
- **v2** — Terraform / Helm export
- **v2+** — RAG / vector DB sizing sub-module
- **v2+** — Multi-region & DR sizing

See PRD §9 for the phased delivery plan and §12 for open questions.

---

## Troubleshooting

**Container starts but page shows an error**
Check `docker compose logs -f`. Most issues are env-var related — missing API key, typo in `LLM_PROVIDER`.

**SQLite "database is locked"**
Shouldn't happen in single-user mode. If it does, stop the app, `cp data/ml-sizer.db data/ml-sizer.db.bak`, and restart.

**LLM calls failing**
- Verify `LLM_PROVIDER` matches your configured keys.
- For OpenAI-compatible endpoints, confirm `OPENAI_COMPATIBLE_BASE_URL` includes `/v1`.
- Check the Network tab in browser devtools — the app proxies calls through `/api/llm`.

**Build section shows no output**
Some Discovery fields are required before sizing can run. The Build section lists missing fields at the top.

**Sizing numbers look wrong**
- Check `docs/sizing-math.md` for the formulas and assumptions (MFU, MBU, overhead factors).
- All engine notes in the Build section explain the reasoning — read them.
- File an issue with the Discovery inputs so the math can be reviewed.

---

## Contributing

This is an internal tool. Before adding features:
1. Read `PRD.md` — especially §3 (scope) and §9 (phases).
2. Propose PRD changes in a PR before writing code for anything non-trivial.
3. Keep the sizing engine pure (no I/O, no randomness) — tests depend on it.
4. Every LLM prompt lives in `lib/llm/prompts/` with a version string.

---

## License

Internal / proprietary. Not for redistribution.

---

## Links
[Back to ToC](#model-sizing-app)
- **[PRD.md](./PRD.md)** — full product requirements, data model, formulas, phases
- **[docs/sizing-math.md](./docs/sizing-math.md)** — formula derivations + citations
- **[docs/adding-a-gpu.md](./docs/adding-a-gpu.md)** — extending the GPU catalog
- **[docs/adding-explain-content.md](./docs/adding-explain-content.md)** — authoring Explain & Example content
- **[docs/llm-provider-guide.md](./docs/llm-provider-guide.md)** — adding a new LLM provider