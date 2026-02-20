# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Honeydew is a household task management system built with a Vue 3 frontend and Cloudflare Workers backend. It helps families coordinate chores, recipes, projects, and wardrobe tracking via a web UI and Telegram bot integration.

## Commands

```bash
npm install                  # Install all dependencies
npm run serve                # Vue dev server with hot-reload (port 8080)
npm run build                # Production build with webpack bundle report
npm run lint                 # ESLint with auto-fix
npm run test                 # Run Vitest unit/integration tests
npm run test:watch           # Run tests in watch mode
npm run dev                  # Full local dev: Wrangler Pages + D1 + Vue dev server (port 8788)
npm run test:e2e             # Run Playwright E2E tests
npm run test:e2e:screenshots # Run screenshot-only E2E tests
npx vitest tests/util.test.ts  # Run a single test file
```

## Architecture

### Frontend (`/src`)

- **Vue 3** with Composition API, **Vue Router 4**, **Pinia** state management
- **tRPC client** (`@trpc/client`) for type-safe API calls to the backend
- **Bulma CSS** framework with **Nord** color theme and custom **Sailwind** utility classes (Tailwind-like utilities generated via SCSS)
- Font: Nunito (Google Fonts)
- Build tool: **Vue CLI 5** (webpack-based, configured in `vue.config.js`)

#### Frontend Structure

```
src/
  App.vue                    # Root component: Header + router-view + Footer
  main.ts                    # App bootstrap: creates Vue app, Pinia, router
  router/index.ts            # Route definitions with auth guards
  store/index.ts             # Single Pinia store with tRPC client integration
  shims-vue.d.ts             # Vue module type declarations
  assets/variables.scss      # Nord theme colors + Sailwind utility definitions
  components/
    HeaderComponent.vue      # Navigation header
    FooterComponent.vue      # Page footer
    ChoreIconComponent.vue   # Chore display icon
    RecipePanelComponent.vue # Recipe card/panel
    TimeComponent.vue        # Time/duration display
    UserIconComponent.vue    # User avatar icon
  views/
    IndexView.vue            # Entry/redirect view
    LandingView.vue          # Unauthenticated landing page
    HomeView.vue             # Authenticated dashboard
    ChoresView.vue           # Chore management
    RecipesView.vue          # Recipe collection
    ProjectsView.vue         # Project list
    TasksView.vue            # Tasks within a project (/projects/:id)
    HouseholdView.vue        # Household settings/admin
    ClosetView.vue           # Clothing/wardrobe management
    OutfitsView.vue          # Outfit suggestions
    SignupView.vue            # New user registration
    SignoutView.vue          # Sign out
    RecoveryView.vue         # Account recovery
    AboutView.vue            # About page
    400View.vue              # Auth required error
    404View.vue              # Not found
```

#### Frontend Patterns

- **Single Pinia store** (`useUserStore`) manages all state: user, chores, recipes, projects, tasks, clothes
- The store wraps all tRPC calls with `QueryAPI<R>()` helper that returns `APIResult<T>` (success/error union type)
- tRPC client connects to `/api` with `httpBatchLink` and `same-origin` credentials
- Route guard: routes with `meta.noAuthRequired: false` redirect unauthenticated users to `/error`
- Initial user data is hydrated from `window.user_data` (set by server-side middleware)
- After mutations, the store fires background refetch calls (e.g., `this.ChoreFetch()`) for eventual consistency
- Zod schemas are imported from `/functions/db_types.ts` for client-side ID validation

### Backend (`/functions`)

- **Cloudflare Pages Functions** (file-based routing under `/functions`)
- **tRPC server** (`@trpc/server` v10) with fetch adapter
- **Cloudflare D1** (SQLite) via **Kysely** ORM with D1Dialect
- **Cloudflare KV** for caching, magic links, session tokens, Telegram callbacks
- Authentication: Magic links + JWT + Telegram integration
- Recipe scraping: Multiple parsers with fallback chain
- Scheduled triggers for automated chore assignment and reminders

#### Backend Structure

```
functions/
  _utils.ts                  # Shared utilities: HTTP responses, cookies, Julian dates, time parsing
  api_types.ts               # API-level type definitions
  db_types.ts                # All Zod schemas and branded types (shared with frontend)
  types.d.ts                 # Cloudflare env bindings and page data types

  api/
    [[trpc]].ts              # tRPC fetch adapter - catches all /api/* routes
    _middleware.ts            # Middleware chain: DB init -> JWT -> user auth
    context.ts               # tRPC context creation
    trpc.ts                  # tRPC init, public/protected procedure exports
    router.ts                # Main appRouter combining all sub-routers
    routers/
      household.ts           # Household management (invite, auto-assign, expecting date)
      me.ts                  # User profile (get, magic link)
      chores.ts              # Chore CRUD + assignment + completion with streaks
      recipes.ts             # Recipe CRUD + favorites + meal prep
      projects.ts            # Project/task CRUD with dependency tracking
      clothes.ts             # Clothing CRUD + wear tracking + Indyx CSV import

  auth/
    _middleware.ts            # JWT validation, token refresh, user lookup
    signup.ts                # POST /auth/signup - create user + household
    signout.ts               # GET /auth/signout - clear cookies
    check.ts                 # GET /auth/check - validate session
    migrate.ts               # GET /auth/migrate - run DB migrations
    auth_types.ts            # Auth request/response Zod schemas
    magic/[id].ts            # GET /auth/magic/:id - consume magic link
    join/[id].ts             # Household join link handler
    telegram/[id].ts         # GET /auth/telegram/:id - link Telegram account

  database/
    _db.ts                   # Database class: all CRUD operations via Kysely
    _telegram.ts             # Telegram API wrapper (send messages, photos, callbacks)
    migration.ts             # Schema migrations (10 versions, run sequentially)

  _recipe/
    index.ts                 # Scraper orchestrator: try all scrapers, return first success
    scrapers/
      ld_json.ts             # Generic: parses <script type="application/ld+json"> Schema.org
      microdata.ts           # Generic: parses HTML microdata attributes
      atk.ts                 # Site-specific: America's Test Kitchen
      weissman.ts            # Site-specific: Joshua Weissman
      everyplate.ts          # Site-specific: EveryPlate
      ctfb.ts                # Site-specific: Central Texas Food Bank
      debug.ts               # Dev-only debug scraper

  _clothing/
    indyx.ts                 # Indyx CSV import parser

  telegram/
    webhook.ts               # POST webhook handler with secret validation
    _handler.ts              # Message/callback dispatch (URL -> recipe, button -> chore complete)
    _middleware.ts            # Telegram-specific middleware
    info.ts                  # Bot info endpoint
    reset.ts                 # Reset webhook endpoint

  triggers/
    _middleware.ts            # Trigger authentication middleware
    reset_all_auto.ts        # Reset auto-assignment timestamps
    reset_all_chores.ts      # Reset all chore states
    schedule/
      chores.ts              # Cron: auto-assign chores + send reminders (12h delayed)
      outfits.ts             # Cron: outfit suggestions (placeholder)
      expecting.ts           # Cron: expecting date notifications
```

#### tRPC Routers

Six sub-routers merged into `appRouter`:

| Router | Procedures | Auth |
|--------|-----------|------|
| `household` | `invite`, `setAutoAssign`, `setOutfitHour`, `setExpectingDate` | Public (uses context) |
| `me` | `get`, `magic_link` | Protected |
| `chores` | `all`, `next`, `another`, `complete`, `delete`, `add`, `assignTo` | Protected |
| `recipes` | `favorites`, `toTry`, `mark_favored`, `mark_meal_prep`, `remove`, `add`, `meal_plan`, `create_meal_plan` | Protected |
| `projects` | `get_projects`, `add`, `add_task`, `delete_task`, `complete_task`, `get_tasks`, `delete` | Protected |
| `clothes` | `all`, `get`, `add`, `delete`, `mark_worn`, `mark_clean`, `mark_dirty`, `import_indyx` | Protected |

#### Authentication Flow

1. **Signup**: POST `/auth/signup` with name + optional house key + Turnstile token. Creates user + household (or joins existing). Issues `DEVICE_TOKEN` (persistent JWT) and `TEMP_TOKEN` (12h JWT) as cookies.
2. **Magic Links**: Generate 50-char random key stored in KV (1h TTL). GET `/auth/magic/:key` validates and consumes key, issues new tokens.
3. **Telegram**: GET `/auth/telegram/:chat_id` links a Telegram chat to a user account.
4. **Middleware chain**: `topLevelHandler` (DB init) -> `jwtHandler` (validate/refresh tokens) -> `userAuthHandler` (load user from DB).

#### Database

- **10 migration versions** applied sequentially on `/auth/migrate`
- Julian Day Numbers used for all date storage (enables simple date arithmetic)
- Tables: `users`, `households`, `chores`, `recipes`, `cardboxes`, `projects`, `tasks`, `houseautoassign`, `clothes`

#### Branded ID System

All entity IDs use Zod-branded types with prefix validation:

| Type | Prefix | Length | Example |
|------|--------|--------|---------|
| `UserId` | `U:` | 38 | `U:42598872-8a5b-44c7-a6ca-1be5e0f21518` |
| `HouseId` | `H:` | 38 | `H:...` |
| `ChoreId` | `C:` | 38 | `C:...` |
| `RecipeId` | `R:` | 38 | `R:...` |
| `ProjectId` | `P:` | 38 | `P:...` |
| `TaskId` | `T:` | 38 | `T:...` |
| `ClothingId` | `CL:` | 39 | `CL:...` |

#### KV Namespace Keys

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `U:{UUID}` | Cached user objects | 6h |
| `H:{UUID}` | Cached household objects | 6h |
| `E:H:{UUID}` | Extended household with members | 6h |
| `MK:{key}` | Magic link -> user ID mapping | 1h |
| `HK:{UUID}` | Household invitation keys | None |
| `TC:{UUID}` | Telegram callback payloads | 24h |
| `CC:U:{UUID}` | User's current chore cache | 23h |
| `TA:H:{UUID}` | Household task assignment | 23h |
| `EH:{UUID}` | Expecting date notification flag | ~7d |

#### Cloudflare Bindings

Defined in `wrangler.toml` and typed in `functions/types.d.ts`:

| Binding | Type | Usage |
|---------|------|-------|
| `HONEYDEW` | KV Namespace | Caching, magic links, session data, Telegram callbacks |
| `HONEYDEWSQL` | D1 Database | Primary data store via Kysely |
| `JWT_SECRET` | Var | JWT signing key |
| `TELEGRAM` | Var | Telegram Bot API key |
| `TELEGRAM_WH` | Var | Telegram webhook secret |
| `TURNSTILE` | Var | Cloudflare Turnstile CAPTCHA secret |
| `PRODUCTION` | Var | `"true"` or `"false"` flag |

### Type Safety

- **Zod schemas** in `/functions/db_types.ts` define all data types with branded types for IDs
- **Kysely** provides typed SQL queries against the D1 database schema
- **tRPC** ensures end-to-end type safety: the frontend imports `AppRouter` type from the backend
- The `@/*` path alias maps to both `src/*` and `shared/*` (configured in `tsconfig.json`)
- Backend (`/functions`) and tests (`/tests`) are excluded from the frontend tsconfig; tests have their own `tests/tsconfig.json`

## Testing

### Unit/Integration Tests (Vitest)

Tests run in a Cloudflare Workers environment using `@cloudflare/vitest-pool-workers` with Miniflare emulation. Configuration is in `vitest.config.ts`.

```bash
npm run test                        # Run all tests once
npm run test:watch                  # Watch mode
npx vitest tests/util.test.ts       # Single file
npx vitest --coverage               # With V8 coverage
```

Test files in `/tests/`:

| File | Covers |
|------|--------|
| `util.test.ts` | Utility functions: HTTP responses, cookies, Julian dates, duration parsing |
| `db.test.ts` | Database operations: users, households, chores, recipes, projects, tasks, clothes (largest test file) |
| `trpc.test.ts` | tRPC router integration: API calls, auth, cross-user access control |
| `telegram.test.ts` | Telegram bot: message handling, recipe URLs, callbacks, chore triggers, scheduling |

Coverage includes: `functions/*.ts`, `functions/database/**/*.ts`, `functions/triggers/**/*.ts`, `functions/telegram/**/*.ts`, `functions/api/**/*.ts`

### E2E Tests (Playwright)

Playwright runs against the full Wrangler dev server (`http://localhost:8788`). Configuration is in `playwright.config.ts`.

```bash
npm run test:e2e                    # Run all E2E tests
npm run test:e2e:screenshots        # Screenshots only
```

- Single project: Chromium Desktop
- Sequential execution (no parallel)
- `e2e/screenshots.spec.ts`: Captures full-page screenshots of all views (landing, signup, dashboard, chores, recipes, projects, household) for visual regression in PRs

### Testing Patterns

- Arrange-Act-Assert structure
- Database state assertions via direct Kysely queries in tests
- Mock Telegram API with listener pattern for verifying bot messages
- Auth bypass in E2E tests (direct API signup to skip Turnstile CAPTCHA)
- Cross-user permission validation tests

## CI/CD

### GitHub Actions Workflows

**`nightly.yml` - Build & Test** (push to main + PRs):
1. Node.js 22.x setup
2. `npm install` -> `npm run build` -> `npm run test`
3. Coverage upload to Codecov

**`screenshots.yml` - PR Screenshots** (PRs only):
1. Install deps + Playwright browsers (Chromium)
2. Build frontend + run screenshot tests
3. Publish screenshots as CML assets in PR comments

### Deployment

- **Cloudflare Pages** with Functions - deployed via Wrangler
- Frontend build output serves as the static site
- `/functions` directory auto-maps to Pages Functions routes
- D1 database and KV namespace are bound in `wrangler.toml`

## Git Workflow

- Main branch: `main`
- Feature branches: `feature/{issue-number}/{description}`
- CI runs on push to main and PRs (build, test, codecov, screenshots)

## Key Conventions

- **Julian Day Numbers**: All dates stored as Julian day numbers for simple date math (see `getJulianDate()` in `_utils.ts`)
- **Branded Zod types**: Entity IDs are branded strings with prefix validation - always use the Zod parsers (e.g., `UserIdZ.parse()`) when creating or validating IDs
- **KV caching with cascading invalidation**: Invalidating a user cache also invalidates their household cache
- **Sailwind**: Custom Tailwind-like utility classes generated via SCSS loops in `App.vue` using Nord color palette from `variables.scss`
- **Recipe scraping**: Site-specific scrapers are tried first, then generic LD-JSON/microdata parsers as fallback
- **Chore assignment algorithm**: `score = (days_overdue / frequency) - (1 / days_since_assigned)` picks the most overdue chore while penalizing recently-assigned ones
- **Telegram MarkdownV2**: Messages use MarkdownV2 formatting with proper character escaping
- **Error logging**: Console errors are auto-persisted to KV with `err:` / `warn:` prefixes (36h TTL)
- **Node.js version**: 22 (specified in `.node-version`)
