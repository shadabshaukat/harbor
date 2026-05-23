import { signUpBusiness, signUpStaffFromInvite } from "@/app/actions/auth";

export default function SignupPage({
  searchParams
}: {
  searchParams: {
    error?: string;
    next?: string;
    invited_email?: string;
    tenant_slug?: string;
    invite_code?: string;
    mode?: string;
  };
}) {
  const isStaffInvite = searchParams?.mode === "staff" || Boolean(searchParams?.invite_code);

  if (isStaffInvite) {
    return (
      <main className="app-shell">
        <section className="hero compact">
          <div>
            <img src="/harbor-logo.svg" alt="Harbor" className="brand-logo" />
            <p className="eyebrow">Employee Invite</p>
            <h1>Join a Harbor workspace</h1>
            <p className="subtle">Create your login using the email address your owner invited.</p>
          </div>
        </section>

        <form action={signUpStaffFromInvite} className="panel form-panel">
          {searchParams?.error ? <p className="error">{searchParams.error}</p> : null}
          <input type="hidden" name="next" value={searchParams?.next ?? ""} />
          <input type="hidden" name="invite_code" value={searchParams?.invite_code ?? ""} />
          <input type="hidden" name="tenant_slug" value={searchParams?.tenant_slug ?? ""} />

          <label className="label">Full name</label>
          <input name="full_name" className="input" required />

          <label className="label">Invite email</label>
          <input
            name="email"
            type="email"
            className="input"
            required
            defaultValue={searchParams?.invited_email ?? ""}
          />

          <label className="label">Password</label>
          <input name="password" type="password" className="input" required />

          <button type="submit" className="btn">Create employee login</button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero compact">
        <div>
          <img src="/harbor-logo.svg" alt="Harbor" className="brand-logo" />
          <p className="eyebrow">Business Registration</p>
          <h1>Register your venue workspace</h1>
          <p className="subtle">Owners start here. Choose a unique workspace name and verify the admin email.</p>
        </div>
      </section>

      <form action={signUpBusiness} className="panel form-panel">
        {searchParams?.error ? <p className="error">{searchParams.error}</p> : null}

        <label className="label">Business or venue name</label>
        <input name="brand_name" className="input" placeholder="Harbor Coffee Co" required />

        <label className="label">Unique workspace name</label>
        <input
          name="workspace_slug"
          className="input"
          placeholder="harbor-coffee"
          pattern="[a-zA-Z0-9-]{3,50}"
          title="Use 3-50 letters, numbers, or hyphens."
          required
        />

        <label className="label">Owner admin email</label>
        <input name="email" type="email" className="input" required defaultValue={searchParams?.invited_email ?? ""} />

        <label className="label">Password</label>
        <input name="password" type="password" className="input" required />

        <label className="label">Owner full name</label>
        <input name="full_name" className="input" required />

        <label className="label">Business type</label>
        <select name="business_type" className="input" defaultValue="cafe">
          <option value="cafe">Cafe</option>
          <option value="restaurant">Restaurant</option>
          <option value="bar">Bar</option>
          <option value="pub">Pub</option>
          <option value="hotel">Hotel</option>
        </select>

        <button type="submit" className="btn">Register business</button>
      </form>
    </main>
  );
}
