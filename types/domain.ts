export type Tenant = {
  id: string;
  slug: string;
  name: string;
  region: "us" | "eu";
};

export type InventoryItem = {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  quantity_on_hand: number;
  reorder_threshold: number;
};

export type ShiftClose = {
  id: string;
  tenant_id: string;
  store_id: string;
  closed_at: string;
  gross_sales_cents: number;
  cash_variance_cents: number;
};
