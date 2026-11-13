// The shop's explicit reasons win even when its first remaining reference has no eligible sale.
import { object } from "../../src/catalogs/acts.ts";
import { money, thing } from "../../src/catalogs/fields.ts";
import type { Composition, ProgramAct, ProgramTool } from "../../src/tools/promises.ts";
import { narrowShop } from "./charging-shop.ts";
import type { Shop } from "./shop.ts";

export type OffMode = "offered" | "also";
export const offWords = { offered: "única venta", also: "venta cerrada", empty: "sin ventas elegibles" };
function closedCharge(act: ProgramAct<Shop>, mode: OffMode): ProgramAct<Shop> {
  const offered = mode === "offered";
  const sale = thing("Venta", "sales", undefined, undefined, offWords.empty);
  const amount = money("Monto");
  return {
    ...act,
    input: object(offered ? { sale, amount } : { amount, sale }),
    refuses: [...act.refuses, ...(offered ? [offWords.offered] : [])],
    offered: state => (offered && state.tools.sales.size === 1 ? offWords.offered : undefined),
    also: {
      tool: "sales",
      with: () => ({ amount: 50 }),
      off: () => offWords.also,
    },
    cases: act.cases.map((kase, index) => {
      if (index !== 0) return kase;
      return {
        ...kase,
        ...(offered ? {} : { from: "sales/s2" }),
        then: { refused: offered ? offWords.offered : "venta menor a mil" },
      };
    }),
  };
}
export function offShop(mode: OffMode): Composition<Shop> {
  const registry = narrowShop.registry.map((tool): ProgramTool<Shop> => {
    const charge = tool.acts.charge;
    return charge ? { ...tool, acts: { ...tool.acts, charge: closedCharge(charge, mode) } } : tool;
  });
  return { ...narrowShop, registry };
}
