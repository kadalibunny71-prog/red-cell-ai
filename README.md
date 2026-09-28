# red cell.ai

A responsive, full-stack coordination workspace for blood requests and donor-centre availability.

> **Safety boundary:** This is an operational coordination tool. It does not determine blood compatibility, provide clinical advice, replace emergency services, or guarantee supply. Each request carries a reminder to verify requirements through the responsible hospital blood bank.

## Included

- **React + Tailwind** frontend: responsive light UI, accessible controls, glass cards, mobile navigation, live feed, filters, create/edit/delete workflows, availability confirmation and delivery tracking.
- **Node + Express** API: secure headers, CORS allow-list, request validation, rate limits, error handling, health endpoint and role/ownership checks.
- **Custom secure authentication:** bcrypt password hashes, a 30-day signed session backed by a revocable `sessions` table, cookie support plus bearer-session fallback for Vercel ↔ Render browser compatibility.
- **Supabase/Postgres:** profiles, items, sessions, indexes, update trigger and RLS policies in `supabase/001_redcell_schema.sql`.
- **Gemini server route:** `POST /api/ai/generate`; the Gemini key remains exclusively in `server/.env`.

## Project layout

```text
client/                 # browser code only — contains no provider secrets
server/                 # Express API / database / Gemini integration
  .env                  # local secrets (create from .env.example; ignored by git)
supabase/               # managed schema migration
```

## Local development

```bash
npm run install:all
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run db:setup         # automatic after adding Supabase Management token
npm run dev:server       # API: http://localhost:8787
npm run dev:client       # web: http://localhost:5173
```

`npm run build` creates the production frontend bundle. `npm --prefix server run check` checks the API syntax.

## Required environment variables

All sensitive values live **only** in `server/.env` / server deployment environment:

```dotenv
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=
JWT_SECRET=
GEMINI_API_KEY=
CLIENT_URL=
```

`VITE_API_BASE_URL` is the single frontend value. It is the public API URL, not a secret.

### Why `SUPABASE_ACCESS_TOKEN` is additionally required

Supabase **service_role** keys can read/write data through the Data API but cannot execute arbitrary Postgres DDL (`CREATE TABLE`, RLS policies, extensions). The app automatically applies its schema with the official Supabase Management API, which requires a Supabase personal access token (`sbp_…`) with access to the project. No SQL needs to be pasted or run manually by the user.

## Database and permissions

`npm run db:setup` sends `supabase/001_redcell_schema.sql` to the Supabase Management API and creates:

- `profiles` — includes the requested id/email/full name/timestamp fields plus role, organisation and **bcrypt `password_hash`**
- `items` — includes the requested base fields plus blood request coordination fields and lifecycle status
- `sessions` — server-only, revocable signed sessions

RLS is enabled. Direct authenticated Supabase access has owner-scoped profile and item write policies, while the application’s Express API uses the server-only service role and independently enforces authentication, item ownership and donor-centre acceptance checks. The frontend never receives a Supabase key, so it cannot bypass the API.

## Deployment plan

- **Frontend:** Vercel, root directory `client`; set `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com` before building.
- **Backend:** Render, root directory `server`, build `npm ci`, start `npm start`; set every server variable above and `NODE_ENV=production`.
- **CORS:** After Vercel is created, set Render `CLIENT_URL` to its exact URL. Comma-separated URLs are supported for a production URL and preview URL.

The repository contains `server/render.yaml`, `server/Dockerfile` and `client/vercel.json` for production deployment. Once credentials are provided, the remaining setup, schema application, repository creation, deployment and end-to-end checks can be automated.

## API overview

| Route | Purpose |
|---|---|
| `POST /api/auth/register` | Create an account (bcrypt password hashing) |
| `POST /api/auth/login` | Sign in and create a server-backed session |
| `GET /api/auth/me` | Restore a saved session |
| `GET/POST /api/items` | Browse the network / publish a request |
| `PUT/DELETE /api/items/:id` | Edit or delete the requester’s own item |
| `POST /api/items/:id/accept` | Donor centre/donor confirms a live request |
| `POST /api/items/:id/deliver` | Requester marks matched request delivered |
| `POST /api/ai/generate` | Gemini operational-copy assistance |
| `GET /api/health` | Deployment health check |
