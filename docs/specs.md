# Harbor Product and Technical Specification

## Product Vision
Harbor is a cloud-native SaaS management platform for cafes, restaurants, bars, pubs, and hotel venues. It is designed to feel like a calm operating system for busy hospitality teams: owners register venues, managers run workspaces, employees take orders and payments, and contractors can be given lightweight operational access.

The app is intentionally browser-first and PWA-friendly so it can run on iPads, phones, small workstations, and back-office laptops without local infrastructure.

## What Has Been Built
- Sleek public landing page for Harbor with hospitality-focused positioning.
- Business registration flow where an owner registers a venue with admin email and unique workspace name.
- Guided onboarding that creates the workspace tenant, owner profile, first store, starter floor plan, starter menu, and inventory after owner email verification.
- Workspace login using workspace name, email, and password for owners, managers, staff, and contractors.
- Employee invite creation for owners and managers.
- Employee invite acceptance at `/invite/[code]`, linking the accepted user into `users_profile` with the invited workspace and role.
- Dashboard overview with active tickets, low-stock count, recent orders, and role/plan context.
- POS order-taking screen with service channel, table selection, menu cards, cart, notes, and service queue submission.
- Orders ledger showing ticket lifecycle and totals.
- Menu Studio with item images and Supabase Storage upload.
- Inventory ledger with reorder status.
- Close-day workflow for owner/manager reconciliation.
- Team management screen with employee directory and invite status.
- Supabase RLS-backed multi-tenant schema.
- Private Supabase Storage for menu item images with signed URL rendering.
- Vercel-ready runtime URL selection for local and deployed environments.
- Dockerfile and Docker Compose for containerized local/runtime use.

## SaaS Workspace Model
Harbor models each hospitality brand or venue group as a workspace. In the database, a workspace is stored as a tenant so Supabase RLS can isolate every venue's data.

Core workspace relationships:
- `tenants`: workspace/business account.
- `users_profile`: links a Supabase Auth user to exactly one tenant and role.
- `stores`: physical venues/locations under a tenant.
- `dining_tables`: table/floor setup per store.
- `staff_invites`: owner/manager-created employee invite lifecycle. The table name is retained for database stability, but product copy calls these employee invites.
- `menu_categories`, `menu_items`, `menu_item_modifiers`: tenant-owned menu catalog.
- `inventory_items`, `inventory_movements`: stock and movement ledger.
- `orders`, `order_items`, `payments`: POS transaction records.
- `shift_closures`: end-of-day reconciliation controls.

Every operational table has `tenant_id`; RLS policies restrict access using `auth.uid()` through `users_profile`.

## Roles
Supported roles:
- `owner`: workspace owner, full business setup and operations access.
- `manager`: can manage setup, menu, inventory, close-day, employee invites, and service operations.
- `staff`: can work inside the workspace, take orders, and operate service workflows.
- `contractor`: can work inside the workspace with lightweight service access such as taking orders and payments.

## Owner Signup Workflow
1. Owner opens `/signup`.
2. Owner enters business name, unique workspace name, admin email, password, owner name, and business type.
3. Supabase Auth creates the user.
4. Owner verifies the admin email through Supabase Auth.
5. Owner logs in with workspace name plus admin email, or lands on onboarding from the verification link.
6. Onboarding calls `onboard_tenant`.
7. Database creates the workspace tenant using the registered workspace name, owner profile, and first store.
8. App seeds starter tables, categories, menu items, and inventory.
9. Owner lands in `/dashboard`.

## Employee Invite Workflow
1. Owner or manager opens `/dashboard/team`.
2. They create an invite with employee email, role (`manager`, `staff`, or `contractor`), location, and expiry.
3. App inserts `staff_invites` and returns an invite URL.
4. Employee opens `/invite/[code]`.
5. If not signed in, employee can create an employee login or login.
6. Invite acceptance validates code, expiry, status, signed-in email, and workspace.
7. App creates or updates `users_profile` with the invited role and workspace tenant.
8. Invite is marked accepted.
9. Employee lands in `/dashboard`.

## Login Workflow
All owner and employee login requires:
- workspace name
- email
- password

The app prevents broken profile-less sessions by routing:
- business-owner metadata users to onboarding
- employee-invite metadata users back to their invite
- unknown profile-less users back to login with a clear error

## Verification Email Workflow
Supabase sends business registration and employee login verification emails from `signUp`.

App behavior:
- all email auth workflows use Supabase Auth APIs; Harbor does not send auth emails directly
- owner signup uses `/auth/callback?next=/onboarding`
- employee signup uses `/auth/callback?next=/invite/[code]`
- login page includes a resend verification form backed by `supabase.auth.resend({ type: "signup" })`

Supabase dashboard requirements:
- enable email/password auth
- add local redirect URL: `http://localhost:3000/**`
- add deployed redirect URL: `https://your-vercel-domain.vercel.app/**`
- configure custom SMTP for reliable delivery outside tiny internal tests

If emails do not arrive:
- check spam/quarantine
- check Supabase Auth logs
- confirm the email address is not already verified
- confirm the redirect URL is allowed
- confirm the project has not hit email limits
- configure custom SMTP before production demos

## Live Debugger
Harbor includes a floating live debugger button for development and demos.

Configuration:
```env
NEXT_PUBLIC_HARBOR_DEBUG=true
HARBOR_DEBUG=true
HARBOR_DEBUG_ALLOW_REMOTE=false
```

Behavior:
- defaults on locally
- streams server events over `/api/debug/stream`
- captures client route changes, client API requests, browser errors, and unhandled promise rejections
- captures server-side auth/API events for signup, resend verification, callbacks, onboarding, employee invites, POS orders, close-day, and menu image uploads
- redacts common secret-like fields before events are stored

Safety:
- remote production streaming is blocked unless `HARBOR_DEBUG_ALLOW_REMOTE=true`
- the debug stream is intended for local development and troubleshooting, not production observability
- use platform logs, Supabase logs, and a real observability service for production

## POS Workflow
1. A team member opens `/dashboard/pos`.
2. App loads the first active store, dining tables, and active menu items.
3. Private menu images are resolved into signed URLs server-side.
4. The team member selects dine-in, takeaway, or delivery.
5. The team member selects a table where applicable.
6. The team member adds menu items to cart and adds notes.
7. App calls `create_pos_order`.
8. Database validates workspace/store/menu access and writes order plus line items.
9. Order appears in order lifecycle views.

## Menu Image Storage
Harbor uses one private Supabase Storage bucket for menu images.

Configuration:
```env
SUPABASE_MENU_IMAGES_BUCKET=menu-images
```

Upload behavior:
- Bucket name is read from env.
- Upload API checks whether the bucket exists.
- If missing, the API creates it as private.
- If it already exists, the API does nothing.
- Files are stored under tenant-scoped object paths.

Example object path:
```text
{tenant_id}/menu/{menu_item_id}/{random_uuid}.webp
```

The app stores the object path in `menu_items.image_url`, not a public URL. Menu and POS pages create short-lived signed URLs for authenticated dashboard users.

## Supabase Scripts
The schema has been consolidated into two scripts.

Use this for a fresh deploy:
```sql
-- Supabase SQL editor
-- Run:
supabase/build_schema.sql
```

Use this for a full reset:
```sql
-- Supabase SQL editor
-- Run:
supabase/drop_schema.sql
supabase/build_schema.sql
```

`drop_schema.sql` removes Harbor app tables, functions, policies, and configured menu image bucket objects. It does not delete Supabase Auth users.

`build_schema.sql` creates:
- app tables
- indexes
- helper functions
- onboarding RPC
- POS order RPC
- RLS policies
- demo tenant seed
- private menu image bucket

If `SUPABASE_MENU_IMAGES_BUCKET` is changed, update the bucket name in both SQL scripts before running them in Supabase SQL editor.

## Environment Variables
Required:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_MENU_IMAGES_BUCKET=menu-images
NEXT_PUBLIC_HARBOR_DEBUG=true
HARBOR_DEBUG=true
HARBOR_DEBUG_ALLOW_REMOTE=false
APP_RUNTIME_TARGET=local
LOCAL_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Vercel:
```env
APP_RUNTIME_TARGET=vercel
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

## Cloud-Native Deployment Model
Vercel is the stateless application layer:
- renders the Next.js app
- runs route handlers/server actions
- handles deployed URLs, preview environments, and app scaling

Supabase is the persistent application platform:
- Postgres database
- Auth
- Storage
- RLS authorization boundary
- Realtime-ready data plane

The app can run locally, in Docker, or on Vercel using the same codebase and env-driven runtime URL selection.

## Deployment Steps
1. Create or select Supabase project.
2. Add app env vars locally and in Vercel.
3. Run `supabase/build_schema.sql`.
4. Configure Supabase Auth redirect URLs for local and Vercel app URLs.
5. Run `npm install`.
6. Run `npm run dev` locally.
7. Deploy to Vercel.
8. Register owner workspace from `/signup`.
9. Complete onboarding.
10. Invite employees from `/dashboard/team`.

## Verification Commands
```bash
npm run typecheck
npm run build
npm run dev
```

Expected unauthenticated route behavior:
- `/`, `/login`, `/signup` return `200`.
- `/dashboard/*` redirects to `/login`.
- `/api/health` returns `200`.

## Current Product Positioning
Harbor should feel like modern hospitality operations software, not a database demo. The front page avoids infrastructure language and sells outcomes:
- run the room
- keep service moving
- manage team access
- keep menus current
- track stock
- close the day cleanly

The dashboard is intentionally minimal and operational: overview, POS, menu, orders, inventory, close day, and team.

## Future Production Hardening
- Replace demo seed with migration-managed environments.
- Add payment provider abstraction and webhook reconciliation.
- Add realtime prep/service boards.
- Add audit logs for privileged actions.
- Add per-store role scopes.
- Add image lifecycle cleanup for replaced menu photos.
- Add generated TypeScript database types from Supabase.
- Add automated E2E tests for business registration, employee invite acceptance, POS order creation, and menu image upload.
