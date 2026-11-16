import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { fixture, secret, words, field, ref, has, type P } from "../../tests/support/secret-rig.ts";
import { effect } from "../house/facts.ts";
import { ownAct } from "../tools/act-definition.ts";

it("la puerta directa del bus resuelve la acción de una cosa y la acción propia", () => {
  const rig = fixture(
    secret,
    undefined,
    {},
    {
      own: () => [
        ownAct<P, typeof secret>("own", "save", { input: secret, purpose: "Propia" }, () => ({ status: "accepted" })),
      ],
    },
  );
  for (const [object, option] of [
    ["child", "set"],
    ["own", "save"],
  ] as const) {
    const event = rig.house.bus.emit(effect("act", { object, option, input: { value: "directo" } }, "ana"));
    expect(ref(field(event.data.input, "value"))).toBe(true);
  }
  expect(has(rig.facts(), "directo")).toBe(false);
});
it("las posiciones de los hechos se protegen también en el resultado devuelto", () => {
  const rig = fixture(secret, () => ({
    status: "accepted",
    effects: [words.fact("sale-registered", { value: "dato-hecho", copy: "dato-hecho" }, "ana")],
  }));
  const result = rig.set({ value: "dato-entrada" });
  expect(result.status).toBe("accepted");
  const writes = [...result.effects, ...rig.facts(), ...rig.house.tools.state().tools.vault].filter(
    event => event.kind === "sale-registered",
  );
  expect(writes.length).toBeGreaterThanOrEqual(3);
  expect(writes.every(event => ref(event.data.value))).toBe(true);
  expect(writes.every(event => event.data.copy === "dato-hecho")).toBe(true);
});
it("una letra se limpia en texto libre sin alterar el protocolo ni los nombres de propiedades", () => {
  const rig = fixture(secret, input => ({
    status: "accepted",
    text: String(field(input, "value")),
    detail: { text: String(field(input, "value")) },
  }));
  const result = rig.set({ value: "x" });
  expect(result.status).toBe("accepted");
  const entries = result.effects.filter(event => event.kind === "tool-entry");
  expect(entries.length).toBe(1);
  expect(
    entries.every(
      event => event.kind === "tool-entry" && ref(event.data.text) && ref(field(event.data.detail, "text")),
    ),
  ).toBe(true);
});
it("una coincidencia con el estado accepted no modifica el discriminante del resultado", () => {
  const rig = fixture(secret, () => ({ status: "accepted", text: "accepted" }));
  const result = rig.set({ value: "accepted" });
  expect(result.status).toBe("accepted");
  expect(
    result.effects
      .filter(e => e.kind === "tool-entry")
      .every(e => e.kind === "tool-entry" && e.data.text === "accepted"),
  ).toBe(true);
});
it("el borrador también omite una unión malformada", () => {
  const input = Type.Union([
    Type.Object({ kind: Type.Literal("private"), value: Type.String({ secret: true }) }),
    Type.Object({ kind: Type.Literal("public"), value: Type.String() }),
  ]);
  const rig = fixture(input);
  const tool = rig.options.registry[0];
  if (tool) Object.defineProperty(tool, "draft", { value: () => "draft" });
  const result = rig.set({ kind: "wrong", value: "dato-malformado" });
  expect(has([result, rig.facts()], "dato-malformado")).toBe(false);
});
for (const schema of [
  Type.Object({}, { additionalProperties: Type.String({ secret: true }) }),
  Type.Record(Type.String(), Type.String({ secret: true })),
  Type.Intersect([secret, Type.Object({ other: Type.String() })]),
]) {
  it("rechaza combinaciones secretas no recorribles", () => {
    expect(() => fixture(schema)).toThrow(expect.objectContaining({ code: "E-SECRET-SCHEMA" }));
  });
}
it("las causas, AggregateError y colecciones no pueden obtener el material", () => {
  const raw = "uno\ndos";
  const rig = fixture(secret, input => {
    const reference = String(field(input, "value"));
    expect(ref(reference)).toBe(true);
    throw new AggregateError([new Error(reference)], reference, { cause: new Map([["item", new Set([reference])]]) });
  });
  const result = rig.set({ value: raw });
  expect(result.status).toBe("rejected");
  expect(has([result, rig.facts()], raw)).toBe(false);
});

it("una entrada secreta malformada tampoco se copia como número en el borrador", () => {
  const rig = fixture();
  const tool = rig.options.registry[0];
  if (tool) Object.defineProperty(tool, "draft", { value: () => "draft" });
  const result = rig.set({ value: 987654321 });
  const entries = rig.facts().filter(event => event.kind === "tool-entry");
  expect(JSON.stringify([result, entries]).includes("987654321")).toBe(false);
});
it("una coincidencia con un discriminante conserva la rama y protege el valor", () => {
  const input = Type.Object({ kind: Type.Literal("private"), value: Type.String({ secret: true }) });
  const rig = fixture(input);
  rig.set({ kind: "private", value: "private" });
  const acts = rig.facts().filter(e => e.kind === "act" && e.data.option === "set");
  expect(acts.every(e => e.kind === "act" && field(e.data.input, "kind") === "private")).toBe(true);
  expect(acts.every(e => e.kind === "act" && ref(field(e.data.input, "value")))).toBe(true);
});
it("la palabra del vocabulario no cambia el tipo de los hechos de la misma acción", () => {
  const rig = fixture(secret, () => ({
    status: "accepted",
    effects: [words.fact("sale-registered", { value: "otro-dato", copy: "sale-registered" }, "ana")],
  }));
  const done = rig.set({ value: "sale-registered" });
  expect(done.status).toBe("accepted");
  const event = rig.facts().find(e => e.kind === "sale-registered");
  expect(event?.kind === "sale-registered" && event.data.copy === "sale-registered" && ref(event.data.value)).toBe(
    true,
  );
});
