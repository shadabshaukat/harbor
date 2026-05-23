"use client";

import { useState } from "react";

type StoreOption = {
  id: string;
  name: string;
};

export function InviteStaffForm({ stores }: { stores: StoreOption[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createInvite() {
    setBusy(true);
    setError("");
    setInviteUrl("");

    const response = await fetch("/api/staff/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invited_email: email,
        role,
        store_id: storeId || null,
        expires_days: 7
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "Could not create invite");
      setBusy(false);
      return;
    }

    setInviteUrl(payload.invite.invite_url);
    setBusy(false);
  }

  return (
    <section className="panel form-panel team-invite-panel">
      <h2>Invite an employee</h2>
      <label className="label">Employee email</label>
      <input
        className="input"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="sam@example.com"
      />

      <label className="label">Role</label>
      <select className="input" value={role} onChange={(event) => setRole(event.target.value)}>
        <option value="manager">Manager</option>
        <option value="staff">Staff</option>
        <option value="contractor">Contractor</option>
      </select>

      <label className="label">Location</label>
      <select className="input" value={storeId} onChange={(event) => setStoreId(event.target.value)}>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>

      <button className="btn" type="button" disabled={busy || !email} onClick={createInvite}>
        {busy ? "Creating invite..." : "Create invite link"}
      </button>

      {inviteUrl ? (
        <div className="invite-result">
          <span>Invite link</span>
          <code>{inviteUrl}</code>
        </div>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
