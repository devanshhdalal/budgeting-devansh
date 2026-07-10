# Savvr

Personal budgeting app by **Devansh Dalal**. Track spending, budgets, rewards, and receipts across multiple profiles on one deployment.

**Stack:** Express 5 API + React 19 (Vite) SPA. Data on local disk per user, with optional GitHub sync.

---

## Quick start

```bash
npm install
cp .env.example .env    # set API keys (see below)
npm run dev             # API :3000 + Vite :5173
```

Open http://localhost:5173

**Production (single process serves API + built UI):**

```bash
npm run build
npm start               # serves dist/ + API on PORT (default 3000)
```

---

## Environment variables

Copy `.env.example` to `.env` at the project root.

| Variable | Used by | Purpose |
|----------|---------|---------|
| `API_KEY` | Server | Shared web key; website sends this + `x-budget-user` header |
| `VITE_API_KEY` | Frontend | Same value as `API_KEY` (baked in at build time) |
| `API_KEY_DEVANSH` | Server | Apple Shortcut key for Devansh profile |
| `API_KEY_PAULA` | Server | Apple Shortcut key for Paula profile |
| `API_KEY_AMEX` | Server | Ingest key for AMEX notifications |
| `API_KEY_NEO` | Server | Ingest key for Neo notifications |
| `API_KEY_SCOTIA` | Server | Ingest key for Scotiabank email |
| `PORT` | Server | HTTP port (default `3000`) |
| `DEBUG_INGEST` | Server | Set to `1` to log ingest attempts |
| `DEBUG_SHORTCUT` | Server | Set to `1` to log Shortcut POST bodies |
| `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` | Server | Optional GitHub Contents API sync |

If no API keys are set, the server defaults to user `devansh` with no auth (local dev only).

---

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run dev` | Starts Express + Vite via `scripts/dev.mjs` |
| `npm run dev:client` | Vite only (proxies `/api` to :3000) |
| `npm start` | Production server (`server.js`) |
| `npm run build` | Vite production build to `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

---

## Users and data

Two profiles: **Devansh Dalal** (`devansh`) and **Paula** (`paula`). Each has isolated data under:

```
data/users/{userId}/
  transactions.json
  config.json
  images/{YYYY-MM}/{filename}
```

The UI user switcher writes `budget_active_user` to `localStorage` and sends `x-budget-user` on every API call.

---

## Apple Shortcuts

POST JSON to `/api/transactions` (manual shape) or `/api/ingest` (raw notification text).

See [docs/INGESTION.md](docs/INGESTION.md) for AMEX/Neo/Scotiabank automations, Excel VBA, and dedup.

---

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full system design, folder map, data flows |
| [docs/INGESTION.md](docs/INGESTION.md) | Notification ingest, Excel, Shortcuts, security |

---

## Portfolio / demo

Do not deploy real spending data publicly. Use sanitized demo data when showcasing (planned). See architecture doc for what to redact.

---

## Author

Devansh Dalal
