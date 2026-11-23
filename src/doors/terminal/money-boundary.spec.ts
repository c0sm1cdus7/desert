import { expect, it } from "vitest";
import { object } from "../../fields/visible-text.ts";
import { money } from "../../fields/fields.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
import { programAct } from "../../tools/promises.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { salesTool, shopShown, type Shop } from "../../../tests/support/shop.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { formats } from "../../surface/formats/masks.ts";
import { asking } from "../../surface/bridge/questions/asking.ts";
import { paint } from "./paint.ts";
import { textOf, width } from "./cells.ts";
import { fieldSeat } from "../../../tests/support/field-seat.ts";
const words = {
  now: () => 17,
  today: () => "2026-11-13",
  optionalMark: "",
  formats: formats(shopShown.locale),
  language: "es" as const,
};
function registry(symbol: string | (() => string)) {
  const input = object({ amount: money("Precio", 1, symbol) });
  const act = programAct<Shop, typeof input>({
    name: "poner precio",
    enter: "poner",
    undoable: true,
    purpose: "el precio",
    key: "q",
    on: "tool",
    input,
    cases: [{ promise: "sets price", input: { amount: 1 }, then: { says: "Listo", facts: [] } }],
    run: () => ({ status: "accepted", text: "Listo", effects: [] }),
  });
  return [{ ...salesTool, acts: { ...salesTool.acts, price: act } }];
}
it("D1: a computed malformed symbol belongs to the program, with question and value in the diagnostic", () => {
  const ask = asking(object({ value: money("Precio", 1, () => "Dólares estadounidenses") }), words);
  expect(() => ask.next([])).toThrow(OutsideDefect);
  expect(() => ask.next([])).toThrow(/Precio.*Dólares estadounidenses/u);
  const rig = shopRig({ registry: registry(() => "Dólares estadounidenses") });
  const router = houseRouter(
    rig.ports("ana", () => 17),
    shopShown,
  );
  try {
    router.watch(() => router.screen({ rows: 30 }));
    router.send({ kind: "type", text: "v" });
    expect(JSON.stringify(router.screen({ rows: 30 }))).toContain("E-PROG-1");
    expect(JSON.stringify(router.screen({ rows: 30 }))).not.toContain("E-BASE-1");
    expect(JSON.stringify(rig.facts())).toContain("Dólares estadounidenses");
    expect(JSON.stringify(rig.facts())).toContain("Precio");
    const screen = JSON.stringify(router.screen({ rows: 30 }));
    expect(screen).toContain("Precio");
    expect(screen).toContain("Dólares estadounidenses");
    expect(screen).toContain("registrar");
    const diagnostics = rig.facts().filter(event => event.kind === "tool-entry");
    expect(diagnostics).toHaveLength(1);
    router.send({ kind: "type", text: "r" });
    expect(router.screen({ rows: 30 }).title).toBe("Registrar");
  } finally {
    router.stop();
    rig.close();
  }
});
it.each(["", " US$", "US$\n", "Dólares estadounidenses"])("C1: literal %j names the question and value", symbol => {
  const rig = shopRig({ registry: registry(symbol) });
  try {
    expect(() =>
      houseTools(
        rig.ports("ana", () => 17),
        shopShown,
        "es",
      ),
    ).toThrow(`Precio: ${JSON.stringify(symbol)}`);
  } finally {
    rig.close();
  }
});
it.each(["", " $", "Pesos argentinos"])("C2: country %j identifies its origin", currency => {
  expect(() => formats({ ...shopShown.locale, currency })).toThrow(
    `Invalid currency symbol for the country: ${JSON.stringify(currency)}`,
  );
});
it.each(["e\u0301", "ＵＳ＄ＵＳ", "￥￥￥￥￥"])("P7: %s is outside the shape", symbol => {
  expect(() => asking(object({ value: money("Precio", 1, symbol) }), words)).toThrow("Invalid currency symbol");
});
it.each([
  ["US$", 3],
  ["ＵＳ＄", 6],
  ["￥", 2],
  ["￥￥￥￥", 8],
] as const)("P7: paints %s with %i columns and keeps the amount after it", (symbol, columns) => {
  const h = fieldSeat(money("Precio", 1, symbol));
  h.send({ kind: "type", text: "1005" });
  const grid = paint(h.screen(), { cols: 80, rows: 24 });
  expect(width(symbol)).toBe(columns);
  expect(textOf(grid).join("\n")).toContain(`${symbol} 10,05`);
  const row = grid.find(line => line.some(cell => cell.char === Array.from(symbol)[0]));
  const start = row?.findIndex(cell => cell.char === Array.from(symbol)[0]) ?? -1;
  expect(row?.[start + columns]?.char).toBe(" ");
  expect(row?.[start + columns + 1]?.char).toBe("1");
});
