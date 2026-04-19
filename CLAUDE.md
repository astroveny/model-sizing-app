@AGENTS.md

# model-sizing-app

A local-first tool for sizing and architecting ML/GenAI deployments across four stack layers (Hardware, Infra Platform, Model Platform, Application). Inference-only in v1. Runs via Docker.

## Essential reading — in this order

Before any non-trivial work, read these:

1. **`PRD.md`** — product requirements. §3 (scope), §5 (data model), §7 (sizing formulas), §9 (phases), §10 (file structure). This is the source of truth.
2. **`PHASE_PLAN.md`** — numbered build steps (P0.1 … P6.10). Each step has action, deliverable, verify criteria, and refs back to PRD sections. When asked to do work, map it to a step ID.
3. **`docs/sizing-math.md`** — formula derivations with numbered citations [1]–[12]. Cite as `// Ref: [4]` in source code comments.
4. **`docs/adding-a-gpu.md`**, **`docs/adding-explain-content.md`**, **`docs/llm-provider-guide.md`** — extension guides for catalogs, ExplainBox content, and LLM providers.

## Working style

- **Step-by-step.** When executing phase work, do one step at a time (e.g., "P0.2"), show what changed, run the verify check, wait for confirmation before moving on.
- **Reference step IDs** in commits and discussion. Commit message pattern: `P0.2: install core dependencies`.
- **Update `PHASE_PLAN.md`** as you go: mark steps complete (☐ → ☑), log failures in the troubleshooting section at the bottom with the step ID.
- **Update `CHANGELOG.md`** at the end of each phase or meaningful change.
- **Never overwrite `PRD.md` or `docs/*.md`** without first proposing the change in chat. These are reviewed documents.

## Tech stack (locked unless PRD changes)
latest versions 
- Next.js  + React  + TypeScript + App Router
- Tailwind  (CSS-based config via `@theme` blocks in `app/globals.css`)
- Zustand (state), Drizzle + better-sqlite3 (DB), Zod (validation)
- shadcn/ui (components), lucide-react (icons), next-themes (light/dark)
- @react-pdf/renderer + docx (exports)
- LLM via provider abstraction: Anthropic default, OpenAI-compatible for Gemma/Kimi/Nemotron

## Conventions

- **File structure** strictly per PRD §10. Don't add `src/`. Import alias: `@/*` → repo root.
- **Sizing engine (`lib/sizing/*`)** is pure-functional. No I/O, no randomness. Tests depend on this.
- **LLM prompts** live in `lib/llm/prompts/*.ts`, each with a `PROMPT_VERSION` constant.
- **`.TODO` placeholder files** in the skeleton: when you start writing the real file, delete the `.TODO` marker.
- **No browser storage** (localStorage/sessionStorage) — we use SQLite on the server.

## Environment

- `.env.example` documents all env vars. User's `.env` is gitignored.
- LLM provider is selected via `LLM_PROVIDER` env var.
- SQLite DB at `data/ml-sizer.db`. Uploads at `uploads/`.

## Current phase

Check `PHASE_PLAN.md` for the last checked-off step. Ask before picking up work past the current phase boundary.