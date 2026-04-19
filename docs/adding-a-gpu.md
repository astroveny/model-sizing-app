# Adding a GPU to the Catalog

The GPU catalog lives at `data/gpus.json`. Adding a new GPU is a data-only change — no code changes needed. The sizing engine picks up new entries automatically.

---

## 1. Schema

Every GPU entry is a JSON object with this shape:

```json
{
  "id": "h200-sxm",
  "vendor": "nvidia",
  "family": "hopper",
  "model": "H200 SXM",
  "vram_gb": 141,
  "memory_type": "HBM3e",
  "memory_bandwidth_gbps": 4800,
  "fp32_tflops": 67,
  "fp16_tflops": 989,
  "bf16_tflops": 989,
  "fp8_tflops": 1979,
  "int8_tops": 1979,
  "int4_tops": 3958,
  "tdp_watts": 700,
  "interconnect": {
    "intra_node": "nvlink-4",
    "intra_node_bandwidth_gbps": 900,
    "form_factor": "sxm5"
  },
  "supported_features": [
    "flash-attention-3",
    "transformer-engine",
    "fp8-native",
    "mig"
  ],
  "list_price_usd": 32000,
  "availability": "available",
  "notes": "HBM3e variant of H100; ~1.43x decode throughput vs H100 due to higher bandwidth.",
  "sources": [
    "https://www.nvidia.com/en-us/data-center/h200/"
  ]
}
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✓ | Kebab-case unique id. Used as key in throughput tables and build state. |
| `vendor` | `"nvidia" \| "amd" \| "intel" \| "google" \| "aws"` | ✓ | Normalized vendor. |
| `family` | string | ✓ | Architecture family (`hopper`, `blackwell`, `ampere`, `ada`, `mi300`, `mi325`). |
| `model` | string | ✓ | Display name. |
| `vram_gb` | number | ✓ | Per-GPU VRAM in GB. |
| `memory_type` | string | | `HBM2e`, `HBM3`, `HBM3e`, `GDDR6`. |
| `memory_bandwidth_gbps` | number | ✓ | Peak HBM bandwidth in GB/s. **Critical for decode sizing.** |
| `fp32_tflops` | number | | Peak TFLOPS at FP32 (dense, non-sparse). |
| `fp16_tflops` | number | ✓ | Peak TFLOPS at FP16 (dense). **Critical for prefill sizing.** |
| `bf16_tflops` | number | | Peak TFLOPS at BF16 (usually = FP16 for NVIDIA). |
| `fp8_tflops` | number | | Peak TFLOPS at FP8. Required if you want FP8 sizing. |
| `int8_tops` | number | | Peak TOPS at INT8. |
| `int4_tops` | number | | Peak TOPS at INT4. |
| `tdp_watts` | number | ✓ | Thermal design power. Used for power budget math. |
| `interconnect` | object | ✓ | See below. |
| `supported_features` | string[] | | Flags used by the engine for optimizations (see below). |
| `list_price_usd` | number | | Best public list price, or MSRP estimate. Used for capex. |
| `availability` | `"available" \| "limited" \| "announced"` | | Flags for engine notes. |
| `notes` | string | | Human-readable context. |
| `sources` | string[] | | URLs for verification. |

### Interconnect object

```json
{
  "intra_node": "nvlink-4",
  "intra_node_bandwidth_gbps": 900,
  "form_factor": "sxm5"
}
```

- `intra_node`: one of `"nvlink-4"`, `"nvlink-5"`, `"infinity-fabric"`, `"nvlink-c2c"`, `"pcie-5"`, `"pcie-4"`, `"none"`.
- `intra_node_bandwidth_gbps`: peak per-link (or aggregate, documented in notes).
- `form_factor`: `"sxm5"`, `"sxm4"`, `"oam"`, `"pcie"`, `"mezz"`.

The sharding decision logic (see `docs/sizing-math.md` §5.5) uses `intra_node` to decide if TP is viable — PCIe-only GPUs get TP penalty or flagged as "not recommended for TP>2".

### Supported features

The engine reads this array to adjust optimization defaults:

- `"flash-attention-3"` — MFU bumps by +0.05 automatically
- `"fp8-native"` — FP8 sizing path enabled (requires `fp8_tflops`)
- `"transformer-engine"` — NVIDIA Transformer Engine support
- `"mig"` — Multi-Instance GPU partitioning (GPUaaS multi-tenant scenarios)
- `"sr-iov"` — AMD partitioning analog
- `"sparsity-2-4"` — 2:4 structured sparsity

Unknown feature flags are ignored. Add new ones to `lib/sizing/features.ts` to wire them into formulas.

---

## 2. Step-by-step: add a new GPU

### Step 1 — gather the specs

You need, at minimum:
- VRAM (GB)
- HBM bandwidth (GB/s)
- FP16 TFLOPS (dense, not sparse-marketing)
- TDP (W)
- Intra-node interconnect type and bandwidth

From the vendor's official datasheet. **Never from reseller sites** — they publish sparse numbers and mislabeled units.

### Step 2 — add the entry

Edit `data/gpus.json`. Append a new object to the `gpus` array. Keep the schema above.

```json
{
  "gpus": [
    { "id": "h100-sxm", ... },
    { "id": "h200-sxm", ... },
    { "id": "YOUR_NEW_GPU", ... }   ← here
  ]
}
```

### Step 3 — add throughput data

Edit `data/throughput.json` to add at least one realistic tokens/sec entry for the new GPU. The engine needs this for decode throughput estimates.

```json
{
  "h200-sxm": {
    "llama-70b": {
      "fp16": { "batch_1": 42, "batch_8": 210, "batch_32": 580 },
      "fp8":  { "batch_1": 78, "batch_8": 380, "batch_32": 1050 }
    },
    "mixtral-8x22b": { ... }
  }
}
```

**Where to get these numbers:**
- MLPerf Inference results (authoritative for reviewed submissions)
- Vendor benchmarks (NVIDIA, AMD publish inference benchmarks)
- vLLM benchmark repo
- Your own measurements if you have access

If you only have partial data, leave others as `null` — the engine will fall back to analytical estimates and flag the estimate as lower-confidence in build notes.

### Step 4 — update server catalog (if needed)

If this GPU goes into a new server platform, also edit `data/servers.json`. See `docs/adding-a-server.md` (TODO — not yet written).

### Step 5 — add to supported GPU dropdowns

The Discovery → Hardware form reads from `data/gpus.json` automatically, so no UI code change needed. Your new GPU appears in the `preferredGpu` dropdown.

### Step 6 — test

Run the sizing unit tests:
```bash
npm test -- sizing
```

Add a test fixture in `tests/fixtures/sample-projects.json` using your new GPU to confirm end-to-end sizing still makes sense.

---

## 3. Example additions

### Example 1 — B200 (Blackwell)

```json
{
  "id": "b200-sxm",
  "vendor": "nvidia",
  "family": "blackwell",
  "model": "B200",
  "vram_gb": 192,
  "memory_type": "HBM3e",
  "memory_bandwidth_gbps": 8000,
  "fp16_tflops": 2250,
  "bf16_tflops": 2250,
  "fp8_tflops": 4500,
  "int4_tops": 9000,
  "tdp_watts": 1000,
  "interconnect": {
    "intra_node": "nvlink-5",
    "intra_node_bandwidth_gbps": 1800,
    "form_factor": "sxm6"
  },
  "supported_features": ["flash-attention-3", "fp8-native", "transformer-engine", "mig"],
  "list_price_usd": 45000,
  "notes": "Blackwell generation; 2.4x decode throughput vs H100.",
  "sources": ["https://www.nvidia.com/en-us/data-center/dgx-b200/"]
}
```

### Example 2 — MI325X (AMD)

```json
{
  "id": "mi325x",
  "vendor": "amd",
  "family": "mi325",
  "model": "Instinct MI325X",
  "vram_gb": 256,
  "memory_type": "HBM3e",
  "memory_bandwidth_gbps": 6000,
  "fp16_tflops": 1307,
  "bf16_tflops": 1307,
  "fp8_tflops": 2614,
  "int4_tops": 5230,
  "tdp_watts": 1000,
  "interconnect": {
    "intra_node": "infinity-fabric",
    "intra_node_bandwidth_gbps": 896,
    "form_factor": "oam"
  },
  "supported_features": ["flash-attention-3", "fp8-native", "sr-iov"],
  "list_price_usd": 20000,
  "notes": "256GB HBM3e — best-in-class VRAM capacity; often fits 70B FP16 on 1 GPU.",
  "sources": ["https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html"]
}
```

---

## 4. Common pitfalls

**Using sparse TFLOPS numbers.** NVIDIA marketing often quotes 2× the dense FLOPS assuming 2:4 sparsity. For inference sizing, **use dense numbers** unless you've explicitly enabled sparsity in the model. If you must use a sparse number, document it clearly in `notes`.

**Confusing TFLOPS and TOPS.** Both are 10¹² ops/sec but TFLOPS is usually for FP operations, TOPS for integer. Don't mix them in the same field.

**Wrong memory bandwidth units.** Datasheets vary: `GB/s`, `TB/s`, `GT/s`. The schema expects GB/s. H100 SXM is 3350 GB/s, not 3.35.

**Forgetting the throughput table.** Without a `data/throughput.json` entry, the engine falls back to analytical estimation, which is less accurate. At minimum, add one or two model-size entries.

**Price inflation.** `list_price_usd` should be best-available public pricing. Real customer pricing is almost always lower — capture that in project-level overrides, not the catalog.

---

## 5. Proposing changes

Since this is an internal tool, submit catalog additions as a PR with:
1. The new entry
2. At least one throughput data point (with source)
3. Updated `tests/fixtures/sample-projects.json` if it enables a new sizing scenario
4. Sources linked in the entry's `sources` array

Catalog correctness matters — one wrong bandwidth number affects every sizing using that GPU.
