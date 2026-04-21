# PHASE_PLAN Addition — Phases 7, 8, 9

**Append to existing PHASE_PLAN.md** below the current Phase 6 section (before "Future phases" / "Troubleshooting reference" / "Revision log" sections).

**Update the existing "Future phases" section** to remove Phase 7 (UX redesign was not in original plan, so nothing to remove actually). Just renumber existing Phase 7–13 items as Phase 10–16 if they were pre-allocated.

---

## Phase 7 — UX Redesign

**Goal:** Implement the two-level left-nav layout, merged landing page with search/filter, onboarding page, GitHub-style dark + warm off-white light theme, moon/sun icon flip, autosave indicator, and Design System tokens.

**Exit criteria:** User can navigate entirely via the left sidebar, collapse it, switch themes with the correct icon, search/filter projects, and complete Discovery without seeing any explicit Save button. All existing functionality (Discovery, RFI, Build, Export from Phases 1–6) still works.

### P7.1 — Install theming dependencies
- **Action:** `npm install next-themes`. Add `@theme` blocks to `app/globals.css` per PRD §14.1 for both light and dark mode color tokens.
- **Deliverable:** `app/globals.css` with full design-system tokens; `next-themes` in package.json
- **Verify:** Inspect CSS vars in devtools; confirm both light and dark tokens present
- **Refs:** PRD §14

### P7.2 — Theme provider + layout integration
- **Action:** Create `components/common/ThemeProvider.tsx` wrapping `next-themes`'s `ThemeProvider` (attribute="class", defaultTheme="system", enableSystem, disableTransitionOnChange). Wrap root layout `app/layout.tsx`.
- **Deliverable:** ThemeProvider; updated root layout
- **Verify:** No flash-of-wrong-theme on page load; dark/light class applied to `<html>`
- **Refs:** PRD §14.6, P0.8b in original plan

### P7.3 — Typography setup
- **Action:** Import Inter (body) and JetBrains Mono (code) via `next/font/google`; apply via CSS variables in root layout.
- **Deliverable:** updated root layout with font variables
- **Verify:** Fonts render correctly; no FOUT
- **Refs:** PRD §14.2

### P7.4 — Sidebar component — layout shell
- **Action:** Create `components/Sidebar/Sidebar.tsx` — expanded (240px) + collapsed (60px) states using conditional classes. Flex layout: header / nav items / spacer / footer. Read/write collapsed state to `localStorage` (`ml-sizer:sidebar-collapsed`).
- **Deliverable:** `Sidebar.tsx`, `SidebarHeader.tsx` (with collapse toggle button)
- **Verify:** Sidebar renders; toggle button switches widths; state persists across reload
- **Refs:** PRD §6.0.1, §6.0.2

### P7.5 — Sidebar nav items
- **Action:** Create `SidebarNavItem.tsx` — active state via pathname match. Build the global nav list: "+ New Project" (primary button style), "🏠 All Projects", "📖 How it works". Use `lucide-react` icons.
- **Deliverable:** `SidebarNavItem.tsx`, integrated into Sidebar
- **Verify:** Click-through navigates; active state renders; tooltips on hover when collapsed
- **Refs:** PRD §6.0.1

### P7.6 — Current project section in sidebar
- **Action:** Create `SidebarCurrentProject.tsx` — reads current project from URL params; renders section links (Discovery / RFI / Build / Export) when on a project page. Hidden otherwise.
- **Deliverable:** component
- **Verify:** Shows on `/project/[id]/*`; hidden on `/`, `/onboarding`
- **Refs:** PRD §6.0.1, §6.0.4

### P7.7 — Theme toggle with moon/sun flip
- **Action:** Create `SidebarThemeToggle.tsx` — uses `useTheme()` from next-themes. Shows `<Moon />` in light, `<Sun />` in dark (destination icon). Pinned to bottom of sidebar.
- **Deliverable:** component
- **Verify:** Icon flips correctly; theme persists; no SSR hydration mismatch (use `mounted` state guard)
- **Refs:** PRD §6.0.5

### P7.8 — Root layout rewrite
- **Action:** Replace `app/layout.tsx` to render `<div class="flex h-screen"><Sidebar /><main class="flex-1 overflow-auto">{children}</main></div>`. Include breadcrumbs slot.
- **Deliverable:** updated root layout
- **Verify:** All pages render inside the layout; no orphan content
- **Refs:** PRD §6.0.3

### P7.9 — Breadcrumbs component
- **Action:** Create `components/common/Breadcrumbs.tsx` — reads current route, renders crumbs using Next.js `usePathname`. On project pages: "All Projects / <project name> / <section>".
- **Deliverable:** component; rendered at top of main content area
- **Verify:** Breadcrumbs render correctly on all routes
- **Refs:** PRD §6.0.3

### P7.10 — Landing/Projects page rebuild
- **Action:** Rewrite `app/page.tsx`. Replace existing project list with new layout: header ("Projects" + count) → search/filter bar → list of `ProjectCard`s.
- **Deliverable:** new `app/page.tsx`; new components `components/ProjectsList/{ProjectsList.tsx, ProjectCard.tsx}`
- **Verify:** Projects list renders; clicking a card navigates into project
- **Refs:** PRD §6.0 (merged landing)

### P7.11 — Search + filter bar
- **Action:** Create `ProjectsSearchFilter.tsx` with: text search input (debounced 200ms), filter dropdowns for workload type and modified date range, "Clear filters" button. State encoded in URL query params via `useSearchParams`.
- **Deliverable:** component
- **Verify:** Typing filters list live; URL updates with filters; shareable URLs work; "Clear filters" resets state
- **Refs:** PRD §6.0 (landing page, search/filter bar section)

### P7.12 — Delete project confirmation dialog
- **Action:** Create `DeleteProjectDialog.tsx` using shadcn AlertDialog. Triggered from trash icon on `ProjectCard`. Dialog text: "Delete project '<n>'? This cannot be undone." Two buttons: Cancel, Delete (destructive variant).
- **Deliverable:** component + wiring in ProjectCard
- **Verify:** Delete button opens dialog; cancel does nothing; confirm deletes + updates list
- **Refs:** PRD §6.0 (project card section)

### P7.13 — Empty states
- **Action:** Create `components/common/EmptyState.tsx` — shared empty-state template. Use on landing page (no projects, filtered-to-zero). Each variant has appropriate CTA.
- **Deliverable:** component
- **Verify:** Empty states render correctly in all scenarios
- **Refs:** PRD §6.0 (landing page, empty state section)

### P7.14 — Project page layout rework
- **Action:** Remove the top-tab navigation from `app/project/[id]/layout.tsx` (Discovery/RFI/Build/Export). Section navigation now comes from the sidebar. Content area is a direct render of the section page.
- **Deliverable:** updated layout
- **Verify:** Navigation between sections uses sidebar; no duplicate nav
- **Refs:** PRD §6.0.4

### P7.15 — Discovery autosave indicator
- **Action:** Create `components/discovery/SavedIndicator.tsx` — shows "Saving…" during debounce, "Saved · Xs ago" after persist success (ticks every second, caps at "1m+ ago"), "Unsaved changes" on error with retry button. Top-right of Discovery content area.
- **Deliverable:** component + wired to the existing autosave hook from P0.7
- **Verify:** Change a field, see "Saving…" → "Saved · 0s ago" → ticking up; disconnect DB, see "Unsaved changes"
- **Refs:** PRD §6.1 (revised)

### P7.16 — Remove any explicit Save buttons
- **Action:** Audit Discovery pages for any remaining Save buttons. Delete. Verify autosave handles all cases.
- **Deliverable:** code removal
- **Verify:** No save buttons visible in any Discovery sub-tab
- **Refs:** PRD §6.1 (revised)

### P7.17 — Onboarding page
- **Action:** Create `app/onboarding/page.tsx` per PRD §6 (new /onboarding section). Four phase sections. Use `components/onboarding/OnboardingSection.tsx` as reusable block.
- **Deliverable:** page + component
- **Verify:** Page reachable at `/onboarding`; linked from sidebar
- **Refs:** PRD §6 (/onboarding page spec)

### P7.18 — First-run onboarding banner
- **Action:** On landing page, when project list is empty AND `localStorage['ml-sizer:onboarded']` is unset, show a dismissible banner linking to `/onboarding`. Dismiss persists.
- **Deliverable:** banner component; integration in landing page
- **Verify:** Banner shows on empty state; dismiss hides it; persists across reload
- **Refs:** PRD §6 (onboarding linked-from section)

### P7.19 — Apply Design System tokens to existing components
- **Action:** Audit all components from Phases 1–6. Replace hardcoded colors (`bg-gray-100`, etc.) with Design System tokens (`bg-[var(--bg-surface)]` or Tailwind arbitrary values). ExplainBox, BuildPanel, Discovery forms, all. Ensure dark mode looks correct everywhere.
- **Deliverable:** component style audit
- **Verify:** Toggle dark mode on every page; nothing broken; borders instead of shadows in dark mode
- **Refs:** PRD §14

### P7.20 — Smoke test
- **Action:** Full walkthrough: create project from sidebar, fill Discovery (confirm autosave indicator), navigate to RFI, Build, Export using sidebar, toggle theme, collapse sidebar, search for a project, delete a project, view onboarding page.
- **Deliverable:** recorded in CHANGELOG with date and notes
- **Verify:** All acceptance criteria from §6.0 and §6.1 (revised) met
- **Refs:** PRD §6.0, §6.1, §14

---

## Phase 8 — Bug Fixes + BoM Pricing Audit

**Goal:** Resolve the three bugs observed in v1, audit BoM pricing, and add safeguards to prevent similar issues.

**Exit criteria:** All three bugs fixed with regression tests; BoM shows "Indicative pricing — confirm with vendor" disclaimer; pricing sources documented per line item.

### P8.1 — Interconnect preference bug — reproduce
- **Action:** Create failing test in `tests/sizing/sharding.test.ts`: set Discovery `hardware.networking = '100g' RoCE`; run `computeBuild`; assert `buildDerived.modelPlatform.interconnectRecommendation.interNode !== 'infiniband-400g'` when Discovery specifies RoCE.
- **Deliverable:** failing test case
- **Verify:** Test fails with current code (confirms bug)
- **Refs:** PRD bug reference §1; P2.9 original step

### P8.2 — Interconnect preference bug — fix
- **Action:** Modify `lib/sizing/sharding.ts` (and/or `bom.ts`). Read `discovery.hardware.networking` as a constraint. Only recommend a different fabric if the user's choice can't meet bandwidth requirements — and if so, flag it in engine notes. Never silently overwrite.
- **Deliverable:** code fix
- **Verify:** P8.1 test now passes; additional assertion: engine note present when user choice undersized
- **Refs:** `docs/sizing-math.md` §5

### P8.3 — RFP JSON truncation bug — reproduce
- **Action:** Create failing test in `tests/llm/json.test.ts`: mock an LLM response truncated mid-JSON at 10,000 chars; run extraction; assert it handles gracefully (either retries or returns partial + error).
- **Deliverable:** failing test
- **Verify:** Current code throws "Unterminated string in JSON"
- **Refs:** PRD bug reference §2

### P8.4 — RFP JSON truncation bug — fix
- **Action:** Two changes:
  1. Raise `maxTokens` in `lib/llm/prompts/extract-rfp.ts` call from default to 8000
  2. Add `lib/llm/json.ts` with `safeJsonParse(text, onMalformed)` that detects truncation, attempts auto-closing (append `]}` or similar), and on total failure retries the LLM call with a "continue where you left off" prompt
- **Deliverable:** code fix + utility
- **Verify:** P8.3 test passes; manually re-run with the real RFP that triggered the original bug
- **Refs:** `docs/llm-provider-guide.md` §5

### P8.5 — RFP file upload bug — diagnose
- **Action:** Add detailed logging in `app/api/upload/route.ts`. Ask user for the specific file that failed (or a similar one). Determine if pdf-parse, mammoth, or file-type detection is throwing.
- **Deliverable:** logs + diagnosis note in PHASE_PLAN troubleshooting section
- **Verify:** Failure root cause identified
- **Refs:** PRD bug reference §3

### P8.6 — RFP file upload bug — fix
- **Action:** Depending on diagnosis: either swap the parsing library, add fallback (e.g., pdf-parse fails → try `pdfjs-dist`), or improve error messaging to include what went wrong ("Encrypted PDF not supported", "Scanned PDF — OCR not enabled in v1", etc.).
- **Deliverable:** code fix + user-facing error surface
- **Verify:** Upload the original failing file again; works or gives actionable error
- **Refs:** PRD bug reference §3

### P8.7 — RFP file upload — edge-case test fixtures
- **Action:** Add fixtures to `tests/fixtures/rfp-samples/`: password-protected PDF, scanned PDF, DOCX with images, DOCX with tables, plain text, malformed PDF. Add test cases covering each.
- **Deliverable:** fixtures + tests
- **Verify:** All fixtures either parse successfully or fail with actionable error message
- **Refs:** `docs/llm-provider-guide.md`

### P8.8 — BoM pricing audit — data review
- **Action:** Review every `list_price_usd` in `data/gpus.json` and `data/servers.json`. For each, add a `pricing_source` field with: URL if public, "vendor-estimate" if from vendor but not public, or "indicative" if unknown. Update the values where public pricing has changed.
- **Deliverable:** updated JSON with sourced prices
- **Verify:** Every entry has a `pricing_source`; values cross-referenced against a public source or flagged as indicative
- **Refs:** `docs/adding-a-gpu.md` §1 field reference

### P8.9 — BoM pricing disclaimer in UI
- **Action:** Add a visible disclaimer on the Build page BoM section: "⚠ Indicative pricing — verify with vendor." Dismissible but re-shown per session.
- **Deliverable:** component update
- **Verify:** Disclaimer renders; dismiss persists within session
- **Refs:** PRD bug report reference "BoM pricing audit"

### P8.10 — BoM override price surface in UI
- **Action:** The `BomItem` schema already has `unitPriceUsd` as a field. Add an editable input on each BoM row in the Build UI — user can override the catalog price per project. Overrides stored in `buildState.overrides` alongside other overrides.
- **Deliverable:** override input in BoM row
- **Verify:** Override a price; total capex updates; reload; override persists
- **Refs:** PRD §5.1 BomItem, §6.3 override handling

### P8.11 — Phase 8 smoke test
- **Action:** End-to-end: load a project that exercised the bugs, confirm all three fixed; verify BoM has disclaimer + price overrides work.
- **Deliverable:** recorded in CHANGELOG
- **Refs:** PRD Phase 8 exit criteria

---

## Phase 9 — Build Report Export

**Goal:** Ship Build Report in PDF and Markdown formats, distinct from the existing customer-facing Proposal.

**Exit criteria:** User can export a Build Report (PDF or MD) from the Export page that contains all Build data in structured form, suitable for internal review or PR attachment.

### P9.1 — Build Report content spec
- **Action:** Formalize the structure. Write `lib/export/build-report-spec.ts` as a data-shape description (typed) of what a Build Report contains. Sections: cover, TOC, per-layer panels (Hardware/Infra/ModelPlatform/Application), summary totals, assumptions, BoM table, engine notes.
- **Deliverable:** TypeScript type + fixture JSON example
- **Verify:** Type compiles; fixture validates
- **Refs:** PRD §6.4 (revised)

### P9.2 — Build Report data extractor
- **Action:** `lib/export/build-report-extract.ts` — pure function: `(project: Project) => BuildReport`. Pulls from Discovery + BuildDerived + BuildOverrides + engine notes + BoM. Includes computed assumptions (MFU/MBU/overhead used for this sizing).
- **Deliverable:** extractor + unit tests
- **Verify:** Tests cover: no overrides (clean derived), with overrides (marked), MoE project, cloud deployment, on-prem deployment
- **Refs:** PRD §5.1 BuildState

### P9.3 — Build Report Markdown renderer
- **Action:** `lib/export/build-report-md.ts` — takes `BuildReport`, returns Markdown string. Include: H1 title, YAML frontmatter (project name, date), TOC, H2 per section, tables for BoM and assumptions. GitHub-flavored markdown.
- **Deliverable:** renderer + unit tests
- **Verify:** Output validates against a markdown linter; renders correctly in GitHub preview
- **Refs:** PRD §6.4 (revised), Build Report Markdown section

### P9.4 — Build Report PDF components
- **Action:** `lib/export/build-report-pdf.tsx` — React-PDF components for: cover, TOC, layer sections, assumptions, BoM table. Use existing design tokens adapted to print (PDF doesn't have dark mode — always light).
- **Deliverable:** PDF component tree + preview in Storybook or dev route
- **Verify:** PDF renders visually correctly in Preview/Acrobat
- **Refs:** PRD §6.4 (revised)

### P9.5 — Build Report API routes
- **Action:** `app/api/export/build-report-pdf/route.ts` and `app/api/export/build-report-md/route.ts`. Both accept `projectId`, load project, run extractor, render, return file.
- **Deliverable:** two routes
- **Verify:** Curl both endpoints; files download correctly; content matches preview
- **Refs:** PRD §6.4 (revised)

### P9.6 — Export page — add Build Report buttons
- **Action:** Update `app/project/[id]/export/page.tsx` Export UI. Section the page into two groups: "Customer Deliverables" (Proposal PDF, Proposal Word, JSON BoM) and "Internal Reports" (Build Report PDF, Build Report MD). Add brief description per item.
- **Deliverable:** updated Export page
- **Verify:** Both groups render; all five exports work
- **Refs:** PRD §6.4 (revised)

### P9.7 — Export filename convention
- **Action:** Enforce filename pattern: `<project-name-slugified>-<export-type>-<YYYY-MM-DD>.<ext>`. Examples: `acme-llm-proposal-2026-04-21.pdf`, `acme-llm-build-report-2026-04-21.md`. Implement via `lib/export/filename.ts`.
- **Deliverable:** filename utility + applied to all export routes
- **Verify:** Download files; filename matches pattern
- **Refs:** PRD §6.4 (revised) acceptance criteria

### P9.8 — Phase 9 smoke test
- **Action:** Full export cycle for the reference Llama-70B sample project. Verify Build Report PDF matches Build Report MD content-for-content. Open MD in GitHub preview for visual QA.
- **Deliverable:** recorded in CHANGELOG
- **Refs:** PRD §6.4 (revised) exit criteria

---

## Troubleshooting log entries (prepopulated)

Append under the existing "Troubleshooting reference by step" section:

```
P8.1 — Interconnect preference bug
  Symptom: Discovery sets RoCE, BoM shows InfiniBand.
  Root cause: TBD during investigation — likely sharding.ts hardcodes
    'infiniband-400g' as default for inter-node without reading Discovery.
  Fix: see P8.2.
  Regression test: tests/sizing/sharding.test.ts (RoCE preserved).

P8.3 — RFP JSON extraction truncation
  Symptom: "Unterminated string in JSON at position 10703"
  Root cause: LLM output exceeded default maxTokens.
  Fix: see P8.4 (raise limit + safeJsonParse utility).

P8.5 — RFP file upload extraction failure
  Symptom: "could not extract from file"
  Root cause: TBD during investigation.
  Fix: see P8.6.
```

---

## Revision log update

Append row to the existing Revision log table:

| Version | Date | Changes |
|---|---|---|
| v0.3 | 2026-04-21 | Added Phase 7 (UX redesign: left-nav, themes, landing, autosave indicator), Phase 8 (bug fixes: interconnect, RFP JSON, RFP upload, BoM pricing audit), Phase 9 (Build Report export in PDF and Markdown) |
