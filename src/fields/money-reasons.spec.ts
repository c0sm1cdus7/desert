import { expect, it } from "vitest";
import { fieldSeat } from "../../tests/support/field-seat.ts";
import { readyMatrix } from "../../tests/support/money-matrix-seat.ts";
import { money, text } from "./fields.ts";
import { renewedMoney } from "../surface/acts/money-memory.ts";
import { formats } from "../surface/formats/masks.ts";
import type { Asking } from "../surface/session/walk-state.ts";

it.each([
  ["mínimo", "pantalla"],
  ["defineProgram", "pantalla"],
  ["mínimo", "tecla"],
  ["defineProgram", "tecla"],
] as const)("Q1: %s / %s checks the empty amount in the new currency", (state, entrance) => {
  const h = readyMatrix(state);
  if (state === "defineProgram") h.send({ kind: "confirm" });
  expect(JSON.stringify(h.screen())).toContain(state === "mínimo" ? "mínimo $ 0,01" : "importe retenido");
  h.sale.currency = "US$";
  if (entrance === "tecla") h.send({ kind: "erase" });
  const screen = h.screen();
  expect(screen.body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
  expect(JSON.stringify(screen)).not.toMatch(/mínimo|importe retenido/u);
  expect(JSON.stringify(screen)).toContain("cambió la moneda");
  h.send({ kind: "erase" });
  h.send({ kind: "type", text: "x" });
  expect(JSON.stringify(h.screen())).not.toMatch(/mínimo|importe retenido/u);
  expect(JSON.stringify(h.screen())).toContain("solo números");
  h.send({ kind: "type", text: "7" });
  expect(h.screen().body).toMatchObject({ entry: { typed: "US$ 0,07" } });
});

it("a live upper limit disappears with the amount, while discarded keys survive", () => {
  let currency = "$";
  const h = fieldSeat({ ...money("Importe", 1, () => currency), maximum: 100 });
  h.send({ kind: "type", text: "500x-" });
  expect(h.reasons()).toEqual(["máximo $ 1,00", "solo números"]);
  currency = "US$";
  expect(h.reasons()).toEqual(["solo números", "cambió la moneda"]);
});

it("Q7: confirming an emptied amount keeps its missing reason through another currency change", () => {
  let currency = "$";
  const h = fieldSeat(money("Importe", 1, () => currency));
  h.send({ kind: "type", text: "500" });
  expect(h.screen().body).toMatchObject({ entry: { typed: "$ 5,00" } });
  currency = "US$";
  expect(h.screen().body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
  expect(h.reasons()).toEqual(["cambió la moneda"]);
  expect(h.send({ kind: "confirm" })).toBeUndefined();
  expect(h.reasons()).toEqual(["cambió la moneda", "falta completar"]);
  currency = "€";
  expect(h.screen().body).toMatchObject({ entry: { typed: "", placeholder: "€ 0,00" } });
  expect(h.reasons()).toEqual(["falta completar", "cambió la moneda"]);
});

it("changing currency while answering a later question recalculates at the emptied question", () => {
  let currency = "$";
  const h = fieldSeat(
    money("Importe", 1, () => currency),
    text("Nota", "Nota"),
  );
  h.send({ kind: "type", text: "500" });
  h.send({ kind: "confirm" });
  h.send({ kind: "confirm" });
  currency = "US$";
  expect(h.screen().body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
  expect(h.reasons()).toEqual(["falta completar", "cambió la moneda"]);
});

const old: Asking = {
  kind: "act",
  tool: "data",
  act: "change",
  phase: "asking",
  currency: "$",
  answers: [],
  asked: [],
  pos: 0,
  floor: 0,
  typed: "500",
  caret: 3,
  at: 0,
  marks: [],
  suggested: false,
};
const format = formats({ currency: "US$", decimal: ",", thousands: ".", day: "dd/mm/aaaa" }).money;
const next = () => ({ kind: "text" as const, ask: "Importe", currency: "US$", mask: format });

it("a previous session's stored value reasons are removed but its action Error and key notices survive", () => {
  const walk = renewedMoney(
    {
      ...old,
      error: "no respondió",
      failed: true,
      ignored: "sin signo",
      notices: [{ reason: "mínimo $ 0,01" }, { reason: "solo números", ignored: true }],
    },
    next,
  );
  expect(walk).toMatchObject({ error: "no respondió", failed: true, typed: "", currency: "US$" });
  expect(walk.notices).toEqual([
    { reason: "solo números", ignored: true },
    { reason: "sin signo", ignored: true },
    { reason: "cambió la moneda" },
  ]);
});

it("a program reason that still holds is evaluated on empty answers in the new currency, beside the Error", () => {
  const seen: (readonly string[])[] = [];
  const walk = renewedMoney({ ...old, error: "no respondió", failed: true }, next, answers => {
    seen.push(answers);
    return `importe requerido en ${next().currency}`;
  });
  expect(seen).toEqual([[""]]);
  expect(walk.error).toBe("no respondió");
  expect(walk.notices).toEqual([{ reason: "importe requerido en US$" }, { reason: "cambió la moneda" }]);
});

it("a fresh device does not restore the previous amount or validation result", () => {
  let currency = "$";
  const h = fieldSeat(money("Importe", 1, () => currency));
  h.send({ kind: "type", text: "0" });
  h.send({ kind: "confirm" });
  currency = "US$";
  h.screen();
  h.reopen();
  expect(h.screen().body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
  expect(h.reasons()).toEqual([]);
});

it("repeated discarded keys remain visible only once after currency changes", () => {
  let currency = "$";
  const h = fieldSeat(money("Importe", 1, () => currency));
  for (const char of ["x", "-", "x", "-", "x"]) h.send({ kind: "type", text: char });
  expect(h.reasons()).toEqual(["sin signo", "solo números"]);
  currency = "US$";
  expect(h.reasons()).toEqual(["solo números", "sin signo", "cambió la moneda"]);
});

it("a live field reason is also checked on empty with the new symbol even beside an action Error", () => {
  const walk = renewedMoney({ ...old, error: "no respondió", failed: true }, () => ({
    ...next(),
    wrong: value => (value === "" ? "mínimo US$ 0,01" : "importe anterior"),
  }));
  expect(walk.error).toBe("no respondió");
  expect(walk.notices).toEqual([{ reason: "mínimo US$ 0,01" }, { reason: "cambió la moneda" }]);
});
