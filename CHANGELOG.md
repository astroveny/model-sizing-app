# Changelog

All notable changes to this project will be documented here. Follow [Keep a Changelog](https://keepachangelog.com/) conventions.

## [Unreleased]

### Added
- PRD, README, docs/, PHASE_PLAN.md
- Project skeleton
- P0.1–P0.3: Next.js + core deps + shadcn/ui bootstrap
- P0.4–P0.5: folder structure, Drizzle + SQLite schema and client
- P0.6–P0.7: Zustand store skeleton + project persistence (CRUD + autosave)
- P0.8: project list, "New Project" flow, project detail shell with tab bar
- P0.8b: light/dark/system theme toggle (next-themes)
- P0.9: multi-stage Dockerfile (node:20-slim, standalone output)
- P0.10: docker-compose.yml with volume mounts and health check
- P0.11: .env.example with all LLM provider vars and DATABASE_PATH
- P0.12: .gitignore covering node_modules, .next, DB files, uploads, secrets; fixed .env.example negation ordering so it is tracked by git
- P0.13: smoke test passed — docker compose up, create project, restart, project persists

### Changed
- (nothing yet)

### Fixed
- .gitignore: moved `!.env.example` after `**/*.env*` so the negation takes effect
