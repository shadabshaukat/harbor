# Harbor Workspace Auth Model

## Login contract
Every owner and employee login requires:
- workspace name
- email
- password

Flow:
1. User signs in with Supabase email/password.
2. App resolves `users_profile -> tenant -> slug`.
3. If the provided workspace name does not match the user's tenant slug, the session is revoked and login is denied.

## Workspace relationships
- `tenants` store Harbor workspaces and own all data.
- `users_profile` links each auth user to exactly one workspace tenant and role.
- `staff_invites` provides the workspace-scoped employee invite lifecycle.

## Why this matches real SaaS POS patterns
- Workspace is explicit during authentication.
- Roles are workspace-owned and constrained to owner, manager, staff, or contractor.
- Data isolation is guaranteed by Supabase RLS on workspace-bound tables.
