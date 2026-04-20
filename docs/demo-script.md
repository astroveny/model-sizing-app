# Demo Script — ML Sizer v1

**Audience:** Internal team onboarding, SA review  
**Duration:** ~15 minutes  
**Pre-requisites:** App running at localhost:3000, ANTHROPIC_API_KEY set in `.env`

---

## 1. Project creation (1 min)

1. Open http://localhost:3000 — show the "No projects yet" empty state.
2. Click **New Project**.
3. Fill in:
   - Name: `Llama 70B Inference — Acme Corp`
   - Customer: `Acme Corp`
   - Description: `On-prem inference for internal RAG workloads, 50 concurrent users`
   - Deployment pattern: `Internal inference`
   - Deployment target: `On-prem`
4. Click **Create**.

---

## 2. Discovery — Workload tab (3 min)

Navigate to **Discovery → Workload**.

1. Model section:
   - Family: `Meta`
   - Name: `Llama 3.1 70B`
   - Parameters: `70`
   - Quantization: `FP16`
   - Context length: `8192`
   - Architecture: `Dense`

2. Load section:
   - Concurrent users: `50`
   - Avg input tokens: `1024`
   - Avg output tokens: `512`
   - P95 latency target: `8000`

3. Click the **?** next to "Concurrent Users" — show the ExplainBox.
4. Click **Ask Claude** — Claude generates a project-tailored explanation for Acme Corp.

---

## 3. Discovery — Hardware & Model Platform tabs (2 min)

**Hardware tab:**
- Preferred vendor: `NVIDIA`
- Preferred GPU: `H100 SXM`
- Cooling: `Air`
- Networking: `400G`

**Model Platform tab:**
- Inference server: `vLLM`
- Enable: Continuous batching, FlashAttention, Prefix caching

---

## 4. RFI — paste an RFP (3 min)

Navigate to **RFI**. Paste the following sample text into the textarea:

```
Request for Proposal: AI Inference Infrastructure
We require on-premises deployment of a 70B parameter language model serving 50 concurrent users.
Minimum P95 latency requirement: 8 seconds end-to-end.
Must support NVIDIA hardware. Preferred inference framework: vLLM.
Kubernetes-based orchestration required.
OIDC authentication mandatory for all API endpoints.
```

Click **Extract**. Show the extracted requirements list:
- Requirements map to Discovery fields (GPU vendor, inference server, auth, etc.)
- Click **Apply all** — watch Discovery fields auto-populate.
- Show the **Qualification score** (should be 80+ given the match).

---

## 5. Build section (3 min)

Navigate to **Build**. Show:

1. **Summary totals** — GPU count, server count, power, rack units, est. CapEx.
2. **Hardware panel** — H100 count, server model, VRAM breakdown, interconnect.
3. Click **"Why this choice?"** on the Hardware panel — Claude explains TP=4, NVLink, etc.
4. **Model Platform panel** — replicas, sharding, KV cache, latency bars showing TTFT and E2E P95 vs target.
5. **Architecture diagram** — layered view: Application → Model Platform → Infrastructure → Hardware.
6. **Rack layout** — server boxes with power draw labels.
7. Override server count to 3 — show the override badge; explain that derived fields still update but override sticks.
8. Reset the override.

---

## 6. Export (2 min)

Navigate to **Export**.

1. Show the **PDF preview** pane inline.
2. Click **Download PDF** — open in Acrobat/Preview, show cover, sizing highlights, BoM table.
3. Click **Download DOCX** — open in Word, show editable styling.
4. Click **Download JSON** — show structured BoM for procurement pipelines.

---

## Talking points

- **Local-first:** everything is SQLite on-disk. Your sizing data never leaves your machine unless you export it.
- **Reactive:** change one Discovery field, all of Build updates in < 1 second.
- **LLM is optional:** all sizing logic is deterministic math; LLM enhances explanations and RFP extraction but the tool works without an API key.
- **Extensible:** adding a GPU, a server SKU, or a new LLM provider is documented in `docs/`.

---

## Known friction points (as of Phase 6)

- PDF preview may take 2-3 seconds to render client-side on first load — normal.
- "Ask Claude" and "Why this choice?" require an LLM API key; error message is shown inline if key is missing.
- Large RFPs (>10k words) may hit token limits — extraction still works but some nuance may be lost.
