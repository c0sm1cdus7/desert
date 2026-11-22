// The wire shape against every walked screen: the raw screen leaks, the wired one is closed and keeps every text.
import { TypeGuard, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import { hintTexts, mainTexts, panelTexts } from "../../checks/surface-walk.ts";
import { walked } from "../../../tests/support/surface-tools.ts";
import type { Intent } from "./contract.ts";
import { pasteLimit } from "./limits.ts";
import { parseIntent, wire, WireScreen } from "./wire.ts";

const stops = await walked();
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
/** The arm of a union a value stands for: the one whose kind it carries. */
const armOf = (schema: TSchema, value: Readonly<Record<string, unknown>>): TSchema | undefined =>
  TypeGuard.IsUnion(schema)
    ? schema.anyOf.find(arm => {
        const kind: unknown = TypeGuard.IsObject(arm) ? arm.properties.kind : undefined;
        return TypeGuard.IsLiteral(kind) && kind.const === value.kind;
      })
    : schema;
/** Where a value holds a key its schema does not name, read off the schema alone: never off `wire`. */
function extras(schema: TSchema, value: unknown, at: string): readonly string[] {
  if (Array.isArray(value))
    return TypeGuard.IsArray(schema) ? value.flatMap((item, i) => extras(schema.items, item, `${at}/${i}`)) : [];
  if (!isRecord(value)) return [];
  const arm = armOf(schema, value);
  if (!arm || !TypeGuard.IsObject(arm)) return [];
  return Object.entries(value).flatMap(([key, inner]) => {
    const known = arm.properties[key];
    return known ? extras(known, inner, `${at}/${key}`) : [`${at}/${key}`];
  });
}
const raw = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe("the screen as it travels", () => {
  it("walks enough screens to mean something", () => {
    expect(stops.length).toBeGreaterThan(50);
  });
  it("finds the leak in the raw screen: keys the contract does not name", () => {
    const leaked = stops.flatMap(({ screen }) => extras(WireScreen, raw(screen), ""));
    expect(stops.some(({ screen }) => !Value.Check(WireScreen, raw(screen)))).toBe(true);
    const names = [...new Set(leaked.map(path => path.split("/").at(-1)))].sort();
    expect(names).toEqual(["open", "opens", "starts", "value"]);
  });
  it("validates every wired screen against the closed shape", () => {
    const wrong = stops.flatMap(({ screen, path }) =>
      [...Value.Errors(WireScreen, wire(screen))].map(
        error => `${JSON.stringify(path)} ${error.path}: ${error.message}`,
      ),
    );
    expect(wrong).toEqual([]);
  });
  it("wires a screen that equals its own JSON round trip: nothing undefined, nothing that does not travel", () => {
    for (const { screen } of stops) expect(raw(wire(screen))).toStrictEqual(wire(screen));
  });
  it("keeps every text the raw screen shows", () => {
    for (const { screen } of stops) {
      const wired = wire(screen);
      expect(mainTexts(wired)).toEqual(mainTexts(screen));
      expect(panelTexts(wired)).toEqual(panelTexts(screen));
      expect(hintTexts(wired)).toEqual(hintTexts(screen));
    }
  });
});

const keys = ["up", "down", "left", "right", "confirm", "cancel", "erase", "menu", "quit", "switch"] as const;
describe("an intent as it arrives", () => {
  const accepted: readonly (readonly [string, Intent])[] = [
    ...keys.map(kind => [kind, { kind }] as const),
    ["a type of one character", { kind: "type", text: "a" }],
    ["a type of one astral character", { kind: "type", text: "😀" }],
    ["an empty paste", { kind: "paste", text: "" }],
    ["a paste at the limit", { kind: "paste", text: "x".repeat(pasteLimit) }],
  ];
  it.each(accepted)("accepts %s", (_, intent) => {
    expect(parseIntent(intent)).toEqual({ ok: true, intent });
  });
  it.each([
    ["an unknown kind", { kind: "jump" }, "kind"],
    ["a kind that is no text", { kind: 1 }, "shape"],
    ["no kind", { text: "a" }, "shape"],
    ["an extra key", { kind: "up", text: "a" }, "shape"],
    ["a type with an extra key", { kind: "type", text: "a", at: 1 }, "shape"],
    ["a type with no text", { kind: "type" }, "shape"],
    ["a paste whose text is no string", { kind: "paste", text: 1 }, "shape"],
    ["an empty type", { kind: "type", text: "" }, "type-length"],
    ["a type of two code points", { kind: "type", text: "ab" }, "type-length"],
    ["a type of an escape", { kind: "type", text: "\x1b" }, "type-control"],
    ["a type of a line break", { kind: "type", text: "\n" }, "type-control"],
    ["a paste over the limit", { kind: "paste", text: "x".repeat(pasteLimit + 1) }, "paste-length"],
    ["a text", "up", "shape"],
    ["null", null, "shape"],
    ["a list", [{ kind: "up" }], "shape"],
  ])("refuses %s, naming its reason", (_, value, reason) => {
    expect(parseIntent(value)).toEqual({ ok: false, reason });
  });
});
