# Responsive Design — `model-sizing-app`

> **Purpose:** define how this app behaves across screen sizes so that any new component developed from now on is mobile-agnostic by default.
> **Status:** living spec; no retrofit of existing components is currently scheduled. New work must conform; existing work will be brought into compliance opportunistically.
> **Companion:** PRD §14 Design System (colors, typography, spacing).

---

## 1. Why this exists

The app was built desktop-first. As a discovery and sizing tool used in client meetings, it's increasingly going to be opened on phones and tablets — sometimes by the engineer running the call, sometimes by the customer reviewing a generated proposal.

This document defines the **responsive contract** every component must meet, the **breakpoints** we use, the **mobile-specific behaviors** for each major surface, and a **review checklist** that gates new components.

It is intentionally pragmatic, not exhaustive. The goal is "usable on mobile" not "best-in-class native-feeling mobile app."

---

## 2. Target devices and breakpoints

The app must work on:

| Class | Min width | Reference device | Use case |
|---|---|---|---|
| Phone — portrait | 360px | iPhone SE | Quick check during a call |
| Phone — landscape | 640px | iPhone in landscape | Reading a Build Report |
| Tablet — portrait | 768px | iPad mini | Discovery + Build at a coffee shop |
| Tablet — landscape | 1024px | iPad Pro 11" | Full workflow |
| Laptop | 1280px | 13" MacBook | Primary target |
| Desktop | 1536px+ | 27" external | Power-user workflow |

Breakpoints (Tailwind v4 conventions):

```
sm: 640px    — phone landscape and up
md: 768px    — tablet portrait and up
lg: 1024px   — tablet landscape and up
xl: 1280px   — laptop and up
2xl: 1536px  — desktop
```

**Default styles target the smallest screen** (mobile-first). Larger screens override via `sm:`, `md:`, `lg:`, etc.

---

## 3. Layout principles

### 3.1 Sidebar behavior

The two-level left sidebar (PRD §6.0) is desktop-friendly but breaks below 1024px. Mobile-specific behavior:

| Width | Sidebar |
|---|---|
| < `lg` (1024px) | Hidden by default. A hamburger button in the top bar opens it as an overlay drawer. |
| ≥ `lg` | Visible as a column. Collapsible to icon-only as today. |

Drawer overlay specifics:
- Slides in from the left
- Backdrop overlay with `bg-overlay` (per Design System)
- Tap outside to close
- Esc key closes
- Body scroll-lock while open

### 3.2 Main content

- Default: `max-w-6xl` with `mx-auto` (centered)
- Phone (`< sm`): `max-w-full px-4`
- Tablet (`sm` to `lg`): `max-w-3xl px-6`
- Laptop+ (`lg+`): existing `max-w-6xl px-8`

### 3.3 Tables

Discovery, BoM, and catalog tables won't fit on a phone. Two patterns are acceptable:

**Pattern A — Horizontal scroll with sticky first column.**
For data-heavy tables (BoM, catalog admin) where every column matters. Wrap in `overflow-x-auto`, give the first column `sticky left-0 bg-surface`. Acceptable on phone landscape; awkward on portrait.

**Pattern B — Card layout below `md`.**
Each row becomes a card with key fields stacked vertically. Use for tables where row count is small (< 50). This is preferred for the projects list.

**Decision rule:** if a table has > 5 columns and > 30 rows expected, use Pattern A. Otherwise use Pattern B.

### 3.4 Forms

- Single column on phone (`< sm`)
- Two columns on tablet (`md` to `lg`) where logical groupings allow
- Match desktop layout (often three columns or label+input rows) only at `lg+`

Field width: `w-full` always. No `w-48` etc., which break on small screens. If you need to constrain, use `max-w-md` or similar.

### 3.5 Modals

- Phone: full-screen takeover (`w-full h-full` with rounded corners on top only or no rounding)
- Tablet+: centered, `max-w-2xl`, `max-h-[80vh]`, scrollable body, fixed header/footer

This applies to ExplainBox maximize, Add Server / GPU / Model dialogs, Delete Project confirmation, etc.

---

## 4. Touch targets

Per WCAG and Apple HIG, interactive elements need a minimum **44×44px** touch area. Many components today use shadcn defaults that are smaller.

- Buttons, icon buttons, switches, dropdown triggers: `min-h-11 min-w-11` (44px) on phone
- Adjacent touch targets: minimum 8px gap

**Implementation note:** small icons within larger buttons are fine — the *button* must be 44×44, not the icon.

---

## 5. Typography on mobile

Body text base size unchanged from PRD §14.2 (`16px`). What changes:

| Element | Phone | Tablet+ |
|---|---|---|
| Page H1 | `text-2xl` (24px) | `text-3xl` (30px) |
| Section H2 | `text-xl` (20px) | `text-2xl` (24px) |
| Card title | `text-lg` (18px) | `text-lg` (18px) |
| Body | `text-base` (16px) | `text-base` (16px) |
| Helper text | `text-sm` (14px) | `text-sm` (14px) |
| Tabular numbers (BoM) | `text-sm tabular-nums` | `text-base tabular-nums` |

Line-height: `leading-relaxed` (1.625) for body on mobile to ease reading.

---

## 6. Per-section mobile contract

### 6.1 Landing / Projects list

- Search bar: full width
- Filter dropdowns: stack vertically below `md`; row above
- Project cards: full width below `md`; in a grid with `lg:grid-cols-2 xl:grid-cols-3` for higher widths
- Card actions (delete icon): always 44×44 touch area

### 6.2 Discovery

- Tab bar: scrollable horizontally on phone (don't compress text)
- Forms: single column on phone (§3.4)
- ExplainBox icon: visible inline; popup modal goes full-screen on phone (§3.5)
- "Saved · Xs ago" indicator: stays top-right, fixed-position on phone scroll if Discovery is long

### 6.3 RFI

- Paste textarea: full width, taller min-height (`min-h-48` on phone)
- Extracted requirements list: cards below `md`, table at `md+`
- Apply / Apply All buttons: prominent, 44px min height

### 6.4 Build

- Layer panels (Hardware/Infra/ModelPlatform/Application): single column accordion below `md`; side-by-side at `md+`
- BoM table: horizontal scroll with sticky first column (§3.3 Pattern A)
- Vendor comparison view: stacked sections on phone; columns at `lg+`

### 6.5 Export

- Export buttons stack vertically below `sm`; in a row at `sm+`
- Preview pane below button block on phone; side-by-side at `lg+` (preview optional on phone)

### 6.6 Settings

- All admin pages use the same pattern: header, search/filter (stack on phone), table or card-list, "Add" button as primary CTA at the top-right (or bottom-right floating on phone)
- Add/Edit dialogs follow modal rules (§3.5)

---

## 7. Things deliberately NOT supported on mobile (yet)

To keep scope reasonable:

- **Portrait phone usage of the Build page sizing diagrams** — the rack layout and architecture diagrams remain desktop-friendly. On phone, show a "Best viewed on tablet or larger" notice with a thumbnail.
- **Drag-and-drop file upload** — on phone, file input opens the native picker.
- **Multi-column dashboard layouts** — single column always until `lg`.
- **PDF preview in-page on phone** — show "Download PDF" button instead of inline preview.
- **Complex catalog management on phone** — admin pages work read-only on phone; full editing requires tablet+ (we'll show a notice).

These are explicit scope cuts, not bugs. Adjust as the doc evolves.

---

## 8. Accessibility intersections

Mobile responsiveness overlaps with accessibility. New components must also ensure:

- Focus indicators (Design System §14.8) work with keyboard *and* with iOS/Android external keyboards
- Color contrast holds at 4.5:1 (PRD §14.9) on dark mode in bright sunlight (which often increases contrast preference)
- Touch targets ≥ 44px (§4)
- Content zoomable to 200% without horizontal scroll on body content
- No reliance on hover-only interactions (any tooltip-revealed info must also be reachable via tap/long-press)

---

## 9. Component checklist (gate for new work)

Every new component PR must pass these before merge. This is the "responsive contract" referenced in phase plans.

- [ ] Renders without horizontal overflow at 360px width
- [ ] Renders without overflow at 768px and 1024px widths
- [ ] All interactive elements meet 44×44px touch target on mobile
- [ ] Text is readable (≥ 14px body) on smallest target
- [ ] Forms collapse to single column below `md`
- [ ] Tables use Pattern A or B per §3.3
- [ ] Modals follow §3.5 (full-screen on phone, centered on tablet+)
- [ ] Tested in both light and dark theme on phone width
- [ ] No hover-only interactions (all info reachable via tap/long-press)
- [ ] Works with keyboard navigation at every breakpoint

---

## 10. Testing approach

### 10.1 Manual checks (every component)

1. Open DevTools, set viewport to 375×667 (iPhone SE 1st gen — represents the smallest realistic target)
2. Verify no horizontal scroll on body
3. Tap-test all buttons, verify min size
4. Switch to 768×1024 (iPad portrait) — layout sensible
5. Switch to 1280×800 (laptop) — original design intent preserved

### 10.2 Real device checks (per release)

Before each version ships, smoke test on at least:
- Phone: any modern iPhone or Android in Chrome
- Tablet: iPad in Safari
- Desktop: primary dev environment

The smoke test follows the §6 contract for each section.

### 10.3 Automated checks (future)

Not in scope now. Candidates if we add them:
- Playwright or Storybook with responsive snapshots
- axe-core for accessibility audits at multiple widths

---

## 11. Versioning this document

Treat this doc the same as PRD: changes are reviewed, versions tracked.

| Version | Date | Changes |
|---|---|---|
| v0.1 | 2026-04-26 | Initial responsive design contract; no retrofit phase |

When a retrofit phase is scheduled (probably v0.6+), it will reference this document and use §9 as its acceptance checklist for each touched component.
