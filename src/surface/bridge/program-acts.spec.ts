// What an act asks where it stands: the thing it is done to is never among what it picks from.
import { describe, expect, it } from "vitest";
import type { Field } from "../contract.ts";
import { besides } from "./picked.ts";

const sales = [
  { title: "s1", value: "sales/s1" },
  { title: "s2", value: "sales/s2" },
];
const field: Field = {
  ask: "Con",
  kind: "pick",
  of: "sales",
  found: () => sales,
  shown: answer => answer,
  nothing: () => "",
  valid: answer => answer.startsWith("sales/"),
};

describe("a question that picks a thing, asked by an act on a thing", () => {
  it("leaves the thing the act is done to out of the list, and takes it for no answer", () => {
    const asked = besides(field, "sales/s1");
    expect(asked?.kind === "pick" ? asked.found("").map(option => option.value) : []).toEqual(["sales/s2"]);
    expect([asked?.valid?.("sales/s1"), asked?.valid?.("sales/s2"), asked?.valid?.("other")]).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("asks as declared an act on no thing, and any question that picks nothing", () => {
    expect(besides(field)).toBe(field);
    const text: Field = { ask: "Nombre", kind: "text", placeholder: "Nombre" };
    expect(besides(text, "sales/s1")).toBe(text);
    expect(besides(null, "sales/s1")).toBeNull();
  });
});
