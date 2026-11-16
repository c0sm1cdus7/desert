// Numeric cases exercise leading zeros as well as the canonical numbers supplied by another door.
import { object } from "../../src/fields/visible-text.ts";
import { money, padded, quantity } from "../../src/fields/fields.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { paymentsTool, salesTool, shopProgram, type Shop } from "./shop.ts";

const input = object({ point: padded("Punto de venta", 4), quantity: quantity("Cantidad"), amount: money("Monto", 1) });
const count = programAct<Shop, typeof input>({
  name: "contar",
  enter: "contar",
  purpose: "lo contado",
  key: "c",
  on: "tool",
  undoable: true,
  input,
  refuses: [],
  run: () => ({ status: "accepted", text: "Contado · 3" }),
  cases: [
    {
      promise: "numeric prefixes stay quiet until the whole answer is ready",
      input: { point: 3, quantity: 2, amount: 100 },
      then: { says: "Contado · 3", facts: [] },
    },
  ],
});
export const countingShop: Composition<Shop> = {
  ...shopProgram,
  registry: [salesTool, { ...paymentsTool, acts: { count } }],
};
