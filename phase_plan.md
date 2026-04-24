# Phase Plan — model-sizing-app

> **This file is an index.** Full step details live in the numbered files below.
> Each file covers 3 phases. Phases are listed in numerical order; note that Phases 10 and 11 were built out of order but are documented in order here.

---

## File index

| File | Phases covered |
|---|---|
| [phase_plan_1.md](./phase_plan_1.md) | Phase 0 — Scaffold & Dockerize · Phase 1 — Discovery · Phase 2 — Sizing Engine |
| [phase_plan_2.md](./phase_plan_2.md) | Phase 3 — Build Section · Phase 4 — RFI · Phase 5 — Export |
| [phase_plan_3.md](./phase_plan_3.md) | Phase 6 — Polish & LLM Expansion · Phase 7 — UX Redesign · Phase 8 — Bug Fixes |
| [phase_plan_4.md](./phase_plan_4.md) | Phase 9 — Build Report Export · Phase 10 — LLM Settings · Phase 11 — UX Polish Round 2 |
| [phase_plan_5.md](./phase_plan_5.md) | Phase 12 — Server & BoM Override · Future phases · Troubleshooting · Revision log |

---

## Current status snapshot

| Phase | Title | Status |
|---|---|---|
| 0 | Scaffold & Dockerize | ☑ done |
| 1 | Discovery Section | ☑ done |
| 2 | Sizing Engine | ☑ done |
| 3 | Build Section | ☑ done |
| 4 | RFI Section | ☑ done |
| 5 | Export | ☑ done |
| 6 | Polish & LLM Expansion | ☑ done |
| 7 | UX Redesign | ☑ done |
| 8 | Bug Fixes + BoM Pricing Audit | ☑ done |
| 9 | Build Report Export | ☑ done |
| 10 | LLM Settings & Multi-Model Routing | ☑ done |
| 11 | UX Polish Round 2 | ☑ done |
| 12 | Server & BoM Override | ◐ P12.9 remaining |

**Next step:** [P12.9 — Smoke test](./phase_plan_5.md#-p129--smoke-test)

---

## Legend

- ☐ = not started · ◐ = in progress · ☑ = done · ⊘ = skipped/deferred

---

## Purpose & conventions

> **Purpose:** Step-by-step build plan with stable numeric identifiers. Reference any step as `P{phase}.{step}` (e.g., `P2.4`) when editing, updating, or troubleshooting.
> **Companion docs:** [PRD.md](./PRD.md) §9 (phased delivery), [README.md](./README.md) (user-facing), [docs/sizing-math.md](./docs/sizing-math.md).
> **Status:** Living document. Steps can be re-ordered within a phase but IDs remain stable once assigned.

### Working conventions
- Mark steps complete (☐ → ☑) in the relevant `phase_plan_X.md` file as work progresses.
- Update the status snapshot table above when a full phase completes.
- Log failures in [phase_plan_5.md — Troubleshooting](./phase_plan_5.md#troubleshooting-reference-by-step) with the step ID.
- Commit message pattern: `P0.2: install core dependencies`.
