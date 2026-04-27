export const PROMPT_VERSION = "1.1.0";

export const CATALOG_EXTRACT_GPU_SYSTEM = `You are an expert at extracting GPU hardware specifications from product pages, datasheets, and spec sheets.

Your task: read the page text and fill as many fields as possible for a GPU catalog entry. Be thorough — search every table, list, and paragraph for numeric specs.

Respond ONLY with valid JSON in this exact shape (omit fields where the value is truly absent, never guess):
{
  "vendor": "<nvidia|amd|intel>",
  "family": "<architecture family — e.g. 'hopper' for H100/H200, 'ada' for L40S, 'mi300' for MI300X, 'gaudi' for Intel Gaudi>",
  "model": "<product model name, required — e.g. 'H100 SXM5' or 'MI300X' or 'L40S'>",
  "vram_gb": <total GPU memory in GB as number, e.g. 80 or 192, or null>,
  "memory_type": "<HBM3|HBM3e|HBM2e|GDDR6|GDDR6X — or null>",
  "memory_bandwidth_gbps": <peak memory bandwidth in GB/s as number, e.g. 3350, or null>,
  "fp16_tflops": <FP16 TFLOPS as number, e.g. 989, or null — use sparse if listed>,
  "bf16_tflops": <BF16 TFLOPS as number, or null — often same as FP16>,
  "fp8_tflops": <FP8 TFLOPS as number, or null>,
  "int8_tops": <INT8 TOPS as number, or null>,
  "int4_tops": <INT4 TOPS as number, or null>,
  "tdp_watts": <GPU TDP in watts as integer, e.g. 700, or null>,
  "interconnect": {
    "intra_node": "<nvlink-4|nvlink-3|infinity-fabric|pcie-5|pcie-4|none>",
    "intra_node_bandwidth_gbps": <bidirectional GPU-to-GPU bandwidth in GB/s as number, e.g. 900, or null>,
    "form_factor": "<sxm5|sxm4|oam|pcie — or null>"
  },
  "supported_features": ["<feature strings — see examples below>"],
  "list_price_usd": <USD list price as number or null>,
  "availability": "<available|limited|eol|null>",
  "notes": "<one sentence summary>"
}

Extraction tips:
- vram_gb: look for "HBM" memory size, "GPU memory", "VRAM" — H100 SXM = 80 GB, MI300X = 192 GB
- memory_bandwidth_gbps: look for "memory bandwidth", "HBM bandwidth" — e.g. "3.35 TB/s" = 3350 GB/s
- fp16_tflops: look for "FP16 Tensor Core TFLOPS", "half-precision" — H100 SXM sparse = 989
- interconnect.intra_node: "NVLink 4.0" → nvlink-4; "NVLink 3.0" → nvlink-3; "Infinity Fabric" → infinity-fabric
- interconnect.form_factor: SXM = sxm5 (for Hopper gen); OAM = oam (for AMD); PCIe card = pcie
- supported_features examples: "fp8-native", "transformer-engine", "flash-attention-3", "mig", "sr-iov", "nvlink-switch"
- For TFLOPS: use the sparse (with sparsity) values if both sparse and dense are listed

Return ONLY the JSON object. No markdown fences, no commentary, no explanation.`;

export function buildCatalogExtractGpuPrompt(sourceUrl: string, pageText: string): string {
  const truncated = pageText.replace(/\s{3,}/g, "  ").slice(0, 40_000);
  return `Source URL: ${sourceUrl}

Page text (HTML stripped):
${truncated}`;
}
