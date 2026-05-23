"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteClient({ code }: { code: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function acceptInvite() {
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/staff/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error || "Could not accept invite");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div style={{ display: "grid", gap: "0.7rem" }}>
      <button className="btn" onClick={acceptInvite} disabled={submitting}>
        {submitting ? "Accepting..." : "Accept Invite and Join Workspace"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
