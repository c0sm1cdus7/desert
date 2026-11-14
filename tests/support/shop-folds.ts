// The shop reads its own sales and payments, including settlements made by sales.
import type { State } from "../../src/tools/tool-contract.ts";
import type { Sales, Payments, Shop, ShopEvent } from "./shop.ts";
export const salesStep = (kept: Sales, event: ShopEvent): Sales => {
  if (event.kind === "sale-registered" || event.kind === "slow-written" || event.kind === "batch-sale-registered")
    return new Map(kept).set(event.data.sale, { total: event.data.total, paid: 0, by: event.by });
  if (event.kind === "sale-corrected") {
    const { sale: name, total, paid } = event.data;
    const corrected = kept.get(name);
    return corrected ? new Map(kept).set(name, { ...corrected, total, paid }) : kept;
  }
  if (event.kind === "sale-settled") {
    const sale = kept.get(event.data.sale);
    return sale ? new Map(kept).set(event.data.sale, { ...sale, paid: sale.paid + event.data.amount }) : kept;
  }
  const sale = event.kind === "payment-received" ? kept.get(event.data.sale ?? "") : undefined;
  if (event.kind !== "payment-received" || !event.data.sale || !sale) return kept;
  return new Map(kept).set(event.data.sale, { ...sale, paid: sale.paid + event.data.amount });
};
/** A payment reads the sales as they were before it: one that names no known sale stays unmatched. */
export const paymentsStep = (kept: Payments, event: ShopEvent, before: State<Shop>): Payments => {
  if (event.kind === "sale-settled") return { ...kept, received: kept.received + event.data.amount };
  if (event.kind !== "payment-received") return kept;
  const matched = before.tools.sales.has(event.data.sale ?? "");
  return {
    received: kept.received + event.data.amount,
    unmatched: matched ? kept.unmatched : [...kept.unmatched, event.data.payment],
  };
};
