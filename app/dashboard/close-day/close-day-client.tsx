"use client";

import { useState } from "react";

export function CloseDayClient({ storeId }: { storeId: string }) {
  const [grossSales, setGrossSales] = useState("2500.00");
  const [cashCounted, setCashCounted] = useState("2500.00");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function closeShift() {
    setSaving(true);
    setMessage("Posting closure...");

    const response = await fetch("/api/eod/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        gross_sales_cents: Math.round(Number(grossSales) * 100),
        cash_counted_cents: Math.round(Number(cashCounted) * 100)
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload.error || "Close-day failed.");
      setSaving(false);
      return;
    }

    setMessage(`Closed at ${new Date(payload.closure.closed_at).toLocaleString()} | variance ${(payload.closure.cash_variance_cents / 100).toFixed(2)}`);
    setSaving(false);
  }

  return (
    <section className="panel form-panel">
      <h2>Shift Reconciliation</h2>
      <label className="label">Gross Sales (AUD)</label>
      <input className="input" value={grossSales} onChange={(e) => setGrossSales(e.target.value)} />
      <label className="label">Cash Counted (AUD)</label>
      <input className="input" value={cashCounted} onChange={(e) => setCashCounted(e.target.value)} />
      <button className="btn" onClick={closeShift} disabled={saving}>{saving ? "Saving..." : "Close Day"}</button>
      {message ? <p className="subtle">{message}</p> : null}
    </section>
  );
}
