"use client";

import { useMemo, useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price_cents: number;
};

type TableInfo = {
  id: string;
  label: string;
  seats: number;
  zone: string | null;
};

type Props = {
  storeId: string;
  menuItems: MenuItem[];
  tables: TableInfo[];
};

type CartLine = MenuItem & { qty: number };

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

export function PosClient({ storeId, menuItems, tables }: Props) {
  const [tableId, setTableId] = useState<string>(tables[0]?.id ?? "");
  const [channel, setChannel] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.base_price_cents * line.qty, 0),
    [cart]
  );

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((line) => line.id === item.id);
      if (existing) {
        return prev.map((line) => (line.id === item.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.id === itemId ? { ...line, qty: Math.max(0, line.qty + delta) } : line))
        .filter((line) => line.qty > 0)
    );
  }

  async function submitOrder() {
    if (cart.length === 0) {
      setStatus("Add at least one item.");
      return;
    }

    setSubmitting(true);
    setStatus("Submitting order...");

    const response = await fetch("/api/pos/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        table_id: channel === "dine_in" ? tableId : null,
        channel,
        note,
        items: cart.map((line) => ({ menu_item_id: line.id, qty: line.qty }))
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload.error || "Could not create order.");
      setSubmitting(false);
      return;
    }

    setStatus(`Order ${payload.order_id?.slice?.(0, 8) ?? ""} sent to the service queue.`);
    setCart([]);
    setNote("");
    setSubmitting(false);
  }

  return (
    <section className="pos-layout">
      <div className="menu-grid">
        {menuItems.map((item) => (
          <button key={item.id} className="menu-card" onClick={() => addToCart(item)}>
            <img src={item.image_url ?? "/menu/flat-white.svg"} alt={item.name} className="menu-image" />
            <div>
              <p className="menu-title">{item.name}</p>
              <p className="subtle">{item.description ?? ""}</p>
              <p className="menu-price">{formatMoney(item.base_price_cents)}</p>
            </div>
          </button>
        ))}
      </div>

      <aside className="cart-panel">
        <h2>Order Builder</h2>

        <label className="label">Service channel</label>
        <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as "dine_in" | "takeaway" | "delivery")}>
          <option value="dine_in">Dine-in</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>

        {channel === "dine_in" ? (
          <>
            <label className="label">Table</label>
            <select className="input" value={tableId} onChange={(e) => setTableId(e.target.value)}>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.label} ({table.seats} seats{table.zone ? `, ${table.zone}` : ""})
                </option>
              ))}
            </select>
          </>
        ) : null}

        <label className="label">Order note</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="No onion, extra hot..." />

        <div className="cart-lines">
          {cart.length === 0 ? (
            <p className="subtle">No items selected.</p>
          ) : (
            cart.map((line) => (
              <div key={line.id} className="cart-line">
                <div>
                  <p className="menu-title">{line.name}</p>
                  <p className="subtle">{formatMoney(line.base_price_cents)} each</p>
                </div>
                <div className="qty-controls">
                  <button onClick={() => updateQty(line.id, -1)}>-</button>
                  <span>{line.qty}</span>
                  <button onClick={() => updateQty(line.id, 1)}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="checkout-row">
          <p>Total</p>
          <p>{formatMoney(total)}</p>
        </div>
        <button className="btn" onClick={submitOrder} disabled={submitting}>
          {submitting ? "Sending..." : "Send to Kitchen"}
        </button>
        {status ? <p className="subtle">{status}</p> : null}
      </aside>
    </section>
  );
}
