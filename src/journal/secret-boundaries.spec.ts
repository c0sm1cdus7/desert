import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { fixture, secret, words, field, ref, has, type P } from "../../tests/support/secret-rig.ts";
import { effect } from "../house/facts.ts";
import { ownAct } from "../tools/act-definition.ts";

it("the bus's direct door resolves a thing's action and the own action", () => {
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
    const event = rig.house.bus.emit(effect("act", { object, option, input: { value: "direct" } }, "ana"));
    expect(ref(field(event.data.input, "value"))).toBe(true);
  }
  expect(has(rig.facts(), "direct")).toBe(false);
});
it("fact positions are protected in the returned result too", () => {
  const rig = fixture(secret, () => ({
    status: "accepted",
    effects: [words.fact("sale-registered", { value: "datum-fact", copy: "datum-fact" }, "ana")],
  }));
  const result = rig.set({ value: "datum-input" });
  expect(result.status).toBe("accepted");
  const writes = [...result.effects, ...rig.facts(), ...rig.house.tools.state().tools.vault].filter(
    event => event.kind === "sale-registered",
  );
  expect(writes.length).toBeGreaterThanOrEqual(3);
  expect(writes.every(event => ref(event.data.value))).toBe(true);
  expect(writes.every(event => event.data.copy === "datum-fact")).toBe(true);
});
it("a letter is cleaned in free text without altering the protocol or property names", () => {
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
it("a match with the accepted status does not change the result's discriminant", () => {
  const rig = fixture(secret, () => ({ status: "accepted", text: "accepted" }));
  const result = rig.set({ value: "accepted" });
  expect(result.status).toBe("accepted");
  expect(
    result.effects
      .filter(e => e.kind === "tool-entry")
      .every(e => e.kind === "tool-entry" && e.data.text === "accepted"),
  ).toBe(true);
});
it("the draft also omits a malformed union", () => {
  const input = Type.Union([
    Type.Object({ kind: Type.Literal("private"), value: Type.String({ secret: true }) }),
    Type.Object({ kind: Type.Literal("public"), value: Type.String() }),
  ]);
  const rig = fixture(input);
  const tool = rig.options.registry[0];
  if (tool) Object.defineProperty(tool, "draft", { value: () => "draft" });
  const result = rig.set({ kind: "wrong", value: "malformed-datum" });
  expect(has([result, rig.facts()], "malformed-datum")).toBe(false);
});
for (const schema of [
  Type.Object({}, { additionalProperties: Type.String({ secret: true }) }),
  Type.Record(Type.String(), Type.String({ secret: true })),
  Type.Intersect([secret, Type.Object({ other: Type.String() })]),
]) {
  it("rejects secret combinations that cannot be walked", () => {
    expect(() => fixture(schema)).toThrow(expect.objectContaining({ code: "E-SECRET-SCHEMA" }));
  });
}
it("causes, AggregateError and collections cannot obtain the material", () => {
  const raw = "one\ntwo";
  const rig = fixture(secret, input => {
    const reference = String(field(input, "value"));
    expect(ref(reference)).toBe(true);
    throw new AggregateError([new Error(reference)], reference, { cause: new Map([["item", new Set([reference])]]) });
  });
  const result = rig.set({ value: raw });
  expect(result.status).toBe("rejected");
  expect(has([result, rig.facts()], raw)).toBe(false);
});

it("a malformed secret input is not copied as a number into the draft either", () => {
  const rig = fixture();
  const tool = rig.options.registry[0];
  if (tool) Object.defineProperty(tool, "draft", { value: () => "draft" });
  const result = rig.set({ value: 987654321 });
  const entries = rig.facts().filter(event => event.kind === "tool-entry");
  expect(JSON.stringify([result, entries]).includes("987654321")).toBe(false);
});
it("a match with a discriminant keeps the branch and protects the value", () => {
  const input = Type.Object({ kind: Type.Literal("private"), value: Type.String({ secret: true }) });
  const rig = fixture(input);
  rig.set({ kind: "private", value: "private" });
  const acts = rig.facts().filter(e => e.kind === "act" && e.data.option === "set");
  expect(acts.every(e => e.kind === "act" && field(e.data.input, "kind") === "private")).toBe(true);
  expect(acts.every(e => e.kind === "act" && ref(field(e.data.input, "value")))).toBe(true);
});
it("the vocabulary word does not change the kind of the same action's facts", () => {
  const rig = fixture(secret, () => ({
    status: "accepted",
    effects: [words.fact("sale-registered", { value: "other-datum", copy: "sale-registered" }, "ana")],
  }));
  const done = rig.set({ value: "sale-registered" });
  expect(done.status).toBe("accepted");
  const event = rig.facts().find(e => e.kind === "sale-registered");
  expect(event?.kind === "sale-registered" && event.data.copy === "sale-registered" && ref(event.data.value)).toBe(
    true,
  );
});
