# Savvr - Architecture Reference

This document is the handoff guide for developers and AI agents working on Savvr. It describes how the system is structured, how data flows, and what each important file does.

**Author:** Devansh Dalal  
**App name:** Savvr (package name: `savvr`)

---

## Table of contents

1. [High-level overview](#1-high-level-overview)
2. [Tech stack](#2-tech-stack)
3. [Runtime modes](#3-runtime-modes)
4. [Repository layout](#4-repository-layout)
5. [Request and data flows](#5-request-and-data-flows)
6. [Authentication and multi-user model](#6-authentication-and-multi-user-model)
7. [Storage layer](#7-storage-layer)
8. [Data schemas](#8-data-schemas)
9. [Backend modules (file by file)](#9-backend-modules-file-by-file)
10. [Frontend modules (file by file)](#10-frontend-modules-file-by-file)
11. [UI architecture](#11-ui-architecture)
12. [State management](#12-state-management)
13. [Apple Shortcuts integration](#13-apple-shortcuts-integration)
14. [GitHub sync (optional)](#14-github-sync-optional)
15. [Error, loading, and empty states](#15-error-loading-and-empty-states)
16. [Styling and design system](#16-styling-and-design-system)
17. [Common development tasks](#17-common-development-tasks)
18. [Deployment notes](#18-deployment-notes)
19. [Known constraints and pitfalls](#19-known-constraints-and-pitfalls)

---

## 1. High-level overview

Savvr is a **monorepo-style** project: one Node process serves both the REST API and the static React SPA (after build). In development, Vite runs separately and proxies API calls.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                            │
│  React + React Router + Framer Motion + Recharts                 │
│  Context: User, Data, Toast                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ fetch /api/*
                            │ headers: x-api-key, x-budget-user
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express 5 (server.js)                           │
│  middleware: CORS, JSON body, requireUser (auth)                 │
│  routes: /api/transactions, /api/config, /api/upload             │
│  static: /images/*, dist/* (SPA fallback)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Storage (server/storage/*)                            │
│  Per-user JSON files on disk + optional GitHub mirror            │
│  data/users/{userId}/transactions.json                           │
│  data/users/{userId}/config.json                                 │
│  data/users/{userId}/images/...                                  │
└─────────────────────────────────────────────────────────────────┘
```

**External input:** Apple Wallet Shortcuts POST directly to `/api/transactions` with a per-user API key (no `x-budget-user` header needed).

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7, Vite 8 |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Express 5, Multer (uploads) |
| Persistence | JSON files on filesystem |
| Optional sync | GitHub Contents API |
| Tooling | ESLint 10, ESM (`"type": "module"`) |

No database. No ORM. All persistence is file-based JSON.

---

## 3. Runtime modes

### Development (`npm run dev`)

- `scripts/dev.mjs` spawns two child processes:
  1. `node server.js` on port **3000**
  2. `node node_modules/vite/bin/vite.js` on port **5173**
- Vite proxies `/api` to `http://localhost:3000` (`vite.config.js`)
- Frontend env: `VITE_API_KEY` from `.env` (must match server `API_KEY`)

### Production (`npm run build` + `npm start`)

- `dist/` contains the built SPA
- `server.js` serves `dist/` as static files and falls back to `index.html` for client routes
- Single port (default 3000)

---

## 4. Repository layout

```
savvr/                          # project root (folder may still be named "budgeting app")
├── server.js                   # Express entry point
├── index.html                  # Vite HTML shell (title: Savvr)
├── vite.config.js              # Vite + API proxy
├── package.json                # name: savvr, author: Devansh Dalal
├── .env.example                # env template (do not commit real .env)
├── eslint.config.js
│
├── scripts/
│   └── dev.mjs                 # parallel dev server launcher (Windows-safe)
│
├── server/                     # backend modules (imported by server.js)
│   ├── config.js               # PORT, paths, GitHub flags
│   ├── github.js               # GitHub Contents API read/write
│   ├── config/
│   │   └── users.js            # USERS list, API key → userId map
│   ├── middleware/
│   │   └── auth.js             # requireUser middleware
│   ├── routes/
│   │   ├── transactions.js     # GET/POST/DELETE transactions
│   │   ├── config.js           # GET/POST user config
│   │   └── upload.js           # POST receipt images
│   ├── storage/
│   │   ├── paths.js            # per-user file paths
│   │   ├── fileStore.js        # read/write JSON (local + GitHub)
│   │   ├── transactions.js     # CRUD + cache + normalization
│   │   ├── config.js           # config load/save + Paula seed
│   │   └── migrate.js          # legacy data → users/devansh/
│   └── utils/
│       ├── amount.js           # Shortcut amount parsing
│       ├── date.js             # ISO date normalization
│       └── merchant.js         # merchant cleanup + category inference
│
├── data/                       # persisted data (should stay private in prod)
│   ├── users/
│   │   ├── devansh/
│   │   │   ├── transactions.json
│   │   │   ├── config.json
│   │   │   └── images/
│   │   └── paula/              # created on first use
│   ├── config.json             # legacy (migrated to devansh)
│   └── transactions.json       # legacy (migrated to devansh)
│
├── shared/                     # isomorphic domain logic (no React deps)
│   └── billingCycle.js         # statement period calculation
│
├── dist/                       # production build output (gitignored)
│
└── src/                        # React frontend
    ├── main.jsx                # ReactDOM entry
    ├── App.jsx                 # re-exports AppShell
    ├── index.css               # global design system + component styles
    │
    ├── app/
    │   └── AppShell.jsx        # Router, providers, nav shell
    │
    ├── accessibility/          # keyboard shortcuts, focus trap, scroll lock
    │   ├── ShortcutsProvider.jsx
    │   ├── KeyboardShortcutsModal.jsx
    │   └── shortcuts.js
    │
    ├── features/               # route-aligned feature modules
    │   ├── dashboard/          # DashboardPage + toolbar, charts, modals
    │   ├── transactions/       # AddTransactionPage, TransactionForm, TransactionItem
    │   ├── settings/           # SettingsPage, card editor, billing cycles
    │   └── subscriptions/      # SubscriptionsPage
    │
    ├── components/
    │   ├── layout/             # StaggeredMenu, PullToRefresh, LoadingScreen
    │   ├── ui/                 # Modal, PageHeader, Stepper, SaveIndicator
    │   ├── charts/             # Recharts pie + bar
    │   └── forms/              # DateField
    │
    ├── context/                # React context providers
    ├── hooks/                  # generic hooks (useData, useDebouncedCallback)
    ├── services/               # API client + session
    ├── utils/                  # pure helpers (dates, filters, charts)
    ├── config/                 # frontend-only config (users, rewards)
    ├── motion/                 # Framer Motion presets
    └── constants.js            # shared constants + cache key factory
```

---

## 5. Request and data flows

### 5.1 Page load (website)

```
User opens /
  → AppShell mounts UserProvider → DataProvider → ToastProvider
  → DataProvider reads localStorage cache (instant UI)
  → Parallel fetch: GET /api/transactions, GET /api/config
  → Headers: x-api-key (VITE_API_KEY), x-budget-user (from localStorage)
  → requireUser resolves req.userId
  → Storage loads JSON for that user
  → Response updates React state + localStorage cache
  → Dashboard renders charts, budgets, transaction list
```

### 5.2 Add transaction (website)

```
AddTransaction form submit
  → saveTransaction() POST /api/transactions
  → Server: normalizePayload (amount, date, merchant, category)
  → upsertTransaction: new UUID if no id, prepend to list, save JSON
  → Client: optimistic prepend via setTransactions (on success)
  → Toast success/error
```

### 5.3 Apple Shortcut

```
Wallet notification → Shortcut runs
  → POST /api/transactions
  → Header: x-api-key: API_KEY_DEVANSH (maps to user devansh)
  → Body: JSON { Amount, Date, Merchant, Card?, Category? }
  → No x-budget-user needed (key identifies user)
  → Same normalizePayload + upsert path as website
```

### Settings save

```
Settings edits auto-save (debounced) per field change
  → POST /api/config with full config object
  → Server writes config.json (GitHub-first when configured)
  → Client commitConfig() updates DataProvider + localStorage
```

### Modals and keyboard

```
Dialogs use components/ui/Modal.jsx (React portal to document.body)
  → Escapes transformed page ancestors (fixes off-screen modals)
  → Focus trap, body scroll lock, Escape to close

Global shortcuts (accessibility/ShortcutsProvider):
  ? — shortcuts help   Mod+1..4 — navigate   / — focus dashboard search
  Mod+M — toggle menu   Esc — close overlay
```

### 5.5 Receipt upload

```
Form with image file
  → POST /api/upload (multipart)
  → Saved to data/users/{userId}/images/{YYYY-MM}/{timestamp}-{random}.ext
  → Returns receiptUrl: /images/{userId}/{YYYY-MM}/{filename}
  → Transaction stores ReceiptUrl field
```

---

## 6. Authentication and multi-user model

### Users (must stay in sync)

| File | Purpose |
|------|---------|
| `server/config/users.js` | Server-side user list + API key mapping |
| `src/config/users.js` | Client-side user list for UI switcher |

Both define:

```js
{ id: 'devansh', name: 'Devansh Dalal' }
{ id: 'paula', name: 'Paula' }
```

**When adding a user:** update both files, add `API_KEY_<USER>` env var, create `data/users/<id>/` on first request.

### Auth middleware (`server/middleware/auth.js`)

Resolution order:

1. `x-api-key` matches `API_KEY_DEVANSH` or `API_KEY_PAULA` → that user
2. Else `x-api-key` matches shared `API_KEY` **and** `x-budget-user` is valid → header user
3. Else if no keys configured at all → default `devansh` (local dev)
4. Else **401 Unauthorized**

### Client session (`src/services/session.js`)

- Reads/writes `budget_active_user` in `localStorage`
- `getActiveUserId()` called on every API request for `x-budget-user`
- `UserProvider` syncs React state ↔ localStorage

---

## 7. Storage layer

### Path resolution (`server/storage/paths.js`)

For `userId = 'devansh'`:

| Key | Path |
|-----|------|
| `transactionsFile` | `data/users/devansh/transactions.json` |
| `configFile` | `data/users/devansh/config.json` |
| `imagesDir` | `data/users/devansh/images/` |
| `githubTransactions` | `data/users/devansh/transactions.json` (repo-relative) |

### Read/write (`server/storage/fileStore.js`)

When `useGitHub` is **true** (GitHub is authoritative):

| Operation | Behavior |
|-----------|----------|
| Read success | Parse GitHub JSON, mirror to local as read-through cache |
| Read 404 | Fall back to local file only (new user or missing remote) |
| Read transient error | **Throw** - API returns 503, no silent empty fallback |
| Write | GitHub PUT must succeed first, then local file written |
| Shrink guard | Refuses write if array would shrink by more than 2 records (e.g. 500 → 1) |

When `useGitHub` is **false**: local filesystem is source of truth. No pre-seeding `[]` on load; files created on first successful write.

**JSON serialization contract** (`server/github.js` → `serializeJson`):

- `JSON.stringify(data, null, 2)` + trailing `\n`
- Same bytes written to local disk and GitHub
- LF line endings enforced via `.gitattributes`

**Base64** (`decodeGitHubContent` / `encodeGitHubContent`):

- GitHub Contents API embeds newlines in base64 strings - strip before decode
- UTF-8 JSON encoded for PUT; binary images use `buffer.toString('base64')` directly

**In-memory cache** is updated only **after** a successful durable write (`transactions.js`, `config.js`).

### GitHub API (`server/github.js`)

- `fetchGitHubFile` returns `{ ok, data }`, `{ notFound: true }`, or `{ notFound: false, status, error }`
- `putGitHubFile` returns `{ ok }` or `{ ok: false, status, error }` with GitHub API message parsed
- Paths URL-encoded per segment via `encodeGitHubPath`

### Transactions (`server/storage/transactions.js`)

- In-memory per-user cache (`Map`)
- On load: ensures every transaction has `id` (UUID), normalizes dates to `YYYY-MM-DD`, sorts by date desc
- `upsertTransaction`: update by `id` or create new with UUID
- `deleteTransactionById`: remove by `id`

### Config (`server/storage/config.js`)

- Caches config per user
- Paula: if no config file, seeds from Devansh's config (first-time setup)
- Legacy `data/config.json` copied to devansh on first load

### Migration (`server/storage/migrate.js`)

Runs once at server startup. Moves old single-user files:

- `data/transactions.json` → `data/users/devansh/transactions.json`
- `data/config.json` → `data/users/devansh/config.json`
- `data/images/` → `data/users/devansh/images/`

---

## 8. Data schemas

### Transaction object

```json
{
  "id": "uuid-v4",
  "Date": "2026-05-08",
  "Merchant": "Osmow's",
  "Amount": 17.24,
  "Category": "Food",
  "Card": "AMEX Cobalt",
  "Notes": null,
  "ReceiptUrl": "/images/devansh/2026-05/filename.jpg"
}
```

- `Date` is always `YYYY-MM-DD` after server normalization
- `Amount` is a number (CAD dollars)
- `Category` is a `value` from config `CATEGORIES` (e.g. `"Food"`, not `"Food & Dining"`)
- `Month` may exist on legacy rows but is unused

### Config object

```json
{
  "CARDS": {
    "Card Name": {
      "currency": "MR Points",
      "multipliers": { "Food": 5, "Groceries": 5, "Base": 1 }
    }
  },
  "MERCHANT_REWARDS_OVERRIDES": {
    "Merchant Name": {
      "Card Name": { "multiplier": 2, "note": "optional" }
    }
  },
  "CATEGORIES": [
    { "value": "Food", "label": "Food & Dining", "icon": "Coffee" }
  ],
  "BUDGET_CONFIG": {
    "Food": 150,
    "Groceries": 400
  }
}
```

Icon names map to Lucide components in `src/utils/categoryIcons.jsx`.

---

## 9. Backend modules (file by file)

### `server.js`

Express app bootstrap: migration, middleware, route mounting, static files, SPA fallback, listen.

### `server/config.js`

Exports: `PORT`, `API_KEY`, GitHub env vars, `useGitHub` boolean, `dataDir`, `distDir`.

### `server/config/users.js`

- `USERS` array
- `buildApiKeyMap()` - builds Map from env keys
- `isValidUserId(id)`

### `server/middleware/auth.js`

- `requireUser` - attaches `req.userId`

### `server/routes/transactions.js`

- `GET /` - list all transactions for user
- `POST /` - create or update (if `id` in body)
- `DELETE /:id` - delete by id
- `normalizePayload()` - validates amount/date, cleans merchant, infers category

### `server/routes/config.js`

- `GET /users` - returns USERS list (for future use)
- `GET /` - get config
- `POST /` - save full config object

### `server/routes/upload.js`

- `POST /` - multer single file `receipt`, optional `date` field

### `server/utils/amount.js`

- `sanitizeAmount(raw)` - parses `$17.24`, `17,24`, parentheses negatives
- `extractAmount(body)` - checks many key names + nested `transaction`/`data`/`payload`

### `server/utils/date.js`

- `normalizeDate(input)` - ISO, US slash dates, or `Date.parse` fallback → `YYYY-MM-DD`

### `server/utils/merchant.js`

- `RULES` table: regex → canonical merchant name + default category
- `cleanMerchant(raw)` - strip prefixes, location tails, title-case fallback
- `inferCategory(cleanName)` - lookup from rules

### `server/github.js`

- `fetchGitHubFile(path)` - GET contents API; discriminated result (success / 404 / error)
- `putGitHubFile(path, base64, message, sha)` - PUT contents API; returns `{ ok, error }`
- `serializeJson(data)` - canonical JSON with trailing newline
- `decodeGitHubContent` / `encodeGitHubContent` - base64 helpers for Contents API
- `encodeGitHubPath(path)` - URL-encode path segments
- User-Agent: `Savvr`

---

## 10. Frontend modules (file by file)

### Entry

| File | Role |
|------|------|
| `main.jsx` | Renders `<App />` in StrictMode |
| `App.jsx` | Re-exports `AppShell` |
| `index.html` | Fonts (Plus Jakarta Sans, Fraunces), meta, title |

### Pages

| File | Route | Role |
|------|-------|------|
| `features/dashboard/DashboardPage.jsx` | `/` | Overview: stats, filters, charts, budgets, subscriptions, transaction list |
| `features/transactions/AddTransactionPage.jsx` | `/add` | Manual transaction stepper with auto-save |
| `features/settings/SettingsPage.jsx` | `/settings` | Budget sliders, cards, billing cycles (auto-save) |
| `features/subscriptions/SubscriptionsPage.jsx` | `/subscriptions` | Recurring subscriptions with renewal dates |

### Layout (`components/layout/`)

| File | Role |
|------|------|
| `AppShell.jsx` | Root layout: Router, header, nav, theme toggle, lazy-loaded pages, provider nesting |
| `AmbientBackground.jsx` | Decorative gradient orbs |
| `LoadingScreen.jsx` | Full-page spinner |
| `ErrorBoundary.jsx` | Catches render errors; Try again / Reload |
| `PullToRefresh.jsx` | Mobile PTR indicator; calls `refresh()` |

### UI (`components/ui/`)

| File | Role |
|------|------|
| `PageHeader.jsx` | Eyebrow, title, subtitle, optional action |
| `SectionCard.jsx` | Card wrapper with title for dashboard sections |
| `StatCard.jsx` | Hero stat tile; supports `children` for AnimatedNumber |
| `PageError.jsx` | Full-page error with retry (no config / sync failed) |
| `Skeleton.jsx` | Shimmer placeholder |
| `AnimatedNumber.jsx` | Count-up animation for currency |

### Feature components

| File | Role |
|------|------|
| `Charts.jsx` | `SpendingPieChart`, `SpendingBarChart` (Recharts) |
| `TransactionItem.jsx` | Single row with edit/delete/receipt actions |
| `DateField.jsx` | Click-to-open native date picker |
| `UserSwitcher.jsx` | Profile toggle buttons |

### Context (`context/`)

| File | Role |
|------|------|
| `UserProvider.jsx` | `userId`, `setUserId`, `user`, `users` |
| `userContext.js` | `createContext` only (ESLint split) |
| `DataProvider.jsx` | Loads transactions + config per user; `refresh()`, `syncError` |
| `dataContext.js` | Context definition |
| `ToastProvider.jsx` | Toast stack UI + `toast.success/error/info` |
| `toastContext.js` | Context definition |

### Hooks (`hooks/`)

| File | Role |
|------|------|
| `useUser.js` | Access UserContext |
| `useData.js` | Access DataContext |
| `useToast.js` | Access ToastContext |
| `useTransactionFilters.js` | Search, date range, category, card filters |
| `useChartColors.js` | Reads CSS `--chart-*` vars; updates on theme change |
| `usePullToRefresh.js` | Touch gesture logic for PTR |

### Services (`services/`)

| File | Role |
|------|------|
| `storage.js` | All `/api/*` fetch wrappers; returns `{ ok, data, error }` |
| `session.js` | `getActiveUserId()` / `setActiveUserId()` via localStorage |

### Utils (`utils/`)

| File | Role |
|------|------|
| `date.js` | `formatDisplayDate`, `todayIsoDate`, `thisMonthRange` |
| `format.js` | `formatCurrency` (en-CA CAD) |
| `filters.js` | `filterTransactions`, `matchesDateRange` |
| `chartData.js` | `buildPieData`, `buildBarData`, `buildInsights` |
| `chartTheme.js` | Chart colors, category color index, axis formatters |
| `localCache.js` | `readCache` / `writeCache` for localStorage JSON |
| `categoryIcons.jsx` | Maps category icon name → Lucide component |

### Config (`config/`)

| File | Role |
|------|------|
| `users.js` | Client USERS list (mirror server) |
| `rewards.js` | `calculateRewards()` for display on transaction rows |

### Other

| File | Role |
|------|------|
| `constants.js` | `MAX_VISIBLE_TRANSACTIONS`, `MAX_BAR_CHART_DAYS`, `cacheKeys(userId)` |
| `motion/presets.js` | Framer variants: `stagger`, `fadeUp`, `pageEnter`, `scaleIn` |
| `index.css` | Entire design system (tokens, layout, components) - single CSS file |

---

## 11. UI architecture

### Provider tree (outer → inner)

```
ErrorBoundary
  ToastProvider
    UserProvider
      DataProvider
        Router
          AppShell (theme, header, nav)
            PageTransition (route animate)
              Dashboard | AddTransaction | Settings
```

### Routing

| Path | Component | Lazy |
|------|-----------|------|
| `/` | Dashboard | yes |
| `/add` | AddTransaction | yes |
| `/settings` | Settings | yes |

### Dashboard data pipeline

```
useData() → transactions, config
useTransactionFilters(transactions) → filteredTransactions
buildPieData(filtered) → pie chart
buildBarData(filtered) → bar chart
buildInsights(filtered, config) → stats, rewards, top merchant
useCategoryBudgets() → budget bars (uses date range from filters)
useSubscriptions() → latest subscription per merchant
```

Filters are **client-side only** (no server query params).

---

## 12. State management

### Server state

- Source of truth: JSON files on disk
- Fetched on mount and on `refresh()` (pull-to-refresh, retry buttons)

### Client cache

- `localStorage` keys from `cacheKeys(userId)`:
  - `cache_transactions_devansh`
  - `cache_config_devansh`
  - (same pattern for `paula`)
- Updated on every successful fetch and on optimistic `setTransactions` / `setConfig`

### Settings draft pattern

`Settings.jsx` uses `SettingsForm` with `key={config}` so switching users or reloading config resets the form. Edits are local until Save posts to API.

### User switch

`DataProvider` wraps inner `UserDataProvider` with `key={userId}` so switching profiles remounts and refetches without stale state.

---

## 13. Apple Shortcuts integration

### Recommended Shortcut flow

1. Receive Wallet transaction
2. Build dictionary: `Amount`, `Date`, `Merchant`, `Card` (optional)
3. **Get Contents of URL** → POST `https://your-host/api/transactions`
4. Headers: `Content-Type: application/json`, `x-api-key: <personal key>`
5. Request body: **JSON** (not File)
6. Do not chain extra "Get Value from URL" steps for notifications - use the POST response dictionary

### Amount field

Must be the actual charge amount. Common bug: Shortcut sends `Amount` as empty or `0` because it reads a variable instead of Shortcut Input.

Server rejects `$0` with a clear error message.

### Debug

Set `DEBUG_SHORTCUT=1` in `.env` to log POST bodies to server console.

---

## 14. GitHub sync (optional)

Enable when all are set: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`.

- Reads try GitHub first, fall back to local
- Writes always hit local disk; GitHub is best-effort secondary
- Image uploads can push to `data/users/{id}/images/...` in repo
- Receipt URLs in production may be `raw.githubusercontent.com/...` when using GitHub mode

---

## 15. Error, loading, and empty states

### Server: `AppError` codes (`server/errors.js`)

| Code | HTTP | When |
|------|------|------|
| `VALIDATION` | 400 | Bad input, oversize upload |
| `UNAUTHORIZED` | 401 | Invalid API key |
| `NOT_FOUND` | 404 | Transaction/config missing |
| `CONFLICT` | 409 | Shrink guard blocked write |
| `STORAGE` | 503 | GitHub/disk unavailable, corrupt JSON |
| `INTERNAL` | 500 | Unexpected server error |

Global `errorHandler` middleware returns `{ error, code }`. Routes use `asyncHandler` so rejections are caught.

### Client status-aware UX

- `src/utils/apiErrors.js` maps status/code to user copy
- `storage.js` passes `status` and `code` on all API results
- `DataProvider.refresh()` returns a promise; PTR and retry buttons await it
- `SyncBanner` on Dashboard, Add, Settings when sync fails with cache

| Scenario | UI behavior |
|----------|-------------|
| Initial load, no cache | `LoadingScreen` or section skeletons |
| Load failed, no config | `PageError` with Retry (variant by status) |
| Load failed, has cache | Page renders + `SyncBanner` with error + Retry |
| Mutation failed | Toast error with server message |
| Render crash | `ErrorBoundary` card |
| Empty filter results | `empty-state` copy in section |
| Receipt image fail | Lightbox error + "Open original" link |
| Pull-to-refresh fail | Toast error |

### Toast API

```js
const toast = useToast();
toast.success('Saved');
toast.error('Failed', { description: 'Server message' });
```

---

## 15b. Ingestion pipeline

See [INGESTION.md](INGESTION.md) for full detail.

- `POST /api/ingest` - raw notification text → parsers → `upsertTransaction`
- Parsers: `server/utils/parsers/amex.js`, `neo.js`, `scotiaEmail.js`
- `CARD_IDENTIFIERS` in config maps last-4 → card name
- `IsTest` transactions excluded from dashboard aggregates
- Dedup via `DedupKey` within 24 hours

---

## 16. Styling and design system

All styles in `src/index.css` (no CSS modules).

### CSS variables (`:root`)

- Typography: `--font-sans`, `--font-display`
- Colors: `--bg`, `--text`, `--accent`, `--chart-1`..`6`
- Theme: `[data-theme='dark']` / `light` toggled in AppShell

### Component classes

Naming is semantic: `.stat-card`, `.transaction-item`, `.chart-chip`, `.toast-card`, etc.

Charts read colors via `useChartColors()` hook (computed from CSS vars).

---

## 17. Common development tasks

### Add a spending category

1. Edit `data/users/{id}/config.json` → `CATEGORIES` array
2. Add `BUDGET_CONFIG` entry
3. Add multipliers to each card in `CARDS`
4. Optional: add icon mapping in `categoryIcons.jsx` if new icon name

### Add a third user

1. `server/config/users.js` - add `{ id, name }` and `add(process.env.API_KEY_NEWUSER, 'newid')` in `buildApiKeyMap`
2. `.env` - add `API_KEY_NEWUSER`
3. Client picks up users from `GET /api/config/users` on boot (falls back to `FALLBACK_USERS`)

### Add merchant auto-categorization

Edit `server/utils/merchant.js` → add row to `RULES`: `[regex, 'Merchant Name', 'Category']`

### Change chart behavior

- Data shaping: `src/utils/chartData.js`
- Rendering: `src/components/Charts.jsx`
- Colors: `src/index.css` `--chart-*` + `src/utils/chartTheme.js`

### Portfolio demo mode (planned)

- Seed fake `data/users/demo/` JSON
- Env flag `DEMO_MODE` to lock API to demo user
- Never deploy real `data/users/*` to public hosting

---

## 18. Deployment notes

Typical flow (e.g. Render):

1. Set env vars: `API_KEY`, `API_KEY_DEVANSH`, `API_KEY_PAULA`, optional GitHub
2. Build command: `npm run build` (must set `VITE_API_KEY` at build time)
3. Start command: `npm start`
4. Persistent disk or GitHub sync for `data/` directory

**Security:**

- Rotate keys if ever exposed in screenshots
- Do not commit `.env` or real transaction data
- Use demo data for portfolio

---

## 19. Known constraints and pitfalls

| Issue | Detail |
|-------|--------|
| `VITE_API_KEY` is build-time | Changing API key requires rebuild |
| User lists duplicated | Server and client `users.js` must match manually |
| No server-side filtering | All transactions loaded; filters in browser |
| GitHub transient failure | Returns 503; does not fall back to stale/empty local data |
| GitHub write failure | Returns 503; in-memory cache not updated |
| Shrink guard | Blocks writes that would drop more than 2 records at once |
| Windows dev script | Uses `node` directly for vite binary (not `npx.cmd`) to avoid EINVAL |
| Paula config seed | Copies from Devansh once if missing |
| Rewards `points` type | Cashback returns string like `"$1.23"`; points are integers |
| `structuredClone` in Settings | Requires modern browser; used for config draft copy |

---

## Agent handoff checklist

When picking up this project:

1. Read `.env.example` and confirm `.env` exists locally
2. Run `npm run dev` - both ports must be up
3. Check `data/users/devansh/` for sample data
4. User switcher tests multi-tenant headers
5. For Shortcut issues: `DEBUG_SHORTCUT=1`, verify JSON body and Amount field
6. For UI work: start at `AppShell.jsx` and `index.css`
7. For API work: start at `server.js` → routes → storage
8. Run `npm run lint` before finishing changes

---

*Last updated for Savvr architecture as of project state with DataProvider, toast system, pull-to-refresh, and page-level error states.*
