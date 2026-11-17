// A declared program case with 101 existing sales crosses the derived walks' 100-row window.
import { chargingShop } from "./charging-shop.ts";
import { salesTool, shopProgram, shopShown } from "./shop.ts";
import { shopWith } from "./shop-variants.ts";
import { must } from "../../src/surface/session/window.ts";
const charge = must(chargingShop.registry.find(tool => tool.id === "payments")?.acts.charge);
export const windowProgram = shopWith(
  {
    slices: {
      ...shopProgram.slices,
      initial: {
        ...shopProgram.slices.initial,
        sales: new Map(Array.from({ length: 101 }, (_, i) => [`s${i + 1}`, { total: 1500, paid: 0, by: "ana" }])),
      },
    },
    sales: {
      acts: {},
      only: true,
      needs: () => [{ target: "sales/s1", why: "Pendiente" }],
      view: (...args) => {
        const view = salesTool.view(...args);
        return args[1] === "sales" ? view.split("\n").slice(-args[2].recentLines).join("\n") : view;
      },
    },
    payments: {
      only: true,
      acts: {
        charge: {
          ...charge,
          cases: [
            {
              promise: "an unknown sale stays unknown",
              input: { sale: "sales/missing", amount: 500 },
              then: { refused: "unknown" },
            },
            {
              promise: "an excessive amount stays refused",
              input: { sale: "sales/s1", amount: 9500 },
              then: { refused: "monto de más" },
            },
            {
              promise: "an old paid sale keeps its offer closed",
              given: [{ act: "charge", on: "payments", input: { sale: "sales/s1", amount: 1500 } }],
              from: "sales/s1",
              input: { sale: "sales/s1", amount: 9500 },
              then: { refused: "monto de más" },
            },
            {
              promise: "an old sale is charged outside the recent window",
              input: { sale: "sales/s1", amount: 500 },
              then: {
                says: "Cobrada · s1\nRecibo de prueba",
                facts: [{ kind: "payment-received", data: { payment: "for-s1", amount: 500, sale: "s1" } }],
              },
            },
          ],
        },
      },
    },
  },
  chargingShop,
);
export { shopShown as windowShown };
