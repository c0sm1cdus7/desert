import { describe, expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { money, oneOf, option } from "../catalogs/fields.ts";
import { asking } from "./bridge/asking.ts";
import { formats } from "./masks.ts";
import { begin, type Session } from "./screen.ts";
import { step } from "./step.ts";
import { resolve } from "./resolve.ts";
import type { Intent } from "./contract.ts";
import type { Tool } from "./shown-tool.ts";

const words = {
  now: () => 17,
  today: () => "2026-11-13",
  optionalMark: "",
  formats: formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }),
};
function seat() {
  let currency = "$";
  const ask = asking(object({ amount: money("Importe", 1, () => currency) }), words);
  const tools: readonly Tool[] = [
    {
      id: "data",
      name: "Datos",
      place: { key: "d", section: "tools" },
      summary: () => "",
      view: () => [],
      acts: {
        enter: {
          label: "anotar",
          verb: "anotar",
          scope: "all",
          next: answers =>
            ask.next(answers) ?? {
              kind: "confirm",
              ask: `${currency} ${String(ask.input(answers))}`,
              reversible: true,
              options: [{ title: "anotar", key: "a" }],
            },
          run: () => Promise.resolve({ ok: true, text: "Anotado" }),
        },
      },
    },
  ];
  let session: Session = [begin(tools, "data", "enter")];
  const send = (key: Intent) => {
    session = step(session, key, tools, 17).session;
  };
  const screen = () => resolve(session, tools, { state: "connected", clock: "00:00", now: 17 }, { rows: 30 });
  return {
    send,
    screen,
    change: () => {
      currency = "US$";
    },
    session: () => session,
  };
}
describe("currency changes while an action is open", () => {
  it("empties a number already being typed when the state changes its currency", () => {
    const hands = seat();
    hands.send({ kind: "type", text: "5000" });
    hands.change();
    expect(hands.screen().body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
    hands.send({ kind: "confirm" });
    expect(hands.session().at(-1)).toMatchObject({ phase: "asking", typed: "" });
    hands.send({ kind: "paste", text: "1005" });
    expect(hands.screen().body).toMatchObject({ entry: { typed: "US$ 10,05" } });
  });
  it("asks the amount again if its currency changes at confirmation", () => {
    const hands = seat();
    hands.send({ kind: "type", text: "5000" });
    hands.send({ kind: "confirm" });
    hands.change();
    expect(hands.screen().body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
    hands.send({ kind: "confirm" });
    expect(hands.session().at(-1)).toMatchObject({ phase: "asking", pos: 0, answers: [] });
  });
  it("does not call a state resolver while auditing or reading back stored cents", () => {
    const ask = asking(
      object({
        amount: money("Importe", 1, (_answered, _state, target, at) => {
          expect(target).toBe("sales/one");
          expect(at).toBe(17);
          return "US$";
        }),
      }),
      words,
    );
    expect(ask.answers({ amount: 50 })).toEqual(["50"]);
    expect(ask.sofar([])).toEqual({});
    expect(ask.next([], "sales/one")).toMatchObject({ mask: { empty: "US$ 0,00" } });
  });
  it.each([false, true])("does not reuse a default after changing currency, partial edit: %s", partial => {
    const input = object({
      currency: oneOf("Moneda", option("ARS", "Pesos", "p"), option("USD", "Dólares", "d")),
      amount: { ...money("Importe", 1, ({ currency }) => (currency === "USD" ? "US$" : "$")), default: 5000 },
    });
    const ask = asking(input, words);
    const tools: readonly Tool[] = [
      {
        id: "data",
        name: "Datos",
        place: { key: "d", section: "tools" },
        summary: () => "",
        view: () => [],
        acts: {
          enter: {
            label: "anotar",
            verb: "anotar",
            scope: "all",
            ...ask,
            today: () => ["Pesos", "5000"],
            run: () => Promise.resolve({ ok: true, text: "Anotado" }),
          },
        },
      },
    ];
    const given = partial ? { answers: ["Pesos", "5000"], from: 0, until: 1, today: true as const } : undefined;
    let session: Session = [begin(tools, "data", "enter", undefined, given)];
    session = step(session, { kind: "type", text: "d" }, tools, 17).session;
    expect(session.at(-1)).toMatchObject({ typed: "" });
  });
});
