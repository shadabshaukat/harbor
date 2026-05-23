# Harbor (Next.js + Supabase + Vercel)

Containerized multi-tenant SaaS starter for hospitality operators (cafes, restaurants, bars, pubs, hotels):
- POS + checkout workflows
- Inventory and supplier operations
- Menus and pricing
- End-of-day close ledger
- Multi-store, multi-workspace operations with database-enforced tenant isolation

See [docs/specs.md](docs/specs.md) for the full product, workflow, schema, storage, and deployment specification.

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
2. Add keys to `.env.local`.
3. Run SQL from `supabase/build_schema.sql` in the Supabase SQL editor.
4. To redeploy from a clean slate, run `supabase/drop_schema.sql`, then run `supabase/build_schema.sql`.
5. Create a real owner account from `/signup`; the guided onboarding flow creates the workspace tenant, owner profile, first store, tables, starter menu, and inventory.

## Auth + Workspace Gating
- `/signup` supports business registration and employee invite account creation.
- `/login` supports owner and employee workspace login.
- `/login` includes a resend verification email form for pending signup confirmations.
- `middleware.ts` protects `/dashboard` for authenticated users.
- `/auth/callback` handles Supabase email confirmation/callback links.
- RLS enforces tenant boundaries in Postgres.

## Supabase Auth Email Setup
- Add `http://localhost:3000/**` and your Vercel app URL to Supabase Auth redirect URLs.
- For production or external testers, configure custom SMTP in Supabase Auth. Supabase's built-in sender is only suitable for limited testing.
- If local auth emails should return to local dev, use `APP_RUNTIME_TARGET=local` or leave `APP_RUNTIME_TARGET=auto` with `LOCAL_APP_URL=http://localhost:3000`.
- Harbor always uses Supabase Auth APIs for signup, verification resend, and callback exchange; it does not send auth emails directly.

## Live Debugger
- A floating Debug button is enabled by default in local development.
- Set `NEXT_PUBLIC_HARBOR_DEBUG=false` and `HARBOR_DEBUG=false` to hide/disable it.
- Remote production streaming is blocked unless `HARBOR_DEBUG_ALLOW_REMOTE=true`.
- The debugger streams client route/API activity plus server-side auth/API events in real time.

## Private Storage
- Menu item photos use a private Supabase Storage bucket.
- Bucket name is configured by `SUPABASE_MENU_IMAGES_BUCKET`.
- Uploads are tenant-scoped by object path and rendered with signed URLs for authenticated dashboard users.

## APIs
- `POST /api/pos/orders`
  - body: `{ "store_id": "<uuid>", "table_id": "<uuid-or-null>", "channel": "dine_in", "note": "extra hot", "items": [{ "menu_item_id": "<uuid>", "qty": 2 }] }`
- `POST /api/eod/close`
  - body: `{ "store_id": "<uuid>", "gross_sales_cents": 100000, "cash_counted_cents": 99800 }`
- `POST /api/staff/invite`
  - body: `{ "invited_email": "team@example.com", "role": "staff", "store_id": "<uuid-or-null>", "expires_days": 7 }`
- `POST /api/menu-items/[id]/image`
  - body: `multipart/form-data` with `file`
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
