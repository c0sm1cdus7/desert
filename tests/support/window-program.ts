// A declared program case with 101 existing sales crosses the derived walks' 100-row window.
import { chargingRegistry } from "./charging-shop.ts";
import { salesTool, shopProgram, shopShown, type Shop } from "./shop.ts";
import { must } from "../../src/surface/window.ts";
import type { Composition } from "../../src/tools/promises.ts";
const payments = must(chargingRegistry.find(tool => tool.id === "payments"));
const charge = must(payments.acts.charge);
export const windowProgram: Composition<Shop> = {
  ...shopProgram,
  slices: {
    ...shopProgram.slices,
    initial: {
      ...shopProgram.slices.initial,
      sales: new Map(Array.from({ length: 101 }, (_, i) => [`s${i + 1}`, { total: 1500, paid: 0, by: "ana" }])),
    },
  },
  registry: [
    {
      ...salesTool,
      acts: {},
      needs: () => [{ target: "sales/s1", why: "Pendiente" }],
      view: (...args) => {
        const view = salesTool.view(...args);
        return args[1] === "sales" ? view.split("\n").slice(-args[2].recentLines).join("\n") : view;
      },
    },
    {
      ...payments,
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
  ],
};
export { shopShown as windowShown };
