# Phase Plan — File 4 of 5 (Phases 9–11)

> Index: [PHASE_PLAN.md](./PHASE_PLAN.md) · Prev: [phase_plan_3.md](./phase_plan_3.md) · Next: [phase_plan_5.md](./phase_plan_5.md)

## Legend

- ☐ = not started · ◐ = in progress · ☑ = done · ⊘ = skipped/deferred
- **Deliverable:** concrete artifact produced by the step
- **Verify:** how to confirm the step is complete
- **Refs:** links to PRD sections and other docs

---

## Phase 9 — Build Report Export

**Goal:** Ship Build Report in PDF and Markdown formats, distinct from the existing customer-facing Proposal.

**Exit criteria:** User can export a Build Report (PDF or MD) from the Export page that contains all Build data in structured form, suitable for internal review or PR attachment.

### ☑ P9.1 — Build Report content spec
- **Action:** Formalize the structure. Write `lib/export/build-report-spec.ts` as a data-shape description (typed) of what a Build Report contains. Sections: cover, TOC, per-layer panels (Hardware/Infra/ModelPlatform/Application), summary totals, assumptions, BoM table, engine notes.
- **Deliverable:** TypeScript type + fixture JSON example
- **Verify:** Type compiles; fixture validates
- **Refs:** PRD §6.4 (revised)

### ☑ P9.2 — Build Report data extractor
- **Action:** `lib/export/build-report-extract.ts` — pure function: `(project: Project) => BuildReport`. Pulls from Discovery + BuildDerived + BuildOverrides + engine notes + BoM. Includes computed assumptions (MFU/MBU/overhead used for this sizing).
- **Deliverable:** extractor + unit tests
- **Verify:** Tests cover: no overrides (clean derived), with overrides (marked), MoE project, cloud deployment, on-prem deployment
- **Refs:** PRD §5.1 BuildState

### ☑ P9.3 — Build Report Markdown renderer
- **Action:** `lib/export/build-report-md.ts` — takes `BuildReport`, returns Markdown string. Include: H1 title, YAML frontmatter (project name, date), TOC, H2 per section, tables for BoM and assumptions. GitHub-flavored markdown.
- **Deliverable:** renderer + unit tests
- **Verify:** Output validates against a markdown linter; renders correctly in GitHub preview
- **Refs:** PRD §6.4 (revised)

### ☑ P9.4 — Build Report PDF components
- **Action:** `lib/export/build-report-pdf.tsx` — React-PDF components for: cover, TOC, layer sections, assumptions, BoM table. Use existing design tokens adapted to print (PDF doesn't have dark mode — always light).
- **Deliverable:** PDF component tree + preview in dev route
- **Verify:** PDF renders visually correctly in Preview/Acrobat
- **Refs:** PRD §6.4 (revised)

### ☑ P9.5 — Build Report API routes
- **Action:** `app/api/export/build-report-pdf/route.ts` and `app/api/export/build-report-md/route.ts`. Both accept `projectId`, load project, run extractor, render, return file.
- **Deliverable:** two routes
- **Verify:** Curl both endpoints; files download correctly; content matches preview
- **Refs:** PRD §6.4 (revised)

### ☑ P9.6 — Export page — add Build Report buttons
- **Action:** Update `app/project/[id]/export/page.tsx`. Section the page into two groups: "Customer Deliverables" (Proposal PDF, Proposal Word, JSON BoM) and "Internal Reports" (Build Report PDF, Build Report MD). Add brief description per item.
- **Deliverable:** updated Export page
- **Verify:** Both groups render; all five exports work
- **Refs:** PRD §6.4 (revised)

### ☑ P9.7 — Export filename convention
- **Action:** Enforce filename pattern: `<project-name-slugified>-<export-type>-<YYYY-MM-DD>.<ext>`. Examples: `acme-llm-proposal-2026-04-21.pdf`, `acme-llm-build-report-2026-04-21.md`. Implement via `lib/export/filename.ts`.
- **Deliverable:** filename utility + applied to all export routes
- **Verify:** Download files; filename matches pattern
- **Refs:** PRD §6.4 (revised) acceptance criteria

### ☑ P9.8 — Phase 9 smoke test
- **Action:** Full export cycle for the reference Llama-70B sample project. Verify Build Report PDF matches Build Report MD content-for-content. Open MD in GitHub preview for visual QA.
- **Deliverable:** recorded in CHANGELOG
- **Refs:** PRD §6.4 (revised) exit criteria

---

## Phase 10 — LLM Settings & Multi-Model Routing

**Goal:** Ship `/settings` page. Users configure multiple models, assign features exclusively, test connections, clear assignments. Backward-compatible with `.env`.

**Exit criteria:** `/settings` page functional. All LLM-dependent features use the configured model for their feature. Backward-compat migration works.

### ☑ P10.1 — Database schema: configured_models + settings_kv
- **Action:** Add `configured_models` and `settings_kv` tables per PRD §5.2 (v0.4b). Write Drizzle migration.
- **Deliverable:** schema + migration
- **Verify:** `npm run db:migrate`; inspect tables in Drizzle Studio
- **Refs:** PRD §5.2 (v0.4b)

### ☑ P10.2 — Encryption utility
- **Action:** Create `lib/utils/crypto.ts` with `encrypt(plaintext)` and `decrypt(ciphertext)` using Node `crypto`, AES-256-GCM. Key derived from `MODEL_STORE_SECRET`. On missing secret: auto-generate 32-byte hex, append to `.env`, log warning. On malformed: fail loudly.
- **Deliverable:** crypto util + env bootstrap
- **Verify:** encrypt → decrypt round-trips; wrong key → explicit error; missing secret on fresh boot → auto-generated
- **Refs:** PRD §8.5.5

### ☑ P10.3 — ConfiguredModel CRUD
- **Action:** `lib/settings/models.ts` — `listModels()`, `createModel()`, `updateModel()`, `deleteModel()`, `testModel()`. Provider config encrypted on write; API key masked in returned DTO.
- **Deliverable:** CRUD module + unit tests (create → list masked → update preserves key → test → delete)
- **Refs:** PRD §8.5.1

### ☑ P10.4 — Feature routing store
- **Action:** `lib/settings/routing.ts` — `getRouting()`, `assign(feature, modelId)`, `unassign(feature)`. Enforces exclusive assignment atomically. Persists to `configured_models.assigned_features_json`.
- **Deliverable:** routing logic + unit tests (exclusive assignment enforcement)
- **Verify:** Assign Feature X to Model A → to Model B → Model A no longer has X
- **Refs:** PRD §8.5.3

### ☑ P10.5 — getLlmProviderForFeature wiring
- **Action:** Update `lib/llm/provider.ts`: add `getLlmProviderForFeature(feature: LlmFeatureId): LlmProvider | null`. Retain `getLlmProvider()` as deprecated shim (`.env` fallback). Add `LlmFeatureId` type export.
- **Deliverable:** updated provider module
- **Refs:** PRD §8.5.7

### ☑ P10.6 — Call-site migration
- **Action:** Migrate every LLM call site to pass a feature identifier. `app/api/llm/route.ts` accepts `feature` in request body; returns 503 with structured error if provider is null. Migrate: `rfp-extract`, `explain-field`, `explain-sizing`, `rfi-draft-response`, `build-report-summary` (if used), `quick-sizing-assist` (stub hook from P11.15).
- **Deliverable:** call sites updated
- **Verify:** Each feature hits the right model per routing; unassigned → structured 503
- **Refs:** PRD §8.5.7

### ☑ P10.7 — Backward-compat migration
- **Action:** On app boot in `lib/db/client.ts`: if `configured_models` empty AND `.env` has `LLM_PROVIDER` → create default ConfiguredModel from env, assign to all 6 features, log once. Idempotent.
- **Deliverable:** migration function + log
- **Verify:** Fresh install with `.env` configured → default model auto-created → all features work
- **Refs:** PRD §8.5.8

### ☑ P10.8 — Settings page shell
- **Action:** Rewrite `app/settings/page.tsx` (replacing v0.4a stub). Layout: header + "Configured Models" list + "+ Add Model" button + Feature Routing Summary at bottom.
- **Deliverable:** page shell
- **Refs:** PRD §8.5.6

### ☑ P10.9 — Add Model dialog
- **Action:** `components/settings/AddModelDialog.tsx`. Fields: Label, Provider (radio), Model identifier, API key (password), Base URL (conditional). On submit: `createModel` → `testModel` → save if valid.
- **Deliverable:** dialog component
- **Verify:** Add Anthropic model with valid key → saved; invalid key → error shown
- **Refs:** PRD §8.5.6

### ☑ P10.10 — Edit model row
- **Action:** Expandable row per configured model. All fields editable. API key masked; re-enter to change (empty = no change).
- **Deliverable:** row component
- **Refs:** PRD §8.5.6

### ☑ P10.11 — Feature assignment checkboxes
- **Action:** 6 checkboxes per model row (one per `LlmFeatureId`). Disabled with tooltip when owned by another model ("Currently: \<label\>"). Toggle → `assign` / `unassign`.
- **Deliverable:** checkbox UI + routing wire
- **Verify:** Exclusive assignment visible; unchecking does not auto-enable on others
- **Refs:** PRD §8.5.3

### ☑ P10.12 — Test Connection button
- **Action:** Button calls `testModel(id)`. Shows spinner → green "Connected" or red error.
- **Deliverable:** button + state
- **Refs:** PRD §8.5.6

### ☑ P10.13 — Clear Assignments button
- **Action:** Confirms then removes all features assigned to this model (become unassigned).
- **Deliverable:** button + confirmation dialog
- **Refs:** PRD §8.5.4

### ☑ P10.14 — Feature Routing Summary
- **Action:** Bottom of Settings page: table (Feature / Assigned Model / Status). Status green ✓ when assigned, red ✗ when unassigned. Rows clickable to scroll to the relevant model.
- **Deliverable:** summary table
- **Refs:** PRD §8.5.6

### ☑ P10.15 — UI disables for unassigned features
- **Action:** Audit and update: ExplainBox "Ask Claude", RFI extract buttons, Build "explain sizing" buttons. Each disabled state shows tooltip linking to `/settings`. Quick Sizing LLM path: gracefully falls back to rule-based (no disable).
- **Deliverable:** all entry points routing-aware
- **Verify:** Clear all assignments → LLM actions grey out with tooltip or fall back
- **Refs:** PRD §8.5.3

### ☑ P10.16 — Quick Sizing LLM-assist activation
- **Action:** Update `lib/quick-sizing/recommender.ts` (v0.4a stub): call `getLlmProviderForFeature('quick-sizing-assist')` when "Let the app recommend". On null or failure → rule-based fallback. Create `lib/llm/prompts/quick-sizing.ts` with `PROMPT_VERSION`.
- **Deliverable:** activated LLM path + prompt + fallback
- **Verify:** With feature assigned → LLM candidates; remove assignment → rule-based; LLM failure → rule-based silently
- **Refs:** PRD §6.6.3, §6.6.5

### ☑ P10.17 — Smoke test
- **Action:** End-to-end:
  1. Configure Anthropic model → assign all features → Test Connection ✓
  2. Test ExplainBox "Ask Claude", RFI extract, Build explain sizing — all use configured model
  3. Clear all assignments → buttons grey out / fallback
  4. Re-assign → works again
  5. Delete model → features become unassigned
- **Deliverable:** CHANGELOG entry
- **Refs:** PRD §8.5

---

## Phase 11 — UX Polish Round 2

**Goal:** Ship visible UX wins: text contrast, sidebar reorder, ML Sizer home link, required field markers, skippable toggle, Quick Sizing flow, RFI Apply polish.

**Exit criteria:** All user-requested polish items shipped; no regressions from Phase 7.

### ☑ P11.1 — Text color contrast audit
- **Action:** Global audit via grep for `text-[var(--text-muted)]` and equivalent arbitrary-value usages across components. Replace with `--text-secondary` unless the element is a placeholder or disabled control. Run `axe-core` DevTools scan as regression check.
- **Deliverable:** global replacement + axe report before/after
- **Verify:** Toggle both themes; all labels and helper text clearly readable; axe scan passes AA on text elements
- **Refs:** PRD §13.9 (v0.4a)

### ☑ P11.2 — Sidebar reorder
- **Action:** Update `components/Sidebar/Sidebar.tsx` to the new order per PRD §6.0.1 (v0.4a). Key changes:
  - Theme toggle moves from pinned-bottom to position 2 (right under logo)
  - New "+ Quick Sizing" button in position 4 (after "+ New Project")
  - New "⚙ Settings" link in position 7 (under "How it works") — **placeholder route only in v0.4a** (Settings page itself is v0.4b / Phase 10). Link to `/settings` which renders a stub page.
- **Deliverable:** reordered sidebar + stub `/settings` page saying "Settings coming in next release"
- **Verify:** Visual check; both collapsed and expanded states correct; clicking Settings shows stub
- **Refs:** PRD §6.0.1 (v0.4a)

### ☑ P11.3 — "ML Sizer" home link
- **Action:** In `components/Sidebar/SidebarHeader.tsx`, wrap the logo + title in `<Link href="/">`. Ensure keyboard focusable. When sidebar collapsed, logo-only still clickable with `aria-label="Home"`.
- **Deliverable:** logo clickable
- **Verify:** Click from any route → lands on `/`; keyboard tab + enter also works
- **Refs:** PRD §6.0.x (v0.4a)

### ☑ P11.4 — Field meta + defaults
- **Action:**
  1. Create `lib/discovery/defaults.ts` — default values per PRD §6.1 table (v0.4a). Single source of truth.
  2. Create `lib/discovery/field-meta.ts` — classifies every field as `required` / `skippable` / `optional`.
- **Deliverable:** two files; typed constants
- **Verify:** Types match `DiscoveryState`; defaults table complete
- **Refs:** PRD §6.1.x

### ☑ P11.5 — Required markers on form fields
- **Action:** Update every form in `components/discovery/*Form.tsx`. Add red asterisk next to labels of fields with class `required`. Render a muted helper text for `optional` fields ("Optional").
- **Deliverable:** label rendering update across all 5 Discovery form components
- **Verify:** Asterisks appear only on truly-required fields; visual consistency across tabs
- **Refs:** PRD §6.1.x

### ☑ P11.6 — Skippable "Use default" toggle
- **Action:** For fields classified `skippable`, render a small Switch next to the input with label "Use default: <value>". When on:
  - Input becomes disabled
  - `_skipped` array in Discovery state includes the fieldId
  - Validation treats this field as complete
- **Deliverable:** reusable `<SkippableField>` wrapper + applied to every skippable field
- **Verify:** Toggle skip on a field; persists; reload; still skipped
- **Refs:** PRD §6.1.x

### ☑ P11.7 — Validation respects _skipped
- **Action:** Update `lib/utils/validation.ts` Zod schemas. A field being in `_skipped` counts as valid for required-gating. (Schema still validates type if value is present.)
- **Deliverable:** updated validation + tests
- **Verify:** Skipping a required field allows Build gate to open; unskipping requires re-entering
- **Refs:** PRD §6.1.y

### ☑ P11.8 — Progress banner
- **Action:** Add `<DiscoveryProgressBanner>` at top of Discovery page. Three states: red (missing required), amber (ready with N defaults), green (all filled manually). Per PRD §6.1.y.
- **Deliverable:** banner component + integration
- **Verify:** State changes correctly as fields are filled/skipped
- **Refs:** PRD §6.1.y

### ☑ P11.9 — Review Defaults modal
- **Action:** Clicking "Review defaults" in the P11.8 banner opens a modal listing each skipped field with its default value and an "Override" link. Override link toggles skip off and focuses the field.
- **Deliverable:** modal component
- **Verify:** Modal shows correct list; Override link works
- **Refs:** PRD §6.1.y

### ☑ P11.10 — Build gate uses new validation
- **Action:** Update the gate in `app/project/[id]/build/page.tsx` (or wherever gating lives) to use the updated validation from P11.7.
- **Deliverable:** gate update
- **Verify:** Discovery with all required filled-or-skipped → Build accessible; missing required → Build blocked with banner
- **Refs:** PRD §6.1.y

### ☑ P11.11 — Quick Sizing sidebar entry
- **Action:** Add "+ Quick Sizing" button to sidebar (already placed in P11.2 as position 4; this step wires its route). Also add on empty-state landing page alongside "+ New Project".
- **Deliverable:** nav wiring + landing empty-state update
- **Refs:** PRD §6.0.1 (v0.4a)

### ☑ P11.12 — Quick Sizing form
- **Action:** Build `app/quick-sizing/page.tsx`. Five-step form per PRD §6.6.2. Use shadcn Stepper pattern or plain sequential form with "Next"/"Back" buttons. Minimal styling; this is a functional path, not a marketing page.
- **Deliverable:** page + form
- **Verify:** Form captures all 5 answers; Back/Next navigation works
- **Refs:** PRD §6.6

### ☑ P11.13 — Rule-based recommender
- **Action:** Build `lib/quick-sizing/recommender.ts` per PRD §6.6.4. Pure function: `(scale, latency, deployment) => Candidate[]`. Returns up to 3 candidates from `data/models.json` with rationale.
- **Deliverable:** recommender + unit tests covering the 4 scale bands
- **Verify:** Tests pass; recommendations are sensible
- **Refs:** PRD §6.6.4

### ☑ P11.14 — Quick Sizing apply flow
- **Action:** On submit + candidate picked:
  1. `createProject({ _source: 'quick-sizing' })`
  2. Apply model metadata from catalog → `discovery.model`
  3. Apply defaults from `lib/discovery/defaults.ts` → other fields; mark them in `_skipped`
  4. Navigate to `/project/<id>/discovery` with banner state flagged
- **Deliverable:** apply logic + integration test (end-to-end: Quick Sizing form → Discovery with 12+ defaults)
- **Verify:** Resulting project is a regular project; no LLM dependency
- **Refs:** PRD §6.6.3

### ☑ P11.15 — LLM-assist stub
- **Action:** Wire the "Let the app recommend" radio to the rule-based recommender for now. Add a TODO hook point in `lib/quick-sizing/recommender.ts` for the LLM path (to be activated by Phase 10 / v0.4b).
- **Deliverable:** hook point + clear TODO comment
- **Refs:** PRD §6.6.4 (v0.4a note)

### ☑ P11.16 — Quick Sizing banner on Discovery
- **Action:** If `_source === 'quick-sizing'`, show dismissible banner at top of Discovery: "Quick Sizing applied with N defaults. Review defaults." Dismiss state per-project.
- **Deliverable:** banner
- **Refs:** PRD §6.6.3 step 6

### ☑ P11.17 — RFI Apply polish
- **Action:** Depends on P8.18 fix being in place. Improve UX:
  - Apply button per extracted item with status pill (Unapplied / Applied / Conflict)
  - Bulk "Apply All Unapplied" at top
  - Conflict resolution dialog: "Discovery already has X; overwrite with Y?"
- **Deliverable:** updated RFI UI
- **Verify:** All three states reachable; conflict dialog works
- **Refs:** PRD §6.2.x, P8.18

### ☑ P11.18 — Smoke test
- **Action:** Full walkthrough:
  1. From `/`, Quick Sizing path → Discovery with banner, toggle some skips, review defaults modal, proceed to Build
  2. "+ New Project" path → Discovery with required markers, skippable toggles, progress banner states
  3. RFI path → paste sample RFP, extract, apply one, apply-all unapplied
  4. Theme toggle in new position, ML Sizer home link, all routes
- **Deliverable:** CHANGELOG entry
- **Verify:** No regressions from Phase 7; all PRD v0.4a acceptance criteria met
