import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixture, secret, ref, has, inputOf, field, words } from "../../tests/support/secret-rig.ts";
import { secretSnapshots } from "../../tests/support/secret-snapshots.ts";
import { effect } from "../house/facts.ts";

for (const [name, value] of [
  ["empty", ""],
  ["one", "Ω"],
  ["eleven auditor", "abcdefghijk"],
  ["twelve", "abcdefghijkl"],
  ["thirteen", "abcdefghijklm"],
  ["auditor vocabulary", "sale-registered"],
  ["multiline", "one\ntwo"],
  ["unicode", "ñ🔒"],
  ["looks like a reference", "secret:00000000-0000-0000-0000-000000000000"],
])
  it(`replaces the position and keeps folds without the datum: ${name}`, () => {
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
it("errors and their causes can only copy the references they received", () => {
  const value = "one\ntwo";
  const rig = fixture(secret, input => {
    throw new Error(String(field(input, "value")), { cause: { nested: new Error(String(field(input, "value"))) } });
  });
  const done = rig.set({ value });
  expect(done.status).toBe("rejected");
  expect(has([done, rig.facts()], value) || has([done, rig.facts()], "one\\ntwo")).toBe(false);
});
it("applies structure to direct facts and admits references even beyond the original maximum", () => {
  const rig = fixture();
  const event = rig.house.bus.emit(words.fact("sale-registered", { value: "x", copy: "x" }, "ana"));
  expect(event.kind).toBe("sale-registered");
  expect(ref(event.data.value) && event.data.copy === "x").toBe(true);
  expect(() =>
    rig.house.bus.emit(words.fact("sale-registered", { value: "too-long-for-the-field", copy: "" }, "ana")),
  ).toThrow();
});
it("cleans an action's facts even when they do not declare the field", () => {
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
it("secretInput false does not disable a mark, and the rejection does not expose the input either", () => {
  const rig = fixture(Type.Object({ value: Type.String({ secret: true, minLength: 20 }) }), undefined, {
    secretInput: () => false,
  });
  expect(rig.set({ value: "demo-pass" }).status).toBe("rejected");
  expect(ref(field(inputOf(rig), "value")) && !has(rig.facts(), "demo-pass")).toBe(true);
});
it("auditor's sentinel: transforming the reference's line breaks does not rebuild the secret", () => {
  const value = "INVENTED_MARKER_LINE_ONE\nINVENTED_MARKER_LINE_TWO";
  const rig = fixture(secret, input => ({
    status: "accepted",
    text: String(field(input, "value")).split("\n").join("|"),
  }));
  const done = rig.set({ value });
  expect(ref(field(inputOf(rig), "value"))).toBe(true);
  expect(has(done, value.split("\n").join("|"))).toBe(false);
});
it("rejects unsupported secret declarations before writing", () => {
  expect(() => fixture(Type.Object({ value: Type.Number({ secret: true }) }))).toThrow(
    expect.objectContaining({ code: "E-SECRET-SCHEMA" }),
  );
});
