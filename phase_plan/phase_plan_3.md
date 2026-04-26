# Phase Plan — File 3 of 5 (Phases 6–8)

> Index: [PHASE_PLAN.md](./PHASE_PLAN.md) · Prev: [phase_plan_2.md](./phase_plan_2.md) · Next: [phase_plan_4.md](./phase_plan_4.md)

## Legend

- ☐ = not started · ◐ = in progress · ☑ = done · ⊘ = skipped/deferred
- **Deliverable:** concrete artifact produced by the step
- **Verify:** how to confirm the step is complete
- **Refs:** links to PRD sections and other docs

---

## Phase 6 — Polish & LLM Expansion

**Goal:** Wire up the LLM-powered "Ask Claude" feature, improve diagrams, error/loading states, documentation polish.

**Exit criteria:** Tool is demo-ready for internal team onboarding.

### ☑ P6.1 — "Ask Claude" in ExplainBox
- **Action:** Wire the button from P1.11. `lib/llm/prompts/explain-field.ts`. Returns customer-tailored explanation using current project context (workload, customer, industry). Editable result saved to `explainOverrides`.
- **Deliverable:** feature complete
- **Refs:** PRD §6.5, docs/adding-explain-content.md §8

### ☑ P6.2 — "Explain this sizing" in Build
- **Action:** Button on each Build panel: "Why this choice?" Sends Discovery + Build derived state + panel focus to LLM. Returns natural-language explanation.
- **Deliverable:** component + `lib/llm/prompts/explain-sizing.ts`
- **Refs:** PRD §8.4

### ☑ P6.3 — Improved architecture diagram
- **Action:** Replace basic boxes with a proper layered diagram: gateway → model platform → sharding topology → hardware. Show data flow arrows.
- **Deliverable:** enhanced `ArchitectureDiagram.tsx`
- **Refs:** PRD §6.3

### ☑ P6.4 — Improved rack diagram
- **Action:** Proper rack visualization with servers stacked correctly, labels, power draw.
- **Deliverable:** enhanced `RackLayout.tsx`
- **Refs:** PRD §6.3

### ☑ P6.5 — Loading states
- **Action:** Every async action (LLM calls, exports, autosave) has a spinner or skeleton. No blank screens.
- **Deliverable:** loading states audit
- **Refs:** UX

### ☑ P6.6 — Error states
- **Action:** LLM failure, DB failure, export failure — all handled with a user-facing message + retry.
- **Deliverable:** error boundary + toast system (e.g., sonner)
- **Refs:** UX

### ☑ P6.7 — Empty states
- **Action:** "No projects yet" screen with a CTA. "Complete Discovery to see sizing" in Build. "Upload an RFP or paste text" in RFI.
- **Deliverable:** empty-state components
- **Refs:** UX

### ☑ P6.8 — Documentation sweep
- **Action:** Update README with any drift; verify all docs/ links work; add GIFs or screenshots to README.
- **Deliverable:** updated docs
- **Refs:** all docs

### ☑ P6.9 — Audit log hookup
- **Action:** Every LLM call + project mutation writes to `audit_log` table. Simple Admin page to view (Phase 6 or later).
- **Deliverable:** `lib/db/audit.ts`
- **Refs:** PRD §5.2

### ☑ P6.10 — Phase 6 demo dry-run
- **Action:** Full end-to-end walkthrough: create project, import RFP, complete Discovery, review Build, export PDF. Notes for any friction.
- **Deliverable:** demo script in `docs/demo-script.md`
- **Refs:** PRD §9 Phase 6 exit

---

## Phase 7 — UX Redesign

**Goal:** Implement the two-level left-nav layout, merged landing page with search/filter, onboarding page, GitHub-style dark + warm off-white light theme, moon/sun icon flip, autosave indicator, and Design System tokens.

**Exit criteria:** User can navigate entirely via the left sidebar, collapse it, switch themes with the correct icon, search/filter projects, and complete Discovery without seeing any explicit Save button. All existing functionality (Discovery, RFI, Build, Export from Phases 1–6) still works.

### ☑ P7.1 — Install theming dependencies
- **Action:** `npm install next-themes`. Add `@theme` blocks to `app/globals.css` per PRD §13.1 for both light and dark mode color tokens.
- **Deliverable:** `app/globals.css` with full design-system tokens; `next-themes` in package.json
- **Verify:** Inspect CSS vars in devtools; confirm both light and dark tokens present
- **Refs:** PRD §13

### ☑ P7.2 — Theme provider + layout integration
- **Action:** Create `components/common/ThemeProvider.tsx` wrapping `next-themes`'s `ThemeProvider` (attribute="class", defaultTheme="system", enableSystem, disableTransitionOnChange). Wrap root layout `app/layout.tsx`.
- **Deliverable:** ThemeProvider; updated root layout
- **Verify:** No flash-of-wrong-theme on page load; dark/light class applied to `<html>`
- **Refs:** PRD §13.6, P0.8b in original plan

### ☑ P7.3 — Typography setup
- **Action:** Import Inter (body) and JetBrains Mono (code) via `next/font/google`; apply via CSS variables in root layout.
- **Deliverable:** updated root layout with font variables
- **Verify:** Fonts render correctly; no FOUT
- **Refs:** PRD §13.2

### ☑ P7.4 — Sidebar component — layout shell
- **Action:** Create `components/Sidebar/Sidebar.tsx` — expanded (240px) + collapsed (60px) states using conditional classes. Flex layout: header / nav items / spacer / footer. Read/write collapsed state to `localStorage` (`ml-sizer:sidebar-collapsed`).
- **Deliverable:** `Sidebar.tsx`, `SidebarHeader.tsx` (with collapse toggle button)
- **Verify:** Sidebar renders; toggle button switches widths; state persists across reload
- **Refs:** PRD §6.0.1, §6.0.2

### ☑ P7.5 — Sidebar nav items
- **Action:** Create `SidebarNavItem.tsx` — active state via pathname match. Build the global nav list: "+ New Project" (primary button style), "🏠 All Projects", "📖 How it works". Use `lucide-react` icons.
- **Deliverable:** `SidebarNavItem.tsx`, integrated into Sidebar
- **Verify:** Click-through navigates; active state renders; tooltips on hover when collapsed
- **Refs:** PRD §6.0.1

### ☑ P7.6 — Current project section in sidebar
- **Action:** Create `SidebarCurrentProject.tsx` — reads current project from URL params; renders section links (Discovery / RFI / Build / Export) when on a project page. Hidden otherwise.
- **Deliverable:** component
- **Verify:** Shows on `/project/[id]/*`; hidden on `/`, `/onboarding`
- **Refs:** PRD §6.0.1, §6.0.4

### ☑ P7.7 — Theme toggle with moon/sun flip
- **Action:** Create `SidebarThemeToggle.tsx` — uses `useTheme()` from next-themes. Shows `<Moon />` in light, `<Sun />` in dark (destination icon). Pinned to bottom of sidebar.
- **Deliverable:** component
- **Verify:** Icon flips correctly; theme persists; no SSR hydration mismatch (use `mounted` state guard)
- **Refs:** PRD §6.0.5

### ☑ P7.8 — Root layout rewrite
- **Action:** Replace `app/layout.tsx` to render `<div class="flex h-screen"><Sidebar /><main class="flex-1 overflow-auto">{children}</main></div>`. Include breadcrumbs slot.
- **Deliverable:** updated root layout
- **Verify:** All pages render inside the layout; no orphan content
- **Refs:** PRD §6.0.3

### ☑ P7.9 — Breadcrumbs component
- **Action:** Create `components/common/Breadcrumbs.tsx` — reads current route, renders crumbs using Next.js `usePathname`. On project pages: "All Projects / <project name> / <section>".
- **Deliverable:** component; rendered at top of main content area
- **Verify:** Breadcrumbs render correctly on all routes
- **Refs:** PRD §6.0.3

### ☑ P7.10 — Landing/Projects page rebuild
- **Action:** Rewrite `app/page.tsx`. Replace existing project list with new layout: header ("Projects" + count) → search/filter bar → list of `ProjectCard`s.
- **Deliverable:** new `app/page.tsx`; new components `components/ProjectsList/{ProjectsList.tsx, ProjectCard.tsx}`
- **Verify:** Projects list renders; clicking a card navigates into project
- **Refs:** PRD §6.0.7

### ☑ P7.11 — Search + filter bar
- **Action:** Create `ProjectsSearchFilter.tsx` with: text search input (debounced 200ms), filter dropdowns for workload type and modified date range, "Clear filters" button. State encoded in URL query params via `useSearchParams`.
- **Deliverable:** component
- **Verify:** Typing filters list live; URL updates with filters; shareable URLs work; "Clear filters" resets state
- **Refs:** PRD §6.0.7

### ☑ P7.12 — Delete project confirmation dialog
- **Action:** Create `DeleteProjectDialog.tsx` using shadcn AlertDialog. Triggered from trash icon on `ProjectCard`. Dialog text: "Delete project '<n>'? This cannot be undone." Two buttons: Cancel, Delete (destructive variant).
- **Deliverable:** component + wiring in ProjectCard
- **Verify:** Delete button opens dialog; cancel does nothing; confirm deletes + updates list
- **Refs:** PRD §6.0.7

### ☑ P7.13 — Empty states
- **Action:** Create `components/common/EmptyState.tsx` — shared empty-state template. Use on landing page (no projects, filtered-to-zero). Each variant has appropriate CTA.
- **Deliverable:** component
- **Verify:** Empty states render correctly in all scenarios
- **Refs:** PRD §6.0.7

### ☑ P7.14 — Project page layout rework
- **Action:** Remove the top-tab navigation from `app/project/[id]/layout.tsx` (Discovery/RFI/Build/Export). Section navigation now comes from the sidebar. Content area is a direct render of the section page.
- **Deliverable:** updated layout
- **Verify:** Navigation between sections uses sidebar; no duplicate nav
- **Refs:** PRD §6.0.4

### ☑ P7.15 — Discovery autosave indicator
- **Action:** Create `components/discovery/SavedIndicator.tsx` — shows "Saving…" during debounce, "Saved · Xs ago" after persist success (ticks every second, caps at "1m+ ago"), "Unsaved changes" on error with retry button. Top-right of Discovery content area.
- **Deliverable:** component + wired to the existing autosave hook from P0.7
- **Verify:** Change a field, see "Saving…" → "Saved · 0s ago" → ticking up; disconnect DB, see "Unsaved changes"
- **Refs:** PRD §6.1 (revised)

### ☑ P7.16 — Remove any explicit Save buttons
- **Action:** Audit Discovery pages for any remaining Save buttons. Delete. Verify autosave handles all cases.
- **Deliverable:** code removal
- **Verify:** No save buttons visible in any Discovery sub-tab
- **Refs:** PRD §6.1 (revised)

### ☑ P7.17 — Onboarding page
- **Action:** Create `app/onboarding/page.tsx` per PRD §6.0.8. Four phase sections. Use `components/onboarding/OnboardingSection.tsx` as reusable block.
- **Deliverable:** page + component
- **Verify:** Page reachable at `/onboarding`; linked from sidebar
- **Refs:** PRD §6.0.8

### ☑ P7.18 — First-run onboarding banner
- **Action:** On landing page, when project list is empty AND `localStorage['ml-sizer:onboarded']` is unset, show a dismissible banner linking to `/onboarding`. Dismiss persists.
- **Deliverable:** banner component; integration in landing page
- **Verify:** Banner shows on empty state; dismiss hides it; persists across reload
- **Refs:** PRD §6.0.8

### ☑ P7.19 — Apply Design System tokens to existing components
- **Action:** Audit all components from Phases 1–6. Replace hardcoded colors (`bg-gray-100`, etc.) with Design System tokens (`bg-[var(--bg-surface)]` or Tailwind arbitrary values). ExplainBox, BuildPanel, Discovery forms, all. Ensure dark mode looks correct everywhere.
- **Deliverable:** component style audit
- **Verify:** Toggle dark mode on every page; nothing broken; borders instead of shadows in dark mode
- **Refs:** PRD §13

### ☑ P7.20 — Smoke test
- **Action:** Full walkthrough: create project from sidebar, fill Discovery (confirm autosave indicator), navigate to RFI, Build, Export using sidebar, toggle theme, collapse sidebar, search for a project, delete a project, view onboarding page.
- **Deliverable:** recorded in CHANGELOG with date and notes
- **Verify:** All acceptance criteria from PRD §6.0 and §6.1 (revised) met
- **Refs:** PRD §6.0, §6.1, §13

---

## Phase 8 — Bug Fixes + BoM Pricing Audit

**Goal:** Resolve the three bugs observed in v1, audit BoM pricing, and add safeguards to prevent similar issues.

**Exit criteria:** All three bugs fixed with regression tests; BoM shows "Indicative pricing — confirm with vendor" disclaimer; pricing sources documented per line item.

### ☑ P8.1 — Interconnect preference bug — reproduce
- **Action:** Create failing test in `tests/sizing/sharding.test.ts`: set Discovery `hardware.networking = '100g' RoCE`; run `computeBuild`; assert `buildDerived.modelPlatform.interconnectRecommendation.interNode !== 'infiniband-400g'` when Discovery specifies RoCE.
- **Deliverable:** failing test case
- **Verify:** Test fails with current code (confirms bug)
- **Refs:** PRD bug reference §1; P2.9 original step

### ☑ P8.2 — Interconnect preference bug — fix
- **Action:** Modify `lib/sizing/sharding.ts` (and/or `bom.ts`). Read `discovery.hardware.networking` as a constraint. Only recommend a different fabric if the user's choice can't meet bandwidth requirements — and if so, flag it in engine notes. Never silently overwrite.
- **Deliverable:** code fix
- **Verify:** P8.1 test now passes; additional assertion: engine note present when user choice undersized
- **Refs:** `docs/sizing-math.md` §5

### ☑ P8.3 — RFP JSON truncation bug — reproduce
- **Action:** Create failing test in `tests/llm/json.test.ts`: mock an LLM response truncated mid-JSON at 10,000 chars; run extraction; assert it handles gracefully (either retries or returns partial + error).
- **Deliverable:** failing test
- **Verify:** Current code throws "Unterminated string in JSON"
- **Refs:** PRD bug reference §2

### ☑ P8.4 — RFP JSON truncation bug — fix
- **Action:** Two changes:
  1. Raise `maxTokens` in `lib/llm/prompts/extract-rfp.ts` call from default to 8000
  2. Add `lib/llm/json.ts` with `safeJsonParse(text, onMalformed)` that detects truncation, attempts auto-closing (append `]}` or similar), and on total failure retries the LLM call with a "continue where you left off" prompt
- **Deliverable:** code fix + utility
- **Verify:** P8.3 test passes; manually re-run with the real RFP that triggered the original bug
- **Refs:** `docs/llm-provider-guide.md` §5

### ☑ P8.5 — RFP file upload bug — diagnose
- **Action:** Add detailed logging in `app/api/upload/route.ts`. Ask user for the specific file that failed (or a similar one). Determine if pdf-parse, mammoth, or file-type detection is throwing.
- **Deliverable:** logs + diagnosis note in PHASE_PLAN troubleshooting section
- **Verify:** Failure root cause identified
- **Refs:** PRD bug reference §3

### ☑ P8.6 — RFP file upload bug — fix
- **Action:** Depending on diagnosis: either swap the parsing library, add fallback (e.g., pdf-parse fails → try `pdfjs-dist`), or improve error messaging to include what went wrong ("Encrypted PDF not supported", "Scanned PDF — OCR not enabled in v1", etc.).
- **Deliverable:** code fix + user-facing error surface
- **Verify:** Upload the original failing file again; works or gives actionable error
- **Refs:** PRD bug reference §3

### ☑ P8.7 — RFP file upload — edge-case test fixtures
- **Action:** Add fixtures to `tests/fixtures/rfp-samples/`: password-protected PDF, scanned PDF, DOCX with images, DOCX with tables, plain text, malformed PDF. Add test cases covering each.
- **Deliverable:** fixtures + tests
- **Verify:** All fixtures either parse successfully or fail with actionable error message
- **Refs:** `docs/llm-provider-guide.md`

### ☑ P8.8 — BoM pricing audit — data review
- **Action:** Review every `list_price_usd` in `data/gpus.json` and `data/servers.json`. For each, add a `pricing_source` field with: URL if public, "vendor-estimate" if from vendor but not public, or "indicative" if unknown. Update the values where public pricing has changed.
- **Deliverable:** updated JSON with sourced prices
- **Verify:** Every entry has a `pricing_source`; values cross-referenced against a public source or flagged as indicative
- **Refs:** `docs/adding-a-gpu.md` §1 field reference

### ☑ P8.9 — BoM pricing disclaimer in UI
- **Action:** Add a visible disclaimer on the Build page BoM section: "⚠ Indicative pricing — verify with vendor." Dismissible but re-shown per session.
- **Deliverable:** component update
- **Verify:** Disclaimer renders; dismiss persists within session
- **Refs:** PRD bug report reference "BoM pricing audit"

### ☑ P8.10 — BoM override price surface in UI
- **Action:** The `BomItem` schema already has `unitPriceUsd` as a field. Add an editable input on each BoM row in the Build UI — user can override the catalog price per project. Overrides stored in `buildState.overrides` alongside other overrides.
- **Deliverable:** override input in BoM row
- **Verify:** Override a price; total capex updates; reload; override persists
- **Refs:** PRD §5.1 BomItem, §6.3 override handling

### ☑ P8.11 — Phase 8 smoke test
- **Action:** End-to-end: load a project that exercised the bugs, confirm all three fixed; verify BoM has disclaimer + price overrides work.
- **Deliverable:** recorded in CHANGELOG
- **Refs:** PRD Phase 8 exit criteria

### ☑ P8.12 — Hydration mismatch warning on `<body>`
- **Action:** Add `suppressHydrationWarning` to the `<body>` element in `app/layout.tsx`. Already applied to `<html>`; extend to `<body>`. Root cause: browser extensions (Grammarly, etc.) inject attributes at runtime.
- **Deliverable:** 1-line change to root layout
- **Verify:** Reload page with Grammarly or similar extension installed; no hydration warning in console
- **Refs:** User reported ExplainBox hydration warning

### ☑ P8.13 — RFP upload: DOMMatrix error
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

### ☑ P8.14 — PDF download: "site not available" crash
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

### ☑ P8.15 — Build Report MD data mismatch
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

### ☑ P8.16 — Build Report: remove Node Pool table
- **Action:** The "node pools" table is consistently empty. Remove from both MD and PDF templates. Add a `TODO: restore when node pool rendering is fixed` comment at the removal site.
- **Deliverable:** table removed from `lib/export/build-report-md.ts` and `lib/export/build-report-pdf.tsx`
- **Refs:** User observation

### ☑ P8.17 — Build Report: Engine Notes missing
- **Action:** Engine notes (from `lib/sizing/notes.ts`) are populated in `buildState.notes` but not pulled by the extractor. Fix: extractor reads `notes`, renderer outputs them under an "Engine Notes" section (grouped by layer where available).
- **Deliverable:** extractor + renderer fix
- **Verify:** Build page has notes → export MD → notes appear in Engine Notes section, grouped by layer
- **Refs:** User observation

### ☑ P8.18 — RFI "Apply to Discovery" broken
- **Action:** The Apply button on RFI extracted items doesn't update Discovery. Investigate and fix. Likely causes:
  - Store action not dispatched
  - Wrong `fieldId` resolver (extracted item → Discovery field path)
  - Update reverted by subsequent autosave race
- **Deliverable:** fix + integration test: paste sample RFP → click Apply on one item → assert Discovery store updated
- **Verify:** As described
- **Refs:** User reported

### ☑ P8.19 — RFI: confirm no auto-apply
- **Action:** Audit current code for any auto-apply behavior after extraction (per PRD §6.2.x, extraction should not touch Discovery automatically). If found, remove.
- **Deliverable:** audit + removal if needed; integration test
- **Verify:** Paste RFP → extracted items appear; Discovery is NOT modified until user clicks Apply
- **Refs:** PRD §6.2.x (v0.4a)

### ☑ P8.20 — ExplainBox routing regression
- **Action:** ExplainBox "Ask AI" doesn't respect the configured model after switching providers in `/settings/llm`. Diagnose:
  1. Confirm whether the button calls `getLlmProviderForFeature('explain-field')` or the deprecated `getLlmProvider()`
  2. Confirm whether `explain-field` has a model assigned in current routing
  3. Check `/api/llm` forwards the `feature` parameter correctly
- **Fix:**
  - Migrate all ExplainBox call sites to `getLlmProviderForFeature('explain-field')`
  - When feature has no assigned model: button disabled with tooltip pointing to `/settings/llm`
  - When feature has a model assigned: button label reflects model's `label` (e.g., "Ask Opus", "Ask Llama-Local"); fallback to "Ask AI" if label overflows
- **Deliverable:** code fix + integration test (assign feature to OpenAI provider, click Ask AI, verify request goes to OpenAI endpoint)
- **Refs:** PRD §8.5.x (v0.5)

### ☑ P8.21 — DOMMatrix regression
- **Action:** "DOMMatrix is not defined" error has returned on RFP file upload (regression from P8.13). Diagnose:
  1. `git log --all -p -- package.json | grep -A2 -B2 "pdfjs\|pdf-parse"` — find when pdfjs-dist reintroduced
  2. `grep -rn "pdfjs\|pdf-parse" --include="*.ts" --include="*.tsx" .` — confirm current usage across all upload paths
- **Fix:**
  - Remove pdfjs-dist usage everywhere (re-apply P8.13 fix on all paths)
  - Add static check: test/lint that no module imports `pdfjs-dist`
- **Deliverable:** fix + regression guard
- **Refs:** P8.13, user reported

### ☑ P8.22 — App version display infrastructure
- **Action:** Wire build-time env vars so P13.18 sidebar version has data to read.
  - `Dockerfile`: add `ARG BUILD_SHA` and `ARG BUILD_DATE` in the builder stage; set `ENV NEXT_PUBLIC_BUILD_SHA=$BUILD_SHA` and `ENV NEXT_PUBLIC_BUILD_DATE=$BUILD_DATE` in the runtime stage
  - `bin/release.sh`: add `--build-arg BUILD_SHA=$(git rev-parse --short HEAD)` and `--build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)` to the `BUILDX_ARGS` array
- **Deliverable:** Dockerfile + release.sh updates
- **Verify:** Build the image; `docker exec ml-sizer env | grep NEXT_PUBLIC_BUILD` shows correct SHA + date
- **Refs:** PRD §6.0.z (v0.5)
