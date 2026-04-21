# PRD Update — Design Refresh + New Features + Bug Fixes

**Type:** Addendum to PRD.md v0.2 → v0.3
**Date:** 2026-04-21
**Applies:** append as new sections or replace indicated sections

> Apply this in three changes to the live PRD:
>
> 1. **Replace §6.1** with the revised Discovery section spec below (adds autosave indicator, apply-from-RFP button stays, removes any save button talk)
> 2. **Replace §10** file/folder structure additions with the new components listed
> 3. **Append new §14 Design System** at the end (before the Revision Log)
> 4. **Append Build Report to §6.4 Export**
> 5. **Add new §6.0 Navigation & Layout Model** right before §6.1

---

## New §6.0 — Navigation & Layout Model

The application uses a persistent **two-level left navigation sidebar** modeled on Claude.ai's layout.

### 6.0.1 Sidebar structure

```
┌─────────────────────────┐
│  [Logo / App Name]      │  ← header with collapse toggle
│                         │
│  [+ New Project]        │  ← primary CTA
│                         │
│  🏠  All Projects        │  ← global nav
│  📖  How it works        │  ← onboarding page
│                         │
│  ─── Current project ── │  ← visible only when inside /project/[id]
│  <project name>         │
│    Discovery            │
│    RFI                  │
│    Build                │
│    Export               │
│                         │
│  (flex spacer)          │
│                         │
│  🌙 / ☀️ Theme toggle   │  ← pinned bottom
│  ⟨ Collapse ⟩           │  ← toggle expanded/collapsed
└─────────────────────────┘
```

### 6.0.2 Collapse behavior

- Sidebar has two states: **expanded (240px)** and **collapsed (60px, icon-only)**
- User toggle button at bottom of sidebar
- State persists in `localStorage` key `ml-sizer:sidebar-collapsed`
- When collapsed, menu items show icon only with tooltip on hover
- Current project section collapses to icon + dot indicator

### 6.0.3 Main content area

- Centered with max-width (`max-w-6xl`) and horizontal auto-margin
- Left-aligned at widths below `1280px` to avoid excessive margin
- Consistent `px-8 py-8` padding
- Breadcrumb at top when inside a project: `All Projects / <project name> / <section>`

### 6.0.4 Project view sub-navigation

When inside a project, the Discovery/RFI/Build/Export sections are selected via the **left sidebar** (replaces the previous top-of-page tab bar). Inside Discovery, the layer sub-tabs (Workload, Hardware, Infra, Model Platform, Application) remain in the **content area** as horizontal tabs — they are section-internal, not application-level.

### 6.0.5 Theme toggle

- Icon shows the *destination* state: moon icon in light mode (click → dark), sun icon in dark mode (click → light)
- System-preference option available via dropdown menu on icon long-press or secondary button (deferred — v1 is just light/dark cycle)

### 6.0.6 Acceptance criteria

- [ ] Sidebar renders on every page at every breakpoint ≥ 1024px wide
- [ ] Collapse state persists across sessions
- [ ] "Current project" section appears only when inside a project
- [ ] Theme toggle flips icon to destination state
- [ ] Breadcrumbs navigate correctly
- [ ] Keyboard navigable (tab through sidebar items, enter to activate)

---

## Replacement for §6.1 — Discovery Section (revised)

**Structure:** horizontal tabs at the top of the Discovery page content (Workload / Hardware / Infra / Model Platform / Application). Left sidebar shows the section selector (Discovery/RFI/Build/Export); Discovery tabs are content-internal.

**Behavior:**
- Every input writes to Zustand store on change (debounced 300ms) → autosaves to SQLite
- A **"Saved · Xs ago"** indicator appears top-right of the Discovery content area
  - Shows "Saving…" during the debounce window
  - Shows "Saved · Xs ago" within 1s of successful persist
  - Turns to "Unsaved changes" if DB write fails; offers retry
- Changes immediately propagate to Build section (which auto-recomputes)
- Required fields flagged with red-border state when blurred-empty; banner at top of tab lists missing fields
- **"Import from RFP"** button pulls extracted values from RFI state (per §6.2)
- **No explicit Save button.** Autosave is authoritative.

**Acceptance criteria:**
- [ ] All fields in `DiscoveryState` are captured via forms
- [ ] Changing any field updates store within 300ms
- [ ] `<ExplainBox>` renders for every field with defined content
- [ ] "Saved · Xs ago" indicator present and accurate
- [ ] No user-visible Save button in Discovery
- [ ] Required-field banner appears when minimum set incomplete
- [ ] Values persist across browser refresh

---

## Replacement for §6.4 — Export section (revised, adds Build Report)

**Outputs:**
1. **Proposal PDF** — executive summary + per-layer sizing + BoM + assumptions (existing)
2. **Proposal Word doc** — same content, editable (existing)
3. **JSON BoM** — machine-readable bill of materials (existing)
4. **Build Report PDF** — NEW: detailed build-only report with same sub-sections as the Build page (Hardware, Infra, Model Platform, Application, Summary Totals, Engine Notes). For internal review and architecture handoff.
5. **Build Report Markdown** — NEW: same content as Build Report PDF, but in `.md` format for wikis/docs/PRs.

**Build Report spec:**
- Cover page: project name, customer, date, deployment pattern
- Table of contents
- Section per layer (Hardware / Infra / Model Platform / Application) with:
  - Derived values (from sizing engine)
  - Overrides (if any), clearly marked
  - Engine notes for that layer
- Summary totals page
- Assumptions page: MFU, MBU, overhead factors, optimization settings active
- BoM table (copy of JSON BoM rendered as table)
- No executive summary or customer-facing framing (that's the Proposal)

**Acceptance criteria:**
- [ ] All 5 export formats available from the Export page
- [ ] Build Report PDF renders with ToC, all sections, assumptions
- [ ] Build Report MD is valid, renders in GitHub/GitLab preview
- [ ] Exports reflect current store state (no stale data)
- [ ] Export files named: `<project-name>-<export-type>-<YYYY-MM-DD>.<ext>`

---

## Replacement for §6.0 (previously absent) — Landing / Projects page

Previously conflated with §6 (feature specs). Now given its own spec.

### Landing page (which is also the projects list page — merged)

**Route:** `/` (root)

**Layout:**
- Left sidebar per §6.0 (collapsed or expanded)
- Main content:
  - Page header: "Projects" title + project count
  - Search + filter bar
  - Projects list (rectangular cards, stacked, sorted by modified date descending)

**Search + filter bar:**
- Free-text search across name and customer
- Filter dropdowns: workload type (inference/fine-tune/training — only inference enabled in v1), modified date range (last 7d / 30d / 90d / all time)
- "Clear filters" button visible when any filter is active
- Filter state preserved in URL query params for shareable links

**Project card:**
- Project name (large)
- Customer (subtle)
- Modified date/time in user's timezone with relative formatting ("2 hours ago", "Yesterday", "3 days ago", "Apr 15")
- Deployment pattern pill (e.g., "internal-inference")
- Delete icon (trash) on the right
  - Clicking opens a confirmation dialog: "Delete project '<name>'? This cannot be undone."
  - Requires explicit confirmation click (no typing-to-confirm for v1)
- Entire card clickable to navigate to project
- Hover state: subtle background lift

**Empty state:**
- If zero projects: "No projects yet. Create your first one to get started." + prominent "+ New Project" button
- If filters return zero: "No projects match these filters. Clear filters to see all."

**Acceptance criteria:**
- [ ] Search and filters work live (< 200ms response)
- [ ] Filter state encoded in URL (`?q=...&workload=inference&modified=30d`)
- [ ] Delete confirmation dialog shown before actual delete
- [ ] Timezone display correct for user locale
- [ ] Empty states render correctly
- [ ] Sorted by `updated_at DESC` by default

---

## New /onboarding page (How it works)

**Route:** `/onboarding`

**Purpose:** replace the "process definition blocks" that were going to live on the landing page. Dedicated space for new users to understand each phase.

**Content structure:**
- Hero: "How this tool works" + 2-sentence summary
- Four sections (one per phase), each with:
  - Phase name (Discovery / RFI / Build / Export)
  - 2-paragraph explanation
  - Screenshot or diagram (can be placeholder boxes in v1; real screenshots added later)
  - Link: "Start by creating a project"
- Closing: "Ready? [+ Create your first project]"

**Linked from:**
- Left sidebar ("📖 How it works")
- First-run banner on empty-state landing page (dismissible; banner state in localStorage)
- Footer of every page (small link)

**Acceptance criteria:**
- [ ] Page renders at `/onboarding`
- [ ] Linked from sidebar and first-run banner
- [ ] Readable on mobile widths (even though app itself is not mobile-optimized for v1)

---

## File-structure additions (append to §10)

New components and pages introduced by Phase 7:

```
app/
├── layout.tsx                          # REPLACES: now wraps with Sidebar + ThemeProvider
├── onboarding/page.tsx                 # NEW: How it works
└── project/[id]/
    └── layout.tsx                      # REPLACES: no longer has top tab bar; delegates to sidebar

components/
├── Sidebar/
│   ├── Sidebar.tsx                     # NEW: main sidebar container
│   ├── SidebarHeader.tsx               # NEW: logo + collapse toggle
│   ├── SidebarNavItem.tsx              # NEW: reusable nav item
│   ├── SidebarCurrentProject.tsx       # NEW: shows current project + sections
│   └── SidebarThemeToggle.tsx          # NEW: moon/sun toggle
├── ProjectsList/
│   ├── ProjectsList.tsx                # NEW: main list component
│   ├── ProjectCard.tsx                 # NEW: single project card
│   ├── ProjectsSearchFilter.tsx        # NEW: search + filter bar
│   └── DeleteProjectDialog.tsx         # NEW: confirmation dialog
├── discovery/
│   └── SavedIndicator.tsx              # NEW: "Saved · Xs ago" badge
├── onboarding/
│   └── OnboardingSection.tsx           # NEW: per-phase section block
└── common/
    ├── Breadcrumbs.tsx                 # NEW: top-of-content breadcrumbs
    └── EmptyState.tsx                  # NEW: reusable empty state

lib/
├── theme/
│   ├── colors.ts                       # NEW: color token definitions
│   └── use-theme.ts                    # NEW: wrapper around next-themes

app/globals.css                         # UPDATED: new theme tokens per §14
```

---

## New §14 — Design System

### 14.1 Color tokens

All colors defined as CSS custom properties in `app/globals.css` using Tailwind v4 `@theme` blocks.

**Light mode** (warm off-white, inspired by Notion/GitHub reading surfaces):

| Token | Hex | Purpose |
|---|---|---|
| `--bg-canvas` | `#faf8f3` | Page background (warm off-white) |
| `--bg-surface` | `#ffffff` | Cards, panels, elevated surfaces |
| `--bg-subtle` | `#f4f0e8` | Subtle surface (hover, zebra) |
| `--bg-overlay` | `rgba(26, 26, 26, 0.4)` | Modal overlay |
| `--border-default` | `#e8e3d8` | Default borders |
| `--border-muted` | `#f0ebe0` | Subtle dividers |
| `--text-primary` | `#1a1a1a` | Body text |
| `--text-secondary` | `#5a5a5a` | Labels, captions |
| `--text-muted` | `#8a8a8a` | Disabled, placeholders |
| `--accent-primary` | `#2f81f7` | Links, primary buttons, focus rings |
| `--accent-hover` | `#1e6fe0` | Hover on accent |
| `--success` | `#1a7f37` | Success states, "Saved" indicator |
| `--warning` | `#9a6700` | Warning states |
| `--danger` | `#cf222e` | Errors, delete actions |

**Dark mode** (GitHub-inspired):

| Token | Hex | Purpose |
|---|---|---|
| `--bg-canvas` | `#0d1117` | Page background (GitHub canvas.default) |
| `--bg-surface` | `#161b22` | Cards, panels (GitHub canvas.subtle) |
| `--bg-subtle` | `#1c2128` | Hover, zebra |
| `--bg-overlay` | `rgba(0, 0, 0, 0.6)` | Modal overlay |
| `--border-default` | `#30363d` | Default borders |
| `--border-muted` | `#21262d` | Subtle dividers |
| `--text-primary` | `#e6edf3` | Body text |
| `--text-secondary` | `#8b949e` | Labels, captions |
| `--text-muted` | `#6e7681` | Disabled, placeholders |
| `--accent-primary` | `#2f81f7` | Same as light for brand consistency |
| `--accent-hover` | `#58a6ff` | Hover on accent (brighter in dark) |
| `--success` | `#3fb950` | Success states |
| `--warning` | `#d29922` | Warning states |
| `--danger` | `#f85149` | Errors, delete actions |

### 14.2 Typography

- Body: `Inter` (sans-serif) via `next/font/google`
- Monospace: `JetBrains Mono` for code, numbers in BoM
- Base size: `16px`; line-height `1.5`
- Scale: use Tailwind's default type scale (`text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`)
- Headings: font-weight 600; avoid bold caps

### 14.3 Spacing

- Stick to Tailwind's 4px-based scale (`p-1`, `p-2`, `p-4`, `p-6`, `p-8`)
- Page padding: `px-8 py-8`
- Card padding: `p-6`
- Gap between stacked items: `gap-3` (12px) for list items, `gap-6` for sections

### 14.4 Elevation (shadows)

Four levels:
- `shadow-none` — flat surfaces
- `shadow-sm` — cards at rest (light mode only; dark mode uses borders)
- `shadow-md` — popovers, dropdowns
- `shadow-lg` — modals

Dark mode uses borders (`border-default`) instead of shadows for elevation.

### 14.5 Corners & radii

- Small controls (inputs, pills): `rounded-md` (6px)
- Cards and surfaces: `rounded-lg` (8px)
- Modals: `rounded-xl` (12px)

### 14.6 Motion

- Default transition: `transition-colors duration-150 ease-out`
- Theme switch: no transition on `html.dark` toggle (prevents flash)
- Hover interactions: 150ms color transition only

### 14.7 Icons

- `lucide-react` for all icons (already in stack via shadcn)
- Sidebar icons: 20px
- Inline icons (buttons, indicators): 16px
- Size via Tailwind: `h-5 w-5` (20px) and `h-4 w-4` (16px)

### 14.8 Accessibility

- All interactive elements have visible focus ring: `focus-visible:ring-2 ring-accent-primary ring-offset-2`
- Color contrast: all text ≥ 4.5:1 against its background (tokens above verified)
- Keyboard navigable throughout
- ARIA labels on icon-only buttons

---

## Bug report reference (for PHASE_PLAN Phase 8)

Known bugs to fix in Phase 8:

1. **Interconnect mismatch in BoM** — User selects "100GBe RoCE" in Discovery; Build/BoM shows "InfiniBand". Likely source: `lib/sizing/sharding.ts` or `lib/sizing/bom.ts` is using a hardcoded default instead of honoring Discovery preference.
2. **RFP JSON extraction truncation** — Error: `Unterminated string in JSON at position 10703 (line 274 column 40)`. LLM output exceeded `maxTokens`; need to raise limit and add streaming-safe JSON parsing with retry.
3. **RFP file upload extraction failure** — Error: `could not extract from file`. Source: pdf-parse or mammoth throwing on specific PDF. Need better error handling and test fixtures for edge cases.

## BoM pricing audit (for PHASE_PLAN Phase 8)

The current `list_price_usd` values in `data/gpus.json` and `data/servers.json` were populated by Claude Code from training data and estimates. They are **indicative only**. Phase 8 adds:
- An audit step to review and source-cite each price
- A visible UI disclaimer in BoM sections: "Indicative pricing — confirm with vendor."
- An "override price" field per BoM line item (already in schema, not yet surfaced in UI)

---

## Revision Log update

| Version | Date | Author | Changes |
|---|---|---|---|
| v0.1 | 2026-04-18 | Claude + owner | Initial draft |
| v0.2 | 2026-04-19 | Claude + owner | Added prefill/decode/sharding math, optimizations §7.6, worked example §7.7 |
| v0.3 | 2026-04-21 | Claude + owner | UX redesign: two-level left nav (§6.0), merged landing/projects page, onboarding page, autosave indicator instead of save button, Build Report export (§6.4), Design System (§14). Known bugs + BoM pricing audit queued for Phase 8. |
