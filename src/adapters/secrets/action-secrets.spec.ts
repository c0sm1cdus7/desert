import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixture, secret, ref, has, inputOf, field, words } from "../../../tests/support/secret-rig.ts";
import { secretSnapshots } from "../../../tests/support/secret-snapshots.ts";
import { effect } from "../../journal/events.ts";

for (const [name, value] of [
  ["vacío", ""],
  ["uno", "Ω"],
  ["once auditor", "abcdefghijk"],
  ["doce", "abcdefghijkl"],
  ["trece", "abcdefghijklm"],
  ["vocabulario auditor", "sale-registered"],
  ["multilínea", "uno\ndos"],
  ["unicode", "ñ🔒"],
  ["parece referencia", "secret:00000000-0000-0000-0000-000000000000"],
])
  it(`reemplaza la posición y conserva plegados sin el dato: ${name}`, () => {
    const rig = fixture(secret, input => ({ status: "accepted", text: String(field(input, "value")) }));
    expect(rig.set({ value }).status).toBe("accepted");
    const kept = field(inputOf(rig), "value");
    expect(ref(kept) && kept !== value).toBe(true);
    const folded = rig.house.tools.state().tools.vault.find(e => e.kind === "act" && e.data.option === "set");
    expect(field(field(field(folded, "data"), "input"), "value")).toBe(kept);
    if (value) expect(has(rig.facts(), value) || has(rig.house.tools.state(), value)).toBe(false);
    rig.close();
    const saved = secretSnapshots(rig.path);
    expect(saved.length).toBe(2);
    expect(typeof kept === "string" && has(saved, kept)).toBe(true);
    if (value) expect(has(saved, value)).toBe(false);
    if (value) expect(readFileSync(join(rig.path, "journal.sqlite")).includes(Buffer.from(value))).toBe(false);
    rig.restart();
    expect(field(inputOf(rig), "value")).toBe(kept);
    if (value) expect(has(rig.house.tools.state(), value)).toBe(false);
  });
it("los errores y sus causas solo pueden copiar referencias recibidas", () => {
  const value = "uno\ndos";
  const rig = fixture(secret, input => {
    throw new Error(String(field(input, "value")), { cause: { nested: new Error(String(field(input, "value"))) } });
  });
  const done = rig.set({ value });
  expect(done.status).toBe("rejected");
  expect(has([done, rig.facts()], value) || has([done, rig.facts()], "uno\\ndos")).toBe(false);
});
it("aplica estructura a hechos directos y admite referencias aunque excedan el máximo original", () => {
  const rig = fixture();
  const event = rig.house.bus.emit(words.fact("sale-registered", { value: "x", copy: "x" }, "ana"));
  expect(event.kind).toBe("sale-registered");
  expect(ref(event.data.value) && event.data.copy === "x").toBe(true);
  expect(() =>
    rig.house.bus.emit(words.fact("sale-registered", { value: "demasiado-largo-para-campo", copy: "" }, "ana")),
  ).toThrow();
});
it("limpia los hechos de una acción aunque no declaren el campo", () => {
  const rig = fixture(secret, input => ({
    status: "accepted",
    private: String(field(input, "value")),
    effects: [
      effect(
        "tool-entry",
        {
          tool: "vault",
          target: "vault",
          author: "ana",
          text: String(field(input, "value")),
          detail: { copy: field(input, "value") },
        },
        "ana",
      ),
    ],
  }));
  const done = rig.set({ value: "sale-registered" });
  expect(has([done, rig.facts()], "sale-registered")).toBe(false);
});
it("secretInput false no desactiva una marca y el rechazo tampoco expone la entrada", () => {
  const rig = fixture(Type.Object({ value: Type.String({ secret: true, minLength: 20 }) }), undefined, {
    secretInput: () => false,
  });
  expect(rig.set({ value: "demo-pass" }).status).toBe("rejected");
  expect(ref(field(inputOf(rig), "value")) && !has(rig.facts(), "demo-pass")).toBe(true);
});
it("centinela del auditor: transformar los saltos de la referencia no reconstruye el secreto", () => {
  const value = "MARCADOR_INVENTADO_LINEA_UNO\nMARCADOR_INVENTADO_LINEA_DOS";
  const rig = fixture(secret, input => ({
    status: "accepted",
    text: String(field(input, "value")).split("\n").join("|"),
  }));
  const done = rig.set({ value });
  expect(ref(field(inputOf(rig), "value"))).toBe(true);
  expect(has(done, value.split("\n").join("|"))).toBe(false);
});
it("rechaza declaraciones secretas no soportadas antes de escribir", () => {
  expect(() => fixture(Type.Object({ value: Type.Number({ secret: true }) }))).toThrow(
    expect.objectContaining({ code: "E-SECRET-SCHEMA" }),
  );
});
