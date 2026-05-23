"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const types = [
  { id: "cafe", label: "Cafe" },
  { id: "restaurant", label: "Restaurant" },
  { id: "bar", label: "Bar" },
  { id: "pub", label: "Pub" },
  { id: "hotel", label: "Hotel" }
] as const;

type Initial = {
  full_name: string;
  business_type: string;
  brand_name: string;
  workspace_slug: string;
};

export function OnboardingClient({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState({
    full_name: initial.full_name || "",
    business_type: initial.business_type || "cafe",
    brand_name: initial.brand_name || "",
    legal_name: initial.brand_name || "",
    slug: initial.workspace_slug || (initial.brand_name || "harbor").toLowerCase().replace(/\s+/g, "-"),
    region: "apac",
    store_name: `${initial.brand_name || "Harbor"} - Flagship`,
    store_code: "HQ-01",
    country_code: "AU",
    timezone: "Australia/Sydney"
  });

  function update<K extends keyof typeof state>(key: K, value: (typeof state)[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function completeOnboarding() {
    setSaving(true);
    setError("");

    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error || "Could not complete onboarding.");
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <section className="panel form-panel">
      {step === 1 ? (
        <>
          <h2>Step 1: Confirm Owner</h2>
          <label className="label">Your full name</label>
          <input className="input" value={state.full_name} onChange={(e) => update("full_name", e.target.value)} />
          <button className="btn" onClick={() => setStep(2)}>Continue</button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2>Step 2: Venue Type</h2>
          <div className="tabbar">
            {types.map((t) => (
              <button key={t.id} className={state.business_type === t.id ? "btn" : "btn ghost"} onClick={() => update("business_type", t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => setStep(3)}>Continue</button>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2>Step 3: Business Workspace</h2>
          <label className="label">Business or venue name</label>
          <input className="input" value={state.brand_name} onChange={(e) => update("brand_name", e.target.value)} />
          <label className="label">Legal entity</label>
          <input className="input" value={state.legal_name} onChange={(e) => update("legal_name", e.target.value)} />
          <label className="label">Workspace name</label>
          <input
            className="input"
            value={state.slug}
            readOnly={Boolean(initial.workspace_slug)}
            onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
          />
          <button className="btn" onClick={() => setStep(4)}>Continue</button>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <h2>Step 4: First Store Setup</h2>
          <label className="label">Store name</label>
          <input className="input" value={state.store_name} onChange={(e) => update("store_name", e.target.value)} />
          <label className="label">Store code</label>
          <input className="input" value={state.store_code} onChange={(e) => update("store_code", e.target.value.toUpperCase())} />
          <label className="label">Region</label>
          <select className="input" value={state.region} onChange={(e) => update("region", e.target.value)}>
            <option value="apac">APAC</option>
            <option value="eu">EU</option>
            <option value="us">US</option>
          </select>
          <label className="label">Country code</label>
          <input className="input" value={state.country_code} onChange={(e) => update("country_code", e.target.value.toUpperCase())} />
          <label className="label">Timezone</label>
          <input className="input" value={state.timezone} onChange={(e) => update("timezone", e.target.value)} />
          <button className="btn" onClick={completeOnboarding} disabled={saving}>
            {saving ? "Creating Harbor workspace..." : "Complete setup"}
          </button>
        </>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
