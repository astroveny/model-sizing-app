# Project Skeleton

This skeleton contains the folder structure and placeholder files for `ml-sizer` as defined in `PRD.md` §10.

## What's here

- **Folder structure** — every directory from PRD §10
- **Config stubs** — `.gitignore`, `.dockerignore`, `.env.example`, `Dockerfile`, `docker-compose.yml`, `CHANGELOG.md`
- **`.TODO` markers** — every file to be created during Phase 0–6 is present as `<filename>.TODO`. Rename/replace as you build.
- **Stub data files** — `data/*.json` have valid-JSON placeholders with `_TODO` markers

## What's NOT here (you already have these)

- `PRD.md`
- `README.md`
- `PHASE_PLAN.md`
- `docs/sizing-math.md`
- `docs/adding-a-gpu.md`
- `docs/adding-explain-content.md`
- `docs/llm-provider-guide.md`

Drop them in the right places after extracting this skeleton.

## How to use

```bash
# 1. Extract into your repo
unzip ml-sizer-skeleton.zip -d /path/to/repo/

# 2. Move your existing docs into place
mv PRD.md README.md PHASE_PLAN.md /path/to/repo/ml-sizer/
mv docs/*.md /path/to/repo/ml-sizer/docs/

# 3. Initialize git (if not already)
cd /path/to/repo/ml-sizer
git init
git add .
git commit -m "Initial commit: PRD, README, PHASE_PLAN, docs, and project skeleton"

# 4. Start Phase 0 step P0.1 (see PHASE_PLAN.md)
```

## The .TODO files

Every `.TODO` file is a placeholder. When you start the step that creates the real file, delete the `.TODO` suffix and write the content.

For example, at step P0.5 (Drizzle schema), you'll:
```bash
# Delete the placeholder
rm lib/db/schema.ts.TODO
# Create the real file
# (write content per PRD §5.2)
```

Some IDEs will flag `.TODO` files with a warning — that's intentional. They're the "unfinished" list.
