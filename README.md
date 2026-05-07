# Memphis Fleet Vehicle Dashboard

Self-hosted fleet checkout / shop / dashboard tool that syncs against an
Airtable base and writes a historic post log back to it.

## What you get

- Express + Vite + React (TypeScript) single-process app
- SQLite (via `better-sqlite3` + Drizzle ORM) for local state
- Direct Airtable REST API integration (no Perplexity / `external-tool` dependency)
- Built-in hourly sync scheduler (configurable; can be disabled to use an external cron)
- Manual `POST /api/sync` endpoint and `GET /api/health` endpoint

## Requirements

- Node.js 20+ (for local install) **or** Docker
- An Airtable Personal Access Token with read+write on the post log base

## Configuration

Copy `.env.example` to `.env` and fill in your `AIRTABLE_TOKEN`. Defaults are
already wired to the existing Memphis Vehicle Post Log base; override only if
you move bases.

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AIRTABLE_TOKEN` | yes | — | Personal Access Token (`data.records:read` + `data.records:write`) |
| `AIRTABLE_BASE_ID` | no | `appf7SJsAl6DzYcV7` | Airtable base id |
| `AIRTABLE_TOTAL_CARS_TABLE_ID` | no | `tbl5N50qREGA00mm1` | Source vehicle table |
| `AIRTABLE_POST_LOG_TABLE_ID` | no | `tblO05lgOSbZkPWsI` | Target log table |
| `PORT` | no | `5000` | Bind port |
| `DB_PATH` | no | `data.db` | SQLite file location (use a persistent volume in prod) |
| `SYNC_INTERVAL_MINUTES` | no | `60` | Background sync cadence; `0` disables the in-process timer |

## Run with Docker (recommended)

```bash
cp .env.example .env
# edit .env — at minimum set AIRTABLE_TOKEN
docker compose up -d --build
```

The dashboard is at <http://localhost:5000>. The SQLite file is stored in the
named Docker volume `dashboard-data` so it survives container rebuilds.

## Run with Node directly

```bash
npm ci
npm run build
cp .env.example .env       # edit the file
node --env-file=.env dist/index.cjs
```

## Run in development

```bash
npm ci
cp .env.example .env       # edit the file
npm run dev
```

`npm run dev` runs the Express + Vite dev server on port 5000 with hot reload.

## Hosting suggestions

Any host that runs a long-lived Node process or container will work:

- **Render / Railway / Fly.io / DigitalOcean App Platform** — connect the
  repo, set the env vars, attach a persistent volume mounted at the directory
  in `DB_PATH`. Build command: `npm ci && npm run build`. Start command:
  `node dist/index.cjs`.
- **Your own VM** — `git clone`, `npm ci && npm run build`, then run with
  `pm2 start ecosystem.config.cjs --update-env`.
- **Docker host / Kubernetes** — use the included `Dockerfile`. Mount a volume
  at `/data`.

### Disabling the in-process scheduler

If you prefer to drive sync from an external scheduler (system cron,
GitHub Actions, etc.), set `SYNC_INTERVAL_MINUTES=0` and have the scheduler
hit `POST /api/sync` on whatever cadence you like. Example:

```cron
12 * * * * curl -fsS -X POST https://your-host/api/sync >/dev/null
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness probe |
| POST | `/api/sync` | Force an Airtable -> local sync |
| GET | `/api/dashboard` | Aggregate dashboard payload |
| GET | `/api/vehicles` | All vehicles |
| GET | `/api/vehicles/available` | Active and not currently checked out |
| PATCH | `/api/vehicles/:id/status` | Change a vehicle's status |
| GET | `/api/checkouts` | All checkout logs |
| GET | `/api/checkouts/active` | Active (still in field) checkouts |
| POST | `/api/checkouts` | Create a checkout (writes to Airtable) |
| POST | `/api/checkouts/:id/return` | Return a vehicle (writes to Airtable) |
| GET | `/api/shop/active` | Vehicles currently in shop |
| POST | `/api/shop` | Send a vehicle to shop (writes to Airtable) |
| POST | `/api/shop/:id/resolve` | Mark vehicle returned from shop |

## Backups

`DB_PATH` is the only stateful file. Snapshot it on whatever cadence you like.
History also lives in Airtable (the post log table), so the SQLite file is
mostly ephemeral — wiping it on deploy will cause a fresh sync from Airtable
and lose only the in-flight checkout / shop logs.

## Licence

MIT.
