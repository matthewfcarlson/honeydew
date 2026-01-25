# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Honeydew is a household task management system built with Vue 3 frontend and Cloudflare Workers backend. It helps families coordinate chores, recipes, and projects via web UI and Telegram integration.

## Commands

```bash
npm install          # Install dependencies
npm run serve        # Vue dev server with hot-reload
npm run build        # Production build with bundle report
npm run lint         # ESLint with auto-fix
npm run test         # Run Jest tests (uses Miniflare for Workers emulation)
npm run dev          # Local dev with Wrangler (Cloudflare Pages + D1)
```

## Architecture

### Frontend (`/src`)
- **Vue 3** with Composition API, **Vue Router 4** (lazy-loaded routes), **Pinia** state management
- **tRPC client** for type-safe API calls
- **Bulma CSS** with SCSS and Sailwind utility classes (`/src/assets/variables.scss`)
- Views: HomeView (dashboard), ChoresView, RecipesView, ProjectsView, TasksView, HouseholdView

### Backend (`/functions`)
- **Cloudflare Workers** serverless functions
- **tRPC server** with routers: `household`, `me`, `recipes`, `chores`, `projects`
- **Cloudflare D1** (SQLite) database via **Kysely** ORM
- Authentication: Magic links + JWT + Telegram integration
- Recipe scraping: Multiple parsers in `/functions/_recipe/scrapers/` (LD-JSON, microdata, site-specific)
- Scheduled triggers in `/functions/triggers/` for auto-assignment and Telegram reminders

### Key Backend Files
- `/functions/api/router.ts` - Main tRPC router combining all sub-routers
- `/functions/api/trpc.ts` - tRPC initialization and middleware
- `/functions/database/_db.ts` - Database layer and Kysely setup
- `/functions/_utils.ts` - Shared utility functions

### Type Safety
- Zod schemas for API validation
- Kysely provides typed SQL queries from database schema
- tRPC ensures end-to-end type safety between frontend and backend

## Testing

Tests use Vitest with `@cloudflare/vitest-pool-workers` to emulate the Cloudflare Workers environment. Test files are in `/tests/`.

```bash
npm run test                    # Run all tests
npm run test:watch              # Run tests in watch mode
npx vitest tests/util.test.ts   # Run single test file
```

## Git Workflow

- Main branch: `main`
- Feature branches: `feature/{issue-number}/{description}`
- CI runs on push to main and PRs (build, test, codecov)
