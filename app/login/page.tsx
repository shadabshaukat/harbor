import Link from "next/link";
import { resendSignupVerification, signIn } from "@/app/actions/auth";

export default function LoginPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string; tenant_slug?: string; next?: string; mode?: string };
}) {
  return (
    <main className="app-shell">
      <section className="hero compact">
        <div>
          <img src="/harbor-logo.svg" alt="Harbor" className="brand-logo" />
          <p className="eyebrow">Workspace Login</p>
          <h1>Owner and employee login</h1>
          <p className="subtle">
            Owners, managers, staff, and contractors sign in with their workspace name and email.
          </p>
        </div>
      </section>

      <form action={signIn} className="panel form-panel">
        {searchParams?.error ? <p className="error">{searchParams.error}</p> : null}
        {searchParams?.message ? <p className="success">{searchParams.message}</p> : null}

        <input type="hidden" name="next" value={searchParams?.next ?? ""} />

        <label className="label">Workspace name</label>
        <input className="input" name="tenant_slug" defaultValue={searchParams?.tenant_slug ?? ""} placeholder="e.g. harbor-demo" required />

        <label className="label">Email</label>
        <input className="input" name="email" type="email" required />

        <label className="label">Password</label>
        <input className="input" name="password" type="password" required />

        <button className="btn" type="submit">Log in to workspace</button>
        <p className="subtle">Registering a venue? <Link href="/signup">Create a business workspace</Link></p>
        <p className="subtle">Joining a team? Ask the owner for an invite link.</p>
      </form>

      <form action={resendSignupVerification} className="panel form-panel verification-panel">
        <h2>Verification email not arriving?</h2>
        <p className="subtle">
          Resend the Supabase signup confirmation for the same email address. Also check spam,
          project email rate limits, and your Supabase Auth URL settings.
        </p>
        <input type="hidden" name="next" value={searchParams?.next ?? "/onboarding"} />
        <input type="hidden" name="mode" value="" />
        <input type="hidden" name="tenant_slug" value={searchParams?.tenant_slug ?? ""} />
        <label className="label">Email to verify</label>
        <input className="input" name="email" type="email" placeholder="you@example.com" required />
        <button className="btn ghost" type="submit">Resend verification email</button>
      </form>
    </main>
  );
}
