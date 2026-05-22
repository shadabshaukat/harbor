# HarborLedger Architecture Notes (Supabase + Vercel)

## 1) Fit for Acme's Goals
- App stack: Next.js on Vercel + Supabase (Postgres, Auth, Storage, Realtime, Edge Functions).
- Why this supports rapid EU launch: managed platform reduces infra ops overhead compared to self-managed RDS + custom auth stack.
- Designed capacity target: baseline 5-6M MAU US + incremental 2.5-3M MAU EU via regional partitioning, caching, queue-backed background jobs, and DB scaling controls.

## 2) Product Scope (multi-tenant hospitality SaaS)
- Core modules: POS transactions, menu/catalog, inventory, procurement, payments integration, staff auth, and end-of-day closing ledger.
- Multi-tenant model: one tenant per hospitality brand/group, one or more stores per tenant.
- Device coverage: browser-first responsive UI for iPad/tablet/workstation/phone.
- Packaging baseline: $799/month/venue-group + transaction and add-on modules.

## 3) Data API + RLS Pattern
- API client: `supabase-js` from Next.js route handlers/server components.
- Security boundary: every transactional table has `tenant_id` and RLS policy binding to `auth.uid()` via `users_profile`.
- Result: accidental cross-tenant read/write is blocked at database layer.

## 4) Auth, Storage, Realtime
- Auth: Supabase Auth with SSO/OIDC option for enterprise chains; JWT session used by RLS.
- Storage: receipt images, menu assets, compliance docs in Storage buckets with signed URLs.
- Realtime: order state updates (kitchen/bar/runner), stock alerts, and shift events.

## 5) Scalability Strategy
- Vercel: edge caching for read-heavy menu/catalog; serverless functions for mutating operations.
- Supabase Postgres:
  - start with proper indexing on `(tenant_id, store_id, created_at)`.
  - use read replicas and connection pooling.
  - partition high-write tables (`orders`, `order_items`) by date/store if write pressure rises.
- Async workflows: use queue/event workers for non-blocking side effects (accounting sync, analytics exports, notifications).

## 6) Disaster Recovery + Business Continuity
- PITR and automated backups enabled.
- Recovery objectives:
  - target RPO: <= 5 minutes.
  - target RTO: <= 60 minutes for Tier-1 workflows.
- Practice quarterly restore drills to a staging environment with runbook sign-off.

## 7) Uptime, SLOs, and Operational Best Practices
- Define app SLOs before go-live:
  - API success rate >= 99.9% monthly.
  - p95 mutation latency <= 500ms for core checkout operations.
- Recommended controls:
  - synthetic checks for `/api/health` every minute from EU + US.
  - error budgets with release gates.
  - canary releases and feature flags for risky flows.
- SLA alignment: verify current Supabase and Vercel enterprise SLA terms during architecture review and map to Acme SLOs.

## 8) EU Security + Compliance Considerations
- Data residency: deploy EU data in EU region project; isolate US vs EU tenant data at project/account boundary where required.
- Encryption: TLS in transit, encrypted storage at rest.
- Compliance controls to validate during procurement:
  - GDPR DPA and SCC terms.
  - audit logging and retention policy.
  - SOC 2 / ISO evidence package.
- Privacy by design:
  - data minimization for customer PII.
  - deletion/export workflows.
  - RBAC for tenant admins and store managers.

## 9) 3-6 Month Delivery Plan
- Month 1: architecture finalization, RLS data model, auth flows, POS MVP.
- Month 2-3: inventory + EOD close, payments abstraction, observability, DR drills.
- Month 4-5: EU tenancy rollout, hardening, load testing, compliance sign-off.
- Month 6: staged rollout and go-live.
