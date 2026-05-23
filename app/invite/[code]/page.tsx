import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInviteClient } from "@/app/invite/[code]/accept-client";

export const dynamic = "force-dynamic";

type TenantJoin = { slug: string; brand_name: string };

function resolveTenant(join: TenantJoin | TenantJoin[] | null): TenantJoin | null {
  if (!join) {
    return null;
  }
  return Array.isArray(join) ? join[0] ?? null : join;
}

export default async function InvitePage({ params }: { params: { code: string } }) {
  const code = params.code;
  const admin = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: invite } = await admin
    .from("staff_invites")
    .select("id,invited_email,role,status,expires_at,tenant_id,tenants:tenant_id(slug,brand_name)")
    .eq("invite_code", code)
    .maybeSingle();

  if (!invite) {
    return (
      <main className="app-shell">
        <section className="panel form-panel">
          <h1>Invite not found</h1>
          <p className="subtle">This invite link is invalid.</p>
        </section>
      </main>
    );
  }

  const tenant = resolveTenant(invite.tenants as TenantJoin | TenantJoin[] | null);
  const isExpired = new Date(invite.expires_at).getTime() < Date.now();

  if (!user) {
    const loginHref = `/login?tenant_slug=${encodeURIComponent(tenant?.slug ?? "")}&next=${encodeURIComponent(`/invite/${code}`)}`;
    const signupHref = `/signup?mode=staff&next=${encodeURIComponent(`/invite/${code}`)}&invite_code=${encodeURIComponent(code)}&invited_email=${encodeURIComponent(invite.invited_email)}&tenant_slug=${encodeURIComponent(tenant?.slug ?? "")}`;

    return (
      <main className="app-shell">
        <section className="panel form-panel">
          <h1>Join {tenant?.brand_name ?? "Harbor workspace"}</h1>
          <p className="subtle">Invited role: {invite.role}</p>
          <p className="subtle">Invite email: {invite.invited_email}</p>
          <p className="subtle">Workspace: {tenant?.slug}</p>
          {isExpired ? <p className="error">This invite has expired.</p> : null}
          {!isExpired ? (
            <>
              <Link className="btn" href={loginHref}>Login to accept invite</Link>
              <Link className="btn ghost" href={signupHref}>Create employee login</Link>
            </>
          ) : null}
        </section>
      </main>
    );
  }

  if (String(user.email ?? "").toLowerCase() !== String(invite.invited_email).toLowerCase()) {
    return (
      <main className="app-shell">
        <section className="panel form-panel">
          <h1>Email mismatch</h1>
          <p className="error">You are signed in as {user.email}, but this invite is for {invite.invited_email}.</p>
        </section>
      </main>
    );
  }

  if (invite.status !== "pending" || isExpired) {
    return (
      <main className="app-shell">
        <section className="panel form-panel">
          <h1>Invite no longer active</h1>
          <p className="subtle">Status: {invite.status}{isExpired ? " (expired)" : ""}</p>
          <Link href="/dashboard" className="btn">Go to dashboard</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="panel form-panel">
        <h1>Accept Employee Invite</h1>
        <p className="subtle">Workspace: {tenant?.brand_name} ({tenant?.slug})</p>
        <p className="subtle">Role: {invite.role}</p>
        <p className="subtle">Signed in as: {user.email}</p>
        <AcceptInviteClient code={code} />
      </section>
    </main>
  );
}
