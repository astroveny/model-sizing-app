# Authoring Explain & Example Content

The Explain & Example component (`<ExplainBox>`) sits next to every Discovery field. It's the tool's main feature for helping customers new to ML deployment understand what they're being asked.

Content lives in `data/explain/` as JSON — **no code changes needed to add or edit explanations.**

---

## 1. Why this matters

When you're in a discovery call with a customer, they will ask things like:
- "What do you mean by concurrent users?"
- "What's the difference between FP16 and FP8?"
- "Why does context length matter?"

If you have to improvise every time, the call drags. If the answer is wrong or inconsistent across customers, you lose credibility. The Explain & Example component gives you a consistent, reviewed answer one click away, with an example to make it concrete.

**Each entry serves three audiences:**

1. **You** — a quick memory aid during the call
2. **Your team** — shared understanding so newer folks give the same answers you would
3. **The customer** — especially the `customerFriendlyHint`, which is plain-English with no jargon

---

## 2. File layout

```
data/explain/
├── workload.json            # model + load fields
├── hardware.json            # GPU, cooling, networking, power
├── infra.json               # orchestrator, observability, GitOps
├── model-platform.json      # inference server, optimizations, caching
└── application.json         # gateway, auth, metering, UI
```

One file per Discovery tab. Each file is an array of entries.

---

## 3. Schema

```json
{
  "fieldId": "discovery.load.concurrentUsers",
  "title": "Concurrent Users",
  "explain": "The number of users expected to make inference requests at the same moment...",
  "example": "A 500-person company rolling out an internal chatbot...",
  "customerFriendlyHint": "Think of the busiest moment...",
  "relatedFields": ["discovery.load.requestsPerSecond", "discovery.load.peakBurstMultiplier"],
  "commonMistakes": [
    "Using total user count instead of peak simultaneous users."
  ]
}
```

### Field reference

| Field | Type | Required | Purpose |
|---|---|---|---|
| `fieldId` | string | ✓ | Dotted path matching the Zustand store field. Must be unique across all files. |
| `title` | string | ✓ | Display title in the ExplainBox header. |
| `explain` | markdown string | ✓ | The "what and why." 2–6 sentences. Formal register. |
| `example` | markdown string | ✓ | Concrete scenario with numbers. 1–3 sentences. |
| `customerFriendlyHint` | string | | Plain-English one-liner for the "Ask Claude" fallback and customer-facing mode. |
| `relatedFields` | string[] | | Other fieldIds the user might also care about. Rendered as "See also" links. |
| `commonMistakes` | string[] | | Gotchas. Rendered as a short warning list. |

---

## 4. Writing guidelines

### 4.1 The `explain` block

Answer two questions, in this order:
1. **What is this?** — one sentence definition
2. **Why does it matter for sizing?** — one or two sentences connecting it to the build

Good:
> The number of users making inference requests simultaneously at peak load. This drives GPU count and replica count — not total user base. A 10,000-user product with 100 concurrent at peak needs far less hardware than one with 1,000 concurrent.

Bad (too abstract, no sizing connection):
> The number of users using the system at the same time.

Bad (too long, buries the point):
> Concurrent users is a measurement of the number of active users within a given system who are making requests during the same temporal window, which could be defined as a small interval like a second or a slightly larger interval depending on the workload characteristics. When architects think about this value they often conflate it with...

Keep it to **6 sentences maximum** for `explain`.

### 4.2 The `example` block

Show, don't just tell. Use realistic numbers. The example should make the user nod and think "oh, that's the kind of number I'd give."

Good:
> A 500-person company rolling out an internal chatbot might have 5,000 total users (with contractors) but only 50 concurrent at peak (lunchtime Monday). A customer-facing API might see 500 concurrent at peak from a much larger user base.

Good:
> For a mid-sized enterprise RAG system: ~200 employees, ~30 concurrent at peak, ~5 sustained average.

Bad (too vague):
> Many users will use the system at the same time.

### 4.3 The `customerFriendlyHint`

One sentence. No jargon. Phrased as a question or a direct prompt the customer can answer. Think: "What would I say in the meeting if the customer looked confused?"

Good:
> Think of the busiest moment. How many people would be waiting for an answer at the same time?

Good:
> How many users do you expect chatting with the bot simultaneously on your worst day?

Bad (jargon):
> Estimate the peak concurrent request rate at the inference endpoint.

### 4.4 The `commonMistakes` block

Short, direct, user-observable mistakes. Each item is one sentence.

Good:
- "Using total user count instead of peak simultaneous users."
- "Forgetting that RAG workflows can have 2–3× token amplification from retrieved chunks."

Bad (not actionable):
- "Sometimes people get this wrong."

---

## 5. Voice & tone

- **Authoritative but accessible** — like a senior engineer explaining to a smart peer in a different domain.
- **Customer-safe** — nothing sarcastic, nothing that would embarrass you if a customer saw it. Assume the `customerFriendlyHint` may be read aloud.
- **Vendor-neutral** — describe tradeoffs, don't pitch products. "MI300X has higher VRAM" is fine; "MI300X is better" is not.
- **Concrete numbers** over abstractions wherever possible.
- **Markdown is supported** in `explain` and `example` — use it sparingly (maybe a `**bold**` for a key term, or a bullet list for multi-part definitions).

---

## 6. Example: complete entry

```json
{
  "fieldId": "discovery.model.quantization",
  "title": "Quantization",
  "explain": "The numeric precision used to store model weights and (optionally) activations. **FP16** is the modern default. **FP8** halves memory with minor quality loss on newer GPUs (H100/H200/B200/MI300X). **INT8** is aggressive; **INT4** is very aggressive and only used for memory-constrained scenarios. Lower precision reduces both VRAM footprint and memory bandwidth per token — so it directly affects how many GPUs you need and how fast decode runs.",
  "example": "A 70B model at FP16 is 140 GB; the same model at FP8 is 70 GB (fits on 1x MI300X 192GB with room for KV cache); at INT4 it's ~35 GB (fits on a single L40S 48GB).",
  "customerFriendlyHint": "Lower precision means smaller and faster, but with some quality tradeoff — do you have a preference or should we recommend one?",
  "relatedFields": [
    "discovery.model.params",
    "discovery.modelPlatform.optimizations.fp8KvCache"
  ],
  "commonMistakes": [
    "Choosing INT4 without validating quality on the actual use case.",
    "Assuming FP8 is supported on pre-Hopper GPUs — it isn't, natively."
  ]
}
```

---

## 7. How content is loaded

The ExplainBox component looks up content by `fieldId`. The loader merges:

1. `data/explain/*.json` — default content (shipped with the tool)
2. `explainOverrides` in the project state — per-project customizations created via the "Edit" button or the "Ask Claude" save flow

Overrides take precedence. This means a user can tailor an explanation for a specific customer without modifying the shared content.

Missing `fieldId`: the ExplainBox renders "No explanation yet — [author one?]" with a link to the JSON file it would belong in.

---

## 8. The "Ask Claude" flow

When a user clicks **Ask Claude** in an ExplainBox:

1. The app sends the field's base `explain` + `example` plus the current Discovery state (workload type, deployment pattern, customer name, industry if set) to the LLM.
2. The LLM returns a customer-tailored explanation.
3. The user can edit before saving.
4. Saved content is stored in `explainOverrides` for that project only.

The prompt template lives in `lib/llm/prompts/explain-field.ts`. Curated defaults in `data/explain/` are always the fallback if the LLM is unavailable.

---

## 9. Authoring workflow

### New field added to Discovery → no explain content yet

1. The ExplainBox renders a placeholder showing where to add the content.
2. Open the right file in `data/explain/` (based on which tab).
3. Append a new entry with `fieldId` matching the new Discovery field.
4. Restart / reload — your content appears.

### Editing an existing entry

1. Just edit the JSON. Reload the browser.
2. Consider whether the change should update `explainOverrides` for existing projects — it won't automatically. Those keep their old override unless you clear them.

### Bulk creation

For a brand-new layer (e.g., adding training workload in v2), author entries in order of:
1. Most-asked questions in real discovery calls (go by memory of real confusions)
2. Fields that drive big sizing deltas (worth the customer understanding)
3. Everything else

Start with `explain` and `example`. `customerFriendlyHint` and `commonMistakes` can be added later.

---

## 10. Quality checklist

Before merging new content, verify:

- [ ] `fieldId` matches the Zustand store path exactly
- [ ] `fieldId` is unique across all files in `data/explain/`
- [ ] `explain` is ≤ 6 sentences and answers *what* + *why it matters for sizing*
- [ ] `example` uses concrete numbers
- [ ] `customerFriendlyHint` is plain-English with no jargon
- [ ] No vendor pitches or unsupported claims
- [ ] Markdown renders correctly in a preview
- [ ] Linked `relatedFields` actually exist

---

## 11. Translation / localization

Not supported in v1. If added later, the plan is:
- Suffix filenames with locale (`workload.en.json`, `workload.ja.json`)
- Loader selects based on user preference
- `fieldId` remains stable across locales

Not in scope now — open an issue if a deployment needs it.
