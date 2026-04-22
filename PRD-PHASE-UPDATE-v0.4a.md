# PRD & PHASE_PLAN Update v0.4a — Bug Fixes + UX Polish

**Type:** Addendum to PRD.md v0.3 → v0.4a and PHASE_PLAN.md
**Date:** 2026-04-22
**Scope:** Phase 8 extension (bugs) + Phase 11 (UX polish)
**Ship order:** Phase 8 extension FIRST (unblocks current use), then Phase 11
**Follow-up addendum:** v0.4b will add Phase 10 (LLM Settings) and Phase 12 (Server/BoM override)

> This document contains both PRD updates (Part A) and PHASE_PLAN additions (Part B). Apply Part A to PRD.md first, then append Part B to PHASE_PLAN.md.

---

# PART A — PRD Updates (PRD.md → v0.4a)

## A.1 — §6.1 Discovery revisions (update existing section)

Add the following sub-sections to existing §6.1:

### 6.1.x Required fields + Skip toggle

Fields are classified into three categories:
- **Required** — must have a value before Build is accessible
- **Skippable required** — required by default, but has a sensible engine default; user can toggle "Use default" to skip entering
- **Optional** — no constraint; blank means "not specified"

Classification table (initial set):

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

**Note:** `hardware.preferredServer` is deferred to v0.4b (Phase 12).

UI rendering:
- **Required** fields marked with red asterisk
- **Skippable** fields have a small "Use default: <value>" toggle next to them; when on, the input is disabled and the default value used at sizing time
- **Optional** fields unmarked

Defaults above live in `lib/discovery/defaults.ts` and are the single source of truth.

### 6.1.y Progress gating

Build section is usable when all **Required** fields have values AND all **Skippable required** fields either have values OR have "Use default" enabled. Optional fields never block.

Top-of-Discovery banner shows:
- Red: "Missing required fields: <list>" (incomplete)
- Amber: "Ready to size — N defaults in use" (with link "Review defaults")
- Green: "All fields filled" (no skips)

---

## A.2 — New §6.6 Quick Sizing Mode

New sub-flow accessible from the sidebar ("+ Quick Sizing" button) or the empty landing page state.

### 6.6.1 Purpose
Allow fast project creation for demos, discovery-call starters, or rough-order-of-magnitude sizing. User answers 5 questions in plain language, app fills the rest with defaults. LLM-based model recommendation is added in v0.4b; v0.4a uses a rule-based recommender only.

### 6.6.2 Flow

Step 1 — **Objective** (free-text): "What are you trying to do?" Example: "Internal chatbot for 200 employees for HR questions."

Step 2 — **Model choice**: radio option:
- "I know the model" → text input, matched fuzzy-search against `data/models.json`
- "Let the app recommend" → rule-based recommendation (v0.4a) or LLM-assisted (added in v0.4b)

Step 3 — **Scale**: concurrent users (number input + slider for quick feel)

Step 4 — **Latency sensitivity**: radio:
- Real-time chat (< 5s end-to-end, streaming)
- Responsive (< 15s end-to-end)
- Batch / no preference

Step 5 — **Deployment**: two dropdowns:
- Pattern (internal / external-api / gpuaas / saas)
- Target (on-prem / cloud / either)

### 6.6.3 Output

On submit:
1. Create a new project
2. Determine candidate models:
   - If user picked a specific model → use it
   - If user chose "Let the app recommend" → rule-based recommender returns 1–3 candidates with rationale (v0.4a); user picks one. v0.4b adds LLM-assisted recommender as an alternative path.
3. Apply the chosen model metadata to `discovery.model`
4. Apply defaults per §6.1 table for all other fields (mark them in `_skipped`)
5. Set `_source = 'quick-sizing'`
6. Navigate to Discovery with a top banner: "Quick Sizing applied with N defaults. Review defaults."

### 6.6.4 Rule-based recommender (v0.4a)

Lives in `lib/quick-sizing/recommender.ts`. Pure function.

Rough bands (starter logic — refine with usage):
- < 50 concurrent + responsive/batch → 7B–13B class candidates
- 50–500 concurrent → 7B–70B based on latency
- 500+ concurrent → smaller models favored, multi-replica
- Real-time latency → favor smaller models + stronger quantization

Returns up to 3 candidates from `data/models.json` with plain-English rationale per candidate.

### 6.6.5 Acceptance criteria
- [ ] Quick Sizing completes in < 60s end-to-end
- [ ] Works without any LLM feature configured (rule-based path)
- [ ] Every applied default traceable (banner links to "review defaults")
- [ ] Resulting project is a normal project (editable, deletable, exportable)
- [ ] LLM-assist hook placeholder exists but is stubbed to rule-based in v0.4a

---

## A.3 — §5.1 Data model additions (partial — v0.4a portion)

Add to existing `DiscoveryState`:

```ts
discovery: {
  // ... existing fields ...
  _skipped: string[]        // NEW: fieldIds where user enabled "use default"
  _source: 'manual' | 'quick-sizing' | 'rfp-import'  // NEW: creation source
}
```

**Note:** `preferredServer` and `bomOverrides` are added in v0.4b.
**Note:** `settings` (for LLM routing) is added in v0.4b.

### Rationale
- `_skipped` — tracks which fields use default; drives UI "review defaults" view
- `_source` — informational; future-proofs analytics and drives the Quick Sizing banner

---

## A.4 — §6.0 Nav tweaks

Update existing §6.0.1 sidebar order. New order, top to bottom:

1. Logo + App name ("ML Sizer") — **clickable, routes to `/`**
2. Theme toggle (moon/sun)
3. `[+ New Project]` button
4. `[+ Quick Sizing]` button (new)
5. 🏠 All Projects
6. 📖 How it works
7. ⚙ Settings *(placeholder link — Settings page itself added in v0.4b)*
8. ─── (separator) ───
9. Current Project block (if inside project)
10. (flex spacer)
11. Collapse toggle (pinned bottom)

**Change from v0.3:** theme toggle moved from bottom to top (position 2).

### 6.0.x ML Sizer home link
Clicking "ML Sizer" in the sidebar header routes to `/`. Applies to both expanded and collapsed states (collapsed logo clickable; aria-label="Home").

---

## A.5 — §6.2 RFI clarification (update existing section)

Add to existing §6.2:

### 6.2.x Apply flow (explicit user action required)

**The app does NOT automatically populate Discovery from RFP extraction.** User must explicitly apply.

After extraction:
- Each extracted requirement has:
  - "Apply" button (single) → maps this one requirement to its linked Discovery field; Discovery updates immediately
  - Status pill: **Unapplied** / **Applied** / **Conflict** (if Discovery already has a non-matching value)
- Bulk "Apply All Unapplied" button at the top of the list
- Conflict resolution dialog on Apply: "Discovery already has X; overwrite with Y?"

---

## A.6 — New §14.9 Accessible text rules

Add to §14 Design System:

### 14.9 Text color accessibility

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

## A.7 — Revision log update

| Version | Date | Changes |
|---|---|---|
| v0.3 | 2026-04-21 | UX redesign + Build Report + Design System |
| v0.4a | 2026-04-22 | §6.1 required/skippable/optional field classes with full classification table and defaults; §6.6 Quick Sizing mode with rule-based recommender (LLM-assist stub to be activated in v0.4b); §5.1 adds `_skipped`, `_source`; §6.0 sidebar reorder + ML Sizer home link; §6.2 explicit Apply flow for RFI; §14.9 accessible text rules |

---

# PART B — PHASE_PLAN Additions

**Append in this order: Phase 8 extension steps first, then Phase 11.**

Do **not** ship Phase 11 before Phase 8 extension is complete — the RFI Apply fixes in P8.18 are prerequisites for P11.14.

---

## Phase 8 — EXTENSION (append P8.12 through P8.19)

### P8.12 — Hydration mismatch warning on `<body>`
- **Action:** Add `suppressHydrationWarning` to the `<body>` element in `app/layout.tsx`. Already applied to `<html>`; extend to `<body>`. Root cause: browser extensions (Grammarly, etc.) inject attributes at runtime.
- **Deliverable:** 1-line change to root layout
- **Verify:** Reload page with Grammarly or similar extension installed; no hydration warning in console
- **Refs:** User reported ExplainBox hydration warning

### P8.13 — RFP upload: DOMMatrix error
- **Action:** Swap `pdfjs-dist` (browser-only) for `pdf-parse` (Node-safe) in server-side PDF parsing.
  ```bash
  npm uninstall pdfjs-dist
  npm install pdf-parse @types/pdf-parse
  ```
  In `app/api/upload/route.ts`:
  ```ts
  import pdfParse from 'pdf-parse'
  const { text } = await pdfParse(buffer)
  ```
- **Deliverable:** dependency swap + route update
- **Verify:** Upload the failing RFP; extraction succeeds
- **Refs:** User reported "DOMMatrix is not defined"

### P8.14 — PDF download: "site not available" crash
- **Action:** Investigate `app/api/export/pdf/route.ts` (and related export routes). Likely causes:
  - Missing `export const runtime = 'nodejs'` (route defaulting to edge, which can't run `@react-pdf/renderer`)
  - Unhandled exception inside PDF generation
  - Transitive `pdfjs-dist` import re-introducing DOMMatrix issue
- **Required fixes:**
  1. Add `export const runtime = 'nodejs'` to every export route
  2. Wrap generation in try/catch with structured error response (JSON `{ error, detail }`)
  3. Server log full stack on error
- **Deliverable:** routes updated across PDF, Word, Build Report PDF
- **Verify:** Download succeeds; if it fails, user sees structured error in dev tools
- **Refs:** User reported

### P8.15 — Build Report MD data mismatch
- **Action:** The extractor in `lib/export/build-report-extract.ts` pulls incorrect data. Diagnose and fix.
- **Diagnosis steps:**
  1. Take the reference Llama-70B sample project with complete Discovery + Build
  2. Export Build Report MD
  3. Diff actual vs expected against the Build page UI, section by section
  4. Identify mapping errors (wrong store paths, missing override merge, wrong field labels)
- **Fixes expected in:**
  - `lib/export/build-report-extract.ts` (data pulls)
  - `lib/export/build-report-md.ts` (rendering / labels)
- **Deliverable:** fixed extractor + renderer + regression test with fixture project
- **Verify:** MD output matches Build page 1:1 for hardware, infra, modelPlatform, application, summary tables
- **Refs:** P9.2, P9.3, user report

### P8.16 — Build Report: remove Node Pool table
- **Action:** The "node pools" table is consistently empty. Remove from both MD and PDF templates. Add a `TODO: restore when node pool rendering is fixed` comment at the removal site.
- **Deliverable:** table removed from `lib/export/build-report-md.ts` and `lib/export/build-report-pdf.tsx`
- **Refs:** User observation

### P8.17 — Build Report: Engine Notes missing
- **Action:** Engine notes (from `lib/sizing/notes.ts`) are populated in `buildState.notes` but not pulled by the extractor. Fix: extractor reads `notes`, renderer outputs them under an "Engine Notes" section (grouped by layer where available).
- **Deliverable:** extractor + renderer fix
- **Verify:** Build page has notes → export MD → notes appear in Engine Notes section, grouped by layer
- **Refs:** User observation

### P8.18 — RFI "Apply to Discovery" broken
- **Action:** The Apply button on RFI extracted items doesn't update Discovery. Investigate and fix. Likely causes:
  - Store action not dispatched
  - Wrong `fieldId` resolver (extracted item → Discovery field path)
  - Update reverted by subsequent autosave race
- **Deliverable:** fix + integration test: paste sample RFP → click Apply on one item → assert Discovery store updated
- **Verify:** As described
- **Refs:** User reported

### P8.19 — RFI: confirm no auto-apply
- **Action:** Audit current code for any auto-apply behavior after extraction (per PRD §6.2.x, extraction should not touch Discovery automatically). If found, remove.
- **Deliverable:** audit + removal if needed; integration test
- **Verify:** Paste RFP → extracted items appear; Discovery is NOT modified until user clicks Apply
- **Refs:** PRD §6.2.x (v0.4a)

---

## Phase 11 — UX Polish Round 2

**Goal:** Ship visible UX wins: text contrast, sidebar reorder, ML Sizer home link, required field markers, skippable toggle, Quick Sizing flow, RFI Apply polish.

**Exit criteria:** All user-requested polish items shipped; no regressions from Phase 7.

### P11.1 — Text color contrast audit
- **Action:** Global audit via grep for `text-[var(--text-muted)]` and equivalent arbitrary-value usages across components. Replace with `--text-secondary` unless the element is a placeholder or disabled control. Run `axe-core` DevTools scan as regression check.
- **Deliverable:** global replacement + axe report before/after
- **Verify:** Toggle both themes; all labels and helper text clearly readable; axe scan passes AA on text elements
- **Refs:** PRD §14.9 (v0.4a)

### P11.2 — Sidebar reorder
- **Action:** Update `components/Sidebar/Sidebar.tsx` to the new order per PRD §6.0.1 (v0.4a). Key changes:
  - Theme toggle moves from pinned-bottom to position 2 (right under logo)
  - New "+ Quick Sizing" button in position 4 (after "+ New Project")
  - New "⚙ Settings" link in position 7 (under "How it works") — **placeholder route only in v0.4a** (Settings page itself is v0.4b / Phase 10). Link to `/settings` which renders a stub page.
- **Deliverable:** reordered sidebar + stub `/settings` page saying "Settings coming in next release"
- **Verify:** Visual check; both collapsed and expanded states correct; clicking Settings shows stub
- **Refs:** PRD §6.0.1 (v0.4a)

### P11.3 — "ML Sizer" home link
- **Action:** In `components/Sidebar/SidebarHeader.tsx`, wrap the logo + title in `<Link href="/">`. Ensure keyboard focusable. When sidebar collapsed, logo-only still clickable with `aria-label="Home"`.
- **Deliverable:** logo clickable
- **Verify:** Click from any route → lands on `/`; keyboard tab + enter also works
- **Refs:** PRD §6.0.x (v0.4a)

### P11.4 — Field meta + defaults
- **Action:**
  1. Create `lib/discovery/defaults.ts` — default values per PRD §6.1 table (v0.4a). Single source of truth.
  2. Create `lib/discovery/field-meta.ts` — classifies every field as `required` / `skippable` / `optional`.
- **Deliverable:** two files; typed constants
- **Verify:** Types match `DiscoveryState`; defaults table complete
- **Refs:** PRD §6.1.x

### P11.5 — Required markers on form fields
- **Action:** Update every form in `components/discovery/*Form.tsx`. Add red asterisk next to labels of fields with class `required`. Render a muted helper text for `optional` fields ("Optional").
- **Deliverable:** label rendering update across all 5 Discovery form components
- **Verify:** Asterisks appear only on truly-required fields; visual consistency across tabs
- **Refs:** PRD §6.1.x

### P11.6 — Skippable "Use default" toggle
- **Action:** For fields classified `skippable`, render a small Switch next to the input with label "Use default: <value>". When on:
  - Input becomes disabled
  - `_skipped` array in Discovery state includes the fieldId
  - Validation treats this field as complete
- **Deliverable:** reusable `<SkippableField>` wrapper + applied to every skippable field
- **Verify:** Toggle skip on a field; persists; reload; still skipped
- **Refs:** PRD §6.1.x

### P11.7 — Validation respects _skipped
- **Action:** Update `lib/utils/validation.ts` Zod schemas. A field being in `_skipped` counts as valid for required-gating. (Schema still validates type if value is present.)
- **Deliverable:** updated validation + tests
- **Verify:** Skipping a required field allows Build gate to open; unskipping requires re-entering
- **Refs:** PRD §6.1.y

### P11.8 — Progress banner
- **Action:** Add `<DiscoveryProgressBanner>` at top of Discovery page. Three states: red (missing required), amber (ready with N defaults), green (all filled manually). Per PRD §6.1.y.
- **Deliverable:** banner component + integration
- **Verify:** State changes correctly as fields are filled/skipped
- **Refs:** PRD §6.1.y

### P11.9 — Review Defaults modal
- **Action:** Clicking "Review defaults" in the P11.8 banner opens a modal listing each skipped field with its default value and an "Override" link. Override link toggles skip off and focuses the field.
- **Deliverable:** modal component
- **Verify:** Modal shows correct list; Override link works
- **Refs:** PRD §6.1.y

### P11.10 — Build gate uses new validation
- **Action:** Update the gate in `app/project/[id]/build/page.tsx` (or wherever gating lives) to use the updated validation from P11.7.
- **Deliverable:** gate update
- **Verify:** Discovery with all required filled-or-skipped → Build accessible; missing required → Build blocked with banner
- **Refs:** PRD §6.1.y

### P11.11 — Quick Sizing sidebar entry
- **Action:** Add "+ Quick Sizing" button to sidebar (already placed in P11.2 as position 4; this step wires its route). Also add on empty-state landing page alongside "+ New Project".
- **Deliverable:** nav wiring + landing empty-state update
- **Refs:** PRD §6.0.1 (v0.4a)

### P11.12 — Quick Sizing form
- **Action:** Build `app/quick-sizing/page.tsx`. Five-step form per PRD §6.6.2. Use shadcn Stepper pattern or plain sequential form with "Next"/"Back" buttons. Minimal styling; this is a functional path, not a marketing page.
- **Deliverable:** page + form
- **Verify:** Form captures all 5 answers; Back/Next navigation works
- **Refs:** PRD §6.6

### P11.13 — Rule-based recommender
- **Action:** Build `lib/quick-sizing/recommender.ts` per PRD §6.6.4. Pure function: `(scale, latency, deployment) => Candidate[]`. Returns up to 3 candidates from `data/models.json` with rationale.
- **Deliverable:** recommender + unit tests covering the 4 scale bands
- **Verify:** Tests pass; recommendations are sensible
- **Refs:** PRD §6.6.4

### P11.14 — Quick Sizing apply flow
- **Action:** On submit + candidate picked:
  1. `createProject({ _source: 'quick-sizing' })`
  2. Apply model metadata from catalog → `discovery.model`
  3. Apply defaults from `lib/discovery/defaults.ts` → other fields; mark them in `_skipped`
  4. Navigate to `/project/<id>/discovery` with banner state flagged
- **Deliverable:** apply logic + integration test (end-to-end: Quick Sizing form → Discovery with 12+ defaults)
- **Verify:** Resulting project is a regular project; no LLM dependency
- **Refs:** PRD §6.6.3

### P11.15 — LLM-assist stub
- **Action:** Wire the "Let the app recommend" radio to the rule-based recommender for now. Add a TODO hook point in `lib/quick-sizing/recommender.ts` for the LLM path (to be activated by Phase 10 / v0.4b).
- **Deliverable:** hook point + clear TODO comment
- **Refs:** PRD §6.6.4 (v0.4a note)

### P11.16 — Quick Sizing banner on Discovery
- **Action:** If `_source === 'quick-sizing'`, show dismissible banner at top of Discovery: "Quick Sizing applied with N defaults. Review defaults." Dismiss state per-project.
- **Deliverable:** banner
- **Refs:** PRD §6.6.3 step 6

### P11.17 — RFI Apply polish
- **Action:** Depends on P8.18 fix being in place. Improve UX:
  - Apply button per extracted item with status pill (Unapplied / Applied / Conflict)
  - Bulk "Apply All Unapplied" at top
  - Conflict resolution dialog: "Discovery already has X; overwrite with Y?"
- **Deliverable:** updated RFI UI
- **Verify:** All three states reachable; conflict dialog works
- **Refs:** PRD §6.2.x, P8.18

### P11.18 — Smoke test
- **Action:** Full walkthrough:
  1. From `/`, Quick Sizing path → Discovery with banner, toggle some skips, review defaults modal, proceed to Build
  2. "+ New Project" path → Discovery with required markers, skippable toggles, progress banner states
  3. RFI path → paste sample RFP, extract, apply one, apply-all unapplied
  4. Theme toggle in new position, ML Sizer home link, all routes
- **Deliverable:** CHANGELOG entry
- **Verify:** No regressions from Phase 7; all PRD v0.4a acceptance criteria met

---

## Troubleshooting entries (prepopulated)

Append to existing troubleshooting section:

```
P8.12 — Hydration mismatch on <body>
  Symptom: "A tree hydrated but some attributes of the server rendered HTML
           didn't match the client properties"
  Root cause: browser extensions (Grammarly, etc.) inject attributes onto <body>
  Fix: add suppressHydrationWarning to <body> in app/layout.tsx
  Regression test: none (dev-only warning)

P8.13 — DOMMatrix not defined on PDF upload
  Symptom: Server throws "DOMMatrix is not defined"
  Root cause: pdfjs-dist assumes browser APIs not available in Node SSR
  Fix: swap to pdf-parse
  Regression test: tests/fixtures/rfp-samples/*.pdf

P8.14 — PDF download "site not available"
  Symptom: Client sees "site was not available" on PDF download
  Root cause: TBD — likely edge runtime or unhandled exception
  Fix: runtime='nodejs' + try/catch + structured error
  Regression test: integration test per export route

P8.15 — Build Report MD data mismatch
  Symptom: Hardware/Infra/etc tables have wrong or missing values
  Root cause: extractor reads wrong store paths
  Fix: repair mappings + regression test with fixture
  Regression test: tests/export/build-report.test.ts

P8.17 — Engine Notes missing from Build Report
  Symptom: Engine Notes section empty despite notes in Build page
  Root cause: extractor doesn't pull buildState.notes
  Fix: add to extractor + renderer
  Regression test: as P8.15

P8.18 — RFI Apply to Discovery broken
  Symptom: Clicking Apply on extracted requirement doesn't update Discovery
  Root cause: TBD
  Fix: wire Apply to store dispatch + integration test
  Regression test: tests/rfi/apply.test.ts
```

---

## Revision log update

| Version | Date | Changes |
|---|---|---|
| v0.4a | 2026-04-22 | **Phase 8 extension (P8.12–P8.19):** hydration warning, DOMMatrix, PDF download crash, Build Report MD data, Node Pool table removed, Engine Notes restored, RFI Apply fixed, RFI confirm-before-apply. **Phase 11 (P11.1–P11.18):** text contrast, sidebar reorder + theme-toggle-to-top, ML Sizer home link, required field markers, skippable toggle + defaults, progress banner, Review Defaults modal, Quick Sizing flow (rule-based; LLM-assist stub), RFI Apply polish. |
