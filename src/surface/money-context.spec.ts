import { expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { money, text } from "../catalogs/fields.ts";
import { programAct } from "../tools/promises.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { salesTool, shopShown, type Shop } from "../../tests/support/shop.ts";
import { houseTools } from "./bridge/house-tools.ts";
import { anyToolScreen } from "./bridge/any-tool.ts";
import type { Start } from "./bridge/house-ports.ts";
import { walked } from "./bridge/actions/asked-act.ts";
import { asking } from "./bridge/asking.ts";
import { formats } from "./masks.ts";
import { must } from "./window.ts";
const input = object({ amount: money("Importe", 1, (_, _state, target) => (target === "sales" ? "US$" : "$")) });
const act = programAct<Shop, typeof input>({
  name: "poner precio",
  enter: "poner",
  key: "q",
  on: "tool",
  undoable: true,
  purpose: "el precio",
  input,
  cases: [{ promise: "sets price", input: { amount: 1005 }, then: { says: "Listo", facts: [] } }],
  run: () => ({ status: "accepted", text: "Listo", effects: [] }),
});
it("PA1: a tool action current row uses its tool even when displayed on a thing", () => {
  const rig = shopRig({ registry: [{ ...salesTool, acts: { price: act } }] });
  try {
    let start: Start | undefined;
    houseTools(
      rig.ports("ana", () => 17),
      {
        ...shopShown,
        screens: {
          sales: (ports, tool, words, acts, starter) => {
            start = starter;
            return anyToolScreen(ports, tool, words, acts, starter);
          },
        },
      },
    );
    const row = must(start)("price", "sales/dollars", { today: { amount: 1005 } });
    expect(row.on).toEqual({ tool: "sales" });
    expect(row.detail).toBe("US$ 10,05");
  } finally {
    rig.close();
  }
});
it("AA2: walked questions default to their tool when no target is passed", () => {
  const rig = shopRig();
  try {
    const base = rig.ports("ana", () => 17);
    const ports = { ...base, act: (value: Parameters<typeof base.act>[0]) => base.act(value, rig.state().through) };
    const entry = walked(
      ports,
      { tool: "sales", name: "price", act },
      {
        locale: shopShown.locale,
        day: () => "2026-11-13",
        things: () => undefined,
        titled: () => "Venta",
      },
    );
    expect(entry.ask.next([])?.currency).toBe("US$");
    expect(entry.ask.next([], "sales/dollars")?.currency).toBe("$");
  } finally {
    rig.close();
  }
});
it("AS3: sofar carries outer answers into the unfinished nested question", () => {
  const seen: unknown[] = [];
  const ask = asking(
    object({
      kind: text("Tipo", "Tipo"),
      item: object({
        amount: money("Importe", 1, value => {
          seen.push(value);
          return value.kind === "USD" ? "US$" : "$";
        }),
      }),
    }),
    {
      resolvingCurrency: true,
      now: () => 17,
      today: () => "2026-11-13",
      optionalMark: "",
      formats: formats(shopShown.locale),
    },
  );
  seen.length = 0;
  expect(ask.sofar(["USD"])).toEqual({ kind: "USD" });
  expect(seen).toContainEqual({ kind: "USD" });
});
