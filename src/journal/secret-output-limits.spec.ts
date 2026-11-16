import { vocabulary } from "./facts.ts";
// Sondas adversarias P1–P11 con datos inventados, convertidas en afirmaciones ejecutables.
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fixture, secret, field, inputOf, words, slices, has } from "../../tests/support/secret-rig.ts";

const utf = (v: unknown, s: string) =>
  JSON.stringify(v ?? null).includes(s) || JSON.stringify(v ?? null).includes(JSON.stringify(s).slice(1, -1));
const disk = (path: string, s: string) =>
  readdirSync(path)
    .filter(f => f.startsWith("journal"))
    .some(f => readFileSync(join(path, f)).includes(Buffer.from(s)));
const report = (label: string, observed: Record<string, unknown>) => {
  const expected: Record<string, unknown> = {
    P1: { status: "accepted", facts: false, disk: false },
    P2: { status: "accepted", result: true, facts: false, disk: false },
    P3: { facts: false, disk: false },
    P4a: { status: "accepted" },
    P4b: { status: "accepted" },
    P5made: { status: "accepted", facts: false, disk: false },
    P5target: { status: "accepted", facts: false, disk: false },
    P7: { status: "accepted" },
    P10: { text: "MARCADOR-DIRECTO-0010" },
  };
  expect(observed).toMatchObject(expected[label] ?? {});
  if (label === "P4a") expect(observed.copy).toBe("banana");
  if (label === "P4b") expect(observed.reason).toBeNull();
  if (label === "P4c") expect(has(observed.input, "ana")).toBe(true);
  if (label === "P7") expect(String(observed.text)).toContain("MARCADORMIXTO13");
};
it("P4 cerrado: una letra secreta conserva banana, ana y hechos válidos", () => {
  const rig = fixture(secret, () => ({
    status: "accepted",
    text: "listo",
    effects: [words.fact("sale-registered", { value: "x", copy: "banana" }, "ana")],
  }));
  const done = rig.set({ value: "a" });
  const fact = rig.facts().find(e => e.kind === "sale-registered");
  const entry = rig
    .facts()
    .filter(e => e.kind === "tool-entry")
    .at(-1);
  report("P4a", {
    status: done.status,
    copy: fact ? field(fact.data, "copy") : null,
    entryText: entry ? field(entry.data, "text") : null,
  });
  const catalog = {
    "sale-registered": Type.Object({ value: Type.String(), copy: Type.String({ pattern: "^[a-z]{1,8}$" }) }),
  };
  const w2 = vocabulary(catalog);
  const rig2 = fixture(
    secret,
    () => ({
      status: "accepted",
      text: "listo",
      effects: [w2.fact("sale-registered", { value: "x", copy: "banana" }, "ana")],
    }),
    {},
    { words: w2, slices },
  );
  const done2 = rig2.set({ value: "a" });
  report("P4b", {
    status: done2.status,
    reason: "reason" in done2 ? done2.reason : null,
    defect: "defect" in done2 ? done2.defect : null,
  });
  const withUser = fixture(Type.Object({ user: Type.String(), value: Type.String({ secret: true }) }));
  withUser.set({ user: "ana", value: "a" });
  report("P4c", { input: inputOf(withUser) });
});

it("P5 cerrado: secreto en target / made / recipient de la entrada", () => {
  const value = "MARCADOR-DESTINO-0005";
  const rig = fixture(secret, input => ({
    status: "accepted",
    text: "ok",
    made: [String(field(input, "value"))],
  }));
  const done = rig.set({ value });
  rig.restart();
  report("P5made", { status: done.status, facts: utf(rig.facts(), value), disk: disk(rig.path, value) });
  const rig2 = fixture(secret, input => ({ status: "accepted", text: "ok", target: String(field(input, "value")) }));
  const done2 = rig2.set({ value });
  rig2.restart();
  report("P5target", { status: done2.status, facts: utf(rig2.facts(), value), disk: disk(rig2.path, value) });
});
