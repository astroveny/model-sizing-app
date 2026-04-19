# Sizing Math — Derivations & Citations

> **Scope:** v1 inference sizing only. Training/fine-tuning math lives elsewhere when those modules ship.
> **Companion:** PRD §7 is the authoritative spec. This doc is the *why* behind the formulas.

---

## 1. Overview: the four things we're sizing

LLM inference sizing is the combination of four distinct concerns:

| Concern | Drives | Dominant resource |
|---|---|---|
| **Memory footprint** | How many GPUs a single replica needs | VRAM |
| **Prefill phase** | Time-To-First-Token (TTFT) | FLOPS |
| **Decode phase** | Inter-Token Latency (ITL), per-request throughput | Memory bandwidth |
| **Sharding strategy** | How the model is split across GPUs when it doesn't fit on one | Interconnect |

Each has its own formula. The engine combines them — plus capacity math (replicas, totals) — to produce a final sizing.

---

## 2. Memory footprint

### 2.1 Model weights

```
bytes_per_param = {FP32:4, FP16:2, BF16:2, FP8:1, INT8:1, INT4:0.5}
vram_model_bytes = params * bytes_per_param
vram_model_gb    = vram_model_bytes / 1e9
```

**Why:** Every parameter is stored in HBM as its chosen numeric type. The bytes-per-param mapping is direct.

**Worked example:** Llama 3.1 70B in FP16 → 70 × 10⁹ × 2 bytes = 140 GB.

**Edge cases:**
- Mixture-of-Experts (MoE): all experts must be resident in memory even if only a subset activates per token. Use total params, not active.
- Weight-only quantization (e.g., AWQ, GPTQ) stores weights compressed but dequantizes on the fly — we use the compressed size for VRAM and flag performance tradeoffs in engine notes.

### 2.2 KV cache

During inference, attention requires cached keys and values for every token in context. The formula:

```
kv_cache_per_token_bytes = 2 * num_layers * hidden_size * bytes_per_param_kv
                           # × 2 because we store both K and V
kv_cache_per_request_gb  = (kv_cache_per_token_bytes * context_length) / 1e9
```

**Why 2×num_layers×hidden:** every transformer layer produces one K vector and one V vector of size `hidden_size` per token.

**Note on Grouped-Query Attention (GQA) / Multi-Query Attention (MQA):** modern Llama/Mistral models reduce KV heads. The formula becomes:

```
kv_cache_per_token_bytes = 2 * num_layers * (num_kv_heads * head_dim) * bytes_per_param_kv
```

For Llama 3.1 70B: `num_kv_heads = 8`, `head_dim = 128` → KV dimension is 1024 not 8192. KV cache is ~8× smaller than naive math suggests. **The engine must look up KV config from the model catalog, not assume `hidden_size`.**

**FP8 KV cache optimization:** with `fp8KvCache: true`, `bytes_per_param_kv = 1` instead of 2. Effectively doubles KV capacity.

**Worked example:** Llama 3.1 70B with GQA, context 8192, FP16 KV:
- `kv_per_token = 2 × 80 × (8 × 128) × 2 = 327,680 bytes ≈ 0.33 MB`
- `kv_per_request at 8k ctx = 0.33 × 8192 / 1000 ≈ 2.7 GB`

### 2.3 Total VRAM

```
vram_kv_total = kv_cache_per_request_gb * max_concurrent_in_flight
vram_overhead = 0.15 * (vram_model + vram_kv_total)
vram_total    = vram_model + vram_kv_total + vram_overhead
```

The 15% overhead covers: activation memory during forward pass, CUDA context, framework overhead, fragmentation. PagedAttention reduces fragmentation waste significantly; without it, use 25%.

**Sources:**
- Hugging Face — "Making LLMs Go Brrr" blog series
- vLLM paper (Kwon et al., 2023) — *"Efficient Memory Management for Large Language Model Serving with PagedAttention"*
- NVIDIA NIM deployment documentation

---

## 3. Prefill phase (compute-bound)

Prefill processes the entire input prompt in one forward pass. Determines **TTFT**.

### 3.1 FLOPS count

```
prefill_flops = 2 * params * input_tokens
```

**Why the 2×:** each matmul does one multiply and one add per parameter per token. For autoregressive decoder-only models, the dominant cost is matmul, and the rule of thumb is 2 FLOPs per param per token for forward pass. This matches the canonical Kaplan et al. scaling-laws formula.

### 3.2 Time and TTFT

```
mfu              = 0.3 to 0.5       # Model FLOPs Utilization
prefill_time_sec = prefill_flops / (gpu_fp16_tflops * 1e12 * mfu * num_gpus_tp)
TTFT_ms          = prefill_time_sec * 1000 + queueing_delay_ms
```

**Why MFU:** peak TFLOPS is a marketing number. Real throughput is lower because of memory stalls, kernel launch overhead, and non-matmul ops. MFU captures the achieved fraction.

**MFU guidance:**
- H100 / H200 with FlashAttention-3 + well-tuned kernels: 0.40–0.50
- A100 with FlashAttention-2: 0.30–0.40
- MI300X with ROCm optimized stack: 0.30–0.40 (improving with each ROCm release)
- Lower bound (conservative): 0.30

The engine uses 0.4 as the default and surfaces this in build notes.

### 3.3 Quantization adjustments

If weights are FP8:
```
use gpu_fp8_tflops instead of gpu_fp16_tflops
mfu_adjustment = 0.9    # FP8 kernels are less mature, slight MFU penalty
```

INT8/INT4 similar — use the relevant throughput number from the GPU catalog and apply a 0.85 MFU factor.

### 3.4 Chunked prefill

Chunked prefill splits the prompt into chunks that are interleaved with decode tokens. It doesn't change total prefill work but smooths P95 TTFT under load by avoiding head-of-line blocking.

The engine assumes it's on and does not alter base TTFT estimate, but surfaces it as a reason P95 will be close to P50.

**Sources:**
- Kaplan et al. (2020) — *"Scaling Laws for Neural Language Models"* — for the 2× FLOPs-per-param forward-pass rule
- NVIDIA Technical Blog — *"Mastering LLM Techniques: Inference Optimization"*
- MLPerf Inference published MFU numbers

---

## 4. Decode phase (memory-bandwidth-bound)

Decode generates output tokens one at a time. For each token, the GPU must read **all** model weights plus the KV cache from HBM. This makes decode dominated by memory bandwidth, not FLOPS.

### 4.1 Bytes read per token

```
bytes_per_tok_read = (params * bytes_per_param) + kv_cache_bytes_current_context
```

Every forward pass re-reads the entire weight matrix once (weights don't change) plus the KV cache accumulated so far.

### 4.2 Time per token

```
mbu                     = 0.6 to 0.8     # Memory Bandwidth Utilization
decode_time_per_tok_sec = bytes_per_tok_read /
                          (gpu_memory_bandwidth_Bps * mbu * num_gpus_tp)
ITL_ms                  = decode_time_per_tok_sec * 1000
```

**Why MBU:** peak HBM bandwidth is rarely achieved — access patterns, kernel design, and memory controller behavior impose overhead. MBU captures the achieved fraction.

**MBU guidance:**
- Modern well-tuned inference stacks (vLLM, TRT-LLM): 0.70–0.85
- Default engine uses 0.70 conservatively.

### 4.3 Why this GPU choice can surprise you

Peak FLOPS rankings ≠ decode throughput rankings. Memory bandwidth matters more.

| GPU | FP16 TFLOPS | HBM bandwidth | Decode-relative |
|---|---|---|---|
| H100 SXM | 989 | 3.35 TB/s | 1.0× baseline |
| H200 | 989 | 4.8 TB/s | ~1.43× |
| B200 | 2250 | 8.0 TB/s | ~2.39× |
| MI300X | 1307 | 5.3 TB/s | ~1.58× |
| MI325X | 1307 | 6.0 TB/s | ~1.79× |

So a model that fits in one MI300X can decode ~1.58× faster than on one H100 at the same batch size — despite H100 being the industry default. This is a real selling point for AMD in bandwidth-bound workloads, and the engine surfaces it in vendor comparison.

### 4.4 Batching changes the math

Continuous batching amortizes weight reads across requests in the batch. With batch size B, weights are read once per token-generation step but used B times.

```
effective_per_request_decode_time = max(
    bytes_weights / (bw * mbu),         # shared across batch
    bytes_kv_per_request / (bw * mbu)   # per-request, not shared
) + compute_term
```

As batch grows, decode shifts from bandwidth-bound to compute-bound. Beyond some batch size (depends on model + GPU), adding requests no longer reduces per-request latency.

The engine uses a lookup table from `data/throughput.json` for realistic per-GPU per-model-size tokens/sec-per-request numbers at realistic batch sizes, rather than deriving this analytically for v1.

### 4.5 End-to-end latency

```
end_to_end_ms = TTFT_ms + (output_tokens * ITL_ms)
```

This is the total user-visible latency for non-streaming clients. For streaming clients, TTFT is what they see first; ITL is the cadence of tokens appearing.

**Sources:**
- Hugging Face — *"A guide to LLM inference and performance"*
- AMD ROCm documentation — MI300X inference benchmarks
- vLLM documentation — PagedAttention batching math

---

## 5. Sharding strategy (TP / PP / EP)

When a model doesn't fit on one GPU, or when we want lower latency than one GPU can deliver, we shard the model.

### 5.1 Tensor Parallelism (TP)

Splits each weight matrix across GPUs column-wise (or row-wise). Every GPU works on the same token simultaneously; their partial results are combined via all-reduce.

**Properties:**
- Lowest added latency — GPUs work in parallel on the same token
- High communication volume per token (all-reduce on activations)
- **Requires intra-node high-bandwidth fabric** (NVLink ≥ 900 GB/s, Infinity Fabric, NVSwitch)
- Practical limit: TP ≤ GPUs per node (typically 8)

**Rule of thumb:** ~8% throughput penalty per doubling of TP size. Applied as:
```
tp_overhead_factor = 1 - (0.08 * log2(TP))
```

TP=1 → 1.0, TP=2 → 0.92, TP=4 → 0.84, TP=8 → 0.76.

### 5.2 Pipeline Parallelism (PP)

Splits layers into stages. Stage 1 has layers 1-N, stage 2 has layers N+1 to 2N, etc. Each stage lives on a different GPU (or GPU group).

**Properties:**
- Lower communication (send activations between stages, not all-reduce)
- Works across nodes over InfiniBand, RoCE, or fast Ethernet
- Pipeline bubble: when stage k is processing microbatch j, stage k+1 is idle until j arrives
- Best combined with large microbatch counts

**Rule of thumb:** ~5% throughput penalty per pipeline stage beyond 1:
```
pp_overhead_factor = 1 - (0.05 * (PP - 1))
```

PP=1 → 1.0, PP=2 → 0.95, PP=4 → 0.85.

### 5.3 Expert Parallelism (EP) — MoE only

Only relevant for Mixture-of-Experts models (Mixtral, DeepSeek-MoE, DBRX, etc.). Distributes experts across GPUs. During routing, tokens are sent to the GPUs hosting their chosen experts (all-to-all communication).

**Properties:**
- Scales MoE models past TP limits
- Token-routing all-to-all is bandwidth-heavy; benefits from NVLink or InfiniBand 400G+
- Typically combined with TP (TP for non-expert layers, EP for experts)

The engine flags EP as advanced configuration and recommends vLLM or SGLang as runtimes that handle it cleanly.

### 5.4 Combined overhead

```
effective_throughput = base_throughput * tp_overhead_factor * pp_overhead_factor
```

EP overhead is workload-dependent and not currently modeled analytically — flagged in build notes.

### 5.5 Decision logic

```
1. Compute min_gpus = ceil(vram_total / gpu_vram)
2. If min_gpus == 1:
     TP = 1, PP = 1, EP = 1
3. If min_gpus <= gpus_per_node (typically 8):
     TP = next_power_of_2(min_gpus)
     PP = 1
     Recommend: intra-node NVLink or Infinity Fabric
4. If min_gpus > gpus_per_node:
     TP = gpus_per_node    # saturate intra-node fabric
     PP = ceil(min_gpus / gpus_per_node)
     Recommend: InfiniBand 400G or RoCE 100G+ inter-node
5. If MoE model:
     Evaluate EP + TP combination; flag advanced
```

**Worked example:** Llama 3.1 405B FP16 in 80GB H100:
- vram_total ≈ 810 GB + KV + overhead ≈ 1000 GB
- min_gpus = ceil(1000 / 80) = 13 → round to 16
- 16 > 8 gpus_per_node → TP=8, PP=2
- Total: 16 GPUs across 2 nodes, requires high-bandwidth inter-node fabric

**Sources:**
- Megatron-LM paper (Shoeybi et al., 2019) — *"Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism"*
- GPipe paper (Huang et al., 2018) — for pipeline parallelism fundamentals
- DeepSpeed documentation — combined parallelism strategies
- NVIDIA NCCL benchmarks — interconnect bandwidth reference

---

## 6. Capacity: replicas and totals

### 6.1 Required throughput

```
required_tokens_per_sec = concurrent_users * (avg_output_tokens / target_end_to_end_sec)
```

**Why:** each concurrent user is generating `avg_output_tokens` within the target latency. Multiply to get aggregate token demand.

### 6.2 Replicas

```
replicas = ceil(required_tokens_per_sec /
                (decode_throughput_per_replica * effective_batch_size))
           * peak_burst_multiplier
```

**Burst multiplier:** clients don't sustain peak load 24/7 but they do have spikes. A 2× burst multiplier means we size for 2× sustained.

**Engine notes:** when replicas > 1, we remind that load balancing needs to be stateful-aware (respect streaming sessions) and that prefix caching loses effectiveness if requests aren't sticky.

### 6.3 Total GPU count

```
gpus_per_replica = TP * PP * EP
total_gpus       = gpus_per_replica * replicas
```

### 6.4 Servers

```
gpus_per_server = server_catalog[chosen_server].max_gpus
servers         = ceil(total_gpus / gpus_per_server)
```

---

## 7. Deployment-pattern adjustments

These multipliers are applied after base sizing is complete. Rationale in PRD §7.3.

| Pattern | Headroom multiplier | Additional sizing impact |
|---|---|---|
| `internal-inference` | 1.0 | Standard monitoring |
| `external-api` | 1.2 | API gateway sized for peak rps, DDoS capacity |
| `gpuaas-multi-tenant` | 1.3 | MIG/MPS partitioning overhead, per-tenant quotas, metering subsystem |
| `saas-product` | 1.25 | Full app stack (auth, billing, UI), multi-region flagged |

Applied to replicas: `replicas_final = ceil(replicas_base * multiplier)`.

---

## 8. Worked end-to-end example

See **PRD §7.7** for a complete Llama 3.1 70B worked example walking through:
- Memory footprint
- Sharding decision (TP=4)
- Prefill → TTFT
- Decode → ITL
- Optimization impact (FP8 KV + speculative decoding)
- Replica count & total GPUs

---

## 9. Assumptions and conservative defaults

The engine uses these defaults and surfaces them as explicit assumptions in every build output:

| Parameter | Default | Range | Rationale |
|---|---|---|---|
| MFU | 0.40 | 0.30–0.50 | Conservative for H100/H200; MI300X still improving |
| MBU | 0.70 | 0.60–0.85 | Achievable with vLLM/TRT-LLM/TGI on modern GPUs |
| VRAM overhead | 15% | 10–25% | With PagedAttention; higher without |
| TP overhead | 8%/doubling | 5–12% | Conservative; varies by interconnect |
| PP overhead | 5%/stage | 3–10% | Assumes well-tuned microbatching |
| FP8 MFU penalty | 0.9× | 0.85–0.95 | Less mature kernels |
| Burst multiplier | 2.0 | 1.5–3.0 | Configurable per project |

Users can override any of these per-project under Build → Advanced.

---

## 10. What's explicitly NOT modeled (and why)

- **Network latency between client and inference endpoint** — geography-dependent, out of sizing scope
- **Cold-start latency** — assumed warm containers
- **Request queueing** — assumed bounded by capacity; exposed via burst multiplier
- **GPU failure / DR sizing** — flagged in engine notes for production but not automatically padded
- **Storage I/O for model loading** — one-time cost, not in steady-state sizing
- **Power and cooling efficiency (PUE)** — power budget reports GPU+server TDP; datacenter PUE is facility-specific

These are candidates for v2 if real projects demand them.

---

## 11. References

Numbered for citation in source code comments.

1. Kaplan, J. et al. (2020). *Scaling Laws for Neural Language Models.* arXiv:2001.08361
2. Shoeybi, M. et al. (2019). *Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism.* arXiv:1909.08053
3. Huang, Y. et al. (2018). *GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism.* arXiv:1811.06965
4. Kwon, W. et al. (2023). *Efficient Memory Management for Large Language Model Serving with PagedAttention.* SOSP 2023
5. NVIDIA Technical Blog — *Mastering LLM Techniques: Inference Optimization*
6. NVIDIA NIM Deployment Guide
7. Hugging Face — *Making LLMs Go Brrr (Parts 1–3)*
8. Hugging Face — *A guide to LLM inference and performance*
9. AMD Instinct MI300X/MI325X ROCm deployment documentation
10. vLLM official documentation — PagedAttention, continuous batching, tensor parallelism
11. MLPerf Inference — published benchmark results (bi-annual)
12. SGLang documentation — expert parallelism & speculative decoding

**In code:** cite as `// Ref: [4] — Kwon et al. 2023` at the top of each formula block.
