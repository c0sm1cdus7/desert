// A deterministic stand-in for an outside printer: no provider, network or credentials are involved.
import { object } from "../../src/fields/visible-text.ts";
import { text } from "../../src/fields/fields.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { registerOffer, paymentsTool, salesTool, shopProgram, type Shop } from "./shop.ts";

const input = object({ receipt: text("Recibo", "Nombre del recibo") });
const outside = ["printer offline"] as const;
const print = programAct<Shop, typeof input, typeof outside>({
  ...registerOffer,
  name: "imprimir",
  enter: "imprimir",
  key: "i",
  purpose: "el recibo de la venta",
  input,
  outside,
  reach: "world",
  run: ({ receipt }) =>
    Promise.resolve(
      receipt === "offline"
        ? { status: "rejected", reason: "printer offline · desk" }
        : { status: "accepted", text: "Impreso · Recibo" },
    ),
  cases: [
    { promise: "the printer prints", input: { receipt: "receipt" }, then: { says: "Impreso · Recibo", facts: [] } },
    { promise: "the printer is offline", input: { receipt: "offline" }, then: { refused: "printer offline · desk" } },
  ],
});
export const printingShop: Composition<Shop> = {
  ...shopProgram,
  registry: [{ ...salesTool, acts: { ...salesTool.acts, print } }, paymentsTool],
};
