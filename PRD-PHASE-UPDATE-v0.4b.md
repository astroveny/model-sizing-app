# PRD & PHASE_PLAN Update v0.4b — LLM Settings + Server/BoM Override

**Type:** Addendum to PRD.md v0.4a → v0.4b and PHASE_PLAN.md
**Date:** 2026-04-22
**Prerequisite:** v0.4a must be fully applied and shipped before starting v0.4b
**Scope:** Phase 10 (LLM Settings + multi-model routing) + Phase 12 (Server + BoM overrides)
**Ship order:** Phase 10 FIRST (unblocks Quick Sizing LLM-assist and future features), then Phase 12

> This document contains both PRD updates (Part A) and PHASE_PLAN additions (Part B). Apply Part A to PRD.md first, then append Part B to PHASE_PLAN.md.

---

# PART A — PRD Updates (PRD.md v0.4a → v0.4b)

## A.1 — New §8.5 LLM Settings & Multi-Model Routing

Replace the v0.3 single-provider assumption. Multiple models are now configurable simultaneously.

### 8.5.1 Configured models

```ts
type ConfiguredModel = {
  id: string                          // uuid
  label: string                       // user-friendly, e.g. "Opus for heavy lifting"
  provider: 'anthropic' | 'openai-compatible'
  providerConfig: {
    apiKey?: string                   // stored encrypted; never returned to client in plaintext
    baseUrl?: string                  // for openai-compatible
    model: string                     // e.g. "claude-opus-4-7", "gpt-4o", "gemma-4-27b"
  }
  assignedFeatures: LlmFeatureId[]
  createdAt: string
  updatedAt: string
  isValid?: boolean
  lastValidatedAt?: string
}
```

### 8.5.2 LLM features (routable)

Six features can be routed to a configured model:

```ts
type LlmFeatureId =
  | 'rfp-extract'           // RFI: extract requirements from RFP
  | 'rfi-draft-response'    // RFI: draft response per layer
  | 'explain-field'         // ExplainBox "Ask Claude"
  | 'explain-sizing'        // Build panels: "Why this choice?"
  | 'build-report-summary'  // Export: generate narrative exec summary
  | 'quick-sizing-assist'   // Quick Sizing: LLM-based model recommendation (activates v0.4a stub)
```

### 8.5.3 Exclusive assignment

A feature is assigned to **at most one model**. UI enforces this: checking a feature on Model A disables that feature's checkbox on all other models. Unchecking re-enables on others.

A feature with no model assigned is **disabled in the app**:
- "Ask Claude" button greyed out with tooltip "Configure a model for Explain field in Settings"
- RFP extract button likewise
- Quick Sizing LLM-assist falls back silently to rule-based

### 8.5.4 Clear per model

Each configured model row in Settings has a "Clear assignments" button that releases all features currently assigned to it (they become unassigned — must be reassigned elsewhere).

### 8.5.5 Provider credentials storage

- API keys stored in SQLite (new `configured_models` table) encrypted with a key derived from env var `MODEL_STORE_SECRET` (32+ chars, user-generated)
- On first boot, if `MODEL_STORE_SECRET` is unset, app generates one, writes to `.env`, and logs a warning to back it up. Without the secret, stored keys cannot be decrypted (by design — no backdoor).
- Keys never returned to UI in plaintext. Masked as `sk-...****`. To change: user re-enters.
- Fallback: if decryption fails, Settings shows banner "Stored credentials cannot be decrypted — re-enter them."

### 8.5.6 Settings page (new `/settings` route)

Replaces the v0.4a stub.

**Layout:**
- Header: "LLM Settings" + brief description
- "Configured Models" section — list of models with "+ Add Model" button
- Each model row (expandable):
  - Label, provider, model identifier
  - API key field (masked if already set)
  - Feature assignment checkboxes (disabled when feature owned by another model, with tooltip showing the owner)
  - "Test Connection" button
  - "Clear assignments" button
  - Delete model button
- Bottom: "Feature Routing Summary" table — for each feature, which model handles it (or "None — feature disabled")

**Validation:**
- "Test Connection" sends a minimal prompt (<10 tokens) to the provider; reports success or error message
- On save, if any feature is unassigned, a confirmation banner appears (non-blocking — user can save anyway)

### 8.5.7 Runtime routing

`getLlmProviderForFeature(feature: LlmFeatureId): LlmProvider | null` replaces `getLlmProvider()`.

Callers must handle `null` — feature is disabled. The existing `getLlmProvider()` remains as a deprecated shim that reads `.env` (backward compat for any call sites not yet migrated).

### 8.5.8 Backward compatibility

On first boot after v0.4b upgrade:
- If `configured_models` table is empty AND `.env` has `LLM_PROVIDER` set, a migration creates a default `ConfiguredModel` from env config and assigns it to **all six features**
- `.env` variables remain readable as a fallback if the `configured_models` table is empty (in case the user cleared all models)

---

## A.2 — §5.1 Data model additions (v0.4b portion)

Add to existing `DiscoveryState`:

```ts
discovery: {
  // ... existing fields ...
  hardware: {
    // ... existing fields ...
    preferredServer?: string          // NEW: server SKU id from data/servers.json
  }
}
```

Add to existing `BuildState`:

```ts
build: {
  // ... existing fields ...
  bomOverrides: Record<string, Partial<BomItem>>   // NEW: keyed by bom item id
}
```

Add new top-level store slice:

```ts
settings: {
  configuredModels: ConfiguredModel[]
  featureRouting: Record<LlmFeatureId, string | null>  // featureId → modelId | null
}
```

---

## A.3 — §5.2 SQLite schema additions

```
configured_models
  (id TEXT PRIMARY KEY,
   label TEXT NOT NULL,
   provider TEXT NOT NULL,                    -- 'anthropic' | 'openai-compatible'
   provider_config_encrypted TEXT NOT NULL,   -- AES-256-GCM encrypted JSON
   assigned_features_json TEXT NOT NULL,      -- JSON array of LlmFeatureId
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL,
   last_validated_at TEXT,
   is_valid INTEGER                            -- 0/1/null
  )

settings_kv
  (key TEXT PRIMARY KEY,
   value_json TEXT NOT NULL,
   updated_at TEXT NOT NULL)
  -- used for singleton settings (e.g., featureRouting map if not embedded in configured_models)
```

---

## A.4 — §6.4 Export — BoM overrides surfaced

Add to existing §6.4:

### 6.4.x BoM override UI

In the Build page → BoM table, each line has:
- **Editable `unitPriceUsd` input** inline; when changed, saved to `build.bomOverrides[itemId].unitPriceUsd`
- **"Swap item" dropdown** showing alternative catalog items in the same `category`; saves to `build.bomOverrides[itemId]` with replacement item fields
- **Visual indicator** ("✎" icon or distinct background) when a line has any override
- **"Reset to catalog" link** per line (only visible when overridden)

### 6.4.y Exports reflect overrides

All five export outputs (Proposal PDF, Proposal Word, JSON BoM, Build Report PDF, Build Report MD) must:
- Render overridden values, not catalog defaults
- Include a note in the BoM table header when any override is active: "Prices/items overridden from catalog"

---

## A.5 — §6.6 Quick Sizing — LLM-assist activation

Update §6.6.3 (added in v0.4a):

### 6.6.3 Output (updated for v0.4b)

Replace step 2:

> 2. Determine candidate models:
>    - If user picked a specific model → use it
>    - If user chose "Let the app recommend":
>      - If `quick-sizing-assist` feature has a configured model → call LLM with objective + scale + latency + deployment → get 1–3 candidates with rationale
>      - Otherwise → fall back to rule-based recommender from v0.4a

### 6.6.5 LLM-assist recommender (v0.4b)

Lives in `lib/llm/prompts/quick-sizing.ts` with `PROMPT_VERSION`. Takes structured input (objective free-text, scale, latency, deployment) and returns JSON of up to 3 candidates with rationale. Uses the feature's assigned model.

On LLM failure (rate limit, parse error, no response): silently fall back to rule-based recommender. User experience is consistent.

---

## A.6 — §6.2 RFI — route extraction via assigned model

Update §6.2 (existing section):

### 6.2.y Extraction uses assigned model

RFP extraction (both paste and upload flows) calls `getLlmProviderForFeature('rfp-extract')`. If feature has no model assigned, the extract button is disabled with tooltip "Configure a model for RFP extraction in Settings".

Same pattern for draft response (`rfi-draft-response`).

---

## A.7 — Revision log update

| Version | Date | Changes |
|---|---|---|
| v0.4a | 2026-04-22 | Bug fixes + UX polish (Phase 8 ext + 11) |
| v0.4b | 2026-04-22 | **§8.5 multi-model LLM routing** with per-feature exclusive assignment, encrypted credential storage, `/settings` page replacing v0.4a stub. **§5.1 adds** `hardware.preferredServer`, `build.bomOverrides`, `settings` store slice. **§5.2 adds** `configured_models`, `settings_kv` tables. **§6.4 adds** BoM override UI and export behavior. **§6.6.3 activates** Quick Sizing LLM-assist path. **§6.2 routes** RFI extraction through assigned model. |

---

# PART B — PHASE_PLAN Additions

**Ship order: Phase 10 FIRST, then Phase 12.**

Phase 10 activates latent features (Quick Sizing LLM-assist from v0.4a, RFI with per-feature routing). Phase 12 is independent of Phase 10 and can be interleaved if needed.

---

## Phase 10 — LLM Settings & Multi-Model Routing

**Goal:** Ship `/settings` page. Users configure multiple models, assign features exclusively, test connections, clear assignments. Backward-compatible with `.env`.

**Exit criteria:** `/settings` page functional. All LLM-dependent features use the configured model for their feature. Backward-compat migration works.

### P10.1 — Database schema: configured_models + settings_kv
- **Action:** Add `configured_models` and `settings_kv` tables per PRD §5.2 addition. Write Drizzle migration.
- **Deliverable:** schema + migration
- **Verify:** `npm run db:migrate`; inspect tables in Drizzle Studio
- **Refs:** PRD §5.2 (v0.4b)

### P10.2 — Encryption utility
- **Action:** Create `lib/utils/crypto.ts` with `encrypt(plaintext: string)` and `decrypt(ciphertext: string)` using Node `crypto` module, AES-256-GCM. Key derived from env var `MODEL_STORE_SECRET`. On app boot:
  - If `MODEL_STORE_SECRET` missing → generate a 32-byte hex, append to `.env`, log warning with backup instructions, continue
  - If malformed → fail loudly
- **Deliverable:** crypto util + env-var bootstrap in `lib/db/client.ts` or similar
- **Verify:** Encrypt "test" → decrypt → "test"; wrong key → explicit error; missing secret on fresh boot → auto-generated + warning in logs
- **Refs:** PRD §8.5.5

### P10.3 — ConfiguredModel CRUD
- **Action:** `lib/settings/models.ts` — `listModels()`, `createModel(input)`, `updateModel(id, patch)`, `deleteModel(id)`, `testModel(id)`. Provider config encrypted on write, decrypted only inside provider instantiation. On read, API key is masked in the returned DTO.
- **Deliverable:** CRUD module + unit tests covering: create → list (key masked) → update (preserves key if not re-entered) → test → delete
- **Refs:** PRD §8.5.1

### P10.4 — Feature routing store
- **Action:** `lib/settings/routing.ts` — `getRouting()`, `assign(feature, modelId)`, `unassign(feature)`. Enforces exclusive assignment: assigning Feature F to Model M removes F from any other model atomically. Persist to `settings_kv` or `configured_models.assigned_features_json`.
- **Deliverable:** routing logic + unit tests (exclusive assignment enforcement)
- **Verify:** Assign Feature X to Model A → to Model B → Model A no longer has it
- **Refs:** PRD §8.5.3

### P10.5 — `getLlmProviderForFeature` wiring
- **Action:** Update `lib/llm/provider.ts`:
  - New: `getLlmProviderForFeature(feature: LlmFeatureId): LlmProvider | null`
  - Deprecate (but retain): `getLlmProvider()` — falls back to `.env` only for legacy call sites
- **Deliverable:** updated provider module + deprecation comment on `getLlmProvider`
- **Refs:** PRD §8.5.7

### P10.6 — Call-site migration
- **Action:** Migrate every LLM call site to pass a feature identifier:
  - `app/api/llm/route.ts` — accept `feature` in request body; call `getLlmProviderForFeature(feature)`; return 503 with structured error if null
  - RFI extract → `feature: 'rfp-extract'`
  - ExplainBox "Ask Claude" → `feature: 'explain-field'`
  - Build "explain sizing" → `feature: 'explain-sizing'`
  - Draft response → `feature: 'rfi-draft-response'`
  - Build Report summary (if implemented) → `feature: 'build-report-summary'`
  - Quick Sizing (from v0.4a stub hook) → `feature: 'quick-sizing-assist'`
- **Deliverable:** call sites updated
- **Verify:** Each feature hits the right model per routing; unassigned features return structured error

### P10.7 — Backward-compat migration
- **Action:** On app boot, in `lib/db/client.ts` startup:
  - If `configured_models` table is empty AND `.env` has `LLM_PROVIDER` set → create a default ConfiguredModel from env, assign to all 6 features, log once
  - Idempotent (safe to run multiple times)
- **Deliverable:** migration function + log
- **Verify:** Fresh install with `.env` configured → default model auto-created → all features work immediately without touching Settings
- **Refs:** PRD §8.5.8

### P10.8 — Settings page shell
- **Action:** Build `app/settings/page.tsx` replacing v0.4a stub. Layout per PRD §8.5.6: header, Configured Models list + "+ Add Model" button, Feature Routing Summary at bottom.
- **Deliverable:** page shell
- **Refs:** PRD §8.5.6

### P10.9 — Add Model dialog
- **Action:** `components/settings/AddModelDialog.tsx`. Fields: Label, Provider (radio: anthropic / openai-compatible), Model identifier (string), API key (password input), Base URL (conditional on openai-compatible). On submit: call `createModel` → `testModel` → save if valid.
- **Deliverable:** dialog component
- **Verify:** Add Anthropic model with valid key → saved; invalid key → error shown, not saved
- **Refs:** PRD §8.5.6

### P10.10 — Edit model row
- **Action:** Per configured model, expandable row shows all fields editable. API key shown masked; re-enter to change (empty field = no change). Feature checkboxes (next step).
- **Deliverable:** row component
- **Refs:** PRD §8.5.6

### P10.11 — Feature assignment checkboxes
- **Action:** Per model row, render 6 checkboxes (one per `LlmFeatureId`). Disabled state with tooltip when feature is owned by another model ("Currently: <other-label>"). On toggle → call `assign` / `unassign`.
- **Deliverable:** checkbox UI + routing wire
- **Verify:** Exclusive assignment visible in UI; unchecking on Model A does not auto-enable on others
- **Refs:** PRD §8.5.3

### P10.12 — Test Connection button
- **Action:** Per model row, button calls `testModel(id)`. Shows spinner → green checkmark + "Connected" or red + error message.
- **Deliverable:** button + state
- **Refs:** PRD §8.5.6

### P10.13 — Clear Assignments button
- **Action:** Per model, button confirms then removes this model from all assigned features (they become unassigned).
- **Deliverable:** button + confirmation dialog
- **Refs:** PRD §8.5.4

### P10.14 — Feature Routing Summary
- **Action:** Bottom of Settings page: table with rows (Feature, Assigned Model, Status). Status = green ✓ when assigned, red ✗ when unassigned. Rows clickable to scroll to the relevant model.
- **Deliverable:** summary table
- **Refs:** PRD §8.5.6

### P10.15 — UI disables for unassigned features
- **Action:** Audit and update UI entry points:
  - ExplainBox "Ask Claude" button
  - RFI extract button(s)
  - Build "explain sizing" buttons
  - Quick Sizing "Let the app recommend" (on LLM path — gracefully falls back to rule-based, no disable needed)
- Each disabled state shows tooltip linking to `/settings`.
- **Deliverable:** all entry points routing-aware
- **Verify:** Clear all assignments → every LLM action either greys out (with tooltip) or uses its fallback
- **Refs:** PRD §8.5.3

### P10.16 — Quick Sizing LLM-assist activation
- **Action:** Update `lib/quick-sizing/recommender.ts` (from v0.4a stub) to call `getLlmProviderForFeature('quick-sizing-assist')` when user chose "Let the app recommend". On null or LLM failure → rule-based fallback. Use prompt in `lib/llm/prompts/quick-sizing.ts` (create if missing).
- **Deliverable:** activated LLM path + prompt + fallback logic
- **Verify:** With `quick-sizing-assist` assigned, LLM responds with candidates; remove assignment → rule-based used; force LLM failure → rule-based used silently
- **Refs:** PRD §6.6.3, §6.6.5

### P10.17 — Smoke test
- **Action:** End-to-end:
  1. Configure 3 models (Anthropic Opus; OpenAI-compat via local Ollama with Llama; Anthropic Haiku for lighter tasks)
  2. Assign RFP extraction → Opus, ExplainBox → Llama, Explain Sizing → Haiku, Quick Sizing → Opus
  3. Test each feature → verify correct model
  4. Clear assignments on Ollama → ExplainBox greys out with tooltip
  5. Re-assign → works again
  6. Delete a model entirely → any assigned features become unassigned
- **Deliverable:** CHANGELOG entry
- **Refs:** PRD §8.5 all

---

## Phase 12 — Server & BoM Override

**Goal:** Give users full override control over server SKU (in Discovery) and individual BoM line items (in Build). Exports reflect overrides.

**Exit criteria:** Discovery has server override; Build BoM allows per-line price + swap + reset; all 5 exports reflect overrides.

### P12.1 — Discovery schema: preferredServer
- **Action:** Add `discovery.hardware.preferredServer?: string` per PRD §5.1 (v0.4b). Update Zod schema + TypeScript types.
- **Deliverable:** schema + types
- **Refs:** PRD §5.1 (v0.4b)

### P12.2 — Server selector UI
- **Action:** In `components/discovery/HardwareForm.tsx`, add server dropdown below preferred GPU. Options filtered by:
  1. `preferredVendor` (if set and != 'either')
  2. GPU compatibility (via `supported_gpu_ids` in `data/servers.json`, cross-ref with `preferredGpu` if set)
- When filters result in zero options, show helper text: "No servers match your GPU + vendor. Clear a filter."
- Dropdown is Optional (blank = auto-select).
- Mark as Skippable with default = blank (auto-select) per PRD §6.1 classification.
- **Deliverable:** dropdown + filter logic + explain-box entry
- **Verify:** Vendor = Dell → only Dell servers; Vendor = either → all servers; GPU = MI300X → only AMD-capable servers
- **Refs:** PRD §5.1 (v0.4b)

### P12.3 — Sizing engine respects preferredServer
- **Action:** Update server selection in `lib/sizing/index.ts` (or wherever chosen). If `preferredServer` set AND compatible with chosen GPU → use it. If incompatible → auto-select fallback AND emit engine note: "Preferred server '<label>' doesn't support <gpu>; auto-selected '<actual>'."
- **Deliverable:** server-selection update + engine note
- **Verify:** Unit test — preferred honored when compatible, warning issued when not
- **Refs:** PRD §5.1 (v0.4b), docs/sizing-math.md §5

### P12.4 — BoM overrides data model
- **Action:** Add `build.bomOverrides: Record<string, Partial<BomItem>>` to store (PRD §5.1 v0.4b). Persistence via SQLite autosave.
- **Deliverable:** store slice + persistence
- **Refs:** PRD §5.1 (v0.4b)

### P12.5 — BoM table: editable unit price
- **Action:** In Build page BoM table (`components/build/BomTable.tsx` or similar), each line's `unitPriceUsd` is an inline editable input. Change → save to `bomOverrides[itemId].unitPriceUsd`. Visual: "✎" icon + distinct background when overridden.
- **Deliverable:** editable cell + state wiring
- **Verify:** Edit price → total capex updates immediately; reload → override persists
- **Refs:** PRD §6.4.x (v0.4b)

### P12.6 — BoM table: swap item dropdown
- **Action:** Per line, "Swap" dropdown shows alternative catalog items of the same `category` (e.g., swap MI300X for H200; swap XE9680 for XD670). On select → save to `bomOverrides[itemId]` with swapped item fields (name, unitPrice, vendor). Totals recompute.
- **Deliverable:** dropdown + swap logic
- **Verify:** Swap an item; BoM total updates; exports reflect swap
- **Refs:** PRD §6.4.x (v0.4b)

### P12.7 — BoM table: Reset to catalog
- **Action:** Per overridden line, "Reset" link removes the override entry for that item; line reverts to catalog values.
- **Deliverable:** reset action
- **Verify:** Override a line → click Reset → line back to catalog
- **Refs:** PRD §6.4.x (v0.4b)

### P12.8 — Exports reflect overrides
- **Action:** Update all 5 export paths:
  - `app/api/export/pdf/route.ts` (Proposal PDF)
  - `app/api/export/docx/route.ts` (Proposal Word)
  - `app/api/export/bom/route.ts` (JSON BoM)
  - `app/api/export/build-report-pdf/route.ts`
  - `app/api/export/build-report-md/route.ts`
- Each reads `build.bomOverrides` and merges before rendering. BoM table header in output includes "Prices/items overridden from catalog" when any overrides present.
- **Deliverable:** consistent override merging across all 5 routes
- **Verify:** Override a line → export all 5 formats → override visible in each
- **Refs:** PRD §6.4.y (v0.4b)

### P12.9 — Smoke test
- **Action:** End-to-end:
  1. Create project, Discovery vendor = AMD + preferredServer = Dell XE9680 (incompatible)
  2. Go to Build → engine note flags mismatch, alternate server chosen
  3. Change Discovery preferredServer = Supermicro SMC (compatible) → honored, no warning
  4. In Build BoM, override 2 lines: one price, one swap
  5. Export all 5 formats → verify overrides in each
  6. Reset one override → catalog returns
- **Deliverable:** CHANGELOG entry
- **Refs:** PRD §5.1, §6.4.x (v0.4b)

---

## Revision log update

| Version | Date | Changes |
|---|---|---|
| v0.4b | 2026-04-22 | **Phase 10 (P10.1–P10.17):** LLM Settings page, multi-model routing with exclusive feature assignment, encrypted credential storage, `.env` backward compat, Quick Sizing LLM-assist activation. **Phase 12 (P12.1–P12.9):** Discovery preferredServer override with GPU-compatibility filtering, Build BoM per-line price + swap + reset, all 5 exports reflect overrides. |
