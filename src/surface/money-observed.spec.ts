import { expect, it } from "vitest";
import { matrixSeat, readyMatrix } from "../../tests/support/money-matrix-seat.ts";
import { fieldSeat } from "../../tests/support/field-seat.ts";
import { text } from "../catalogs/fields.ts";

it.each(["en vuelo", "confirmación"] as const)(
  "P4/P5: %s preserves the failed action beside changed currency",
  state => {
    const h = readyMatrix(state);
    if (state === "confirmación") h.send({ kind: "confirm" });
    h.sale.currency = "US$";
    h.end(false);
    expect(h.screen().body).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
    expect(JSON.stringify(h.screen())).toContain("el proveedor no respondió");
    expect(JSON.stringify(h.screen())).toContain("cambió la moneda");
    h.send({ kind: "erase" });
    h.send({ kind: "confirm" });
    h.send({ kind: "type", text: "x" });
    expect(JSON.stringify(h.screen())).toContain("el proveedor no respondió");
    expect(JSON.stringify(h.screen())).toContain("cambió la moneda");
    expect(JSON.stringify(h.screen())).toContain("falta completar");
    expect(JSON.stringify(h.screen())).toContain("solo números");
  },
);
it("P3: a displayed empty amount stays empty when currency returns, including the next key", () => {
  const h = readyMatrix("importe");
  h.event("ida y vuelta");
  expect(h.screen().body).toMatchObject({ entry: { typed: "" } });
  expect(h.session().at(-1)).toMatchObject({ typed: "", answers: [], currency: "$" });
  h.send({ kind: "type", text: "7" });
  expect(h.screen().body).toMatchObject({ entry: { typed: "$ 0,07" } });
});
it("P6: the same symbol is the same currency and independent sessions keep independent amounts", () => {
  const a = readyMatrix("importe");
  const b = readyMatrix("importe");
  a.sale.currency = "$";
  expect(a.screen().body).toMatchObject({ entry: { typed: "$ 5,00" } });
  b.sale.currency = "US$";
  b.screen();
  expect(a.screen().body).toMatchObject({ entry: { typed: "$ 5,00" } });
  expect(matrixSeat("vacío").screen().body).toMatchObject({ entry: { typed: "" } });
});
it("P9 / WA4: a space before an existing space is rejected at the caret", () => {
  const h = fieldSeat(text("Nota", "Nota"));
  h.send({ kind: "type", text: "a b" });
  h.send({ kind: "left" });
  h.send({ kind: "left" });
  h.send({ kind: "type", text: " " });
  expect(h.screen().body).toMatchObject({ entry: { typed: "a b", caret: 1 } });
  expect(h.reasons()).toEqual(["sin espacios al principio ni dobles"]);
});
it("P10: pasted signs, separators and overflow keep the first discarded reason", () => {
  const h = matrixSeat("vacío");
  h.sale.currency = "US$";
  h.send({ kind: "paste", text: "-1.234,56" });
  expect(h.screen().body).toMatchObject({ entry: { typed: "US$ 1.234,56" } });
  expect(JSON.stringify(h.screen())).toContain("sin signo");
  h.send({ kind: "paste", text: "9".repeat(20) });
  expect(h.screen().body).toMatchObject({ entry: { typed: "US$ 12.345.699.999,99" } });
  expect(JSON.stringify(h.screen())).toContain("máximo US$ 99.999.999.999,99");
});

it("another person edits the shared sale while two independent devices are asking its amount", () => {
  const sale = { currency: "$" };
  const ana = matrixSeat("vacío", sale);
  const beto = matrixSeat("vacío", sale);
  ana.send({ kind: "type", text: "500" });
  beto.send({ kind: "type", text: "750" });
  beto.sale.currency = "US$";
  expect(ana.screen().body).toMatchObject({ entry: { typed: "" } });
  beto.sale.currency = "$";
  ana.send({ kind: "type", text: "7" });
  expect(ana.screen().body).toMatchObject({ entry: { typed: "$ 0,07" } });
  // Beto never saw a changed symbol, so his visible amount was never invalidated.
  expect(beto.screen().body).toMatchObject({ entry: { typed: "$ 7,50" } });
});
