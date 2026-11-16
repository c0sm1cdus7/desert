import { describe, expect, it } from "vitest";
import { object } from "./visible-text.ts";
import { money, oneOf, option, text } from "./fields.ts";
import { asking } from "../surface/bridge/questions/asking.ts";
import { formats } from "../surface/formats/masks.ts";
import { begin, type Session } from "../surface/session/screen.ts";
import { step } from "../surface/router/step.ts";
import { resolve } from "../surface/router/resolve.ts";
import type { Intent } from "../surface/contract/contract.ts";
import type { Tool } from "../surface/contract/shown-tool.ts";

const words = {
  now: () => 17,
  today: () => "2026-11-13",
  optionalMark: "",
  formats: formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }),
};
function seat(later = false) {
  let currency = "$";
  const ask = asking(
    object({ amount: money("Importe", 1, () => currency), ...(later ? { note: text("Nota", "Nota") } : {}) }),
    words,
  );
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
    expect(JSON.stringify(hands.screen().body)).toContain("cambió la moneda");
    hands.send({ kind: "confirm" });
    expect(hands.session().at(-1)).toMatchObject({ phase: "asking", pos: 0, answers: [] });
  });
  it("returns from a later question with an explanation and forgets later answers", () => {
    const hands = seat(true);
    hands.send({ kind: "type", text: "5000" });
    hands.send({ kind: "confirm" });
    hands.send({ kind: "type", text: "nota" });
    hands.change();
    expect(hands.screen().body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
    expect(JSON.stringify(hands.screen().body)).toContain("cambió la moneda");
    hands.send({ kind: "type", text: "x" });
    expect(JSON.stringify(hands.screen().body)).toContain("cambió la moneda");
    hands.send({ kind: "type", text: "25" });
    expect(JSON.stringify(hands.screen().body)).not.toContain("cambió la moneda");
    hands.send({ kind: "confirm" });
    expect(hands.screen().body).toMatchObject({ entry: { typed: "", placeholder: "Nota" } });
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
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])("does not reuse a carried amount: partial %s, default %s", (partial, initial) => {
    const input = object({
      currency: oneOf("Moneda", option("ARS", "Pesos", "p"), option("USD", "Dólares", "d")),
      amount: {
        ...money("Importe", 1, ({ currency }) => (currency === "USD" ? "US$" : "$")),
        ...(initial ? { default: 5000 } : {}),
      },
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
    expect(session.at(-1)).toMatchObject({ phase: "asking", pos: 1, typed: "", answers: ["Dólares"] });
    expect(
      JSON.stringify(resolve(session, tools, { state: "connected", clock: "00:00", now: 17 }, { rows: 30 }).body),
    ).not.toContain("50,00");
  });
});
