# HarborLedger (Next.js + Supabase + Vercel)

Containerized multi-tenant SaaS starter for hospitality operators (cafes, restaurants, bars, pubs, hotels):
- POS + checkout workflows
- Inventory and supplier operations
- Menus and pricing
- End-of-day close ledger
- Multi-store, multi-tenant operations

## Stack
- Next.js 14 (App Router)
- Supabase (`supabase-js`, Auth, RLS, Storage, Realtime)
- Vercel deployment target
- Docker container runtime

## Runtime Mode Toggle (Local vs Vercel)
Use `APP_RUNTIME_TARGET` in env:
- `local`: app URL resolves from `LOCAL_APP_URL` (default `http://localhost:3000`)
- `vercel`: app URL resolves from `NEXT_PUBLIC_APP_URL` (or Vercel-provided URL vars)
- `auto`: prefers `NEXT_PUBLIC_APP_URL`, then `VERCEL_URL`, else localhost

Recommended:
- Local dev `.env.local`
  - `APP_RUNTIME_TARGET=local`
  - `LOCAL_APP_URL=http://localhost:3000`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Vercel env vars
  - `APP_RUNTIME_TARGET=vercel`
  - `NEXT_PUBLIC_APP_URL=https://harbor-six-xi.vercel.app`

## Quick Start
1. Copy env file:
```bash
cp .env.example .env.local
```
2. Install dependencies:
```bash
npm install
```
3. Run the app:
```bash
npm run dev
```
4. Open [http://localhost:3000](http://localhost:3000)

## Docker
Build and run:
```bash
docker compose up --build
```

## Supabase Setup
1. Create a Supabase project.
2. Run SQL from `supabase/schema.sql` in SQL editor.
3. Run SQL from `supabase/seed.sql`.
4. Add keys to `.env.local`.
5. Create a real Auth user from `/signup` and link it in `users_profile` using the SQL snippet in `seed.sql`.

## Auth + Tenant Gating
- `/login` and `/signup` implemented with Supabase Auth.
- `middleware.ts` protects `/dashboard` for authenticated users.
- `/auth/callback` handles Supabase email confirmation/callback links.
- RLS enforces tenant boundaries in Postgres.

## APIs
- `POST /api/pos/orders`
  - body: `{ "store_id": "<uuid>", "total_cents": 2250 }`
- `POST /api/eod/close`
  - body: `{ "store_id": "<uuid>", "gross_sales_cents": 100000, "cash_variance_cents": -200 }`
- `GET /api/health`

## Vercel Deployment
1. Import repository into Vercel.
2. Add environment variables from `.env.example`.
3. Set `APP_RUNTIME_TARGET=vercel`.
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain.
5. Set region preference to EU (`fra1`) for EU-first workloads in `vercel.json`.
6. Deploy.

## Key Architecture Notes
See `docs/architecture.md` for:
- RLS data API patterns
- Auth/Storage/Realtime design
- Scale strategy for 5-6M US MAU + 2.5-3M EU MAU
- Disaster recovery targets and runbooks
- Uptime/SLO best practices
- EU security and compliance planning
