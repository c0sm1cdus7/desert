import { expect, it } from "vitest";
import { object } from "./visible-text.ts";
import { money, oneOf, option, text, when } from "./fields.ts";
import { asking } from "../surface/bridge/questions/asking.ts";
import { formats } from "../surface/formats/masks.ts";
import { begin, type Session } from "../surface/session/screen.ts";
import { step } from "../surface/router/step.ts";
import { resolve } from "../surface/router/resolve.ts";
import type { Intent } from "../surface/contract/contract.ts";
import type { Tool, ViewRow } from "../surface/contract/shown-tool.ts";
const words = {
  now: () => 17,
  today: () => "2026-11-13",
  optionalMark: "",
  language: "es" as const,
  formats: formats({ currency: "$", decimal: ",", thousands: ".", day: "dd/mm/aaaa" }),
};
function seat(ask: ReturnType<typeof asking>, given?: ViewRow["with"]) {
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
          next: ask.next,
          run: () => Promise.resolve({ ok: true, text: "Anotado" }),
        },
      },
    },
  ];
  let session: Session = [begin(tools, "data", "enter", undefined, given)];
  return {
    send: (key: Intent) => {
      const result = step(session, key, tools, 17, "es");
      session = result.session;
      return result.run;
    },
    screen: () =>
      resolve(session, tools, { language: "es", state: "connected", clock: "00:00", now: 17 }, { rows: 30 }),
    session: () => session,
    resume: (saved: Session) => {
      session = saved;
    },
  };
}
it("an old saved walk without currency metadata keeps its written amount", () => {
  const hands = seat(asking(object({ amount: money("Importe") }), words));
  hands.send({ kind: "type", text: "500" });
  hands.resume(
    hands.session().map(place => {
      if (place.kind !== "act") return place;
      const { currency: _old, ...legacy } = place;
      return legacy;
    }),
  );
  expect(hands.screen().body).toMatchObject({ entry: { typed: "$ 5,00" } });
  expect(hands.send({ kind: "confirm" })).toMatchObject({ answers: ["500"] });
});
it("a currency change cannot rewrite an action already running", () => {
  let currency = "$";
  const hands = seat(asking(object({ amount: money("Importe", 1, () => currency) }), words));
  hands.send({ kind: "type", text: "500" });
  hands.send({ kind: "confirm" });
  const before = hands.screen();
  currency = "US$";
  expect(hands.screen()).toEqual(before);
  expect(hands.session().at(-1)).toMatchObject({ phase: "running", answers: ["500"] });
});
it("a currency change reopens an earlier fixed amount and removes the partial edit boundary and old value", () => {
  let currency = "$";
  const ask = asking(object({ amount: money("Importe", 1, () => currency), note: text("Nota", "Nota") }), words);
  const hands = seat(ask, { answers: ["500", "anterior"], from: 1, until: 2, today: true });
  currency = "US$";
  const body = hands.screen().body;
  expect(body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
  expect(JSON.stringify(body)).not.toContain("5,00");
  hands.send({ kind: "type", text: "250" });
  expect(hands.session().at(-1)).toMatchObject({ pos: 0, floor: 0, answers: [], typed: "250" });
  expect(hands.session().at(-1)).not.toHaveProperty("until");
  expect(hands.session().at(-1)).not.toHaveProperty("was");
  expect(hands.send({ kind: "confirm" })).toBeUndefined();
  expect(hands.screen().body).toMatchObject({ entry: { typed: "", placeholder: "Nota" } });
  hands.send({ kind: "type", text: "nueva" });
  expect(hands.send({ kind: "confirm" })).toMatchObject({ answers: ["250", "nueva"] });
});
it("changing currency through an intervening note does not restore the former amount", () => {
  const ask = asking(
    object({
      currency: oneOf("Moneda", option("ARS", "Pesos", "p"), option("USD", "Dólares", "d")),
      note: text("Nota", "Nota"),
      amount: money("Precio", 1, value => (value.currency === "USD" ? "US$" : "$")),
    }),
    words,
  );
  const hands = seat(ask, { answers: ["Dólares", "nota", "1005"], from: 0, today: true });
  hands.send({ kind: "type", text: "p" });
  hands.send({ kind: "type", text: "nota" });
  hands.send({ kind: "confirm" });
  expect(hands.screen().body).toMatchObject({ entry: { typed: "", placeholder: "$ 0,00" } });
  expect(JSON.stringify(hands.screen().body)).not.toContain("10,05");
});
it("currency metadata on a non-money field never invokes a money resolver", () => {
  const ask = asking(
    object({
      note: {
        ...text("Nota", "Nota"),
        currency: () => {
          throw new Error("not money");
        },
      },
    }),
    words,
  );
  expect(ask.next([])).toMatchObject({ ask: "Nota", placeholder: "Nota" });
});

it("a newly asked amount keeps its own default when the previous route had no money field", () => {
  const ask = asking(
    object({
      mode: oneOf("Con precio", option("no", "Sin", "s"), option("yes", "Con", "c")),
      amount: when({ ...money("Importe"), default: 500 }, value => value.mode === "yes"),
      note: text("Nota", "Nota"),
    }),
    words,
  );
  const hands = seat(ask, { answers: ["Sin", "nota"], from: 0 });
  hands.send({ kind: "type", text: "c" });
  expect(hands.screen().body).toMatchObject({ entry: { typed: "$ 5,00", suggested: true } });
});
it("old answered fields without currency metadata do not erase the next answer", () => {
  const hands = seat(asking(object({ amount: money("Importe"), note: text("Nota", "Nota") }), words));
  hands.send({ kind: "type", text: "500" });
  hands.send({ kind: "confirm" });
  hands.send({ kind: "type", text: "nota" });
  hands.resume(
    hands.session().map(place =>
      place.kind !== "act"
        ? place
        : {
            ...place,
            asked: place.asked.map(({ currency: _old, ...legacy }) => legacy),
          },
    ),
  );
  expect(hands.screen().body).toMatchObject({ entry: { typed: "nota" } });
  expect(hands.send({ kind: "confirm" })).toMatchObject({ answers: ["500", "nota"] });
});
